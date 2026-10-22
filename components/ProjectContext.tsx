'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Project } from '@/sanity/types'

/** Length of the letter drawing played when hovering a C/X/Y/Z, in ms. */
export const TRANSITION_MS = 1800

type Ctx = {
  projects: Project[]
  projectIndex: number
  slideIndex: number
  /** increments on every project change; Carousel uses it to replay the transition + reshuffle thumbnails */
  changeId: number
  transitioning: boolean
  /** letter animation triggered by hovering a C/X/Y/Z in the text (0 C, 1 X, 2 Y, 3 Z) */
  letterPreview: { index: number; id: number } | null
  playLetter: (index: number) => void
  goToProject: (index: number) => void
  goToSlide: (index: number) => void
}

const ProjectContext = createContext<Ctx | null>(null)

export function useProjects() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjects must be used inside <ProjectProvider>')
  return ctx
}

export function ProjectProvider({ projects, children }: { projects: Project[]; children: React.ReactNode }) {
  const [projectIndex, setProjectIndex] = useState(0)
  const [slideIndex, setSlideIndex] = useState(0)
  const [changeId, setChangeId] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const timers = useRef<number[]>([])
  const [letterPreview, setLetterPreview] = useState<{ index: number; id: number } | null>(null)
  const previewTimer = useRef<number>(0)
  const playLetter = useCallback((index: number) => {
    const id = Date.now()
    setLetterPreview({ index, id })
    clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => setLetterPreview((p) => (p?.id === id ? null : p)), TRANSITION_MS)
  }, [])

  // Deep link: /?p=project-slug
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('p')
    const i = slug ? projects.findIndex((p) => p.slug === slug) : -1
    if (i > 0) setProjectIndex(i)
  }, [projects])

  const goToProject = useCallback(
    (index: number) => {
      if (!projects.length) return
      const next = ((index % projects.length) + projects.length) % projects.length
      // switch right away (no letter drawing on project change anymore)
      setChangeId((c) => c + 1)
      setProjectIndex(next)
      setSlideIndex(0)
      const url = new URL(window.location.href)
      url.searchParams.set('p', projects[next].slug)
      window.history.replaceState(null, '', url)
    },
    [projects]
  )

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  return (
    <ProjectContext.Provider
      value={{ projects, projectIndex, slideIndex, changeId, transitioning, goToProject, goToSlide: setSlideIndex, letterPreview, playLetter }}
    >
      {children}
    </ProjectContext.Provider>
  )
}
