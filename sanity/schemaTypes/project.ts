import { defineArrayMember, defineField, defineType } from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  orderings: [
    { title: 'Manual order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
    { title: 'Year, newest', name: 'yearDesc', by: [{ field: 'year', direction: 'desc' }] },
  ],
  fieldsets: [{ name: 'world', title: 'Picture World', options: { collapsible: true, collapsed: true, columns: 2 } }],
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'titleZh',
      title: 'Title (Chinese, optional)',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'year', title: 'Year (optional)', type: 'number' }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower numbers show first in the Projects list.',
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      description:
        'Images, videos and PDFs, in order. The first image is shown on the home page.',
      of: [
        defineArrayMember({ type: 'imageItem' }),
        defineArrayMember({ type: 'videoItem' }),
        defineArrayMember({ type: 'pdfItem' }),
      ],
      validation: (r) => r.min(1).warning('Add at least one media item'),
    }),
    defineField({
      name: 'backgroundColor',
      title: 'Project page background (optional)',
      type: 'color',
      description: 'Background of this project’s page. Text turns black or white automatically to stay readable. Leave empty for the site default.',
      options: { disableAlpha: true },
    }),
    defineField({
      name: 'worldX',
      title: 'Picture World position: across (0–100)',
      type: 'number',
      fieldset: 'world',
      description: '0 = left edge, 100 = right edge. Leave both empty to place it automatically.',
      validation: (r) => r.min(0).max(100),
    }),
    defineField({
      name: 'worldY',
      title: 'Picture World position: down (0–100)',
      type: 'number',
      fieldset: 'world',
      description: '0 = top, 100 = bottom.',
      validation: (r) => r.min(0).max(100),
    }),
    defineField({
      name: 'thumbnailOverride',
      title: 'Thumbnail override (optional)',
      type: 'image',
      description: 'Leave empty to use the first image automatically (home page image).',
    }),
  ],
  preview: {
    select: { title: 'title', year: 'year', media: 'media.0.image' },
    prepare: ({ title, year, media }) => ({ title, subtitle: year ? String(year) : '', media }),
  },
})
