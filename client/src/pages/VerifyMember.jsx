import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { api } from '../lib/api.js';
import Spinner from '../components/Spinner.jsx';

// Opened by scanning the QR code on a member's ID card: /verify/member/<code>.
// A single page that says whether the card is genuine and shows who it belongs to.
// Someone arriving from a scan has no history in the site, so "back" takes them to
// the TNV Hub landing page rather than out of the site.

const formatDate = iso => {
  if (!iso) return '—';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatChecked = iso => new Date(iso).toLocaleString('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
});

function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5 12.5 10 17.5 19 7.5" />
    </svg>
  );
}

function CrossIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-neutral-muted">{label}</dt>
      <dd className="text-right text-sm font-semibold text-neutral-ink">{children}</dd>
    </div>
  );
}

const STATUS = {
  active: {
    tone: 'bg-brand-green text-white',
    ring: 'ring-brand-green/20',
    title: 'Verified member',
    text: 'This ID card was issued by Tamil Nadu Volunteers and the member is in good standing.'
  },
  suspended: {
    tone: 'bg-amber-500 text-white',
    ring: 'ring-amber-500/20',
    title: 'Membership suspended',
    text: 'This card was issued by Tamil Nadu Volunteers, but the membership is currently suspended. Do not accept it as proof of membership.'
  },
  not_active: {
    tone: 'bg-amber-500 text-white',
    ring: 'ring-amber-500/20',
    title: 'Membership not active',
    text: 'This card belongs to a Tamil Nadu Volunteers record that is not active right now.'
  }
};

export default function VerifyMember() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const fixedHistory = useRef(false);

  // Opened straight from a scan (first page in this tab): put the landing page
  // underneath, so the back button goes to TNV Hub instead of leaving the site
  useEffect(() => {
    if (fixedHistory.current) return;
    fixedHistory.current = true;
    const idx = window.history.state && typeof window.history.state.idx === 'number' ? window.history.state.idx : 0;
    if (idx === 0) {
      navigate('/', { replace: true });
      navigate(location.pathname, { replace: false });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: '' });
    api(`/api/verify/member/${encodeURIComponent(code || '')}`).then(res => {
      if (!alive) return;
      if (res.ok) setState({ loading: false, data: res.data, error: '' });
      else if (res.status === 0) setState({ loading: false, data: null, error: 'network' });
      else setState({ loading: false, data: null, error: res.data?.error || 'This ID card could not be verified.' });
    });
    return () => { alive = false; };
  }, [code]);

  const { loading, data, error } = state;
  const member = data?.member;
  const status = data ? STATUS[data.status] || STATUS.not_active : null;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-bg text-neutral-ink">
      <header className="bg-brand-green-dark">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow">
            <img src="/tnv-logo.png" alt="" width="40" height="40" className="h-10 w-10 shrink-0 rounded-full bg-white" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-base font-bold text-white">Tamil Nadu Volunteers</span>
              <span className="block truncate text-xs text-brand-yellow">தமிழ்நாடு தன்னார்வலர்கள்</span>
            </span>
          </Link>
          <Link
            to="/"
            className="shrink-0 rounded-full border border-white/30 px-3.5 py-2 text-xs font-bold text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
          >
            Go to TNV Hub
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="sr-only">ID card verification</h1>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-24 text-sm text-neutral-muted" aria-busy="true">
            <Spinner className="h-8 w-8" />
            Checking this ID card…
          </div>
        ) : error ? (
          <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-red-200">
            <div className="flex items-center gap-4 bg-red-600 px-6 py-5 text-white">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20"><CrossIcon className="h-7 w-7" /></span>
              <div>
                <p className="font-display text-xl font-bold">{error === 'network' ? 'Could not check right now' : 'Not verified'}</p>
                <p className="text-sm text-white/85">ID card verification</p>
              </div>
            </div>
            <div className="space-y-4 px-6 py-6 text-sm leading-relaxed text-neutral-muted">
              <p>
                {error === 'network'
                  ? 'We could not reach Tamil Nadu Volunteers to check this card. Check your internet connection and scan the card again.'
                  : error}
              </p>
              {error !== 'network' && (
                <p>
                  If you think this is a mistake, call <a href="tel:+919087293339" className="font-semibold text-brand-green hover:underline">+91 90872 93339</a> with the ID number printed on the card.
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className={`overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ${status.ring}`}>
            <div className={`flex items-center gap-4 px-6 py-5 ${status.tone}`} role="status">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
                {data.status === 'active' ? <CheckIcon className="h-7 w-7" /> : <CrossIcon className="h-7 w-7" />}
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-bold">{status.title}</p>
                <p className="text-sm text-white/85">Checked {formatChecked(data.checked_at)}</p>
              </div>
            </div>

            <div className="px-6 pt-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-brand-green-tint ring-2 ring-brand-yellow">
                  {member.photo_path
                    ? <img src={member.photo_path} alt={`Photo of ${member.full_name}`} className="h-full w-full object-cover" />
                    : <span className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-brand-green-dark">{(member.full_name || 'V').charAt(0)}</span>}
                </div>
                <div className="min-w-0">
                  <p className="font-display text-2xl font-bold leading-tight text-neutral-ink">{member.full_name}</p>
                  {member.role && <p className="mt-0.5 text-sm font-semibold text-brand-green">{member.role}</p>}
                  <p className="mt-1 font-mono text-sm text-neutral-muted">{member.tnv_id}</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-neutral-muted">{status.text}</p>
            </div>

            {data.status !== 'suspended' && (
              <dl className="mx-6 mt-4 divide-y divide-neutral-100 border-t border-neutral-100">
                <Row label="District">{member.district_name || '—'}</Row>
                {member.wing && <Row label="Wing">{member.wing}</Row>}
                <Row label="Member since">{formatDate(member.member_since)}</Row>
                <Row label="Membership year">{member.membership_year}</Row>
                <Row label="Valid until">{formatDate(member.valid_until)}</Row>
              </dl>
            )}

            <div className="flex flex-col gap-2 px-6 pb-6 pt-5 sm:flex-row">
              {member.portfolio_path && (
                <Link
                  to={member.portfolio_path}
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-brand-green px-5 text-sm font-bold text-white transition-colors duration-150 hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow"
                >
                  View volunteer profile
                </Link>
              )}
              <Link
                to="/"
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-neutral-300 px-5 text-sm font-bold text-neutral-ink transition-colors duration-150 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow"
              >
                About Tamil Nadu Volunteers
              </Link>
            </div>
          </section>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-neutral-muted">
          Details are read live from Tamil Nadu Volunteers’ records each time the card is scanned.
        </p>
      </main>
    </div>
  );
}
