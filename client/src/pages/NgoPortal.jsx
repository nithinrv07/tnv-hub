import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { getToken } from '../lib/session.js';
import { getCurrentUser, logout } from '../lib/authService.js';
import Spinner from '../components/Spinner.jsx';

const STATUS = {
  pending: { label: 'Under review', cls: 'bg-amber-50 text-amber-800 border-amber-200', text: 'Our team reviews every application within 72 hours and will call your point of contact.' },
  approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'Your organisation is a TNV collaboration partner. Volunteers can now choose it when they register.' },
  rejected: { label: 'Not approved', cls: 'bg-rose-50 text-rose-800 border-rose-200', text: 'Your application was not approved. See the note from our team below.' }
};

const formatDate = value => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB');
};

// Organisation portal: the application's status and the volunteers who registered
// under this organisation
export default function NgoPortal() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, error: '', organisation: null, members: [] });

  useEffect(() => {
    const user = getCurrentUser();
    if (!getToken() || !user || user.role !== 'ngo') {
      navigate('/login', { replace: true, state: { message: 'Sign in with your organisation email to open the portal.' } });
      return;
    }
    (async () => {
      const res = await api('/api/ngo/me', { token: getToken() });
      if (res.status === 401) {
        logout();
        navigate('/login', { replace: true, state: { message: 'Your session ended. Please sign in again.' } });
        return;
      }
      if (!res.ok) {
        setState(s => ({ ...s, loading: false, error: res.data?.error || "We couldn't load your organisation. Please try again." }));
        return;
      }
      setState({ loading: false, error: '', organisation: res.data.organisation, members: res.data.members || [] });
    })();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (state.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-bg">
        <Spinner className="h-8 w-8 text-brand-green" />
      </div>
    );
  }

  const org = state.organisation;
  const status = STATUS[org?.status] || STATUS.pending;

  return (
    <div className="min-h-screen bg-neutral-bg">
      <header className="border-b border-brand-green-tint bg-white">
        <div className="container-page flex items-center justify-between gap-3 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/tnv-logo.png" alt="" className="h-9 w-9 shrink-0 rounded-full object-contain" />
            <span className="truncate font-display text-sm font-bold text-brand-green-dark">Tamil Nadu Volunteers</span>
          </Link>
          <button type="button" onClick={handleLogout} className="min-h-tap shrink-0 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">
            Sign out
          </button>
        </div>
      </header>

      <main className="container-page max-w-4xl space-y-6 py-8">
        {state.error && (
          <p role="alert" className="rounded-xl border border-status-no-answer/40 bg-white p-4 text-sm font-medium text-status-no-answer">{state.error}</p>
        )}

        {org && (
          <>
            {location.state?.justRegistered && (
              <div className="rounded-xl border border-brand-green/30 bg-brand-green-tint p-4 text-sm font-semibold text-brand-green-dark">
                Thank you. Your application has been received.
              </div>
            )}

            <section className="flex flex-col gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-green-tint/80 sm:flex-row sm:items-center sm:p-6">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-neutral-200 bg-white">
                {org.logo ? <img src={org.logo} alt={`${org.organisation_name} logo`} className="h-full w-full object-contain p-1" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-2xl font-bold text-neutral-ink">{org.organisation_name}</h1>
                <p className="mt-0.5 text-sm text-neutral-muted">
                  {[org.category, org.district_name, org.zone ? `Zone ${org.zone}${org.ward ? `, Ward ${org.ward}` : ''}` : ''].filter(Boolean).join(' · ')}
                </p>
                <span className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-bold ${status.cls}`}>{status.label}</span>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-green-tint/80 sm:p-6">
              <h2 className="font-display text-base font-bold text-brand-green-dark">Application</h2>
              <p className="mt-1 text-sm text-neutral-700">{status.text}</p>
              {org.remarks && (
                <p className="mt-3 rounded-lg bg-neutral-bg p-3 text-sm text-neutral-700"><strong>Note from TNV:</strong> {org.remarks}</p>
              )}
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ['Organisation email', org.org_email],
                  ['Organisation phone', org.org_phone],
                  ['Point of contact', [org.poc_name, org.poc_designation].filter(Boolean).join(', ')],
                  ['Contact mobile', org.poc_phone],
                  ['Applied on', formatDate(org.created_at)]
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{k}</dt>
                    <dd className="break-words font-medium text-neutral-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-green-tint/80 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold text-brand-green-dark">Our volunteers ({state.members.length})</h2>
              </div>
              <p className="mt-1 text-sm text-neutral-muted">Volunteers who chose your organisation when they registered with TNV.</p>
              {state.members.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-500">No volunteers have joined through your organisation yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-neutral-100">
                  {state.members.map(m => (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-green-tint text-sm font-bold text-brand-green-dark">
                        {m.photo_path ? <img src={m.photo_path} alt="" className="h-full w-full object-cover" /> : (m.full_name || 'V').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-neutral-ink">{m.full_name}</p>
                        <p className="truncate text-xs text-neutral-muted">
                          {[m.district_name, m.tnv_id, m.created_at ? `Joined ${formatDate(m.created_at)}` : ''].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${m.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {m.status === 'approved' ? 'Active' : 'Pending'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
