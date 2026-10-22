import { defineArrayMember, defineField, defineType } from 'sanity'
import { CV_SECTIONS } from '../../lib/cvSections'

/** One CV line: year + text, optional link. */
export const cvEntry = defineType({
  name: 'cvEntry',
  title: 'Entry',
  type: 'object',
  fields: [
    defineField({ name: 'year', type: 'string', description: 'e.g. 2024 or 2022–2024', validation: (r) => r.required() }),
    defineField({ name: 'text', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'detail', title: 'Detail (venue, city…)', type: 'string' }),
    defineField({ name: 'link', type: 'url' }),
  ],
  preview: {
    select: { year: 'year', text: 'text', detail: 'detail' },
    prepare: ({ year, text, detail }) => ({ title: text, subtitle: [year, detail].filter(Boolean).join(' · ') }),
  },
})


export const information = defineType({
  name: 'information',
  title: 'Information',
  type: 'document',
  groups: [
    { name: 'bio', title: 'Bio', default: true },
    { name: 'cv', title: 'CV' },
  ],
  fields: [
    defineField({
      name: 'bio',
      type: 'array',
      group: 'bio',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [{ title: 'Italic', value: 'em' }],
            annotations: [
              { name: 'link', type: 'object', title: 'Link', fields: [{ name: 'href', type: 'url' }] },
            ],
          },
        }),
      ],
    }),
    ...CV_SECTIONS.map((s) =>
      defineField({
        name: s.name,
        title: s.title,
        type: 'array',
        group: 'cv',
        description: 'Sorted by year automatically (newest first).',
        of: [defineArrayMember({ type: 'cvEntry' })],
      })
    ),
  ],
  preview: { prepare: () => ({ title: 'Information' }) },
})
