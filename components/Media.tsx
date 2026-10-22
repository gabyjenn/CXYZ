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

export function MediaView({ item, eager }: { item: MediaItem; eager?: boolean }) {
  switch (item._type) {
    case 'imageItem':
      return <SanityImg image={item.image} sizes="(max-width: 768px) 100vw, 65vw" eager={eager} />
    case 'videoItem':
      if (item.fileUrl)
        return (
          <video
            src={item.fileUrl}
            poster={item.poster?.asset ? urlFor(item.poster).width(1600).url() : undefined}
            autoPlay
            muted
            loop
            playsInline
          />
        )
      if (item.url) return <iframe src={toEmbed(item.url)} allow="autoplay; fullscreen" title={item.caption || 'Video'} />
      return null
    case 'pdfItem':
      return item.fileUrl ? <iframe src={`${item.fileUrl}#view=FitH`} title={item.caption || 'PDF'} /> : null
  }
}
