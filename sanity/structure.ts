import type { StructureResolver } from 'sanity/structure'
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list'

const singleton = (S: Parameters<StructureResolver>[0], type: string, title: string) =>
  S.listItem().title(title).id(type).child(S.document().schemaType(type).documentId(type).title(title))

export const structure: StructureResolver = (S, context) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('project').title('Projects'),
      singleton(S, 'information', 'Information'),
      S.documentTypeListItem('logEntry').title('Log'),
            // drag items up and down to set the order on the site
      orderableDocumentListDeskItem({ type: 'newsItem', title: 'News', S, context }),
      S.divider(),
      singleton(S, 'siteSettings', 'Footer & Settings'),
    ])
