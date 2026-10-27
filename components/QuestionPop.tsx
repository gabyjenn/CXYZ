'use client'

/**
 * Question module on the home image, bottom-right.
 *  Closed: a small circle with an envelope.
 *  Open (click it): spans cols 10–12 —
 *     question ……………………………… (×)
 *     ____________________________ (→)
 *  The envelope circle becomes the submit arrow; × closes. Answers go to Google Sheets
 *  via /api/question (same as before).
 */
import { useEffect, useRef, useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function QuestionPop({ questions, thanks = 'Thank you.' }: { questions: string[]; thanks?: string }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const input = useRef<HTMLInputElement>(null)

  // a random question from the Studio list (picked in the browser, so every visitor gets a different one)
  const pick = (current: string | null) => {
    const others = questions.length > 1 ? questions.filter((q) => q !== current) : questions
    return others[Math.floor(Math.random() * others.length)]
  }
  useEffect(() => {
    setQuestion(pick(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions])

  // every time it opens: a new question, never the same one twice in a row
  const openNew = () => {
    setQuestion((q) => pick(q))
    setStatus('idle')
    setOpen(true)
  }

  // focus the answer line when opening; Esc closes
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => input.current?.focus(), 150)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!open) return openNew()
    if (!answer.trim() || status === 'sending') return
    setStatus('sending')
    const website = new FormData(e.currentTarget).get('website') // honeypot
    try {
      const res = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer, website }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
      setAnswer('')
      // show the thank-you for a moment, then fold back into the Q
      window.setTimeout(() => {
        setOpen(false)
        setStatus('idle')
      }, 2500)
    } catch {
      setStatus('error')
    }
  }

  if (!questions.length) return null

  const line = status === 'sent' ? thanks : status === 'error' ? 'Something went wrong. Try again?' : question

  return (
    <form className={`q${open ? ' is-open' : ''}`} onSubmit={onSubmit}>
      <label htmlFor="q-answer" className="q__text">
        {line}
      </label>
      <button type="button" className="q__circle q__close" aria-label="Close" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
        <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden>
          <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
      </button>
      <input
        ref={input}
        id="q-answer"
        className="q__input"
        value={answer}
        tabIndex={open ? 0 : -1}
        autoComplete="off"
        onChange={(e) => {
          setAnswer(e.target.value)
          if (status === 'error') setStatus('idle')
        }}
      />
      <button
        type="submit"
        className="q__circle q__go"
        aria-label={open ? 'Send answer' : 'Open question'}
        disabled={open && status === 'sending'}
      >
        {open ? (
          <svg width="14" height="12" viewBox="0 0 12 10" aria-hidden>
            <path d="M0 5 H11 M7 1 L11 5 L7 9" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        ) : (
          // pencil
          <svg width="21" height="21" viewBox="0 0 16 16" aria-hidden>
            <path
              d="M1.5 14.5 L3.1 10.4 L12.3 1.2 L14.8 3.7 L5.6 12.9 Z M3.1 10.4 L5.6 12.9 M10.2 3.4 L12.6 5.8"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}
      </button>
      {/* spam trap: hidden from people, bots fill it in */}
      <input className="q__hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
    </form>
  )
}
