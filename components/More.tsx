'use client'

/**
 * Text content under the first screen. Each row:
 *   col 1 label · col 2–4 list (grey, active one black) · col 5–8 the active item
 */
import { useLayoutEffect, useRef, useState } from 'react'
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
  useLayoutEffect(() => {
    const el = inner.current
    if (!el) return
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div className="more__content" style={{ height }}>
      <div className="more__inner" ref={inner}>
        <div className="more__fade" key={id}>
          {children}
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
  const [logActive, setLogActive] = useState(log[0]?._id)
  const entry = log.find((l) => l._id === logActive)
  const [logOpen, setLogOpen] = useState(false)

  return (
    <section id="more" className="more grid" aria-label="Information">
      {cv.length > 0 && (
        <div className="more__row">
          <h2 className="more__label">CV</h2>
          <ul className="more__list side__list">
            {cv.map((s) => (
              <li key={s.name}>
                <button type="button" className="pick" aria-current={s.name === cvActive} onClick={() => setCvActive(s.name)}>
                  {s.title}
                </button>
              </li>
            ))}
            {settings.cvPdfUrl && (
              <li className="more__download">
                <a href={`${settings.cvPdfUrl}?dl=`} download>
                  Download CV
                </a>
              </li>
            )}
          </ul>
          <Smooth id={cvActive}>
            {cvActive === 'bio' ? (
              information.bio && <PortableText value={information.bio} components={ptComponents} />
            ) : (
              <ul className="cv-list">
                {(information[cvActive as keyof Information] as Information['awards'])?.map((e) => (
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
        <div className="more__row">
          <h2 className="more__label">
            <button type="button" aria-expanded={logOpen} onClick={() => setLogOpen((o) => !o)}>
              Log
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
                  </li>
                ))}
              </ul>
              <Smooth id={logActive}>{entry && <PortableText value={entry.text} components={ptComponents} />}</Smooth>
            </>
          )}
        </div>
      )}
    </section>
  )
}
