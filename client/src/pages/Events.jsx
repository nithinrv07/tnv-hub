import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEvents, registerForEvent, STATUS_BADGES } from '../lib/eventService.js';
import { getToken } from '../lib/session.js';
import Spinner from '../components/Spinner.jsx';

const TN_DISTRICTS = [
  'All Districts',
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris',
  'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
  'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
  'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
  'Viluppuram', 'Virudhunagar'
];

function getEventCategory(event) {
  const firstTag = Array.isArray(event.tags) ? event.tags[0] : event.tags;
  return event.category || event.category_name || firstTag || 'General';
}

function formatEventDate(value) {
  if (!value) return '';
  const isoDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB').format(date);
}

function getEventMapsUrl(event) {
  const primaryLocation = [event.location, event.venue]
    .find(value => typeof value === 'string' && value.trim())
    ?.trim();
  const district = typeof event.district === 'string' ? event.district.trim() : '';
  const location = primaryLocation
    ? district && !primaryLocation.toLowerCase().includes(district.toLowerCase())
      ? `${primaryLocation}, ${district}`
      : primaryLocation
    : district;
  if (!location) return null;

  const query = new URLSearchParams({ api: '1', query: location });
  return `https://www.google.com/maps/search/?${query.toString()}`;
}

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Ongoing', 'Published'
  const [search, setSearch] = useState('');
  const [registeringId, setRegisteringId] = useState(null);
  const [toast, setToast] = useState('');
  const [toastMapsUrl, setToastMapsUrl] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    // public=true returns only Published and Ongoing events
    const res = await getEvents({ public: 'true' });
    if (showLoading) setLoading(false);
    if (res.ok && Array.isArray(res.data?.events)) {
      setEvents(res.data.events);
      setError('');
    } else if (showLoading) {
      setError('Unable to load upcoming events at this moment.');
    }
  };

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), 5000);
    const onFocus = () => load(false);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (!selectedEventId) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedEventId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedEventId]);

  const showToast = (msg, event = null) => {
    setToast(msg);
    setToastMapsUrl(event ? getEventMapsUrl(event) : null);
    setTimeout(() => setToast(''), 5000);
  };

  const handleRegister = async (eventId, title) => {
    const token = getToken();
    if (!token) {
      // Unauthenticated visitor must be redirected to sign in without modifying registration state
      navigate('/login', {
        state: {
          from: '/events',
          message: `Please sign in to register as a volunteer for "${title}".`
        }
      });
      return;
    }

    setRegisteringId(eventId);
    const res = await registerForEvent(eventId);
    setRegisteringId(null);

    if (res.status === 401 || res.data?.require_login) {
      navigate('/login', {
        state: {
          from: '/events',
          message: `Please sign in to register as a volunteer for "${title}".`
        }
      });
      return;
    }

    if (res.ok) {
      const event = events.find(item => item.id === eventId);
      showToast(`Thank you! You have registered as a volunteer for "${title}".`, event);
      setEvents(prev => prev.map(e => e.id === eventId ? {
        ...e,
        is_registered: true,
        registered_count: res.data?.registered_count ?? ((e.registered_count || 0) + 1)
      } : e));
    } else if (res.data?.is_registered) {
      showToast(res.data?.error || 'You are already registered for this event.');
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, is_registered: true } : e));
    } else {
      showToast(res.data?.error || 'Registration failed. Please try again.');
    }
  };

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (statusFilter !== 'all' && e.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (selectedDistrict !== 'All Districts') {
        const d = (e.district || '').toLowerCase();
        if (d !== 'all districts' && d !== 'statewide' && d !== selectedDistrict.toLowerCase()) {
          return false;
        }
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = (e.title || '').toLowerCase().includes(q);
        const inVenue = (e.venue || '').toLowerCase().includes(q);
        const inDesc = (e.description || '').toLowerCase().includes(q);
        if (!inTitle && !inVenue && !inDesc) return false;
      }
      return true;
    });
  }, [events, statusFilter, selectedDistrict, search]);

  const selectedEvent = events.find(event => event.id === selectedEventId);

  return (
    <div className="bg-neutral-bg min-h-screen py-10 sm:py-16">
      <div className="container-page max-w-6xl">
        {/* Toast */}
        {toast && (
          <div className="mb-6 rounded-xl border border-brand-green/30 bg-brand-green-tint p-4 text-sm font-semibold text-brand-green-dark shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />
              {toast}
            </div>
            <div className="flex items-center gap-3">
              {toastMapsUrl && (
                <a
                  href={toastMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-brand-green-dark hover:underline"
                >
                  Open in Maps
                </a>
              )}
              <button onClick={() => { setToast(''); setToastMapsUrl(null); }} className="text-xs text-brand-green-dark hover:underline">Dismiss</button>
            </div>
          </div>
        )}

        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-block rounded-full bg-brand-green-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-green-dark">
            Civic Action & Field Drives
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-neutral-ink sm:text-4xl lg:text-5xl">
            TNV Events & Volunteer Drives
          </h1>
          <p className="mt-3 text-base text-neutral-muted sm:text-lg">
            Join grassroots initiatives across all 38 districts of Tamil Nadu. Tree plantations, flood preparedness drills, riverbank restorations, and civic leadership workshops.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-brand-green-tint p-4 shadow-sm mb-8 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-white text-neutral-ink shadow-xs' : 'text-neutral-muted hover:text-neutral-ink'
              }`}
            >
              All Active ({events.length})
            </button>
            <button
              onClick={() => setStatusFilter('Ongoing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                statusFilter === 'Ongoing' ? 'bg-white text-emerald-800 shadow-xs' : 'text-neutral-muted hover:text-emerald-800'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Ongoing Now ({events.filter(e => e.status === 'Ongoing').length})
            </button>
            <button
              onClick={() => setStatusFilter('Published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'Published' ? 'bg-white text-blue-800 shadow-xs' : 'text-neutral-muted hover:text-blue-800'
              }`}
            >
              Upcoming ({events.filter(e => e.status === 'Published').length})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 flex-1 max-w-xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by event or venue..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-neutral-muted/30 pl-9 pr-3 py-2 text-xs focus:border-brand-green focus:outline-none"
              />
              <svg className="w-4 h-4 text-neutral-muted absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* District Selector */}
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              className="rounded-xl border border-neutral-muted/30 px-3 py-2 text-xs font-semibold text-neutral-ink focus:border-brand-green focus:outline-none"
            >
              {TN_DISTRICTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-brand-green-tint p-16 text-center shadow-xs">
            <Spinner className="mx-auto h-8 w-8 text-brand-green" />
            <p className="mt-3 text-sm text-neutral-muted">Fetching upcoming drives...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-12 text-center text-red-800 shadow-xs">
            <p className="font-semibold">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-green-tint p-16 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-brand-green-tint text-brand-green mx-auto flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-ink text-lg font-display">No Events Found</h3>
            <p className="text-xs text-neutral-muted mt-1 max-w-md mx-auto">
              There are currently no events matching your criteria in this district. Check back soon or select "All Districts" to view state-wide initiatives.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(evt => {
              const badge = STATUS_BADGES[evt.status] || STATUS_BADGES.Published;
              const isFull = evt.capacity != null && (evt.registered_count || 0) >= evt.capacity;
              const isRegistering = registeringId === evt.id;

              return (
                <div
                  key={evt.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`View details for ${evt.title}`}
                  onClick={() => setSelectedEventId(evt.id)}
                  onKeyDown={event => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedEventId(evt.id);
                    }
                  }}
                  className="bg-white rounded-2xl border border-brand-green-tint p-6 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 transition-all flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-3">
                    <span className="inline-flex rounded-full bg-brand-green-tint px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-green-dark">
                      {getEventCategory(evt)}
                    </span>

                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {evt.status === 'Ongoing' ? 'LIVE NOW' : evt.status === 'Completed' ? 'COMPLETED' : 'UPCOMING'}
                      </span>

                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-neutral-100 text-neutral-700">
                        📍 {evt.district}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-lg font-bold font-display leading-snug ${
                      evt.status === 'Completed' ? 'line-through text-neutral-500' : 'text-neutral-ink'
                    }`}>
                      {evt.title}
                    </h3>

                    {/* Description */}
                    <p className={`text-xs leading-relaxed line-clamp-3 ${evt.status === 'Completed' ? 'text-neutral-400' : 'text-neutral-muted'}`}>
                      {evt.description}
                    </p>

                    {/* Info rows */}
                    <div className="space-y-1.5 pt-2 text-xs text-neutral-600 border-t border-neutral-100">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-brand-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          <strong>Date:</strong> {formatEventDate(evt.start_date)} {evt.end_date && evt.end_date !== evt.start_date ? `to ${formatEventDate(evt.end_date)}` : ''} ({evt.start_time} - {evt.end_time})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-brand-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">
                          <strong>Venue:</strong> {evt.venue}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-brand-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span>
                          <strong>Wing:</strong> {evt.wing}
                        </span>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-muted mb-1">
                        <span>Volunteer Signups</span>
                        <span className="text-brand-green-dark">{evt.registered_count || 0} / {evt.capacity == null ? 'Unlimited' : evt.capacity} volunteers</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-brand-green h-2 rounded-full transition-all duration-500"
                          style={{ width: `${evt.capacity == null ? 0 : Math.min(100, Math.round(((evt.registered_count || 0) / evt.capacity) * 100))}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-5 mt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
                    <span className="text-xs text-neutral-muted">
                      Lead: {evt.organizer_name || 'TNV District Lead'}
                    </span>

                    <button
                      disabled={evt.status === 'Completed' || evt.is_registered || isFull || isRegistering}
                      onClick={event => {
                        event.stopPropagation();
                        handleRegister(evt.id, evt.title);
                      }}
                      className={`px-4 py-2 text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-all ${
                        evt.status === 'Completed'
                          ? 'bg-neutral-100 text-neutral-500 border border-neutral-300 rounded-lg cursor-default'
                          : evt.is_registered
                          ? 'bg-emerald-100 text-emerald-800 cursor-default border border-emerald-300 rounded-lg'
                          : isFull
                          ? 'opacity-60 cursor-not-allowed bg-neutral-300 text-neutral-600 rounded-lg'
                          : 'btn-primary'
                      }`}
                    >
                      {isRegistering ? (
                        <Spinner className="w-3.5 h-3.5" />
                      ) : evt.status === 'Completed' ? (
                        '✓ Event Completed'
                      ) : evt.is_registered ? (
                        '✓ Registered'
                      ) : isFull ? (
                        'Capacity Reached'
                      ) : (
                        "I'm Interested"
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Banner */}
        <div className="mt-12 text-center bg-white rounded-2xl border border-brand-green-tint p-8 shadow-sm">
          <h3 className="font-display text-lg font-bold text-neutral-ink">
            Want to organize an event in your district?
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-neutral-muted max-w-xl mx-auto">
            District and Block Coordinators can coordinate new environmental drives, youth rallies, and disaster preparedness initiatives directly from the Admin Portal.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link to="/register" className="btn-primary text-xs font-semibold px-4 py-2">
              Join as Volunteer
            </Link>
            <Link to="/login" className="px-4 py-2 text-xs font-semibold rounded-lg text-brand-green hover:underline">
              Coordinator Sign In &rarr;
            </Link>
          </div>
        </div>

        {selectedEvent && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center"
            onClick={() => setSelectedEventId(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-details-title"
              onClick={event => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-brand-green-tint max-h-[92vh] overflow-y-auto"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-100 bg-white px-5 py-4 sm:px-7">
                <div>
                  <span className="inline-flex rounded-full bg-brand-green-tint px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-green-dark">
                    {getEventCategory(selectedEvent)}
                  </span>
                  <h2 id="event-details-title" className="mt-2 font-display text-xl font-extrabold text-neutral-ink sm:text-2xl">
                    {selectedEvent.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEventId(null)}
                  aria-label="Close event details"
                  className="shrink-0 rounded-lg p-2 text-2xl leading-none text-neutral-muted hover:bg-neutral-100 hover:text-neutral-ink"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-bold ${STATUS_BADGES[selectedEvent.status]?.bg || STATUS_BADGES.Published.bg} ${STATUS_BADGES[selectedEvent.status]?.text || STATUS_BADGES.Published.text} ${STATUS_BADGES[selectedEvent.status]?.border || STATUS_BADGES.Published.border}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${STATUS_BADGES[selectedEvent.status]?.dot || STATUS_BADGES.Published.dot}`} />
                    {selectedEvent.status}
                  </span>
                  {selectedEvent.district && (
                    <span className="rounded-md bg-neutral-100 px-2.5 py-1 font-bold text-neutral-700">
                      {selectedEvent.district}
                    </span>
                  )}
                </div>

                {selectedEvent.description && (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-muted">
                    {selectedEvent.description}
                  </p>
                )}

                <div className="grid gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-muted">Date</p>
                    <p className="mt-1 font-semibold text-neutral-ink">
                      {formatEventDate(selectedEvent.start_date)}
                      {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.start_date
                        ? ` to ${formatEventDate(selectedEvent.end_date)}`
                        : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-muted">Time</p>
                    <p className="mt-1 font-semibold text-neutral-ink">
                      {selectedEvent.start_time} - {selectedEvent.end_time}
                    </p>
                  </div>
                  {selectedEvent.venue && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-neutral-muted">Venue</p>
                      <p className="mt-1 font-semibold text-neutral-ink">{selectedEvent.venue}</p>
                    </div>
                  )}
                  {selectedEvent.location && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-neutral-muted">Location</p>
                      <p className="mt-1 font-semibold text-neutral-ink">{selectedEvent.location}</p>
                    </div>
                  )}
                  {selectedEvent.wing && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-neutral-muted">TNV Wing</p>
                      <p className="mt-1 font-semibold text-neutral-ink">{selectedEvent.wing}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-neutral-muted">Volunteers</p>
                    <p className="mt-1 font-semibold text-neutral-ink">
                      {selectedEvent.registered_count || 0} / {selectedEvent.capacity == null ? 'Unlimited' : selectedEvent.capacity} registered
                    </p>
                  </div>
                  {selectedEvent.organizer_name && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-neutral-muted">Organizer</p>
                      <p className="mt-1 font-semibold text-neutral-ink">{selectedEvent.organizer_name}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  {getEventMapsUrl(selectedEvent) ? (
                    <a
                      href={getEventMapsUrl(selectedEvent)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={event => event.stopPropagation()}
                      className="text-center text-sm font-bold text-brand-green-dark hover:underline sm:text-left"
                    >
                      Open in Maps
                    </a>
                  ) : <span />}
                  <button
                    type="button"
                    disabled={selectedEvent.status === 'Completed' || selectedEvent.is_registered || (selectedEvent.capacity != null && (selectedEvent.registered_count || 0) >= selectedEvent.capacity) || registeringId === selectedEvent.id}
                    onClick={() => handleRegister(selectedEvent.id, selectedEvent.title)}
                    className="btn-primary px-5 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {registeringId === selectedEvent.id
                      ? <Spinner className="mx-auto h-4 w-4" />
                      : selectedEvent.is_registered
                      ? '✓ Registered'
                      : selectedEvent.status === 'Completed'
                      ? '✓ Event Completed'
                      : (selectedEvent.capacity != null && (selectedEvent.registered_count || 0) >= selectedEvent.capacity)
                      ? 'Capacity Reached'
                      : "I'm Interested"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
