import type { Settings } from '@/sanity/types'

export function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear()
  return (
    <footer className="footer module grid">
      <p className="footer__copy">
        © {year}
        {settings.copyright && ` ${settings.copyright}`}
      </p>
      <ul className="footer__links">
        {settings.email && (
          <li>
            <a href={`mailto:${settings.email}`}>{settings.email}</a>
          </li>
        )}
        {settings.instagram && (
          <li>
            <a href={settings.instagram} target="_blank" rel="noreferrer">
              Instagram
            </a>
          </li>
        )}
        {settings.substack && (
          <li>
            <a href={settings.substack} target="_blank" rel="noreferrer">
              Subscribe
            </a>
          </li>
        )}
        {settings.portfolioPdfUrl && (
          <li>
            <a href={`${settings.portfolioPdfUrl}?dl=`} download>
              Portfolio (PDF)
            </a>
          </li>
        )}
      </ul>
    </footer>
  )
}
