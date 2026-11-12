'use client'

/** Small pieces used on more than one page. */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MediaItem } from '@/sanity/types'
import { useProjects } from './ProjectContext'
import { MediaView, aspectOf } from './Media'

/** Row 1: "CXYZ" (home link) + "WORLD" (opens/closes Picture World) + optional extra in col 3. On phones: CXYZ left, WORLD right. */
export function TopRow({ extra }: { extra?: React.ReactNode }) {
  const { world, setWorld } = useProjects()
  const onHome = usePathname() === '/'
  return (
    <div className="side__row top-row">
      {/* red on the home page only (white on project pages and in Picture World) */}
      <Link href="/" className="side__label logo" aria-current={onHome && !world} onClick={() => setWorld(false)}>
        CXYZ
      </Link>
      <div className="side__content">
        <button
          type="button"
          className="world-toggle"
          aria-pressed={world}
          onClick={() => {
            if (!world) askForTilt() // iPhone: ask for motion access (must happen on a tap)
            setWorld(!world)
          }}
        >
          WORLD
        </button>
      </div>
      {/* optional third cell (project page: the view toggle) */}
      {extra && <div className="top-row__extra">{extra}</div>}
    </div>
  )
}

/**
 * iPhones only share phone tilt after the visitor allows it, and the request has to
 * come from a tap. Other phones (and desktops) don't need this, so it does nothing there.
 */
export function askForTilt() {
  const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } })
    .DeviceOrientationEvent
  if (typeof D?.requestPermission === 'function') D.requestPermission().catch(() => {})
}

/**
 * The colour phone browsers use for their top bar (Safari tints it to match the page).
 * It doesn't follow page changes on its own, so pages set it explicitly.
 */
export function setThemeColor(color: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = color
}

/** The site's own background colour (black in dark mode), ignoring any project colour. */
export function siteBg() {
  const site = document.querySelector<HTMLElement>('.site')
  return (site && getComputedStyle(site).getPropertyValue('--bg').trim()) || '#000'
}

/** Caption text: words wrapped in *asterisks* show in italics, e.g. “Chapel Street, *Queer Lives*, 2024”. */
export function Caption({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        part.length > 2 && part.startsWith('*') && part.endsWith('*') ? <em key={i}>{part.slice(1, -1)}</em> : part
      )}
    </>
  )
}

/** Thin 1px arrow. */
export function Arrow({ dir }: { dir: 'up' | 'down' | 'left' | 'right' }) {
  const rotate = { down: 0, up: 180, left: 90, right: -90 }[dir]
  return (
    <svg className="arrow" width="14" height="20" viewBox="0 0 14 20" aria-hidden style={{ rotate: `${rotate}deg` }}>
      <path d="M7 0 V19 M1 13 L7 19 L13 13" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

/**
 * One image or video, as big as fits in (its column) × (screen height − 40px),
 * keeping its proportions, pushed to the right edge.
 * PDFs aren't shown on the page: just a link that opens them in a new tab.
 */
export function Shot({ item, eager }: { item: MediaItem; eager?: boolean }) {
  if (item._type === 'pdfItem') {
    return item.fileUrl ? (
      <a className="shot-download" href={item.fileUrl} target="_blank" rel="noreferrer">
        View PDF{item.caption && <>: <Caption text={item.caption} /></>}
      </a>
    ) : null
  }
  return (
    <div className="shot" style={{ '--ar': aspectOf(item) } as React.CSSProperties}>
      <MediaView item={item} eager={eager} />
    </div>
  )
}
