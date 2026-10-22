import { defineQuery } from 'next-sanity'
import { CV_SECTIONS } from '../lib/cvSections'

const media = /* groq */ `
  media[]{
    _key,
    _type,
    caption,
    _type == "imageItem" => {
      "image": image{ ..., "alt": coalesce(alt, ""), "dimensions": asset->metadata.dimensions, "lqip": asset->metadata.lqip }
    },
    _type == "videoItem" => { url, "fileUrl": file.asset->url, poster },
    _type == "pdfItem" => { "fileUrl": file.asset->url }
  }
`

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project" && defined(slug.current)] | order(coalesce(order, 9999) asc, year desc) {
    _id,
    title,
    titleZh,
    year,
    "slug": slug.current,
    // First image in media becomes the thumbnail unless an override is set
    "thumbnail": coalesce(thumbnailOverride, media[_type == "imageItem"][0].image),
    "thumbnailAr": coalesce(
      thumbnailOverride.asset->metadata.dimensions.aspectRatio,
      media[_type == "imageItem"][0].image.asset->metadata.dimensions.aspectRatio,
      1
    ),
    ${media}
  }
`)

export const INFORMATION_QUERY = defineQuery(`
  *[_id == "information"][0]{
    bio,
    ${CV_SECTIONS.map((s) => `"${s.name}": ${s.name}[] | order(year desc)`).join(',\n    ')}
  }
`)

export const LOG_QUERY = defineQuery(`
  *[_type == "logEntry"] | order(date desc) { _id, date, showTime, text }
`)

export const NEWS_QUERY = defineQuery(`
  *[_type == "newsItem"] | order(startsAt desc) { _id, title, link, venue, startsAt, endsAt, showTime }
`)

export const SETTINGS_QUERY = defineQuery(`
  *[_id == "siteSettings"][0]{
    siteTitle, theme, carouselInterval, copyright, email, instagram, substack,
    "portfolioPdfUrl": portfolioPdf.asset->url,
    question,    
    "questions": select(count(questions[defined(@) && @ != ""]) > 0 => questions[defined(@) && @ != ""], defined(question) => [question], []),
    questionThanks
  }
`)
