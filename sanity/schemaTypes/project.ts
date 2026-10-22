import { defineArrayMember, defineField, defineType } from 'sanity'

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  orderings: [
    { title: 'Manual order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
    { title: 'Year, newest', name: 'yearDesc', by: [{ field: 'year', direction: 'desc' }] },
  ],
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
      description: 'Lower numbers show first in the Projects menu and carousel.',
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      description:
        'Images, videos and PDFs, in slideshow order. The first image becomes the project thumbnail.',
      of: [
        defineArrayMember({ type: 'imageItem' }),
        defineArrayMember({ type: 'videoItem' }),
        defineArrayMember({ type: 'pdfItem' }),
      ],
      validation: (r) => r.min(1).warning('Add at least one media item'),
    }),
    defineField({
      name: 'thumbnailOverride',
      title: 'Thumbnail override (optional)',
      type: 'image',
      description: 'Leave empty to use the first image automatically.',
    }),
  ],
  preview: {
    select: { title: 'title', year: 'year', media: 'media.0.image' },
    prepare: ({ title, year, media }) => ({ title, subtitle: year ? String(year) : '', media }),
  },
})
