import { defineField, defineType } from 'sanity'

const caption = defineField({
  name: 'caption',
  title: 'Caption',
  type: 'string',
  description: 'Optional. Shown under the frame (placement still TBD in design).',
})

export const imageItem = defineType({
  name: 'imageItem',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      validation: (r) => r.required(),
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),
    caption,
  ],
  preview: {
    select: { media: 'image', title: 'caption' },
    prepare: ({ media, title }) => ({ media, title: title || 'Image' }),
  },
})

export const videoItem = defineType({
  name: 'videoItem',
  title: 'Video',
  type: 'object',
  fields: [
    defineField({
      name: 'file',
      title: 'Video file (mp4/webm)',
      type: 'file',
      options: { accept: 'video/mp4,video/webm' },
    }),
    defineField({
      name: 'url',
      title: 'Or embed URL (Vimeo / YouTube)',
      type: 'url',
    }),
    defineField({ name: 'poster', title: 'Poster image', type: 'image' }),
    caption,
  ],
  validation: (r) =>
    r.custom((v: { file?: unknown; url?: string } | undefined) =>
      v?.file || v?.url ? true : 'Add a video file or an embed URL'
    ),
  preview: {
    select: { media: 'poster', title: 'caption', url: 'url' },
    prepare: ({ media, title, url }) => ({ media, title: title || 'Video', subtitle: url }),
  },
})

export const pdfItem = defineType({
  name: 'pdfItem',
  title: 'PDF',
  type: 'object',
  fields: [
    defineField({
      name: 'file',
      type: 'file',
      options: { accept: 'application/pdf' },
      validation: (r) => r.required(),
    }),
    caption,
  ],
  preview: {
    select: { title: 'caption', file: 'file.asset.originalFilename' },
    prepare: ({ title, file }) => ({ title: title || file || 'PDF', subtitle: 'PDF' }),
  },
})
