'use client'

/**
 * Landing animation: C, X, Y, Z flash up one after another in the centre of
 * the screen (each 80vw wide), then the white cover disappears.
 *
 * It's in the server HTML, so it covers the page from the very first paint
 * (no flash of the site before the intro), and removes itself when done.
 * Timing lives in the CSS (.intro, --intro-step).
 */
import { useState } from 'react'

// files in /public
const LETTERS = ['/c.svg', '/x.svg', '/y.svg', '/z.svg']

export function Intro() {
  const [done, setDone] = useState(false)
  if (done) return null
  return (
    <div
      className="intro"
      aria-hidden
      // the cover's own animation finishing = intro over (ignore the letters' animations ending)
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setDone(true)
      }}
    >
      {LETTERS.map((src, i) => (
        <span
          key={src}
          className="intro__letter"
          style={{ '--i': i, '--src': `url('${src}')` } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
