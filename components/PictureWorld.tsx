'use client'

/**
 * Picture World: a full-screen mode opened by the grey circle.
 *
 *  - Every image on the site (from every project) gets its own spot on the
 *    screen, spread evenly, so each image competes on its own: a project with
 *    more images simply owns more of the screen.
 *  - One ball. Click anywhere and it rolls towards the click (click the ball
 *    itself for a random shot), bouncing off the screen edges and slowing down.
 *  - Where it stops, the nearest image fills the background, and up to 6 other
 *    images from the same project float on top (200–600px wide).
 *  - Only CXYZ + the circle and "Exit" stay visible. Esc also exits.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { urlFor } from '@/sanity/client'
import type { Project, SanityImage } from '@/sanity/types'
import { useProjects } from './ProjectContext'
import { TopRow } from './Shared'

const PAD = 20 // keep floating images this far from the screen edges…
const PAD_TOP = 80 // …below the CXYZ row…
const PAD_BOTTOM = 20 // …and the bottom edge
/** Floating images: desktop shows up to 3, 360–600px wide; phones up to 6, 200–600px. */
const floatRules = () =>
  window.innerWidth > 768 ? { max: 3, minW: 360, maxW: 600 } : { max: 6, minW: 200, maxW: 600 }
const MAX_ROLL_S = 2 // longest roll, like the old pool balls

type Float = { key: string; image: SanityImage; x: number; y: number; w: number; h: number }
type Shown = { id: number; entry: number; bg: SanityImage; floats: Float[] }
/** One image somewhere on the site, and the project it belongs to. */
type Entry = { project: number; image: SanityImage; key: string }

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const shuffle = <T,>(a: T[]) => {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

function imagesOf(p: Project): SanityImage[] {
  const imgs = (p.media ?? []).flatMap((m) => (m._type === 'imageItem' && m.image?.asset ? [m.image] : []))
  if (imgs.length) return imgs
  return p.thumbnail?.asset ? [{ ...p.thumbnail, dimensions: { width: 0, height: 0, aspectRatio: p.thumbnailAr } }] : []
}

/** Every image on the site, in a fixed but mixed-up order (so a project's images aren't all side by side). */
function allEntries(projects: Project[]): Entry[] {
  const hash = (t: string) => {
    let h = 2166136261
    for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619)
    return h >>> 0
  }
  return projects
    .flatMap((p, project) => imagesOf(p).map((image, k) => ({ project, image, key: `${p._id}-${image.asset?._ref ?? k}` })))
    .sort((a, b) => hash(a.key) - hash(b.key))
}

/**
 * n spots (in px) sharing the screen evenly: a grid of equal cells, rows chosen
 * so the cells are as close to square as possible, one spot in the middle of each.
 */
function gridSpots(n: number, W: number, H: number) {
  const countsFor = (rows: number) =>
    Array.from({ length: rows }, (_, r) => Math.floor(n / rows) + (r < n % rows ? 1 : 0))
  let best = 1
  let bestScore = Infinity
  for (let rows = 1; rows <= n; rows++) {
    const counts = countsFor(rows)
    const squareness = Math.max(...counts.map((c) => { const a = W / c / (H / rows); return Math.max(a, 1 / a) }))
    const evenness = Math.max(...counts) / Math.min(...counts)
    if (squareness * evenness < bestScore) {
      bestScore = squareness * evenness
      best = rows
    }
  }
  return countsFor(best).flatMap((count, r) =>
    Array.from({ length: count }, (_, c) => ({ x: ((c + 0.5) / count) * W, y: ((r + 0.5) / best) * H }))
  )
}

type Box = { x: number; y: number; w: number; h: number }
const GAP = 10 // minimum space between floating images (and around the ball)
const hits = (a: Box, b: Box) =>
  a.x < b.x + b.w + GAP && a.x + a.w + GAP > b.x && a.y < b.y + b.h + GAP && a.y + a.h + GAP > b.y

/**
 * Random sizes and spots, fully on screen (clear of CXYZ and Exit), never
 * overlapping each other or the ball. If an image can't find a free spot it
 * shrinks (not below 200px wide); if it still doesn't fit, it's left out.
 */
