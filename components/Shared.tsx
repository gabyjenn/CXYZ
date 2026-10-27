'use client'

/** Small pieces used on more than one page. */
import Link from 'next/link'
import type { MediaItem } from '@/sanity/types'
import { useProjects } from './ProjectContext'
import { MediaView, aspectOf } from './Media'

/** Row 1: "CXYZ" (home link) + "World", which opens/closes Picture World. On phones: CXYZ left, World right. */
export function TopRow() {
  const { world, setWorld } = useProjects()
  return (
    <div className="side__row top-row">
      <Link href="/" className="side__label logo" aria-current={!world} onClick={() => setWorld(false)}>
        CXYZ
      </Link>
      <div className="side__content">
        <button type="button" className="world-toggle" aria-pressed={world} onClick={() => setWorld(!world)}>
          World
        </button>
      </div>
    </div>
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
 * PDFs aren't shown on the page: just a download link.
 */
export function Shot({ item, eager }: { item: MediaItem; eager?: boolean }) {
  if (item._type === 'pdfItem') {
    return item.fileUrl ? (
      <a className="shot-download" href={`${item.fileUrl}?dl=`} download>
        Download PDF{item.caption ? `: ${item.caption}` : ''}
      </a>
    ) : null
  }
  return (
    <div className="shot" style={{ '--ar': aspectOf(item) } as React.CSSProperties}>
      <MediaView item={item} eager={eager} />
    </div>
  )
}
