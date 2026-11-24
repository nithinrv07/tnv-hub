import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DISTRICT_PLACEHOLDERS, getDistrictBySlug, getDistrictPlaceholderFields, districtSlug } from '../data/districts.js';
import { getEvents } from '../lib/eventService.js';

const FIELD_LABELS = {
  coordinatorName: 'Coordinator name',
  coordinatorContact: 'Coordinator contact number',
  activities: 'District activities',
  description: 'About the district'
};

const canonicalDistrict = name => {
  const normalized = String(name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (normalized === 'villupuram' || normalized === 'viluppuram') return 'viluppuram';
  if (normalized === 'kanniyakumari' || normalized === 'kanyakumari') return 'kanyakumari';
  return normalized;
};

const eventDistrictName = name => {
  if (canonicalDistrict(name) === 'viluppuram') return 'Viluppuram';
  if (canonicalDistrict(name) === 'kanyakumari') return 'Kanyakumari';
  return name;
};

function formatEventDate(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-GB').format(date);
}

function DistrictField({ label, value, placeholder }) {
  return (
    <div className="rounded-xl border border-brand-green-tint bg-white p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-neutral-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-neutral-ink">{value}</dd>
      {placeholder && <p className="mt-1 text-xs text-amber-800">Awaiting verified information</p>}
    </div>
  );
}

export default function District() {
  const { districtSlug: selectedSlug } = useParams();
  const district = getDistrictBySlug(selectedSlug);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(Boolean(district));
  const [error, setError] = useState('');
  const placeholderFields = district ? getDistrictPlaceholderFields(district) : [];

  useEffect(() => {
    let active = true;
    if (!district) return () => { active = false; };

    setLoading(true);
    setError('');
    getEvents({ public: 'true' })
      .then(res => {
        if (!active) return;
        if (!res.ok || !Array.isArray(res.data?.events)) {
          setError('Unable to load district events right now.');
          setEvents([]);
          return;
        }
        const districtKey = canonicalDistrict(district.name);
        setEvents(res.data.events.filter(event => {
          const eventDistrict = canonicalDistrict(event.district);
          return !eventDistrict || eventDistrict === 'alldistricts' || eventDistrict === 'statewide' || eventDistrict === districtKey;
        }));
      })
      .catch(() => {
        if (active) {
          setError('Unable to load district events right now.');
          setEvents([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [district?.name]);

  if (!district) {
    return (
      <section className="container-page py-16">
        <h1 className="font-display text-3xl font-bold text-brand-green-dark">District not found</h1>
        <p className="mt-2 text-sm text-neutral-muted">Choose a district from the zones overview.</p>
        <Link to="/#zones" className="btn-primary mt-5 inline-flex px-5 py-2.5">Back to zones and districts</Link>
      </section>
    );
  }

  const placeholderCount = placeholderFields.length;

  return (
    <section className="bg-neutral-bg py-10 sm:py-14">
      <div className="container-page max-w-5xl">
        <Link to="/#zones" className="inline-flex min-h-tap items-center text-sm font-semibold text-brand-green-dark hover:underline">
          &larr; Back to zones and districts
        </Link>

        <header className="mt-5 rounded-2xl bg-brand-green-dark px-5 py-8 text-white sm:px-8 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-yellow">{district.zone} zone</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">{district.name} District</h1>
        </header>

        {placeholderCount > 0 && (
          <p role="note" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Some district details are placeholders awaiting an update. Placeholder contact numbers are not verified and cannot be used to call.
          </p>
        )}

        <section className="mt-8" aria-labelledby="district-details-heading">
          <h2 id="district-details-heading" className="font-display text-2xl font-bold text-brand-green-dark">District information</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(FIELD_LABELS).map(([field, label]) => (
              <DistrictField
                key={field}
                label={label}
                value={district[field] || DISTRICT_PLACEHOLDERS[field]}
                placeholder={placeholderFields.includes(field)}
              />
            ))}
          </dl>
        </section>

        <section className="mt-10" aria-labelledby="district-events-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="district-events-heading" className="font-display text-2xl font-bold text-brand-green-dark">Events in {district.name}</h2>
              <p className="mt-1 text-sm text-neutral-muted">Public events for this district and statewide events.</p>
            </div>
            <Link to={`/events?district=${encodeURIComponent(eventDistrictName(district.name))}`} className="text-sm font-bold text-brand-green-dark hover:underline">
              Browse all events &rarr;
            </Link>
          </div>

          {loading ? (
            <p role="status" className="mt-4 rounded-xl border border-brand-green-tint bg-white p-6 text-sm text-neutral-muted">Loading district events...</p>
          ) : error ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-white p-6 text-sm text-red-800">{error}</p>
          ) : events.length === 0 ? (
            <p className="mt-4 rounded-xl border border-brand-green-tint bg-white p-6 text-sm text-neutral-muted">No public events are currently listed for this district.</p>
          ) : (
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {events.map(event => (
                <li key={event.id} className="rounded-2xl border border-brand-green-tint bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold text-brand-green">{formatEventDate(event.start_date)}</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-neutral-ink">{event.title}</h3>
                  {event.venue && <p className="mt-1 text-sm text-neutral-muted">{event.venue}</p>}
                  {event.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-muted">{event.description}</p>}
                  <Link to={`/events?event=${encodeURIComponent(event.id)}`} className="mt-4 inline-flex min-h-tap items-center text-sm font-bold text-brand-green-dark hover:underline">
                    View details &amp; participate &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
