'use client'

/**
 * Site-wide state, shared by every page (it lives in the layout, so it
 * survives moving between the home page and project pages):
 *  - which project is active (home image, highlighted title)
 *  - Picture World on/off
 *  - the C/X/Y/Z hover drawing
 */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { Project } from '@/sanity/types'

/** Length of the letter drawing played when hovering a C/X/Y/Z, in ms. */
export const TRANSITION_MS = 2000

type Ctx = {
  projects: Project[]
  activeIndex: number
  setActiveIndex: (index: number) => void
  world: boolean
  setWorld: (open: boolean) => void
  /** letter animation triggered by hovering a C/X/Y/Z in the text (0 C, 1 X, 2 Y, 3 Z); id restarts it */
  letterPreview: { index: number; id: number } | null
  playLetter: (index: number) => void
}

const ProjectContext = createContext<Ctx | null>(null)

export function useProjects() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProjects must be used inside <ProjectProvider>')
  return ctx
}

export function ProjectProvider({ projects, children }: { projects: Project[]; children: React.ReactNode }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [world, setWorld] = useState(false)

  const [letterPreview, setLetterPreview] = useState<{ index: number; id: number } | null>(null)
  const previewTimer = useRef<number>(0)
  const playLetter = useCallback((index: number) => {
    const id = Date.now()
    setLetterPreview({ index, id })
    clearTimeout(previewTimer.current)
    previewTimer.current = window.setTimeout(() => setLetterPreview((p) => (p?.id === id ? null : p)), TRANSITION_MS)
  }, [])

  return (
    <ProjectContext.Provider value={{ projects, activeIndex, setActiveIndex, world, setWorld, letterPreview, playLetter }}>
      {children}
    </ProjectContext.Provider>
  )
}
