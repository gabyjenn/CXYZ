'use client'

import { useEffect, useState } from 'react'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function QuestionModule({ questions, thanks = 'Thank you.' }: { questions: string[]; thanks?: string }) {
  // Pick one at random in the browser, so every visit can get a different
  // question (the page itself is cached and identical for everyone).
  const [question, setQuestion] = useState<string | null>(null)
  useEffect(() => {
    setQuestion(questions[Math.floor(Math.random() * questions.length)])
  }, [questions])

  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!answer.trim()) return
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
    } catch {
      setStatus('error')
    }
  }

  return (
    <form className="question" onSubmit={onSubmit} data-pool-solid>
      {/* first question as a placeholder until the random pick (invisible, so no flash) */}
      <label htmlFor="q-answer" className="question__label" style={question ? undefined : { visibility: 'hidden' }}>
        {question ?? questions[0]}
      </label>
      <textarea
        id="q-answer"
        className="question__field"
        value={answer}
        onChange={(e) => {
          setAnswer(e.target.value)
          if (status !== 'sending') setStatus('idle')
        }}
        maxLength={5000}
        required
      />
      <input className="question__hp" name="website" tabIndex={-1} autoComplete="off" aria-hidden />
      <button type="submit" className="question__submit" disabled={status === 'sending' || !answer.trim()}>
        {status === 'sending' ? 'Sending…' : 'Submit'}
      </button>
      <p className="question__status" role="status">
        {status === 'sent' && thanks}
        {status === 'error' && 'Something went wrong. Please try again.'}
      </p>
    </form>
  )
}
