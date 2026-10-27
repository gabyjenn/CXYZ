'use client'

/**
 * Text content under the first screen. Each row:
 *   col 1 label · col 2–4 list (grey, active one black) · col 5–8 the active item
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PortableText } from '@portabletext/react'
import type { Information, LogEntry, NewsItem, Settings } from '@/sanity/types'
import { CV_SECTIONS } from '@/lib/cvSections'
import { formatLogDate, formatNewsDate } from '@/lib/format'
import { ptComponents } from './portableText'

/**
 * Animates its height when the content inside changes (CV section / log entry),
 * and fades the new content in. `id` = what's showing; a new id replays the fade.
 */
function Smooth({ id, children }: { id?: string; children: React.ReactNode }) {
  const inner = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  // what's on screen: lags behind `id` while the old content fades out
  const [shownId, setShownId] = useState(id)
  const [leaving, setLeaving] = useState(false)
  const last = useRef(children)
  if (shownId === id) last.current = children

  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // new selection: fade the old text out first, then swap (height + fade-in follow)
  useEffect(() => {
    if (id === shownId) return
    setLeaving(true)
    const t = window.setTimeout(() => {
      setShownId(id)
      setLeaving(false)
    }, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className="more__content" style={{ height }}>
      <div className="more__inner" ref={inner}>
        <div className={`more__fade${leaving ? ' is-leaving' : ''}`} key={shownId}>
          {shownId === id ? children : last.current}
        </div>
      </div>
    </div>
  )
}

type Props = { information: Information; news: NewsItem[]; log: LogEntry[]; settings: Settings }

export function More({ information, news, log, settings }: Props) {
  // CV list: Biography first, then only the sections that have entries
  const cv = [
    ...(information.bio?.length ? [{ name: 'bio', title: 'Biography' }] : []),
    ...CV_SECTIONS.filter((s) => information[s.name]?.length),
  ]
  const [cvActive, setCvActive] = useState(cv[0]?.name)
  const [year, setYear] = useState<string | null>(null) // phones: picked year (null = the latest)
  // phones only: CV entries are shown one year at a time
  const [isPhone, setIsPhone] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsPhone(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const [logOpen, setLogOpen] = useState(false)
  const [logActive, setLogActive] = useState(log[0]?._id)
  const entry = log.find((l) => l._id === logActive)

  const entries = cvActive === 'bio' ? [] : ((information[cvActive as keyof Information] as Information['awards']) ?? [])
  const years = [...new Set(entries.map((e) => e.year))].sort((a, b) => parseInt(b) - parseInt(a)) // newest first
  const activeYear = year && years.includes(year) ? year : years[0] // latest year by default
  const byYear = isPhone && years.length > 1
  const visible = byYear ? entries.filter((e) => e.year === activeYear) : entries

  return (
    <div className="about">
    <section id="more" className="more grid" aria-label="Information">
      {cv.length > 0 && (
        <div className="more__row">
          <h2 className="more__label">CV</h2>
          <ul className="more__list more__tabs side__list">
            {cv.map((s) => (
              <li key={s.name}>
                <button
                  type="button"
                  className="pick"
                  aria-current={s.name === cvActive}
                  onClick={(e) => {
                    setCvActive(s.name)
                    setYear(null)
                    // phones: bring a half-hidden tab fully into view
                    e.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
                  }}
                >
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
          {/* phones only: years as a row; the latest is selected by default, tap another to switch */}
          {years.length > 1 && (
            <ul className="more__years more__tabs">
              {years.map((y) => (
                <li key={y}>
                  <button type="button" className="pick" aria-current={y === activeYear} onClick={() => setYear(y)}>
                    {y}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Smooth id={`${cvActive}-${byYear ? activeYear : 'all'}`}>
            {cvActive === 'bio' ? (
              information.bio && <PortableText value={information.bio} components={ptComponents} />
            ) : (
              <ul className="cv-list">
                {visible.map((e) => (
                  <li key={e._key} className="cv-row">
                    <span className="cv-row__year">{e.year}</span>
                    <span className="cv-row__text">
                      {e.link ? (
                        <a href={e.link} target="_blank" rel="noreferrer">
                          {e.text}
                        </a>
                      ) : (
                        e.text
                      )}
                      {e.detail && `, ${e.detail}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Smooth>
        </div>
      )}

      {news.length > 0 && (
        <div className="more__row">
          <h2 className="more__label">News</h2>
          <ul className="more__list news-list">
            {news.map((n) => (
              <li key={n._id}>
                {n.link ? (
                  <a href={n.link} target="_blank" rel="noreferrer">
                    {n.title}
                  </a>
                ) : (
                  <span>{n.title}</span>
                )}
                {n.venue && <span>{n.venue}</span>}
                <time dateTime={n.startsAt}>{formatNewsDate(n.startsAt, n.endsAt, n.showTime)}</time>
              </li>
            ))}
          </ul>
        </div>
      )}

      {log.length > 0 && (
        <div className="more__row more__row--log">
          <h2 className="more__label">
            <button type="button" aria-expanded={logOpen} onClick={() => setLogOpen((o) => !o)}>
              Log {logOpen ? '−' : '+'}
            </button>
          </h2>
          {logOpen && (
            <>
              <ul className="more__list side__list more__fade">
                {log.map((l) => (
                  <li key={l._id}>
                    <button type="button" className="pick" aria-current={l._id === logActive} onClick={() => setLogActive(l._id)}>
                      <time dateTime={l.date}>{formatLogDate(l.date, l.showTime)}</time>
                    </button>
                    {/* phones: the entry opens right under its date */}
                    {l._id === logActive && (
                      <div className="log-inline more__fade" key={l._id}>
                        <PortableText value={l.text} components={ptComponents} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <Smooth id={logActive}>{entry && <PortableText value={entry.text} components={ptComponents} />}</Smooth>
            </>
          )}
        </div>
      )}
    </section>

    {/* footer: © name year  ·  downloads (CV / PDF Portfolio) */}
    <footer className="foot grid">
      <p className="foot__copy">
        © {settings.copyright ? `${settings.copyright} ` : ''}
        {new Date().getFullYear()}
      </p>
      {(settings.cvPdfUrl || settings.portfolioPdfUrl) && (
        <ul className="foot__links">
          {settings.cvPdfUrl && (
            <li>
              <a href={`${settings.cvPdfUrl}?dl=`} download>
                CV
              </a>
            </li>
          )}
          {settings.portfolioPdfUrl && (
            <li>
              <a href={`${settings.portfolioPdfUrl}?dl=`} download>
                PDF Portfolio
              </a>
            </li>
          )}
        </ul>
      )}
    </footer>
    </div>
  )
}
