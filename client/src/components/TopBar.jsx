import { Link } from 'react-router-dom';
import { NEWS, SOCIAL_LINKS, CONTACT_PHONE } from '../data/site.js';
import { usePrefersReducedMotion } from '../lib/motion.js';
import { formatPhone } from '../lib/format.js';
import SocialIcon from './SocialIcon.jsx';
import LanguageMenu from './LanguageMenu.jsx';

function NewsItem({ item, hidden }) {
  const tab = hidden ? { tabIndex: -1 } : {};
  const linkClass = 'underline-offset-2 hover:underline';
  let text = item.text;
  if (item.to) {
    text = (
      <Link to={item.to} className={linkClass} {...tab}>
        {item.text}
      </Link>
    );
  } else if (item.href) {
    text = (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass} {...tab}>
        {item.text}
      </a>
    );
  }
  return (
    <li className="flex shrink-0 items-center gap-6 pr-6">
      <span>{text}</span>
      <span className="h-1.5 w-1.5 rounded-full bg-brand-green-dark" aria-hidden="true" />
    </li>
  );
}

function Ticker() {
  const reduced = usePrefersReducedMotion();

  if (reduced) {
    return (
      <ul className="flex min-w-0 flex-1 gap-6 overflow-x-auto whitespace-nowrap px-3 text-sm font-medium">
        {NEWS.map((n, i) => (
          <NewsItem key={i} item={n} />
        ))}
      </ul>
    );
  }

  // Two copies of the list scroll as one track; the copy is hidden from screen readers.
  // Hovering or focusing a link pauses it so it can be read and clicked.
  const seconds = Math.max(25, NEWS.reduce((n, item) => n + item.text.length, 0) / 4);
  return (
    <div className="group min-w-0 flex-1 overflow-hidden">
      <div
        className="flex w-max animate-marquee whitespace-nowrap text-sm font-medium group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
        style={{ '--marquee-duration': `${seconds}s` }}
      >
        <ul className="flex pl-3">
          {NEWS.map((n, i) => (
            <NewsItem key={i} item={n} />
          ))}
        </ul>
        <ul className="flex" aria-hidden="true">
          {NEWS.map((n, i) => (
            <NewsItem key={i} item={n} hidden />
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function TopBar() {
  return (
    <div className="bg-brand-yellow text-neutral-ink">
      <div className="container-page flex h-11 items-center gap-3 sm:gap-4">
        <ul className="hidden items-center gap-2 md:flex" aria-label="TNV on social media">
          {SOCIAL_LINKS.map(s => {
            const icon = (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-green-dark text-white">
                <SocialIcon name={s.icon} />
              </span>
            );
            return (
              <li key={s.icon}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.name} className="block rounded-full">
                    {icon}
                  </a>
                ) : (
                  <span title={`${s.name}: link coming soon`} className="block opacity-80">
                    {icon}
                    <span className="sr-only">{s.name} (link coming soon)</span>
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <section aria-label="News and updates" className="flex h-full min-w-0 flex-1 items-center overflow-hidden">
          <h2 className="flex h-full shrink-0 items-center gap-1.5 bg-brand-green-dark px-3 text-sm font-bold text-white">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-brand-yellow" fill="currentColor" aria-hidden="true">
              <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
            </svg>
            <span className="hidden sm:inline">News &amp; Updates</span>
            <span className="sm:hidden">News</span>
          </h2>
          <Ticker />
        </section>

        {CONTACT_PHONE && (
          <a
            href={`tel:+${CONTACT_PHONE}`}
            className="flex min-h-tap shrink-0 items-center gap-1.5 font-bold text-brand-green-dark"
            aria-label={`Call TNV on ${formatPhone(CONTACT_PHONE)}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" />
            </svg>
            <span className="hidden sm:inline">{formatPhone(CONTACT_PHONE)}</span>
          </a>
        )}

        <LanguageMenu />
      </div>
    </div>
  );
}
