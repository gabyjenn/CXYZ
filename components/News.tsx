import type { NewsItem } from '@/sanity/types'
import { formatRange } from '@/lib/format'

export function News({ items }: { items: NewsItem[] }) {
  return (
    <section className="news module" aria-label="News">
      <h2 className="news__label">News</h2>
      {items.length === 0 && <p className="news__item news__empty">—</p>}
      {items.map((n) => (
        <article key={n._id} className="news__item">
          {n.link ? (
            <a className="news__title" href={n.link} target="_blank" rel="noreferrer">
              {n.title} ↗
            </a>
          ) : (
            <span className="news__title">{n.title}</span>
          )}
          {n.venue && <span className="news__meta">{n.venue}</span>}
          <time className="news__meta" dateTime={n.startsAt}>
            {formatRange(n.startsAt, n.endsAt, n.showTime)}
          </time>
        </article>
      ))}
    </section>
  )
}
