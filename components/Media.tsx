'use client'

import { urlFor } from '@/sanity/client'
import type { MediaItem, SanityImage } from '@/sanity/types'

const WIDTHS = [480, 800, 1200, 1600, 2400]

export function SanityImg({ image, sizes, alt, eager }: { image: SanityImage; sizes: string; alt?: string; eager?: boolean }) {
  if (!image?.asset) return null
  const src = urlFor(image).width(1600).url()
  const srcSet = WIDTHS.map((w) => `${urlFor(image).width(w).url()} ${w}w`).join(', ')
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt ?? image.alt ?? ''}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={image.lqip ? { backgroundImage: `url(${image.lqip})` } : undefined}
    />
  )
}

/** Aspect ratio used to size the frame for each media type. */
export function aspectOf(item: MediaItem): number {
  if (item._type === 'imageItem') return item.image?.dimensions?.aspectRatio ?? 1.5
  if (item._type === 'videoItem') return 16 / 9
  return 1 / Math.SQRT2 // PDF ≈ A4 portrait
}

function toEmbed(url: string) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1&muted=1&loop=1`
  return url
}

/**
 * How a video behaves:
 *  'controls' (default) — doesn't play by itself; the browser's play/pause, sound, timeline
 *                         and full-screen controls are shown
 *  'ambient'            — plays silently on a loop with no controls (home page background)
 *  'still'              — just the first frame / poster (grid thumbnails)
 */
export type VideoMode = 'controls' | 'ambient' | 'still'

export function MediaView({ item, eager, video = 'controls' }: { item: MediaItem; eager?: boolean; video?: VideoMode }) {
  switch (item._type) {
    case 'imageItem':
      return <SanityImg image={item.image} sizes="(max-width: 768px) 100vw, 75vw" eager={eager} />
    case 'videoItem':
      if (item.fileUrl) {
        const poster = item.poster?.asset ? urlFor(item.poster).width(1600).url() : undefined
        if (video === 'ambient')
          return <video src={item.fileUrl} poster={poster} autoPlay muted loop playsInline />
        return (
          <video
            // without a poster, "#t=0.1" makes phones show the first frame instead of a blank box
            src={poster ? item.fileUrl : `${item.fileUrl}#t=0.1`}
            poster={poster}
            controls={video === 'controls'}
            preload="metadata"
            playsInline
          />
        )
      }
      if (item.url)
        return video === 'still' ? (
          <span className="video-still">{item.caption || 'Video'}</span>
        ) : (
          <iframe src={toEmbed(item.url)} allow="autoplay; fullscreen" title={item.caption || 'Video'} />
        )
      return null
    case 'pdfItem':
      return null // PDFs are download links (see Shot in Shared.tsx)
  }
}
