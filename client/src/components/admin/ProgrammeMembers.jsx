import { useMemo, useState } from 'react';
import { setMemberProgramme } from '../../lib/adminService.js';

// ₹365 members, listed apart so they can be put on food distribution or tree planting.
// onUpdate(profileId, programme) keeps the admin page's member list in step.

const PROGRAMMES = {
  food: { label: 'Food distribution', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  tree: { label: 'Tree planting', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
};

const formatDate = value => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB');
};

export default function ProgrammeMembers({ members, onUpdate }) {
  const [tab, setTab] = useState('all'); // all | food | tree | none
  const [district, setDistrict] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');

  const paid = useMemo(() => (members || []).filter(m => m && m.membership_paid && !m.blocked), [members]);
  const districts = useMemo(() => Array.from(new Set(paid.map(m => m.district_name).filter(Boolean))).sort(), [paid]);
  const counts = useMemo(() => ({
    all: paid.length,
    food: paid.filter(m => m.programme === 'food').length,
    tree: paid.filter(m => m.programme === 'tree').length,
    none: paid.filter(m => !m.programme).length
  }), [paid]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paid
      .filter(m => tab === 'all' || (tab === 'none' ? !m.programme : m.programme === tab))
      .filter(m => !district || m.district_name === district)
      .filter(m => !q || [m.full_name, m.phone, m.tnv_id].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => (a.district_name || '').localeCompare(b.district_name || '') || (a.full_name || '').localeCompare(b.full_name || ''));
  }, [paid, tab, district, search]);

  const assign = async (member, programme) => {
    setError('');
    setSaving(member.id);
    const res = await setMemberProgramme(member.id, programme);
    setSaving(null);
    if (!res.ok) {
      setError(res.data?.error || `Couldn't update ${member.full_name}. Please try again.`);
      return;
    }
    onUpdate?.(member.id, programme || null);
  };

  const exportCsv = () => {
    const rows = [['Name', 'Phone', 'District', 'TNV ID', 'Programme', 'Paid on']].concat(
      list.map(m => [m.full_name, m.phone, m.district_name, m.tnv_id || '', PROGRAMMES[m.programme]?.label || 'Not assigned', formatDate(m.membership_paid_at)])
    );
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `TNV_365_members_${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-brand-green-dark text-base font-display">₹365 Members: Food Distribution & Tree Planting</h3>
          <p className="text-xs text-neutral-muted mt-0.5">Everyone who has paid the ₹365 membership, so you can assign them to a programme.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!list.length} className="shrink-0 px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold hover:bg-neutral-50 disabled:opacity-40">
          Download list (CSV)
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[['all', 'All paid'], ['food', 'Food distribution'], ['tree', 'Tree planting'], ['none', 'Not assigned']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`min-h-9 px-3 rounded-lg text-xs font-bold border ${tab === id ? 'bg-brand-green text-white border-brand-green' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}
          >
            {label} ({counts[id]})
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone or TNV ID" aria-label="Search" className="w-full py-2 px-3 rounded-lg border border-neutral-300 text-sm" />
        <select value={district} onChange={e => setDistrict(e.target.value)} aria-label="District" className="w-full py-2 px-3 rounded-lg border border-neutral-300 text-sm bg-white">
          <option value="">All districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

      {list.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-500">{paid.length === 0 ? 'No one has paid the ₹365 membership yet.' : 'No members match.'}</p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
          {list.map(m => (
            <li key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-neutral-900">{m.full_name}</p>
                <p className="truncate text-[11px] text-neutral-500">
                  {[m.phone, m.district_name, m.tnv_id, m.membership_paid_at ? `Paid ${formatDate(m.membership_paid_at)}` : ''].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label={`Programme for ${m.full_name}`}>
                {Object.entries(PROGRAMMES).map(([id, p]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={saving === m.id}
                    onClick={() => assign(m, m.programme === id ? '' : id)}
                    aria-pressed={m.programme === id}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors disabled:opacity-50 ${m.programme === id ? p.cls : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'}`}
                  >
                    {m.programme === id ? '✓ ' : ''}{p.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
