'use client'

import { useEffect, useRef, useState } from 'react'
import { PortableText } from '@portabletext/react'
import type { LogEntry, Project } from '@/sanity/types'
import { formatLogDate } from '@/lib/format'
import { useProjects } from './ProjectContext'
import { ptComponents } from './portableText'

type Panel = 'projects' | 'log' | null

const projectLabel = (p: Project) =>
  `${p.title}${p.titleZh ? ` ${p.titleZh}` : ''}${p.year ? ` (${p.year})` : ''}`

export function Nav({ log, portfolioPdfUrl }: { log: LogEntry[]; portfolioPdfUrl?: string }) {
  const { projects, projectIndex, goToProject } = useProjects()
  const [open, setOpen] = useState<Panel>(null)
  const [pinned, setPinned] = useState(false) // opened by click → stays open until clicked away
  const ref = useRef<HTMLElement>(null)

  const close = () => {
    setOpen(null)
    setPinned(false)
  }

  // close on outside click / Esc
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const canHover = () => window.matchMedia('(hover: hover)').matches
  const enter = (p: Panel) => () => {
    if (!pinned && canHover()) setOpen(p)
  }
  const leave = () => {
    if (!pinned) setOpen(null)
  }
  const toggle = (p: Panel) => () => {
    if (open === p && pinned) close()
    else {
      setOpen(p)
      setPinned(true)
    }
  }

  const current = projects[projectIndex]
  const latest = log[0]

  return (
    <header ref={ref} className="nav module grid">
      <a
        className="nav__logo"
        href="/"
        onClick={(e) => {
          e.preventDefault()
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        aria-label="Home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="nav__logo-mark" aria-hidden />
      </a>

      {/* ── Projects: label + current project, list opens in place ── */}
      <div className="navcol navcol--projects" onMouseEnter={enter('projects')} onMouseLeave={leave}>
        <button
          className="navcol__head"
          aria-expanded={open === 'projects'}
          aria-controls="nav-projects"
          onClick={toggle('projects')}
        >
          Projects
        </button>
        <button className="navcol__sub" onClick={toggle('projects')} tabIndex={-1}>
          {current ? `${projectLabel(current)} ↓` : '—'}
        </button>

        {open === 'projects' && (
          <ul id="nav-projects" className="navmenu">
                        {/* current project first (sits exactly on the displayed title), then the rest — no repeat */}
            {(projects.length ? [projectIndex, ...projects.map((_, i) => i).filter((i) => i !== projectIndex)] : []).map((i) => {
              const p = projects[i]
              return (
                <li key={p._id}>
                  <button
                    className="navmenu__item"
                    aria-current={i === projectIndex}
                    onClick={() => {
                      if (i !== projectIndex) goToProject(i)
                      close()
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    {projectLabel(p)}
                    {i === projectIndex && ' ↓'}
                  </button>
                </li>
              )
            })}
            {portfolioPdfUrl && (
              <li>
                <a className="navmenu__item" href={portfolioPdfUrl} target="_blank" rel="noreferrer">
                  PDF Portfolio
                </a>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* ── Log: label + latest date, entries open in place ── */}
      <div className="navcol navcol--log" onMouseEnter={enter('log')} onMouseLeave={leave}>
        <button className="navcol__head" aria-expanded={open === 'log'} aria-controls="nav-log" onClick={toggle('log')}>
          Log
        </button>
        <button className="navcol__sub" onClick={toggle('log')} tabIndex={-1}>
          {latest ? formatLogDate(latest.date, latest.showTime) : '—'}
        </button>

        {open === 'log' && log.length > 0 && (
          <ul id="nav-log" className="navmenu navmenu--log">
            {log.map((entry) => (
              <li key={entry._id} className="navmenu__item">
                <time className="navmenu__date" dateTime={entry.date}>
                  {formatLogDate(entry.date, entry.showTime)}
                </time>
                <div className="navmenu__text">
                  <PortableText value={entry.text} components={ptComponents} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  )
}
