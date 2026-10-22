import type { StructureResolver } from 'sanity/structure'

const singleton = (S: Parameters<StructureResolver>[0], type: string, title: string) =>
  S.listItem().title(title).id(type).child(S.document().schemaType(type).documentId(type).title(title))

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('project').title('Projects'),
      singleton(S, 'information', 'Information'),
      S.documentTypeListItem('logEntry').title('Log'),
      S.documentTypeListItem('newsItem').title('News'),
      S.divider(),
      singleton(S, 'siteSettings', 'Footer & Settings'),
    ])
