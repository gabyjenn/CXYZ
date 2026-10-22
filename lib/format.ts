// Fixed timezone so server and client render identical dates (no hydration mismatch).
export const TIMEZONE = 'America/New_York'

const parts = (iso: string) => {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour').replace(/^24$/, '00'), min: get('minute') }
}

/** 2026.10.20  or  2026.10.20 19:00 */
export function formatDate(iso: string, withTime = false) {
  const { y, m, d, h, min } = parts(iso)
  return `${y}.${m}.${d}${withTime ? ` ${h}:${min}` : ''}`
}

/** 2026.10.20–11.02 for ranges */
export function formatRange(startIso: string, endIso?: string, withTime = false) {
  if (!endIso) return formatDate(startIso, withTime)
  const a = parts(startIso)
  const b = parts(endIso)
  const end = a.y === b.y ? `${b.m}.${b.d}` : `${b.y}.${b.m}.${b.d}`
  return `${a.y}.${a.m}.${a.d}–${end}`
}

/** Oct 9, 2026  or  Oct 9, 2026, 4:55 PM — used in the nav Log */
export function formatLogDate(iso: string, withTime = false) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(iso))
}

/** Sep 27, 2026 · Sep 27, 2026 @3PM · Aug 12–28, 2026 · Sep 16–Dec 19, 2026 · Dec 28, 2026–Jan 3, 2027 */
export function formatNewsDate(startIso: string, endIso?: string, withTime = false) {
  const p = (iso: string) => {
    const f = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(new Date(iso))
    const g = (t: string) => f.find((x) => x.type === t)?.value ?? ''
    return { y: g('year'), m: g('month'), d: g('day'), h: g('hour'), min: g('minute'), ap: g('dayPeriod').toUpperCase() }
  }
  const a = p(startIso)
  const time = withTime ? ` @${a.h}${a.min !== '00' ? `:${a.min}` : ''}${a.ap}` : ''
  if (!endIso) return `${a.m} ${a.d}, ${a.y}${time}`
  const b = p(endIso)
  if (a.y !== b.y) return `${a.m} ${a.d}, ${a.y}–${b.m} ${b.d}, ${b.y}`
  if (a.m !== b.m) return `${a.m} ${a.d}–${b.m} ${b.d}, ${b.y}`
  if (a.d !== b.d) return `${a.m} ${a.d}–${b.d}, ${b.y}`
  return `${a.m} ${a.d}, ${a.y}${time}`
}