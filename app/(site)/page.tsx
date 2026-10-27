import { sanityFetch } from '@/sanity/client'
import { INFORMATION_QUERY, LOG_QUERY, NEWS_QUERY, SETTINGS_QUERY } from '@/sanity/queries'
import type { Information, LogEntry, NewsItem, Settings } from '@/sanity/types'
import { Home } from '@/components/Home'
import { More } from '@/components/More'

export default async function HomePage() {
  const [information, log, news, settings] = await Promise.all([
    sanityFetch<Information>(INFORMATION_QUERY, {}),
    sanityFetch<LogEntry[]>(LOG_QUERY, []),
    sanityFetch<NewsItem[]>(NEWS_QUERY, []),
    sanityFetch<Settings>(SETTINGS_QUERY, {}),
  ])

  return (
    <main className="home">
      <Home settings={settings} />
      <More information={information} news={news} log={log} settings={settings} />
    </main>
  )
}
