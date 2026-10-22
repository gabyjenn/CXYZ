import { defineArrayMember, defineField, defineType } from 'sanity'

export const logEntry = defineType({
  name: 'logEntry',
  title: 'Log entry',
  type: 'document',
  orderings: [{ title: 'Newest', name: 'dateDesc', by: [{ field: 'date', direction: 'desc' }] }],
  fields: [
    defineField({
      name: 'date',
      title: 'Date & time',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'showTime',
      title: 'Show time on site',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'text',
      type: 'array',
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
      validation: (r) => r.required(),
    }),
  ],
  preview: {
    select: { date: 'date', text: 'text' },
    prepare: ({ date, text }) => ({
      title: date ? new Date(date).toLocaleDateString() : 'Undated',
      subtitle: text?.[0]?.children?.map((c: { text: string }) => c.text).join('') ?? '',
    }),
  },
})
