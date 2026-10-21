import { Link } from 'react-router-dom';
import { POLICIES } from '../data/policies.js';
import { CONTACT } from '../data/site.js';
import { formatPhone } from '../lib/format.js';
import NotFound from './NotFound.jsx';

function ContactDetails() {
  return (
    <ul className="mt-3 space-y-1 text-neutral-ink">
      <li>
        Phone:{' '}
        <a className="font-medium text-brand-green-dark underline" href={`tel:+${CONTACT.phone}`}>
          {formatPhone(CONTACT.phone)}
        </a>
      </li>
      <li>
        Email:{' '}
        <a className="font-medium text-brand-green-dark underline" href={`mailto:${CONTACT.email}`}>
          {CONTACT.email}
        </a>
      </li>
      <li>Office: {CONTACT.address}</li>
    </ul>
  );
}

export default function Policy({ slug }) {
  const policy = POLICIES[slug];
  if (!policy) return <NotFound />;

  return (
    <article className="bg-white py-12 sm:py-16">
      <div className="container-page max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-sm text-neutral-muted">
          <Link to="/" className="underline-offset-2 hover:underline">Home</Link>
          <span aria-hidden="true"> / </span>
          <span>{policy.title}</span>
        </nav>
        <h1 className="mt-3 font-display text-4xl font-bold text-brand-green-dark sm:text-5xl">{policy.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-neutral-muted">{policy.intro}</p>

        {policy.sections.map(s => (
          <section key={s.heading} className="mt-8">
            <h2 className="font-display text-2xl font-bold text-brand-green-dark">{s.heading}</h2>
            {s.paragraphs?.map(p => (
              <p key={p} className="mt-3 leading-relaxed text-neutral-muted">{p}</p>
            ))}
            {s.list && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-neutral-muted">
                {s.list.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {s.contact && <ContactDetails />}
          </section>
        ))}

        {policy.closing && <p className="mt-10 font-medium text-neutral-ink">{policy.closing}</p>}
      </div>
    </article>
  );
}
