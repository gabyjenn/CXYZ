'use client'

/**
 * One letter of the logo (C, X, Y or Z) drawn as a dotted 1px line across
 * whatever box it's placed in (the viewport, via LetterHover).
 *
 * Each letter's corners/line ends come from Logo.svg as fractions of the
 * letter's box (0–1), then get stretched to that box minus a 20px inset,
 * so the letter's proportions follow the box's aspect ratio.
 *
 * Animation (linear): the line draws on during the first half and draws
 * off during the second half.
 */
import { useId, useLayoutEffect, useRef, useState } from 'react'

type Pt = [number, number]

// From Logo.svg. Each array is one continuous stroke.
const LETTERS: Pt[][][] = [
  // C
  [[[1, 0], [0.51, 0], [0, 0.5], [0.508, 1], [1, 1]]],
  // X
  [
    [[0, 0], [1, 1]],
    [[0, 1], [1, 0]],
  ],
  // Y (as drawn in the logo)
  [[[0, 0.048], [0.498, 0.7], [1, 0], [1, 1], [0, 1]]],
  // Z
  [[[0, 0], [1, 0], [0, 1], [1, 1]]],
]

const INSET = 20 // px from the edge

export function LetterTransition({ index, duration }: { index: number; duration: number }) {
  const ref = useRef<SVGSVGElement>(null)
  const maskId = `letter-mask-${useId().replace(/:/g, '')}`
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (parent) setSize({ w: parent.clientWidth, h: parent.clientHeight })
  }, [])

  const letter = LETTERS[((index % 4) + 4) % 4]
  const d = size
    ? letter
        .map((stroke) =>
          stroke
            .map(([x, y], i) => {
              const px = INSET + x * (size.w - 2 * INSET)
              const py = INSET + y * (size.h - 2 * INSET)
              return `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`
            })
            .join(' ')
        )
        .join(' ')
    : ''

  return (
    <svg
      ref={ref}
      className="letter-transition"
      width="100%"
      height="100%"
      viewBox={size ? `0 0 ${size.w} ${size.h}` : undefined}
      aria-hidden
      style={{ '--dur': `${duration}ms` } as React.CSSProperties}
    >
      {size && (
        <>
          <defs>
            {/* a solid line that draws on/off; it reveals the dotted line below */}
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <path d={d} className="letter-transition__reveal" pathLength={1} />
            </mask>
          </defs>
          <path d={d} className="letter-transition__line" mask={`url(#${maskId})`} />
        </>
      )}
    </svg>
  )
}
