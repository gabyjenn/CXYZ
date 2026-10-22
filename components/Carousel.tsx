'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useProjects } from './ProjectContext'
import { MediaView, SanityImg, aspectOf } from './Media'
import { PdfViewer } from './PdfViewer'
import { planRoll, play, type Ball } from './poolPhysics'
import type { Project } from '@/sanity/types'

const MOBILE = '(max-width: 768px)'
/** Pagination switches to "03 / 12" style above this many slides. */
const MAX_DOTS = 10

type Box = { x: number; y: number; w: number; h: number }
type Placed = Box & { id: string }

const overlaps = (a: Box, b: Box, m = 0) =>
  a.x < b.x + b.w + m && a.x + a.w + m > b.x && a.y < b.y + b.h + m && a.y + a.h + m > b.y

/**
 * Randomly place thumbnails anywhere in the carousel EXCEPT the largest
 * possible frame area and the pagination strip, so they never collide
 * whatever the current slide's aspect ratio is.
 */
/** Areas thumbnails may never sit in: the largest possible frame + the pagination strip. */
function blockedAreas(W: number, H: number, mobile: boolean): Box[] {
  const frameW = mobile ? W - 20 : W * 0.65
  const frameH = H * (mobile ? 0.67 : 0.8)
  return [
    { x: (W - frameW) / 2, y: (H - frameH) / 2, w: frameW, h: frameH }, // frame
    { x: (W - frameW) / 2, y: H - 80, w: frameW, h: 80 },               // caption + pagination
  ]
}

/**
 * Anything on the page marked `data-pool-solid` (the question module) that
 * overlaps the carousel, in carousel coordinates. Thumbnails bounce off these.
 */
function solidAreas(carousel: HTMLElement): Box[] {
  const c = carousel.getBoundingClientRect()
  const out: Box[] = []
  document.querySelectorAll<HTMLElement>('[data-pool-solid]').forEach((el) => {
    const r = el.getBoundingClientRect()
    const x = Math.max(r.left, c.left), y = Math.max(r.top, c.top)
    const x2 = Math.min(r.right, c.right), y2 = Math.min(r.bottom, c.bottom)
    if (x2 > x && y2 > y) out.push({ x: x - c.left, y: y - c.top, w: x2 - x, h: y2 - y })
  })
  return out
}

function placeThumbs(projects: Project[], W: number, H: number, size: number, mobile: boolean, solids: Box[] = []): Placed[] {
  const blocked = [...blockedAreas(W, H, mobile), ...solids]
  const edge = mobile ? 10 : 20
  const placed: Placed[] = []

  for (const p of projects) {
    if (!p.thumbnail?.asset) continue
    // circles: always a square box, image cropped to fill it
    const w = size
    const h = size
    let box: Box | null = null
    for (let tries = 0; tries < 300; tries++) {
      const cand = { x: edge + Math.random() * (W - w - 2 * edge), y: edge + Math.random() * (H - h - 2 * edge), w, h }
      const hitsBlocked = blocked.some((b) => overlaps(cand, b, 10))
      const hitsThumb = placed.some((t) => overlaps(cand, t, 6))
      if (!hitsBlocked && !hitsThumb) {
        box = cand
        break
      }
      // after many failures, allow thumbs to touch each other but still never the frame
      if (tries > 200 && !hitsBlocked) {
        box = cand
        break
      }
    }
    if (box) placed.push({ ...box, id: p._id })
  }
  return placed
}

