import type { Metadata } from 'next'
import './globals.css'
import { sanityFetch } from '@/sanity/client'
import { PROJECTS_QUERY, SETTINGS_QUERY } from '@/sanity/queries'
import type { Project, Settings } from '@/sanity/types'
import { ProjectProvider } from '@/components/ProjectContext'
import { PictureWorld } from '@/components/PictureWorld'
import { LetterHover } from '@/components/LetterHover'
import { Intro } from '@/components/Intro'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await sanityFetch<Settings>(SETTINGS_QUERY, {})
  return { title: settings.siteTitle || 'Portfolio' }
}

/** Shared by the home page and every project page. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, projects] = await Promise.all([
    sanityFetch<Settings>(SETTINGS_QUERY, {}),
    sanityFetch<Project[]>(PROJECTS_QUERY, []),
  ])
  return (
    <div className="site" data-theme={settings.theme || 'light'}>
      <ProjectProvider projects={projects}>
        {children}
        <PictureWorld />
        <LetterHover />
        <Intro />
      </ProjectProvider>
    </div>
  )
}
