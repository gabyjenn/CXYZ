import { defineField, defineType } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Footer & Settings',
  type: 'document',
  groups: [
    { name: 'footer', title: 'Footer', default: true },
    { name: 'question', title: 'Question module' },
    { name: 'site', title: 'Site' },
  ],
  fields: [
    defineField({ name: 'siteTitle', type: 'string', group: 'site', initialValue: 'Portfolio' }),
    defineField({
      name: 'theme',
      title: 'Color scheme',
      type: 'string',
      group: 'site',
      options: {
        list: [
          { title: 'White background, black text', value: 'light' },
          { title: 'Black background, white text', value: 'dark' },
        ],
        layout: 'radio',
      },
      initialValue: 'light',
    }),
    defineField({
      name: 'carouselInterval',
      title: 'Slideshow interval (seconds)',
      type: 'number',
      group: 'site',
      description: 'Seconds between slides. Empty = 30. Set 0 to turn the slideshow off.',
      initialValue: 30,
      validation: (r) => r.min(0).max(600),
    }),
    defineField({
      name: 'copyright',
      title: 'Copyright name',
      type: 'string',
      group: 'footer',
      description: 'Rendered as “© 2026 Name”',
    }),
    defineField({ name: 'email', type: 'string', group: 'footer', validation: (r) => r.email() }),
    defineField({ name: 'instagram', title: 'Instagram URL', type: 'url', group: 'footer' }),
    defineField({ name: 'substack', title: 'Substack subscribe URL', type: 'url', group: 'footer' }),
    defineField({
      name: 'portfolioPdf',
      title: 'Portfolio PDF (optional)',
      type: 'file',
      group: 'footer',
      options: { accept: 'application/pdf' },
    }),
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      group: 'question',
      description: 'Leave empty to hide the module.',
    }),
    defineField({
      name: 'questionThanks',
      title: 'Thank-you message',
      type: 'string',
      group: 'question',
      initialValue: 'Thank you.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Footer & Settings' }) },
})
