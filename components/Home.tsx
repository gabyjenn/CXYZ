'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { MediaItem, Settings } from '@/sanity/types'
import { useProjects } from './ProjectContext'
import { Shot, TopRow, setThemeColor, siteBg } from './Shared'
import { QuestionPop } from './QuestionPop'
import { useRouter } from 'next/navigation'

export function Home({ settings }: { settings: Settings }) {
  const { projects, activeIndex, setActiveIndex } = useProjects()
  const router = useRouter()
  const active = projects[activeIndex]
  const jumpRef = useRef<HTMLButtonElement>(null)
  const [down, setDown] = useState(false)

  // home always uses the site's default colours (black), even if a project page
  // with its own background colour didn't get to undo it on the way out
  useEffect(() => {
    const site = document.querySelector<HTMLElement>('.site')
    ;['--bg', '--fg', '--muted'].forEach((k) => site?.style.removeProperty(k))
    document.documentElement.style.background = ''
    setThemeColor(siteBg()) // phone browser's top bar back to black
  }, [])
  // a random image from the active project, picked in the browser, so every visit
  // (and every click on a project title) can show a different one
  const [pick, setPick] = useState<number | null>(null)
  useEffect(() => {
    setPick(Math.random())
  }, [active?._id])
  const images = active?.media?.filter((m) => m._type === 'imageItem' && m.image?.asset) ?? []
  const first: MediaItem | undefined =
    !active || pick === null
      ? undefined
      : images[Math.floor(pick * images.length)] ??
        active.media?.find((m) => m._type === 'videoItem') ??
        (active.thumbnail?.asset
          ? { _key: 'thumb', _type: 'imageItem', image: { ...active.thumbnail, dimensions: { width: 0, height: 0, aspectRatio: active.thumbnailAr } } }
          : undefined)
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
                    onClick={() => (i === activeIndex ? router.push(`/projects/${p.slug}`) : setActiveIndex(i))}
                  >
                    {p.title}
                  </button>
                  {i === activeIndex && (
                    <Link href={`/projects/${p.slug}`} className="see-more">
                      +
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
          <Shot key={first._key} item={first} eager />
        </Link>
      )}

      <button type="button" ref={jumpRef} className="jump" onClick={jump}>
        <span>{down ? 'Back to Top' : 'About'}</span>
      </button>
      {!!settings.questions?.length && <QuestionPop questions={settings.questions} thanks={settings.questionThanks} />}
    </section>
  )
}
