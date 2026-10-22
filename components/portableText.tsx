import type { PortableTextComponents } from '@portabletext/react'

export const ptComponents: PortableTextComponents = {
  marks: {
    link: ({ value, children }) => (
      <a href={value?.href} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
        {children}
      </a>
    ),
  },
}
