// Hand-written types matching queries.ts.
// Optional: run `npm run typegen` to generate exact types instead.
import type { PortableTextBlock } from '@portabletext/react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SanityImage = { asset?: { _ref: string }; alt?: string; dimensions?: { width: number; height: number; aspectRatio: number }; lqip?: string; [k: string]: any }

export type MediaItem =
  | { _key: string; _type: 'imageItem'; caption?: string; image: SanityImage }
  | { _key: string; _type: 'videoItem'; caption?: string; url?: string; fileUrl?: string; poster?: SanityImage }
  | { _key: string; _type: 'pdfItem'; caption?: string; fileUrl?: string }

export type Project = {
  _id: string
  title: string
  titleZh?: string
  year?: number
  slug: string
  thumbnail?: SanityImage
  thumbnailAr: number
  media?: MediaItem[]
  background?: string  
  worldX?: number
  worldY?: number
}

export type CvEntry = { _key: string; year: string; text: string; detail?: string; link?: string }

export type CvSectionName =
  | 'awards'
  | 'exhibitions'
  | 'curatorialProjects'
  | 'filmScreenings'
  | 'lectures'
  | 'education'
  | 'bibliography'

export type Information = {
  bio?: PortableTextBlock[]
} & Partial<Record<CvSectionName, CvEntry[]>>

export type LogEntry = { _id: string; date: string; showTime?: boolean; text: PortableTextBlock[] }

export type NewsItem = {
  _id: string
  title: string
  link?: string
  venue?: string
  startsAt: string
  endsAt?: string
  showTime?: boolean
}

export type Settings = {
  siteTitle?: string
  theme?: 'light' | 'dark'
  carouselInterval?: number
  copyright?: string
  email?: string
  instagram?: string
  substack?: string
  portfolioPdfUrl?: string
  cvPdfUrl?: string
  questions?: string[]
  questionThanks?: string
}
