import { Fragment } from 'react'
import { PortableText } from '@portabletext/react'
import type { Information, NewsItem, Settings } from '@/sanity/types'
import { formatNewsDate } from '@/lib/format'
import { CV_SECTIONS } from '@/lib/cvSections'
import { QuestionModule } from './QuestionModule'
import { ptComponents } from './portableText'
import { StickyLabels } from './StickyLabels'

export function InformationModule({ information, settings, news = [] }: { information: Information; settings: Settings; news?: NewsItem[] }) {
  return (
    <section id="information" className="info module grid" aria-label="Information">
      <StickyLabels />
      {/* question module: its own column (1–2), pinned under the sticky label line */}
      {!!settings.questions?.length && (
        <div className="info__question">
          <QuestionModule questions={settings.questions} thanks={settings.questionThanks} />
        </div>
      )}

      {/* Labels are direct children of the column, like the CV: "Information"
          stays pinned through the bio, then "News" lands on top of it. */}
      <div className="info__left">
        <h2 className="info__label">Biography</h2>
        <div className="bio">
          {information.bio && <PortableText value={information.bio} components={ptComponents} />}
        </div>

        {news.length > 0 && (
          <>
            <h2 className="info__label">News</h2>
            <ul className="info-news">
              {news.map((n) => (
                <li key={n._id} className="info-news__item">
                  {n.link ? (
                    <a href={n.link} target="_blank" rel="noreferrer">{n.title}</a>
                  ) : (
                    <span>{n.title}</span>
                  )}
                  {n.venue && <span>{n.venue}</span>}
                  <time dateTime={n.startsAt}>{formatNewsDate(n.startsAt, n.endsAt, n.showTime)}</time>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="info__right">
        {CV_SECTIONS.map(({ name, title }) => {
          const entries = information[name]
          if (!entries?.length) return null
          return (
            <Fragment key={name}>
              <h2 className="info__label cv-label">{title}</h2>
              <ul className="cv-list">
                {entries.map((e) => (
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
                      {e.detail && <span className="cv-row__detail">, {e.detail}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Fragment>
          )
        })}
      </div>
    </section>
  )
}