function layoutFloats(images: SanityImage[], W: number, H: number, ball: Box): Float[] {
  const placed: Float[] = []
  const taken: Box[] = [ball]
  const maxH = H - PAD_TOP - PAD_BOTTOM
  for (const [k, image] of images.entries()) {
    const ar = image.dimensions?.aspectRatio ?? 1.5
    const { minW, maxW } = floatRules()
    let w = Math.min(rand(minW, maxW), W - 2 * PAD, maxH * ar)
    let spot: Float | null = null
    while (!spot) {
      const h = w / ar
      for (let t = 0; t < 80 && !spot; t++) {
        const f = { key: `${k}-${image.asset?._ref}`, image, w, h, x: rand(PAD, W - PAD - w), y: rand(PAD_TOP, PAD_TOP + maxH - h) }
        if (!taken.some((o) => hits(f, o))) spot = f
      }
      if (spot || w <= minW) break
      w = Math.max(minW, w * 0.85) // no room: try a bit smaller
    }
    if (spot) {
      placed.push(spot)
      taken.push(spot)
    }
  }
  return placed
}

/** Bounce a coordinate back and forth between lo and hi (the edges). */
function fold(v: number, lo: number, hi: number) {
  const L = hi - lo
  if (L <= 0) return lo
  const m = (((v - lo) % (2 * L)) + 2 * L) % (2 * L)
  return lo + (m <= L ? m : 2 * L - m)
}

export function PictureWorld() {
  const { world } = useProjects()
  return world ? <World /> : null
}

