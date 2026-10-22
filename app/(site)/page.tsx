import { sanityFetch } from '@/sanity/client'
import { INFORMATION_QUERY, LOG_QUERY, NEWS_QUERY, PROJECTS_QUERY, SETTINGS_QUERY } from '@/sanity/queries'
import type { Information, LogEntry, NewsItem, Project, Settings } from '@/sanity/types'
import { ProjectProvider } from '@/components/ProjectContext'
import { Nav } from '@/components/Nav'
import { Carousel } from '@/components/Carousel'
import { InformationModule } from '@/components/Information'
import { Footer } from '@/components/Footer'
import { LetterHover } from '@/components/LetterHover'

/**
 * Studio value is in SECONDS (default 30). 0 = autoplay off.
 * Anything under 3 s is raised to 3 s so a typo can't make it flicker.
 */
function slideshowMs(seconds: number | undefined) {
  const s = seconds ?? 30
  if (s <= 0) return 0
  return Math.max(s, 3) * 1000
}

export default async function Home() {
  const [projects, information, log, news, settings] = await Promise.all([
    sanityFetch<Project[]>(PROJECTS_QUERY, []),
    sanityFetch<Information>(INFORMATION_QUERY, {}),
    sanityFetch<LogEntry[]>(LOG_QUERY, []),
    sanityFetch<NewsItem[]>(NEWS_QUERY, []),
    sanityFetch<Settings>(SETTINGS_QUERY, {}),
  ])

  return (
    <ProjectProvider projects={projects}>
      <Nav log={log} portfolioPdfUrl={settings.portfolioPdfUrl} />
      <main>
        <Carousel interval={slideshowMs(settings.carouselInterval)} />
        <InformationModule information={information} settings={settings} news={news} />
      </main>
      <Footer settings={settings} />
      <LetterHover />
    </ProjectProvider>
  )
}
