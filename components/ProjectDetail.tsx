'use client'

/**
 * Project page:
 *   col 1–3 (fixed): CXYZ + toggle / Projects + title / caption + pagination, ← Go Back bottom-left
 *   col 4–12: every image of the project, stacked; scroll to see more
 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Project } from '@/sanity/types'
import { useProjects } from './ProjectContext'
import { Shot, TopRow } from './Shared'

export function ProjectDetail({ project }: { project: Project }) {
  const { projects, setActiveIndex } = useProjects()
  const media = project.media ?? []
  const [current, setCurrent] = useState(0)
  const frames = useRef<(HTMLDivElement | null)[]>([])
    // this project's background colour (Studio), with black or white text — whichever reads better
  useEffect(() => {
    const bg = project.background
    const site = document.querySelector<HTMLElement>('.site')
    if (!bg || !site) return
    const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(bg.slice(i, i + 2), 16) / 255))
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    const darkText = (L + 0.05) / 0.05 > 1.05 / (L + 0.05)
    const vars = {
      '--bg': bg,
      '--fg': darkText ? '#000' : '#fff',
      '--muted': darkText ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)',
    }
    Object.entries(vars).forEach(([k, v]) => site.style.setProperty(k, v))
    document.documentElement.style.background = bg
    return () => {
      Object.keys(vars).forEach((k) => site.style.removeProperty(k))
      document.documentElement.style.background = ''
    }
  }, [project.background])

  // coming back home shows this project
  useEffect(() => {
    const i = projects.findIndex((p) => p._id === project._id)
    if (i >= 0) setActiveIndex(i)
  }, [project._id, projects, setActiveIndex])

  // current = the last image whose top has passed the middle of the screen
  useEffect(() => {
    const onScroll = () => {
      const mid = window.innerHeight / 2
      let i = 0
      frames.current.forEach((el, k) => {
        if (el && el.getBoundingClientRect().top <= mid) i = k
      })
      // scrolled all the way down → the last one, even if it's short
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      setCurrent(atBottom && window.scrollY > 0 ? frames.current.length - 1 : i)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // images below the screen wait hidden, and fade in the first time they scroll into view.
  // (Hidden only by this script, so if anything goes wrong the images simply show.)
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.remove('is-waiting')
            io.unobserve(e.target) // only once
          } else {
            e.target.classList.add('is-waiting')
          }
        }),
      { rootMargin: '0px 0px -10% 0px' } // starts when it's 10% into the screen
    )
    frames.current.forEach((el) => el && io.observe(el))
    return () => {
      io.disconnect()
      frames.current.forEach((el) => el?.classList.remove('is-waiting'))
    }
  }, [media.length])

  const goTo = (i: number) => {
    const el = frames.current[i]
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' })
  }

  const caption = media[current]?.caption

  return (
    <main className="detail grid">
      <div className="side side--fixed">
        <TopRow />
          <div className="side__row detail__meta">
            <h1 className="detail__title">{project.title}</h1>
            {media.length > 1 && (
              <nav className="detail__pages" aria-label="Images">
                {media.map((m, i) => (
                  <button key={m._key} type="button" className="pick" aria-current={i === current} onClick={() => goTo(i)}>
                    {i + 1}
                  </button>
                ))}
              </nav>
            )}
            {caption && <p className="detail__caption">{caption}</p>}
          </div>
      </div>

      <div className="detail__media">
        {media.map((m, i) => (
          <div
            key={m._key}
            className="detail__frame"
            ref={(el) => {
              frames.current[i] = el
            }}
          >
            <Shot item={m} eager={i === 0} />
          </div>
        ))}
      </div>

      <Link href="/" className="jump jump--fixed">
        <span>Go Back</span>
      </Link>
    </main>
  )
}
