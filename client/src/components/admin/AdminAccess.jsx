import { useEffect, useMemo, useState } from 'react';
import { getAdminAccessList, grantAdminAccess, revokeAdminAccess } from '../../lib/adminService.js';
import Spinner from '../Spinner.jsx';
import REGISTRATION from '../../data/registrationOptions.json';

// Assembly constituencies of the chosen districts
const DISTRICT_ID = Object.fromEntries(REGISTRATION.districts.map(d => [d.name, d.id]));
const constituenciesOf = names => names.flatMap(n => (REGISTRATION.options.constituencies_by_district[DISTRICT_ID[n]] || []).map(c => ({ district: n, name: c })));

// Admin Access (Master Admin only): make an approved member an admin for chosen
// districts, decide which sections of the admin panel they can open, or take the
// access back.

export const MODULE_LABELS = {
  members: 'Members Management',
  collab: 'Collaboration Partners',
  payments: 'Payments & ₹365 programmes',
  birthdays: 'Birthday Wishes',
  messages: 'Send Message',
  calls: 'Call Log Operations',
  events: 'Event Management',
  tasks: 'Task Coordination',
  certificates: 'Certificates',
  donations: 'Donations',
  questions: 'Question Bank'
};

export default function AdminAccess({ members, districts, onChanged }) {
  const [state, setState] = useState({ loading: true, admins: [], modules: Object.keys(MODULE_LABELS), error: '' });
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState(null); // member being given access, or an admin being edited
  const [allDistricts, setAllDistricts] = useState(false);
  const [pickedDistricts, setPickedDistricts] = useState([]);
  const [pickedModules, setPickedModules] = useState(['members']);
  const [allConstituencies, setAllConstituencies] = useState(true);
  const [pickedConstituencies, setPickedConstituencies] = useState([]);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  const load = async () => {
    const res = await getAdminAccessList();
    if (!res.ok) {
      setState(s => ({ ...s, loading: false, error: res.data?.error || "Admin access couldn't be loaded." }));
      return;
    }
    setState({ loading: false, admins: res.data.admins || [], modules: res.data.modules || Object.keys(MODULE_LABELS), error: '' });
  };
  useEffect(() => { load(); }, []);

  const adminIds = useMemo(() => new Set(state.admins.map(a => a.profile_id)), [state.admins]);
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (members || [])
      .filter(m => m && !['master_admin'].includes(m.role))
      .filter(m => !q || [m.full_name, m.email, m.phone, m.tnv_id, m.district_name, m.assembly_constituency].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => (a.status === 'approved' ? 0 : 1) - (b.status === 'approved' ? 0 : 1) || String(a.full_name || '').localeCompare(String(b.full_name || '')));
  }, [members, search]);
  const shownCandidates = showAll || search.trim() ? candidates : candidates.slice(0, 25);

  const startGrant = member => {
    setChosen({ profile_id: member.id, full_name: member.full_name, email: member.email, district_name: member.district_name, isNew: true });
    setAllDistricts(false);
    setPickedDistricts(member.district_name ? [member.district_name] : []);
    setPickedModules(['members']);
    setAllConstituencies(true);
    setPickedConstituencies([]);
    setFormError('');
    setSearch('');
  };

  const startEdit = admin => {
    setChosen({ ...admin, isNew: false });
    const ds = Array.isArray(admin.districts) ? admin.districts : [];
    setAllDistricts(ds.length === 0);
    setPickedDistricts(ds);
    setPickedModules(Array.isArray(admin.modules) && admin.modules.length ? admin.modules : ['members']);
    const cs = Array.isArray(admin.constituencies) ? admin.constituencies : [];
    setAllConstituencies(cs.length === 0);
    setPickedConstituencies(cs);
    setFormError('');
  };

  const toggle = (list, setList, value) => setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

  const save = async () => {
    setFormError('');
    if (!allDistricts && pickedDistricts.length === 0) return setFormError('Choose at least one district, or All districts.');
    if (pickedModules.length === 0) return setFormError('Choose at least one section.');
    const validCs = allDistricts || allConstituencies ? [] : pickedConstituencies.filter(c => constituenciesOf(pickedDistricts).some(x => x.name === c));
    if (!allDistricts && !allConstituencies && validCs.length === 0) return setFormError('Choose at least one constituency, or All constituencies.');
    setBusy(true);
    const res = await grantAdminAccess({ profile_id: chosen.profile_id, districts: allDistricts ? [] : pickedDistricts, constituencies: validCs, modules: pickedModules });
    setBusy(false);
    if (!res.ok) return setFormError(res.data?.error || 'Access could not be saved. Please try again.');
    setNotice(`${chosen.full_name} ${chosen.isNew ? 'is now an admin' : 'access updated'}. They see the change the next time they sign in.`);
    setChosen(null);
    load();
    onChanged?.();
  };

  const revoke = async admin => {
    setConfirmRevoke(null);
    setBusy(true);
    const res = await revokeAdminAccess(admin.profile_id);
    setBusy(false);
    if (!res.ok) {
      setNotice('');
      setFormError(res.data?.error || 'Access could not be removed. Please try again.');
      return;
    }
    setNotice(`${admin.full_name} is no longer an admin.`);
    if (chosen?.profile_id === admin.profile_id) setChosen(null);
    load();
    onChanged?.();
  };

  const input = 'w-full py-2 px-3 rounded-lg border border-neutral-300 text-sm bg-white focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green';

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-4 sm:p-6 space-y-5">
      <div>
        <h3 className="font-bold text-brand-green-dark text-base font-display">Admin Access</h3>
        <p className="text-xs text-neutral-muted mt-0.5">
          Give approved members admin access for districts or constituencies, and choose which sections they can open. They switch between their member dashboard and admin from the side panel. Only you, the Master Admin, can change this.
        </p>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-green/30 bg-brand-green-tint px-4 py-3 text-sm font-semibold text-brand-green-dark">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="shrink-0 text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Give access */}
      {!chosen && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor="access-search" className="text-sm font-bold text-neutral-800">All members ({candidates.length})</label>
            <p className="text-xs text-neutral-500">Only approved members can be given admin access.</p>
          </div>
          <input id="access-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone, TNV ID, district or constituency" className={input} />
          {candidates.length === 0 ? (
            <p className="py-4 text-center text-xs text-neutral-500">{search.trim() ? 'No member matches.' : 'No members yet.'}</p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-neutral-100 overflow-y-auto rounded-xl border border-neutral-200">
              {shownCandidates.map(m => {
                const isAdminAlready = adminIds.has(m.id);
                const eligible = m.status === 'approved' && !m.blocked;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">{m.full_name}</p>
                      <p className="truncate text-[0.6875rem] text-neutral-500">{[m.tnv_id, m.district_name, m.assembly_constituency, m.email].filter(Boolean).join(' · ')}</p>
                    </div>
                    {isAdminAlready ? (
                      <button type="button" onClick={() => startEdit(state.admins.find(a => a.profile_id === m.id))} className="shrink-0 px-3 py-1.5 rounded-lg border border-brand-green-tint text-brand-green-dark text-xs font-bold hover:bg-brand-green-tint">
                        Admin · Change
                      </button>
                    ) : eligible ? (
                      <button type="button" onClick={() => startGrant(m)} className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark">
                        Give access
                      </button>
                    ) : (
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[0.6875rem] font-semibold text-neutral-500">{m.blocked ? 'Blocked' : 'Not approved yet'}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {!showAll && !search.trim() && candidates.length > shownCandidates.length && (
            <button type="button" onClick={() => setShowAll(true)} className="text-xs font-bold text-brand-green hover:underline">Show all {candidates.length} members</button>
          )}
        </div>
      )}

      {/* Access form */}
      {chosen && (
        <div className="space-y-4 rounded-xl border border-brand-green/40 p-4">
          <div>
            <p className="text-sm font-bold text-neutral-900">{chosen.isNew ? 'Give access to' : 'Change access for'} {chosen.full_name}</p>
            <p className="text-[0.6875rem] text-neutral-500">{[chosen.email, chosen.district_name].filter(Boolean).join(' · ')}</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-neutral-700 mb-1">Districts they manage</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={allDistricts} onChange={e => setAllDistricts(e.target.checked)} className="h-4 w-4 accent-brand-green" />
              All districts
            </label>
            {!allDistricts && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-56 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                {districts.map(d => (
                  <label key={d} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-neutral-50">
                    <input type="checkbox" checked={pickedDistricts.includes(d)} onChange={() => toggle(pickedDistricts, setPickedDistricts, d)} className="h-3.5 w-3.5 accent-brand-green" />
                    {d}
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {!allDistricts && pickedDistricts.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-neutral-700 mb-1">Constituencies they manage</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allConstituencies} onChange={e => setAllConstituencies(e.target.checked)} className="h-4 w-4 accent-brand-green" />
                All constituencies in the chosen district{pickedDistricts.length === 1 ? '' : 's'}
              </label>
              {!allConstituencies && (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                  {pickedDistricts.map(dn => (
                    <div key={dn}>
                      <p className="px-1.5 pb-1 text-[0.6875rem] font-bold text-neutral-500">{dn}</p>
                      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
                        {constituenciesOf([dn]).map(c => (
                          <label key={c.name} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-neutral-50">
                            <input type="checkbox" checked={pickedConstituencies.includes(c.name)} onChange={() => toggle(pickedConstituencies, setPickedConstituencies, c.name)} className="h-3.5 w-3.5 accent-brand-green" />
                            {c.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </fieldset>
          )}

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-neutral-700 mb-1">Sections they can open</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {state.modules.map(id => (
                <label key={id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-2.5 py-2 text-xs hover:border-brand-green">
                  <input type="checkbox" checked={pickedModules.includes(id)} onChange={() => toggle(pickedModules, setPickedModules, id)} className="h-3.5 w-3.5 accent-brand-green" />
                  {MODULE_LABELS[id] || id}
                </label>
              ))}
            </div>
          </fieldset>

          {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{formError}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark disabled:opacity-60">
              {busy && <Spinner className="h-4 w-4" />}
              {chosen.isNew ? 'Give access' : 'Save changes'}
            </button>
            <button type="button" onClick={() => setChosen(null)} className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-bold hover:bg-neutral-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current admins */}
      <div className="border-t border-neutral-100 pt-4">
        <p className="text-sm font-bold text-neutral-900 mb-3">Admins ({state.admins.length})</p>
        {state.loading ? (
          <div className="py-8 text-center"><Spinner className="mx-auto" /></div>
        ) : state.error ? (
          <p className="text-sm text-rose-700">{state.error}</p>
        ) : state.admins.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">No one else has admin access yet.</p>
        ) : (
          <ul className="space-y-2">
            {state.admins.map(a => (
              <li key={a.profile_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-neutral-900">{a.full_name}</p>
                  <p className="text-[0.6875rem] text-neutral-500">
                    {Array.isArray(a.districts) && a.districts.length ? a.districts.join(', ') : 'All districts'}
                    {Array.isArray(a.constituencies) && a.constituencies.length ? ` · ${a.constituencies.join(', ')}` : ''}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(a.modules || []).map(m => (
                      <span key={m} className="rounded-full bg-brand-green-tint px-2 py-0.5 text-[0.625rem] font-semibold text-brand-green-dark">{MODULE_LABELS[m] || m}</span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEdit(a)} className="px-3 py-1.5 rounded-lg border border-brand-green-tint text-brand-green-dark text-xs font-bold hover:bg-brand-green-tint">
                    Change
                  </button>
                  {confirmRevoke === a.profile_id ? (
                    <>
                      <button type="button" onClick={() => revoke(a)} disabled={busy} className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50">
                        Yes, remove access
                      </button>
                      <button type="button" onClick={() => setConfirmRevoke(null)} className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold hover:bg-neutral-50">
                        Keep
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmRevoke(a.profile_id)} disabled={busy} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 disabled:opacity-50">
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
