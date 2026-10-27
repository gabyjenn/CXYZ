'use client'

import { useEffect } from 'react'
import { useProjects, TRANSITION_MS } from './ProjectContext'
import { LetterTransition } from './LetterTransition'

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

export function LetterHover() {
  const { playLetter, letterPreview } = useProjects()

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
