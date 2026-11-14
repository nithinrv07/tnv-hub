import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Spinner from '../components/Spinner.jsx';
import { getPortfolio, portfolioPath, tnvIdFromSlug } from '../lib/portfolio.js';

// Public volunteer portfolio: who the volunteer is in TNV and what they have done,
// compiled from TNV records. Laid out like a public officer profile: a profile card,
// a written summary, the current role, a year-at-a-glance strip, computed facts and
// a sortable list of every event they joined. Private details are never shown.

const formatDate = value => {
  // Plain dates (event days) are shown as written; timestamps in local time
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB');
};

const monthYear = value => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
};

function serviceLength(from) {
  const start = new Date(from);
  if (isNaN(start.getTime())) return null;
  const months = Math.max(0, (new Date().getFullYear() - start.getFullYear()) * 12 + new Date().getMonth() - start.getMonth());
  if (months < 1) return 'Less than a month';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} yr${y === 1 ? '' : 's'}${m ? ` ${m} mo` : ''}`;
}

function summaryFor(p) {
  const first = p.full_name;
  const since = p.member_since ? new Date(p.member_since).getFullYear() : null;
  const parts = [];
  parts.push(
    `${first} is a ${p.role === 'Volunteer' ? 'volunteer' : p.role} with Tamil Nadu Volunteers from ${p.district_name} district` +
    `${since ? `, a member since ${since}` : ''}.`
  );
  const serving = [p.wing && `the ${p.wing}`, p.department && `the ${p.department} department`].filter(Boolean);
  if (serving.length) parts.push(`${first.split(' ')[0]} serves in ${serving.join(', ')}${p.mode_of_work ? ` (${p.mode_of_work.toLowerCase()})` : ''}.`);
  if (p.organisation) parts.push(`${first.split(' ')[0]} is associated with ${p.organisation}.`);
  const s = p.stats;
  if (s.events) {
    parts.push(
      `The record lists ${s.events} event${s.events === 1 ? '' : 's'}` +
      `${s.districts_served > 1 ? ` across ${s.districts_served} districts` : ''}` +
      `${s.certificates ? `, with ${s.certificates} certificate${s.certificates === 1 ? '' : 's'} of appreciation` : ''}.`
    );
  } else {
    parts.push('Their first TNV events will appear here once they take part.');
  }
  if (s.tasks_completed) parts.push(`${s.tasks_completed} assigned task${s.tasks_completed === 1 ? '' : 's'} completed${s.points ? `, earning ${s.points} points` : ''}.`);
  return parts.join(' ');
}

const ATTENDANCE = {
  present: { label: 'Present', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  absent: { label: 'Absent', cls: 'bg-rose-50 text-rose-700 border-rose-200' }
};

function StatBlock({ value, label }) {
  return (
    <div className="min-w-0 text-center">
      <div className="font-display text-2xl font-black text-brand-green-dark">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</div>
    </div>
  );
}

function Fact({ label, value, note }) {
  return (
    <div className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 font-display text-xl font-black text-neutral-ink">{value}</div>
      {note && <div className="mt-0.5 truncate text-xs text-neutral-muted">{note}</div>}
    </div>
  );
}

export default function VolunteerPortfolio() {
  const { slug } = useParams();
  const tnvId = tnvIdFromSlug(slug);
  const [state, setState] = useState({ loading: true, error: '', isPrivate: false, portfolio: null });
  const [filter, setFilter] = useState('all'); // all | attended | certified
  const [sort, setSort] = useState({ key: 'start_date', dir: 'desc' });
  const [showAll, setShowAll] = useState(false);
  const [shared, setShared] = useState('');

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: '', isPrivate: false, portfolio: null });
    setShowAll(false);
    if (!tnvId) {
      setState({ loading: false, error: 'This portfolio link is not valid.', isPrivate: false, portfolio: null });
      return undefined;
    }
    getPortfolio(tnvId).then(res => {
      if (!alive) return;
      if (res.ok) setState({ loading: false, error: '', isPrivate: false, portfolio: res.data.portfolio });
      else setState({
        loading: false,
        isPrivate: Boolean(res.data?.private),
        portfolio: null,
        error: res.status === 0 ? "We couldn't reach the TNV server. Please try again." : res.data?.error || 'This portfolio could not be found.'
      });
    });
    return () => { alive = false; };
  }, [tnvId]);

  const p = state.portfolio;

  useEffect(() => {
    if (p) document.title = `${p.full_name} – TNV Volunteer Portfolio`;
  }, [p]);

  // Events joined in each of the last 12 months
  const strip = useMemo(() => {
    if (!p) return [];
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('en-GB', { month: 'short' }), count: 0, present: 0 };
    });
    p.events.forEach(e => {
      const m = months.find(x => String(e.start_date).startsWith(x.key));
      if (m) {
        m.count += 1;
        if (e.attendance === 'present') m.present += 1;
      }
    });
    return months;
  }, [p]);

  const rows = useMemo(() => {
    if (!p) return [];
    const list = p.events.filter(e => filter === 'all' || (filter === 'attended' ? e.attendance === 'present' : e.certificate));
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => String(a[sort.key] || '').localeCompare(String(b[sort.key] || '')) * dir);
  }, [p, filter, sort]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${p.full_name} – TNV Volunteer`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared('Link copied');
    } catch (_e) {
      setShared('');
      return;
    }
    setTimeout(() => setShared(''), 2500);
  };

  const sortBy = key => setSort(s => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));
  const sortMark = key => (sort.key === key ? (sort.dir === 'desc' ? ' ▼' : ' ▲') : '');

  if (state.loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-neutral-bg">
        <Spinner className="h-8 w-8 text-brand-green" />
      </div>
    );
  }

  if (!p) {
    return (
      <section className="bg-neutral-bg py-16">
        <div className="container-page max-w-lg text-center">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-brand-green-tint/80">
            <h1 className="font-display text-2xl font-bold text-neutral-ink">{state.isPrivate ? 'This portfolio is private' : 'Portfolio not found'}</h1>
            <p className="mt-2 text-sm text-neutral-muted">{state.error}</p>
            <Link to="/" className="btn-primary mt-6 inline-flex min-h-tap px-5">Go to the home page</Link>
          </div>
        </div>
      </section>
    );
  }

  const s = p.stats;
  const since = p.approved_at || p.member_since;
  const maxMonth = Math.max(1, ...strip.map(m => m.count));
  const visibleRows = showAll ? rows : rows.slice(0, 8);
  const initials = (p.full_name || 'V').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const details = [
    ['District', p.district_name],
    ['Constituency', p.assembly_constituency],
    ['Chennai zone', p.zone],
    ['Wing', p.wing],
    ['Department', p.department],
    ['Mode of work', p.mode_of_work],
    ['Organisation', p.organisation],
    ['Member since', formatDate(p.member_since)],
    ['With TNV for', serviceLength(p.member_since)],
    ['Programme', p.programme === 'food' ? 'Food distribution' : p.programme === 'tree' ? 'Tree planting' : null]
  ].filter(([, v]) => v);

  const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-green-tint/80 sm:p-6';
  const heading = 'font-display text-base font-bold text-brand-green-dark';

  return (
    <section className="bg-neutral-bg py-6 sm:py-10">
      <div className="container-page grid max-w-6xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Profile card */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className={`${card} text-center`}>
            <div className="mx-auto grid h-36 w-28 place-items-center overflow-hidden rounded-xl bg-brand-green-tint ring-1 ring-brand-green-tint">
              {p.photo_path
                ? <img src={p.photo_path} alt={`Photo of ${p.full_name}`} className="h-full w-full object-cover" />
                : <span className="font-display text-3xl font-black text-brand-green-dark">{initials}</span>}
            </div>
            <h1 className="mt-4 font-display text-xl font-bold text-neutral-ink">{p.full_name}</h1>
            <p className="text-sm text-neutral-muted">{p.role}</p>
            <span className="mt-2 inline-block rounded-full bg-brand-yellow-tint px-3 py-0.5 text-xs font-bold text-amber-900">{p.district_name}</span>
            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-4">
              <StatBlock value={s.events} label="Events" />
              <StatBlock value={s.certificates} label="Certificates" />
              <StatBlock value={s.tasks_completed} label="Tasks" />
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          {/* Header and summary */}
          <div className={card}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-bold text-neutral-ink sm:text-3xl">{p.full_name}</h2>
                <p className="mt-1 text-sm text-neutral-muted">
                  TNV Volunteer · <span className="font-mono">{p.tnv_id}</span>{since ? ` · Member since ${new Date(since).getFullYear()}` : ''}
                </p>
              </div>
              <button type="button" onClick={share} className="inline-flex min-h-tap shrink-0 items-center justify-center rounded-xl border border-brand-green/40 px-4 text-sm font-bold text-brand-green-dark hover:bg-brand-green-tint">
                {shared || 'Share'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[p.wing, `${p.district_name} District`, p.preferred_designation !== p.role ? p.preferred_designation : null, p.organisation_linked ? p.organisation : null]
                .filter(Boolean)
                .map(chip => (
                  <span key={chip} className="rounded-full bg-brand-green-tint px-2.5 py-1 text-xs font-semibold text-brand-green-dark">{chip}</span>
                ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-700 sm:text-base">{summaryFor(p)}</p>
          </div>

          {/* Current role and details */}
          <div className={card}>
            <div className="rounded-xl border-l-4 border-brand-green bg-brand-green-tint/50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-green">Current role{p.wing ? ` · ${p.wing}` : ''}</p>
              <p className="mt-0.5 font-display text-lg font-bold text-neutral-ink">{p.role}{p.department ? `, ${p.department}` : ''}</p>
              {since && <p className="text-xs text-neutral-muted">Serving since {formatDate(since)}</p>}
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-neutral-100 py-2.5 text-sm">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="min-w-0 text-right font-semibold text-neutral-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Year at a glance */}
          <div className={card}>
            <h3 className={heading}>Year at a glance</h3>
            <p className="text-xs text-neutral-muted">Events joined in each of the last 12 months</p>
            <div className="mt-4 flex h-28 items-end gap-1 sm:gap-2" role="img" aria-label={`Events per month over the last year: ${strip.map(m => `${m.label} ${m.count}`).join(', ')}`}>
              {strip.map(m => (
                <div key={m.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className={`w-full max-w-[28px] rounded-t ${m.count ? 'bg-brand-green' : 'bg-neutral-100'}`}
                    style={{ height: m.count ? `${Math.max(12, (m.count / maxMonth) * 100)}%` : '6%' }}
                    title={`${m.label}: ${m.count} event${m.count === 1 ? '' : 's'}`}
                  />
                  <span className="text-[10px] text-neutral-500">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Facts */}
          <div className={card}>
            <h3 className={heading}>Volunteering facts</h3>
            <p className="text-xs text-neutral-muted">Computed from TNV event, attendance and task records</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Fact label="Events joined" value={s.events} note={s.events ? `latest ${monthYear(p.events[0].start_date)}` : 'none yet'} />
              <Fact label="Marked present" value={s.present} note={s.events ? `${Math.round((s.present / s.events) * 100)}% of events` : '—'} />
              <Fact label="Certificates" value={s.certificates} note="of appreciation" />
              <Fact label="Tasks completed" value={`${s.tasks_completed}${s.tasks_total ? ` / ${s.tasks_total}` : ''}`} note="assigned by TNV" />
              <Fact label="Points" value={s.points} note="from completed tasks" />
              <Fact label="Districts served" value={s.districts_served} note="unique event districts" />
            </div>
          </div>

          {/* Events */}
          <div className={card}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className={heading}>Events</h3>
                <p className="text-xs text-neutral-muted">{s.events} event{s.events === 1 ? '' : 's'} · tap a column to sort</p>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show events">
                {[['all', 'All'], ['attended', 'Attended'], ['certified', 'With certificate']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setFilter(id); setShowAll(false); }}
                    aria-pressed={filter === id}
                    className={`min-h-9 rounded-lg border px-3 text-xs font-bold ${filter === id ? 'border-brand-green bg-brand-green text-white' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-500">No events to show here yet.</p>
            ) : (
              <>
                {/* Phones: one card per event */}
                <ul className="mt-4 divide-y divide-neutral-100 sm:hidden">
                  {visibleRows.map(e => (
                    <li key={e.id} className="py-3">
                      <p className="text-sm font-bold text-neutral-ink">{e.title}</p>
                      <p className="text-xs text-neutral-500">{[e.category, e.district, formatDate(e.start_date)].filter(Boolean).join(' · ')}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {e.attendance && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ATTENDANCE[e.attendance].cls}`}>{ATTENDANCE[e.attendance].label}</span>}
                        {e.certificate && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">Certificate</span>}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Larger screens: sortable table */}
                <table className="mt-4 hidden w-full table-fixed text-left text-sm sm:table">
                  <thead className="border-b border-neutral-200 text-[11px] uppercase tracking-wider text-neutral-500">
                    <tr>
                      <th className="w-10 py-2 font-bold">#</th>
                      <th className="py-2 font-bold"><button type="button" onClick={() => sortBy('title')} className="uppercase tracking-wider">Event{sortMark('title')}</button></th>
                      <th className="w-36 py-2 font-bold"><button type="button" onClick={() => sortBy('district')} className="uppercase tracking-wider">District{sortMark('district')}</button></th>
                      <th className="w-28 py-2 font-bold"><button type="button" onClick={() => sortBy('start_date')} className="uppercase tracking-wider">Date{sortMark('start_date')}</button></th>
                      <th className="w-40 py-2 font-bold">Record</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {visibleRows.map((e, i) => (
                      <tr key={e.id}>
                        <td className="py-2.5 text-neutral-400">{i + 1}</td>
                        <td className="py-2.5 pr-3">
                          <p className="truncate font-semibold text-neutral-ink">{e.title}</p>
                          {e.category && <p className="truncate text-xs text-neutral-500">{e.category}</p>}
                        </td>
                        <td className="truncate py-2.5 pr-3 text-neutral-700">{e.district}</td>
                        <td className="py-2.5 text-neutral-700">{formatDate(e.start_date)}</td>
                        <td className="py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {e.attendance && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${ATTENDANCE[e.attendance].cls}`}>{ATTENDANCE[e.attendance].label}</span>}
                            {e.certificate && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">Certificate</span>}
                            {!e.attendance && !e.certificate && <span className="text-xs text-neutral-400">Registered</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {rows.length > 8 && (
                  <button type="button" onClick={() => setShowAll(v => !v)} className="mt-3 w-full rounded-xl border border-neutral-200 py-2.5 text-sm font-bold text-brand-green-dark hover:bg-neutral-50">
                    {showAll ? 'Show fewer' : `Show all ${rows.length} events · +${rows.length - 8} more`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Field experience */}
          {p.past_field_work.length > 0 && (
            <div className={card}>
              <h3 className={heading}>Field experience</h3>
              <p className="text-xs text-neutral-muted">Areas of work before and outside TNV</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.past_field_work.map(w => (
                  <span key={w} className="rounded-full border border-neutral-200 bg-neutral-bg px-2.5 py-1 text-xs font-medium text-neutral-700">{w}</span>
                ))}
              </div>
            </div>
          )}

          {/* Other volunteers */}
          {p.peers.length > 0 && (
            <div className={card}>
              <h3 className={heading}>More volunteers from {p.district_name}</h3>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.peers.map(v => (
                  <li key={v.tnv_id}>
                    <Link to={portfolioPath(v.full_name, v.tnv_id)} className="flex min-h-tap items-center gap-3 rounded-xl border border-neutral-200 p-3 hover:border-brand-green">
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-green-tint text-xs font-bold text-brand-green-dark">
                        {v.photo_path ? <img src={v.photo_path} alt="" className="h-full w-full object-cover" /> : (v.full_name || 'V').charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-neutral-ink">{v.full_name}</span>
                        <span className="block truncate text-[11px] text-neutral-500">{v.since ? `Since ${new Date(v.since).getFullYear()}` : v.district_name}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="px-1 text-xs text-neutral-500">
            Compiled from Tamil Nadu Volunteers records. Contact details are never shown on this page. Volunteers can make their portfolio private from their dashboard.
          </p>
        </div>
      </div>
    </section>
  );
}
