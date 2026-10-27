import { defineField, defineType } from 'sanity'
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list'

export const newsItem = defineType({
  name: 'newsItem',
  title: 'News item',
  type: 'document',
  orderings: [orderRankOrdering, { title: 'Date, newest', name: 'dateDesc', by: [{ field: 'startsAt', direction: 'desc' }] }],
  fields: [
    // hidden: the position you set by dragging in Studio → News
    orderRankField({ type: 'newsItem' }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'link', title: 'External link (optional)', type: 'url' }),
    defineField({ name: 'venue', title: 'Location / Venue', type: 'string' }),
    defineField({
      name: 'startsAt',
      title: 'Date & time',
      type: 'datetime',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'endsAt', title: 'End date (optional)', type: 'datetime' }),
    defineField({
      name: 'showTime',
      title: 'Show time',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: { title: 'title', venue: 'venue', startsAt: 'startsAt' },
    prepare: ({ title, venue, startsAt }) => ({
      title,
      subtitle: [startsAt && new Date(startsAt).toLocaleDateString(), venue].filter(Boolean).join(' · '),
    }),
  },
})
