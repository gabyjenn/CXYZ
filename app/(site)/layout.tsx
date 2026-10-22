import type { Metadata } from 'next'
import './globals.css'
import { sanityFetch } from '@/sanity/client'
import { SETTINGS_QUERY } from '@/sanity/queries'
import type { Settings } from '@/sanity/types'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await sanityFetch<Settings>(SETTINGS_QUERY, {})
  return { title: settings.siteTitle || 'Portfolio' }
}

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await sanityFetch<Settings>(SETTINGS_QUERY, {})
  return (
    <div className="site" data-theme={settings.theme || 'light'}>
      {children}
    </div>
  )
}
