import { useEffect, useMemo, useState } from 'react';
import { getAdminAccessList, grantAdminAccess, revokeAdminAccess } from '../../lib/adminService.js';
import Spinner from '../Spinner.jsx';

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
    if (!q) return [];
    return (members || [])
      .filter(m => m && m.status === 'approved' && !m.blocked && !adminIds.has(m.id))
      .filter(m => [m.full_name, m.email, m.phone, m.tnv_id].some(v => String(v || '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [members, search, adminIds]);

  const startGrant = member => {
    setChosen({ profile_id: member.id, full_name: member.full_name, email: member.email, district_name: member.district_name, isNew: true });
    setAllDistricts(false);
    setPickedDistricts(member.district_name ? [member.district_name] : []);
    setPickedModules(['members']);
    setFormError('');
    setSearch('');
  };

  const startEdit = admin => {
    setChosen({ ...admin, isNew: false });
    const ds = Array.isArray(admin.districts) ? admin.districts : [];
    setAllDistricts(ds.length === 0);
    setPickedDistricts(ds);
    setPickedModules(Array.isArray(admin.modules) && admin.modules.length ? admin.modules : ['members']);
    setFormError('');
  };

  const toggle = (list, setList, value) => setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

  const save = async () => {
    setFormError('');
    if (!allDistricts && pickedDistricts.length === 0) return setFormError('Choose at least one district, or All districts.');
    if (pickedModules.length === 0) return setFormError('Choose at least one section.');
    setBusy(true);
    const res = await grantAdminAccess({ profile_id: chosen.profile_id, districts: allDistricts ? [] : pickedDistricts, modules: pickedModules });
    setBusy(false);
    if (!res.ok) return setFormError(res.data?.error || 'Access could not be saved. Please try again.');
    setNotice(`${chosen.full_name} ${chosen.isNew ? 'is now an admin' : 'access updated'}. They see the change the next time they sign in.`);
    setChosen(null);
    load();
    onChanged?.();
  };

  const revoke = async admin => {
    if (!window.confirm(`Remove admin access from ${admin.full_name}? They go back to being a member.`)) return;
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
          Give approved members admin access for one or more districts, and choose which sections they can open. Only you, the Master Admin, can change this.
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
          <label htmlFor="access-search" className="text-xs font-bold text-neutral-700">Give a member admin access</label>
          <input id="access-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search approved members by name, email, phone or TNV ID" className={input} />
          {search.trim() && candidates.length === 0 && <p className="text-xs text-neutral-500">No approved member matches.</p>}
          {candidates.length > 0 && (
            <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {candidates.map(m => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">{m.full_name}</p>
                    <p className="truncate text-[11px] text-neutral-500">{[m.tnv_id, m.district_name, m.email].filter(Boolean).join(' · ')}</p>
                  </div>
                  <button type="button" onClick={() => startGrant(m)} className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark">
                    Choose
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Access form */}
      {chosen && (
        <div className="space-y-4 rounded-xl border border-brand-green/40 p-4">
          <div>
            <p className="text-sm font-bold text-neutral-900">{chosen.isNew ? 'Give access to' : 'Change access for'} {chosen.full_name}</p>
            <p className="text-[11px] text-neutral-500">{[chosen.email, chosen.district_name].filter(Boolean).join(' · ')}</p>
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
                  <p className="text-[11px] text-neutral-500">
                    {Array.isArray(a.districts) && a.districts.length ? a.districts.join(', ') : 'All districts'}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {(a.modules || []).map(m => (
                      <span key={m} className="rounded-full bg-brand-green-tint px-2 py-0.5 text-[10px] font-semibold text-brand-green-dark">{MODULE_LABELS[m] || m}</span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEdit(a)} className="px-3 py-1.5 rounded-lg border border-brand-green-tint text-brand-green-dark text-xs font-bold hover:bg-brand-green-tint">
                    Change
                  </button>
                  <button type="button" onClick={() => revoke(a)} disabled={busy} className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 disabled:opacity-50">
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
