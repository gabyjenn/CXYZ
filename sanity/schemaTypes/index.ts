import { imageItem, pdfItem, videoItem } from './media'
import { project } from './project'
import { cvEntry, information } from './information'
import { logEntry } from './log'
import { newsItem } from './news'
import { siteSettings } from './siteSettings'

export const schemaTypes = [
  // objects
  imageItem,
  videoItem,
  pdfItem,
  cvEntry,
  // documents
  project,
  information,
  logEntry,
  newsItem,
  siteSettings,
]

export const singletonTypes = new Set(['information', 'siteSettings'])