export function Carousel({ interval }: { interval: number }) {
  const { projects, projectIndex, slideIndex, changeId, transitioning, goToProject, goToSlide } = useProjects()
  const project = projects[projectIndex]
  const slides = project?.media ?? []
  const slide = slides[Math.min(slideIndex, slides.length - 1)]

  const ref = useRef<HTMLElement>(null)
  const [thumbs, setThumbs] = useState<Placed[]>([])
  const thumbEls = useRef(new Map<string, HTMLElement>())
  const cueRef = useRef<string | undefined>(undefined) // thumbnail that was clicked
  const thumbsRef = useRef<Placed[]>([])
  thumbsRef.current = thumbs
  const [paused, setPaused] = useState(false)

  // last slide → back to the first slide of the same project (loops; never changes project)
  const next = useCallback(() => {
    if (slides.length <= 1) return
    goToSlide((slideIndex + 1) % slides.length)
  }, [slideIndex, slides.length, goToSlide])

  // first slide → back to the last slide of the same project
  const prev = useCallback(() => {
    if (slides.length <= 1) return
    goToSlide((slideIndex - 1 + slides.length) % slides.length)
  }, [slideIndex, slides.length, goToSlide])

  // ── PDFs: real page shape + page count (detected by the viewer), current page
  const [pdfInfo, setPdfInfo] = useState<Record<string, { aspect: number; pages: number }>>({})
  const [pdfPage, setPdfPage] = useState(1)
  const isPdf = slide?._type === 'pdfItem'
  const pdfPages = isPdf ? pdfInfo[slide._key]?.pages ?? 1 : 1
  useEffect(() => setPdfPage(1), [slide?._key])

  /** next page inside a PDF, otherwise next slide */
  const step = useCallback(() => {
    if (isPdf && pdfPage < pdfPages) setPdfPage((n) => n + 1)
    else next()
  }, [isPdf, pdfPage, pdfPages, next])
  const stepBack = useCallback(() => {
    if (isPdf && pdfPage > 1) setPdfPage((n) => n - 1)
    else prev()
  }, [isPdf, pdfPage, prev])

  // ── thumbnails: random positions on load and on resize
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const run = () => {
      const mobile = window.matchMedia(MOBILE).matches
      setThumbs(placeThumbs(projects, el.clientWidth, el.clientHeight, mobile ? 30 : 60, mobile, solidAreas(el)))
    }
    run()
    let t: number
    const ro = new ResizeObserver(() => {
      clearTimeout(t)
      t = window.setTimeout(run, 150)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      clearTimeout(t)
    }
  }, [projects])

  // ── on project change: thumbnails roll like pool balls to their new spots
  useEffect(() => {
    const el = ref.current
    if (!changeId || !el || !thumbsRef.current.length) return
    const W = el.clientWidth
    const H = el.clientHeight
    const mobile = window.matchMedia(MOBILE).matches

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setThumbs(placeThumbs(projects, W, H, mobile ? 30 : 60, mobile, solidAreas(el)))
      return
    }

    const balls: Ball[] = thumbsRef.current.map((t) => ({
      id: t.id, x: t.x + t.w / 2, y: t.y + t.h / 2, r: t.w / 2, vx: 0, vy: 0,
    }))
    const bounds = { W, H, edge: mobile ? 10 : 20 }
    const blocked = blockedAreas(W, H, mobile)
    const solids = solidAreas(el)
    const frames = planRoll(balls, bounds, blocked, cueRef.current, solids)
    cueRef.current = undefined

    const write = (bs: Ball[]) => {
      for (const b of bs) {
        const node = thumbEls.current.get(b.id)
        if (node) {
          node.style.left = `${b.x - b.r}px`
          node.style.top = `${b.y - b.r}px`
        }
      }
    }
    return play(frames, balls, write, (bs) => {
      const placed: Placed[] = bs.map((b) => ({ id: b.id, x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }))
      // Fallback for very crowded layouts only (many projects on a small
      // screen): if no clean shot was found in time, ease any thumbnail
      // still over the image to the nearest free spot.
      const fixed = placed.map((t, i) => {
        if (![...blocked, ...solids].some((r) => overlaps(t, r, -0.5))) return t
        const others = placed.filter((_, j) => j !== i)
        let best = t
        let bestD = Infinity
        for (let k = 0; k < 300; k++) {
          const c = { ...t, x: bounds.edge + Math.random() * (W - t.w - 2 * bounds.edge), y: bounds.edge + Math.random() * (H - t.h - 2 * bounds.edge) }
          if ([...blocked, ...solids].some((r) => overlaps(c, r, 6)) || others.some((o) => overlaps(c, o, 4))) continue
          const d = Math.hypot(c.x - t.x, c.y - t.y)
          if (d < bestD) { bestD = d; best = c }
        }
        const node = thumbEls.current.get(t.id)
        if (node && best !== t) node.classList.add('thumb--settle')
        return best
      })
      setThumbs(fixed)
      window.setTimeout(() => thumbEls.current.forEach((n) => n.classList.remove('thumb--settle')), 400)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeId])

  // ── autoplay
  useEffect(() => {
    if (interval <= 0 || paused || transitioning || slides.length <= 1) return
        const t = window.setTimeout(step, interval)
    return () => clearTimeout(t)
  }, [paused, transitioning, slides.length, projects.length, step, interval, slideIndex, projectIndex, pdfPage])

  // pause when tab hidden
  useEffect(() => {
    const onVis = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // ── keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea')) return
      if (e.key === 'ArrowRight') step()
      if (e.key === 'ArrowLeft') stepBack()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, stepBack])

  if (!project) {
    return (
      <section className="carousel module" ref={ref}>
        <p className="carousel__empty">Add a project in /studio</p>
      </section>
    )
  }

  const interactive = slide?._type === 'videoItem'

  return (
    <section className="carousel module" ref={ref} aria-roledescription="carousel" aria-label="Projects">
      {thumbs.map((t) => {
        const i = projects.findIndex((p) => p._id === t.id)
        const p = projects[i]
        return (
          <button
            key={t.id}
            ref={(node) => {
              if (node) thumbEls.current.set(t.id, node)
              else thumbEls.current.delete(t.id)
            }}
            className="thumb"
            style={{ left: t.x, top: t.y, width: t.w, height: t.h }}
            aria-current={i === projectIndex}
            aria-label={p.title}
            title={p.title}
            onClick={() => {
              if (i === projectIndex) return
              cueRef.current = t.id // this one gets the hard hit
              goToProject(i)
            }}
          >
            <SanityImg image={p.thumbnail!} sizes="120px" alt="" />
          </button>
        )
      })}

      {slide && (
        <figure
          className="frame"
          style={{ '--ar': isPdf ? pdfInfo[slide._key]?.aspect ?? aspectOf(slide) : aspectOf(slide) } as React.CSSProperties}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {interactive ? (
            <div className="frame__media frame__media--interactive" key={slide._key}>
              <MediaView item={slide} />
            </div>
          ) : (
            // click → next PDF page / next slide (replaces arrows)
            <div
              className="frame__media"
              key={slide._key}
              onClick={step}
              role="button"
              tabIndex={0}
              aria-label={isPdf ? 'Next page' : 'Next image'}
            >
              {slide._type === 'pdfItem' ? (
                slide.fileUrl && (
                  <PdfViewer
                    url={slide.fileUrl}
                    page={pdfPage}
                    onLoad={(info) => setPdfInfo((m) => ({ ...m, [slide._key]: info }))}
                  />
                )
              ) : (
                <MediaView item={slide} eager />
              )}
            </div>
          )}
        </figure>
      )}

      <div className="carousel__bottom">
        {/* TODO(design): caption placement is still open. Shown above pagination for now. */}
        {(slide?.caption || (isPdf && pdfPages > 1)) && (
          <p className="carousel__caption">
            {slide?.caption}
            {slide?.caption && isPdf && pdfPages > 1 && ' · '}
            {isPdf && pdfPages > 1 && `p. ${pdfPage} / ${pdfPages}`}
          </p>
        )}
        {slides.length > 1 &&
          (slides.length > MAX_DOTS ? (
            <div className="pagination">
              <button onClick={prev} aria-label="Previous">←</button>
              <span>
                {String(slideIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
              <button onClick={next} aria-label="Next">→</button>
            </div>
          ) : (
            <nav className="pagination" aria-label="Slides">
              {slides.map((s, i) => (
                <button key={s._key} aria-current={i === slideIndex} onClick={() => goToSlide(i)}>
                  {i + 1}
                </button>
              ))}
            </nav>
          ))}
      </div>
    </section>
  )
}
