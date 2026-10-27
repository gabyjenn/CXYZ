'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { MediaItem, Settings } from '@/sanity/types'
import { useProjects } from './ProjectContext'
import { Shot, TopRow } from './Shared'
import { QuestionPop } from './QuestionPop'

export function Home({ settings }: { settings: Settings }) {
  const { projects, activeIndex, setActiveIndex } = useProjects()
  const active = projects[activeIndex]
  const jumpRef = useRef<HTMLButtonElement>(null)
  const [down, setDown] = useState(false)

  // the project's first image (exactly as on its project page); falls back to its first video,
  // then to the thumbnail override
  const first: MediaItem | undefined = active
    ? active.media?.find((m) => m._type === 'imageItem' && m.image?.asset) ??
      active.media?.find((m) => m._type === 'videoItem') ??
      (active.thumbnail?.asset
        ? { _key: 'thumb', _type: 'imageItem', image: { ...active.thumbnail, dimensions: { width: 0, height: 0, aspectRatio: active.thumbnailAr } } }
        : undefined)
    : undefined

  // "Read More" ↔ "Back to Top": flips once the first screen is half scrolled away
  useEffect(() => {
    const onScroll = () => setDown(window.scrollY > window.innerHeight / 2)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const jump = () => {
    if (down) return window.scrollTo({ top: 0, behavior: 'smooth' })
    const el = jumpRef.current
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 20, behavior: 'smooth' })
  }

  return (
    <section className="hero grid">
      <div className="side">
        <TopRow />

        {projects.length > 0 && (
          <div className="side__row">
            <h2 className="side__label">Projects</h2>
            <ul className="side__content side__list">
              {projects.map((p, i) => (
                <li key={p._id} className="project-line">
                  <button
                    type="button"
                    className="pick"
                    aria-current={i === activeIndex}
                    onClick={() => setActiveIndex(i)}
                  >
                    {p.title}
                  </button>
                  {i === activeIndex && (
                    <Link href={`/projects/${p.slug}`} className="see-more">
                      See More
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="side__row">
          <h2 className="side__label">Contact</h2>
          <ul className="side__content side__list">
            {settings.email && (
              <li>
                <a href={`mailto:${settings.email}`}>{settings.email}</a>
              </li>
            )}
            {settings.instagram && (
              <li>
                <a href={settings.instagram} target="_blank" rel="noreferrer">
                  Instagram
                </a>
              </li>
            )}
            {settings.substack && (
              <li>
                <a href={settings.substack} target="_blank" rel="noreferrer">
                  Substack
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      {active && first && (
        <Link href={`/projects/${active.slug}`} className="hero__media" aria-label={`${active.title}: see more`}>
          <Shot key={active._id} item={first} eager />
        </Link>
      )}

      <button type="button" ref={jumpRef} className="jump" onClick={jump}>
        <span>{down ? 'Back to Top' : 'About'}</span>
      </button>
      {!!settings.questions?.length && <QuestionPop questions={settings.questions} thanks={settings.questionThanks} />}
    </section>
  )
}
