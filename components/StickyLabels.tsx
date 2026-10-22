'use client'

import { useEffect, useState } from 'react'

/**
 * Information section, while scrolling:
 *  - a full-width white bar with a dotted bottom line sits under the nav from
 *    the moment the section reaches the nav until the section has scrolled
 *    past, regardless of which label is showing (or none)
 *  - any label that starts being pushed up is hidden, so a label never
 *    slides under the nav
 *  - a label only comes in front of the bar once it reaches the pinned spot,
 *    so the next label never covers the line or the current label on its way up
 */
export function StickyLabels({ selector = '.info__label' }: { selector?: string }) {
  const [bar, setBar] = useState<number | null>(null) // bar height in px, null = hidden

  useEffect(() => {
    const labels = Array.from(document.querySelectorAll<HTMLElement>(selector))
    const nav = document.querySelector<HTMLElement>('.nav')
    const section = labels[0]?.closest<HTMLElement>('.info')
    let raf = 0
    const update = () => {
      raf = 0
      const navBottom = nav ? nav.getBoundingClientRect().bottom : 0
      for (const label of labels) {
        const top = label.getBoundingClientRect().top
        label.classList.toggle('is-gone', top < navBottom - 0.5)
        // only a label sitting exactly in the pinned spot comes to the front;
        // one still scrolling up passes under the bar like normal content
        label.classList.toggle('is-pinned', Math.abs(top - navBottom) < 0.5) // exactly in place
      }
      if (!section || !labels.length) return setBar(null)
      // all labels are the same height; round UP so a label at a fractional
      // height (e.g. 38.2px on phones) can never overlap the 1px line
      const height = Math.ceil(labels[0].getBoundingClientRect().height)
      const r = section.getBoundingClientRect()
      // on: the section's top has reached the nav (= first label pins)
      // off: the section's end has come up into the bar
      const on = r.top <= navBottom + 0.5 && r.bottom > navBottom + height
      setBar(on ? height : null)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [selector])

  return bar === null ? null : <div className="sticky-bar" style={{ height: bar + 1 }} aria-hidden />
}
