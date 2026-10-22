import { NextResponse } from 'next/server'

/**
 * Receives Question Module answers and appends them to Google Sheets
 * through a Google Apps Script web app (see google-apps-script/Code.gs).
 * The webhook URL + secret stay server-side.
 */
export async function POST(req: Request) {
  let body: { question?: unknown; answer?: unknown; website?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  // honeypot: bots fill hidden fields — pretend success, store nothing
  if (body.website) return NextResponse.json({ ok: true })

  const answer = typeof body.answer === 'string' ? body.answer.trim().slice(0, 5000) : ''
  const question = typeof body.question === 'string' ? body.question.slice(0, 500) : ''
  if (!answer) return NextResponse.json({ error: 'Empty answer' }, { status: 400 })

  const url = process.env.GOOGLE_SHEETS_WEBHOOK_URL
  if (!url) {
    console.error('[question] GOOGLE_SHEETS_WEBHOOK_URL is not set')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      // text/plain avoids a CORS preflight on Apps Script; body is still JSON
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret: process.env.GOOGLE_SHEETS_SECRET,
        question,
        answer,
        submittedAt: new Date().toISOString(),
      }),
      redirect: 'follow',
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.ok) throw new Error(`Sheets responded ${res.status}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[question]', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 502 })
  }
}
