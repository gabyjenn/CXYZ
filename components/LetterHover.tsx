'use client'

/**
 * Hovering any C, X, Y or Z in the site's text plays that letter's
 * dotted-line animation across the whole viewport.
 *
 * Phones (no hover):
 *  - tapping a C/X/Y/Z in the text plays it (links still work as normal)
 *  - after IDLE_MS without touching or scrolling, letters start drawing on their
 *    own (picked from the C/X/Y/Z letters visible on screen), one every
 *    REPEAT_MS, until the screen is touched again
 *  - neither happens inside Picture World, where touches aim and shoot the ball
 *
 * No markup changes: on mouse move we ask the browser which character is
 * under the pointer (caretPositionFromPoint), check the pointer is really
 * on that character's box, and fire once per character entered.
 */
import { useEffect, useRef } from 'react'
import { useProjects, TRANSITION_MS } from './ProjectContext'
import { LetterTransition } from './LetterTransition'

/** Phones: quiet time before letters start drawing on their own, and the gap between them. */
const IDLE_MS = 8000
const REPEAT_MS = 4000

/** Which characters trigger which letter. Make it /[CXYZ]/ for capitals only. */
const MATCH = /[CXYZcxyz]/
const INDEX: Record<string, number> = { c: 0, x: 1, y: 2, z: 3 }

type Hit = { node: Text; offset: number }

function caretAt(x: number, y: number): Hit | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y)
    return p && p.offsetNode.nodeType === Node.TEXT_NODE ? { node: p.offsetNode as Text, offset: p.offset } : null
  }
  if (d.caretRangeFromPoint) {
    const r = d.caretRangeFromPoint(x, y)
    return r && r.startContainer.nodeType === Node.TEXT_NODE ? { node: r.startContainer as Text, offset: r.startOffset } : null
  }
  return null
}

/** The trigger character actually under (x, y), if any. */
function letterAt(x: number, y: number): (Hit & { letter: number }) | null {
  const hit = caretAt(x, y)
  if (!hit) return null
  const text = hit.node.data
  const range = document.createRange()
  // the caret lands between characters, so check the one on each side
  for (const off of [hit.offset, hit.offset - 1]) {
    if (off < 0 || off >= text.length || !MATCH.test(text[off])) continue
    range.setStart(hit.node, off)
    range.setEnd(hit.node, off + 1)
    for (const r of range.getClientRects()) {
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return { node: hit.node, offset: off, letter: INDEX[text[off].toLowerCase()] }
      }
    }
  }
  return null
}

/** The C/X/Y/Z letters (0–3) in text that's currently on screen. */
function visibleLetters(): number[] {
  const found = new Set<number>()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let n = walker.nextNode(); n && found.size < 4; n = walker.nextNode()) {
    const text = (n as Text).data
    if (!MATCH.test(text)) continue
    range.selectNodeContents(n)
    const r = range.getBoundingClientRect()
    if (r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth || !r.width) continue
    for (const ch of text) if (MATCH.test(ch)) found.add(INDEX[ch.toLowerCase()])
  }
  return [...found]
}

export function LetterHover() {
  const { playLetter, letterPreview, world } = useProjects()
  const worldRef = useRef(world)
  worldRef.current = world

  // phones: tap a letter, or wait and they draw on their own
  useEffect(() => {
    if (window.matchMedia('(hover: hover)').matches) return // has a mouse: hover handles it
    let idle = 0
    let repeat = 0
    let down: { x: number; y: number; t: number } | null = null

    const drawSomething = () => {
      if (!worldRef.current && document.visibilityState === 'visible') {
        const letters = visibleLetters()
        const pool = letters.length ? letters : [0, 1, 2, 3]
        playLetter(pool[Math.floor(Math.random() * pool.length)])
      }
      repeat = window.setTimeout(drawSomething, REPEAT_MS)
    }
    const wake = () => {
      clearTimeout(idle)
      clearTimeout(repeat)
      idle = window.setTimeout(drawSomething, IDLE_MS)
    }
    const onDown = (e: PointerEvent) => {
      wake()
      down = { x: e.clientX, y: e.clientY, t: Date.now() }
    }
    const onUp = (e: PointerEvent) => {
      // a light tap (not a scroll or a long press) on a C/X/Y/Z draws it
      if (!down || worldRef.current) return
      const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10 && Date.now() - down.t < 500
      down = null
      if (!tap) return
      const hit = letterAt(e.clientX, e.clientY)
      if (hit) playLetter(hit.letter)
    }

    wake()
    document.addEventListener('pointerdown', onDown, { passive: true })
    document.addEventListener('pointerup', onUp, { passive: true })
    window.addEventListener('scroll', wake, { passive: true })
    return () => {
      clearTimeout(idle)
      clearTimeout(repeat)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerup', onUp)
      window.removeEventListener('scroll', wake)
    }
  }, [playLetter])

  useEffect(() => {
    if (!window.matchMedia('(hover: hover)').matches) return // touch screens: no hover
    let last: Hit | null = null
    let raf = 0
    let px = 0
    let py = 0
    const check = () => {
      raf = 0
      const hit = letterAt(px, py)
      if (!hit) {
        last = null
        return
      }
      // fire once when the pointer enters a new character, not on every move
      if (last && last.node === hit.node && last.offset === hit.offset) return
      last = hit
      playLetter(hit.letter)
    }
    const onMove = (e: MouseEvent) => {
      px = e.clientX
      py = e.clientY
      if (!raf) raf = requestAnimationFrame(check)
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [playLetter])

  // the drawing: fixed over the viewport (letter stretched to it, 20px in)
  return letterPreview ? (
    <div className="letter-overlay" aria-hidden key={letterPreview.id}>
      <LetterTransition index={letterPreview.index} duration={TRANSITION_MS} />
    </div>
  ) : null
}
