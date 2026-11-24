import { Link } from 'react-router-dom';
import { TESTIMONIALS, HOMEPAGE_TESTIMONIAL_COUNT } from '../data/testimonials.js';
import { RevealHeading } from './Reveal.jsx';

const sectionTitle = 'font-display text-2xl font-bold leading-tight text-brand-green-dark sm:text-3xl lg:text-4xl pb-1';

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');
}

export function TestimonialCard({ testimonial }) {
  const { name, quote, district, wing, role, since, photo, activities = [], learned } = testimonial;
  const meta = [role, wing, district].filter(Boolean).join(' · ');

  return (
    <figure className="flex h-full flex-col rounded-2xl border border-brand-green-tint bg-white p-5 shadow-sm sm:p-6">
      <svg className="h-7 w-7 text-brand-yellow" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9.5 6C6.5 6 4 8.6 4 11.8V18h6.2v-6.2H7.1c0-1.9 1.1-3.3 2.4-3.6V6zm10 0c-3 0-5.5 2.6-5.5 5.8V18h6.2v-6.2h-3.1c0-1.9 1.1-3.3 2.4-3.6V6z" />
      </svg>

      <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-neutral-ink sm:text-base">
        <p>{quote}</p>
      </blockquote>

      {learned && (
        <p className="mt-4 rounded-xl bg-brand-green-tint/60 px-3 py-2 text-xs leading-relaxed text-brand-green-dark sm:text-sm">
          <span className="font-semibold">What I learned: </span>
          {learned}
        </p>
      )}

      {activities.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Took part in">
          {activities.map(activity => (
            <li key={activity} className="rounded-full bg-brand-yellow-tint px-2.5 py-1 text-[11px] font-semibold text-neutral-ink">
              {activity}
            </li>
          ))}
        </ul>
      )}

      <figcaption className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
        {photo ? (
          <img src={photo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" loading="lazy" />
        ) : (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-green text-sm font-bold text-white" aria-hidden="true">
            {initials(name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-display font-bold text-neutral-ink">{name}</p>
          {(meta || since) && (
            <p className="text-xs text-neutral-muted">
              {meta}
              {meta && since ? ' · ' : ''}
              {since ? `Volunteer since ${since}` : ''}
            </p>
          )}
        </div>
      </figcaption>
    </figure>
  );
}

export function TestimonialGrid({ items }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(t => (
        <TestimonialCard key={`${t.name}-${t.quote.slice(0, 20)}`} testimonial={t} />
      ))}
    </div>
  );
}

// Homepage section: featured testimonials, or the first few. Hidden while
// there are none, so the homepage never shows an empty block.
export default function HomeTestimonials() {
  if (TESTIMONIALS.length === 0) return null;
  const featured = TESTIMONIALS.filter(t => t.featured);
  const items = (featured.length ? featured : TESTIMONIALS).slice(0, HOMEPAGE_TESTIMONIAL_COUNT);

  return (
    <section id="testimonials" className="scroll-mt-32 bg-white py-12 sm:py-16" aria-labelledby="testimonials-title">
      <div className="container-page">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <RevealHeading id="testimonials-title" className={sectionTitle}>Hear from our volunteers</RevealHeading>
            <p className="mt-3 max-w-xl text-sm text-neutral-muted sm:text-base">
              What it is like to volunteer with Tamil Nadu Volunteers, in our volunteers' own words.
            </p>
          </div>
          <Link to="/volunteers" className="shrink-0 text-sm font-semibold text-brand-green hover:underline">
            Read more volunteer stories →
          </Link>
        </div>
        <div className="mt-8">
          <TestimonialGrid items={items} />
        </div>
      </div>
    </section>
  );
}