function World() {
  const { projects, activeIndex, setActiveIndex, setWorld } = useProjects()
  const ballRef = useRef<HTMLDivElement>(null)
  const aimRef = useRef<SVGLineElement>(null)
  const rolling = useRef(false) // ball moving → no aiming line
  const aimOk = useRef(false) // pointer is aiming (mouse over the picture, or a touch being held)
  const updateAim = () => {
    if (aimRef.current) aimRef.current.style.visibility = aimOk.current && !rolling.current ? 'visible' : 'hidden'
  }
  const pos = useRef({ x: 0, y: 0 })
  const raf = useRef(0)
  const shownEntry = useRef(-1) // which image is showing (for tilt: only change when a different one wins)
  const [shown, setShown] = useState<Shown | null>(null)

  const radius = () => (ballRef.current?.offsetWidth ?? 60) / 2
  const ballBox = () => {
    const r = radius()
    return { x: pos.current.x - r, y: pos.current.y - r, w: 2 * r, h: 2 * r }
  }
  const place = (x: number, y: number) => {
    pos.current = { x, y }
    const r = radius()
    if (ballRef.current) ballRef.current.style.transform = `translate(${x - r}px, ${y - r}px)`
    aimRef.current?.setAttribute('x1', String(x))
    aimRef.current?.setAttribute('y1', String(y))
  }

  const entries = useMemo(() => allEntries(projects), [projects])

  // show one image as the background + up to 6 others from its project floating on top
  const show = useCallback(
    (e: number) => {
      const entry = entries[e]
      if (!entry) return
      shownEntry.current = e
      const others = shuffle(imagesOf(projects[entry.project]).filter((im) => im.asset?._ref !== entry.image.asset?._ref))
      setShown((s) => ({
        id: (s?.id ?? 0) + 1,
        entry: e,
        bg: entry.image,
        floats: layoutFloats(others.slice(0, floatRules().max), window.innerWidth, window.innerHeight, ballBox()),
      }))
      setActiveIndex(entry.project)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, projects, setActiveIndex]
  )

  // the image whose spot is closest to (x, y)
  const nearest = useCallback(
    (x: number, y: number) => {
      const spots = gridSpots(entries.length, window.innerWidth, window.innerHeight)
      let best = -1
      let bestD = Infinity
      spots.forEach((s, i) => {
        const d = Math.hypot(s.x - x, s.y - y)
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
      return best
    },
    [entries]
  )

  // open: ball starts on the spot of the active project's first image, showing it
  useEffect(() => {
    if (!entries.length) return
    const firstRef = imagesOf(projects[activeIndex] ?? ({} as Project))[0]?.asset?._ref
    const start = Math.max(0, entries.findIndex((e) => e.project === activeIndex && e.image.asset?._ref === firstRef))
    const s = gridSpots(entries.length, window.innerWidth, window.innerHeight)[start]
    const r = radius()
    place(fold(s.x, r, window.innerWidth - r), fold(s.y, r, window.innerHeight - r))
    show(start)
    // only on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // no page scrolling underneath; Esc exits; keep the ball on screen when resizing
  useEffect(() => {
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setWorld(false)
    const onResize = () => {
      const r = radius()
      place(fold(pos.current.x, r, window.innerWidth - r), fold(pos.current.y, r, window.innerHeight - r))
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      html.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setWorld])

  // tilt (phones): the ball rolls "downhill" like a marble. When it comes to rest,
  // the nearest image shows (only if it's a different one). Taps still shoot.
  useEffect(() => {
    const g = { x: 0, y: 0 }
    let hasTilt = false
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return
      hasTilt = true
      const rad = Math.PI / 180
      let gx = Math.sin(e.gamma * rad) // left–right
      let gy = Math.sin(e.beta * rad) // front–back
      // turn the phone's axes into screen directions when it's held sideways
      const angle = screen.orientation?.angle ?? 0
      if (angle === 90) [gx, gy] = [gy, -gx]
      else if (angle === 270 || angle === -90) [gx, gy] = [-gy, gx]
      else if (angle === 180) [gx, gy] = [-gx, -gy]
      g.x = gx
      g.y = gy
    }
    window.addEventListener('deviceorientation', onTilt)

    const ACCEL = 1800 // px/s² when tilted all the way
    const DEAD = 0.06 // ignore tilts under ~3.5° so the ball can rest on a slightly uneven hand
    const FRICTION = 0.35 // speed kept per second (lower = stops sooner)
    const BOUNCE = 0.4 // speed kept when hitting an edge
    const v = { x: 0, y: 0 }
    let last = 0
    let moved = false
    let still = 0
    let frame = 0
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop)
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      if (!hasTilt || !dt || rolling.current) {
        v.x = v.y = 0 // a tap-shot is playing: let it finish
        return
      }
      const ax = Math.abs(g.x) > DEAD ? g.x * ACCEL : 0
      const ay = Math.abs(g.y) > DEAD ? g.y * ACCEL : 0
      const keep = Math.pow(FRICTION, dt)
      v.x = (v.x + ax * dt) * keep
      v.y = (v.y + ay * dt) * keep
      const r = radius()
      const W = window.innerWidth
      const H = window.innerHeight
      let x = pos.current.x + v.x * dt
      let y = pos.current.y + v.y * dt
      if (x < r) { x = r; v.x = -v.x * BOUNCE }
      if (x > W - r) { x = W - r; v.x = -v.x * BOUNCE }
      if (y < r) { y = r; v.y = -v.y * BOUNCE }
      if (y > H - r) { y = H - r; v.y = -v.y * BOUNCE }
      place(x, y)
      // settled: show whatever image it stopped on
      if (Math.hypot(v.x, v.y) > 25) {
        moved = true
        still = 0
      } else if (moved && (still += dt) > 0.5) {
        moved = false
        const i = nearest(x, y)
        if (i >= 0 && i !== shownEntry.current) show(i)
      }
    }
    frame = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('deviceorientation', onTilt)
      cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearest, show])

  const shoot = (tx: number, ty: number) => {
    cancelAnimationFrame(raf.current)
    rolling.current = true
    updateAim()
    const W = window.innerWidth
    const H = window.innerHeight
    const r = radius()
    const p0 = { ...pos.current }
    let dx = tx - p0.x
    let dy = ty - p0.y
    let len = Math.hypot(dx, dy)
    if (len < r) {
      // clicked the ball itself: random direction, medium-strong shot
      const a = Math.random() * Math.PI * 2
      dx = Math.cos(a)
      dy = Math.sin(a)
      len = rand(0.5, 1) * Math.max(W, H)
    } else {
      dx /= len
      dy /= len
    }
    // how far it travels (bounces included): further clicks = harder shots
    const longest = 2.5 * Math.max(W, H)
    const D = Math.min(Math.max(len * 2, 300), longest)
    const T = (0.6 + (MAX_ROLL_S - 0.6) * (D / longest)) * 1000
    const k = 4 / T // friction: fast start, gentle stop
    const norm = 1 - Math.exp(-k * T)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let t0 = 0
    const tick = (now: number) => {
      if (!t0) t0 = now
      const t = reduce ? T : Math.min(now - t0, T)
      const s = (D * (1 - Math.exp(-k * t))) / norm
      place(fold(p0.x + dx * s, r, W - r), fold(p0.y + dy * s, r, H - r))
      if (t < T) raf.current = requestAnimationFrame(tick)
      else {
        rolling.current = false
        updateAim() // line comes back once the ball has stopped
        const i = nearest(pos.current.x, pos.current.y)
        if (i >= 0) show(i)
      }
    }
    raf.current = requestAnimationFrame(tick)
  }

  // dotted aiming line from the ball to the pointer.
  //  Mouse: shows whenever the mouse is over the picture (not over CXYZ / World).
  //  Touch: press and hold ~0.35s → the line appears; drag to aim; let go to shoot.
  //         A quick tap still shoots straight away, like a click.
  const hold = useRef<{ timer: number; aiming: boolean; skipClick: boolean }>({ timer: 0, aiming: false, skipClick: false })
  const aimAt = (x: number, y: number) => {
    aimRef.current?.setAttribute('x2', String(x))
    aimRef.current?.setAttribute('y2', String(y))
  }
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' || (e.target as HTMLElement).closest('a, button')) return
    clearTimeout(hold.current.timer)
    const { clientX: x, clientY: y } = e
    hold.current.timer = window.setTimeout(() => {
      hold.current.aiming = true
      aimAt(x, y)
      aimOk.current = true
      updateAim()
    }, 350)
  }
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      if (hold.current.aiming) aimAt(e.clientX, e.clientY)
      return
    }
    const overUi = !!(e.target as HTMLElement).closest('a, button')
    aimOk.current = !overUi
    aimAt(e.clientX, e.clientY)
    updateAim()
  }
  const onUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return
    clearTimeout(hold.current.timer)
    if (!hold.current.aiming) return // quick tap: the click below shoots
    hold.current.aiming = false
    hold.current.skipClick = true // this touch already shot; ignore the click that follows
    aimOk.current = false
    shoot(e.clientX, e.clientY) // hides the line while rolling
    updateAim()
  }
  const onCancel = () => {
    clearTimeout(hold.current.timer)
    hold.current.aiming = false
    aimOk.current = false
    updateAim()
  }
  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    aimOk.current = false
    updateAim()
  }
  useEffect(() => () => clearTimeout(hold.current.timer), [])

  const onClick = (e: React.MouseEvent) => {
    if (hold.current.skipClick) {
      hold.current.skipClick = false
      return
    }
    if ((e.target as HTMLElement).closest('a, button')) return
    shoot(e.clientX, e.clientY)
  }

  const src = (image: SanityImage, w: number) => urlFor(image).width(Math.min(2400, Math.round(w * 2))).url()

  return (
    <div
      className="world"
      onClick={onClick}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      onPointerLeave={onLeave}
      onContextMenu={(e) => e.preventDefault()} // no long-press menu on phones
    >
      {shown && (
        <div className="world__scene" key={shown.id}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="world__bg"
            src={src(shown.bg, 1400)}
            alt=""
            onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
          />
          {shown.floats.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={f.key}
              className="world__float"
              src={src(f.image, f.w)}
              alt={f.image.alt ?? ''}
              onLoad={(e) => e.currentTarget.classList.add('is-loaded')}
              style={{ left: f.x, top: f.y, width: f.w, height: f.h, transitionDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      )}

      <svg className="world__aim" aria-hidden>
        {/* positions are set directly (no re-render): start = ball, end = mouse */}
        <line ref={aimRef} />
      </svg>
      <div className="world__ball" ref={ballRef} aria-hidden />

      <div className="world__ui grid">
        <div className="side">
          <TopRow />
        </div>
      </div>
    </div>
  )
}
