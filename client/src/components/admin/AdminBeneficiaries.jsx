import { useCallback, useEffect, useMemo, useState } from 'react';
import Spinner from '../Spinner.jsx';
import REGISTRATION from '../../data/registrationOptions.json';
import {
  getBeneficiaries, createBeneficiary, updateBeneficiary, deleteBeneficiary, getAdminCampaigns, errorText
} from '../../lib/donationService.js';
import {
  inr, formatDate, btn, inputCls, PageHeader, StatGrid, Badge, Notice, Card, Loading, Empty,
  Tabs, SearchBox, Field, Modal, ConfirmDialog, SubmitButton, downloadCsv, TABLE
} from './donations/ui.jsx';

// Admin > Beneficiaries Register: who the trust helps, checked before aid is
// given, with who verified it and who handed it over. Records of aid given are
// kept for the audit and cannot be deleted.

const DISTRICTS = REGISTRATION.districts.map(d => d.name);
const TYPES = ['Individual', 'Family', 'School or college', 'Hospital or clinic', 'Community or village', 'Other organisation'];
const CATEGORIES = ['Education', 'Healthcare', 'Disaster Relief', 'Nutrition', 'Environment', 'Livelihood', 'Other'];
const SUPPORT = ['Money', 'Materials', 'Food', 'Medical help', 'Scholarship', 'Volunteer work'];
const STATUS = {
  APPLIED: { label: 'To be checked', tone: 'amber' },
  VERIFIED: { label: 'Verified', tone: 'blue' },
  AID_DISBURSED: { label: 'Aid given', tone: 'green' },
  REJECTED: { label: 'Not eligible', tone: 'rose' }
};
const EMPTY = { name: '', type: 'Individual', district: '', category: 'Education', support_type: 'Money', contact_phone: '', amount_valuation: '', linked_campaign_id: '', notes: '' };

export default function AdminBeneficiaries() {
  const [state, setState] = useState({ loading: true, list: [], error: '' });
  const [campaigns, setCampaigns] = useState([]);
  const [tab, setTab] = useState('all');
  const [district, setDistrict] = useState('');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(null);
  const [action, setAction] = useState(null); // { item, kind: 'VERIFIED'|'REJECTED'|'AID_DISBURSED'|'delete' }

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const res = await getBeneficiaries();
    setState({ loading: false, list: res.beneficiaries, error: res.ok ? '' : res.error });
  }, []);
  useEffect(() => { load(); getAdminCampaigns().then(r => setCampaigns(r.campaigns)); }, [load]);

  const list = state.list;
  const count = s => list.filter(b => b.status === s).length;
  const campaignTitle = id => campaigns.find(c => c.id === id)?.title;
  const given = list.filter(b => b.status === 'AID_DISBURSED');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter(b => tab === 'all' || b.status === tab)
      .filter(b => !district || b.district === district)
      .filter(b => !q || [b.name, b.district, b.category, b.contact_phone, b.notes].some(v => String(v || '').toLowerCase().includes(q)));
  }, [list, tab, district, query]);

  const stats = [
    { label: 'In the register', value: list.length, note: (n => `${n} district${n === 1 ? "" : "s"}`)(new Set(list.map(b => b.district)).size) },
    { label: 'To be checked', value: count('APPLIED'), note: 'Visit or call before verifying', attention: count('APPLIED') ? 'amber' : null },
    { label: 'Verified, aid pending', value: count('VERIFIED'), note: 'Ready to receive aid' },
    { label: 'Aid given', value: inr(given.reduce((s, b) => s + Number(b.amount_valuation || 0), 0)), note: `To ${given.length} beneficiar${given.length === 1 ? 'y' : 'ies'}` }
  ];

  const exportCsv = () => downloadCsv(`TNV_beneficiaries_${new Date().toISOString().slice(0, 10)}.csv`,
    ['Name', 'Type', 'District', 'Cause', 'Support', 'Phone', 'Amount / value (INR)', 'Status', 'Verified by', 'Verified on', 'Aid given by', 'Aid given on', 'Campaign', 'Notes'],
    shown.map(b => [b.name, b.type, b.district, b.category, b.support_type, b.contact_phone, b.amount_valuation, STATUS[b.status]?.label, b.verified_by, formatDate(b.verified_at), b.disbursed_by, formatDate(b.disbursed_at), campaignTitle(b.linked_campaign_id), b.notes]));

  return (
    <section className="space-y-5">
      <PageHeader
        title="Beneficiaries register"
        description="People and institutions the trust supports. Check each one before verifying, and record aid when it is handed over so every rupee can be traced to a recipient."
        actions={(
          <>
            <button type="button" className={btn.primary} onClick={() => setEditing({})}>Add beneficiary</button>
            <button type="button" className={btn.secondary} onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
            <button type="button" className={btn.secondary} onClick={load} disabled={state.loading}>{state.loading && <Spinner className="h-3.5 w-3.5" />}Refresh</button>
          </>
        )}
      />
      <StatGrid items={stats} />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs label="Filter by status" value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: list.length }, ...Object.entries(STATUS).map(([id, s]) => ({ id, label: s.label, count: count(id) }))]} />
            <label htmlFor="ben-district" className="sr-only">District</label>
            <select id="ben-district" value={district} onChange={e => setDistrict(e.target.value)} className={`${inputCls} min-h-9 w-auto py-1`}>
              <option value="">All districts</option>
              {[...new Set(list.map(b => b.district).filter(Boolean))].sort().map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <SearchBox value={query} onChange={setQuery} placeholder="Name, phone, notes" label="Search beneficiaries" />
        </div>
        {state.loading && !list.length ? <Loading label="Loading the register…" /> : state.error ? (
          <div className="p-4"><Notice notice={{ tone: 'error', text: state.error }} /></div>
        ) : !shown.length ? (
          <Empty title={list.length ? 'No matches' : 'The register is empty'} action={!list.length && <button type="button" className={btn.primary} onClick={() => setEditing({})}>Add the first beneficiary</button>}>
            {list.length ? 'Change the filters or search.' : 'Add a person or institution when they ask for help or are referred by a coordinator.'}
          </Empty>
        ) : (
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th scope="col" className={TABLE.th}>Beneficiary</th>
                  <th scope="col" className={TABLE.th}>District</th>
                  <th scope="col" className={TABLE.th}>Support</th>
                  <th scope="col" className={`${TABLE.th} text-right`}>Amount / value</th>
                  <th scope="col" className={TABLE.th}>Status</th>
                  <th scope="col" className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(b => (
                  <tr key={b.id} className={TABLE.row}>
                    <td className={`${TABLE.td} max-w-xs`}>
                      <p className="font-semibold text-neutral-900">{b.name}</p>
                      <p className="text-xs text-neutral-muted">{[b.type, b.contact_phone].filter(Boolean).join(' · ')}</p>
                      {b.linked_campaign_id && campaignTitle(b.linked_campaign_id) && <p className="text-xs text-neutral-muted">Campaign: {campaignTitle(b.linked_campaign_id)}</p>}
                    </td>
                    <td className={`${TABLE.td} text-xs text-neutral-700`}>{b.district}</td>
                    <td className={`${TABLE.td} text-xs text-neutral-700`}>{b.category}<p className="text-neutral-muted">{b.support_type}</p></td>
                    <td className={`${TABLE.td} whitespace-nowrap text-right tabular-nums`}>{b.amount_valuation ? inr(b.amount_valuation) : '—'}</td>
                    <td className={TABLE.td}>
                      <Badge tone={STATUS[b.status]?.tone}>{STATUS[b.status]?.label || b.status}</Badge>
                      {b.status === 'AID_DISBURSED' && <p className="mt-1 text-[11px] text-neutral-muted">{formatDate(b.disbursed_at)} · {b.disbursed_by}</p>}
                      {b.status === 'VERIFIED' && b.verified_by && <p className="mt-1 text-[11px] text-neutral-muted">by {b.verified_by}</p>}
                    </td>
                    <td className={`${TABLE.td} text-right`}>
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        {b.status === 'APPLIED' && <button type="button" className={btn.smallPrimary} onClick={() => setAction({ item: b, kind: 'VERIFIED' })}>Verify</button>}
                        {b.status === 'VERIFIED' && <button type="button" className={btn.smallPrimary} onClick={() => setAction({ item: b, kind: 'AID_DISBURSED' })}>Record aid given</button>}
                        {b.status !== 'AID_DISBURSED' && <button type="button" className={btn.small} onClick={() => setEditing(b)}>Edit</button>}
                        {(b.status === 'APPLIED' || b.status === 'VERIFIED') && <button type="button" className={btn.small} onClick={() => setAction({ item: b, kind: 'REJECTED' })}>Not eligible</button>}
                        {b.status === 'REJECTED' && <button type="button" className={btn.small} onClick={() => setAction({ item: b, kind: 'APPLIED' })}>Reopen</button>}
                        {b.status !== 'AID_DISBURSED' && <button type="button" className={`${btn.small} text-rose-700`} onClick={() => setAction({ item: b, kind: 'delete' })}>Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <BeneficiaryEditor
          item={editing}
          campaigns={campaigns}
          onClose={() => setEditing(null)}
          onSaved={(b, isNew) => { setEditing(null); setNotice({ tone: 'ok', text: isNew ? `${b.name} added to the register.` : `${b.name} updated.` }); load(); }}
        />
      )}
      {action && (
        <StatusAction
          action={action}
          onClose={() => setAction(null)}
          onDone={text => { setAction(null); setNotice({ tone: 'ok', text }); load(); }}
        />
      )}
    </section>
  );
}

function StatusAction({ action, onClose, onDone }) {
  const { item: b, kind } = action;
  const [amount, setAmount] = useState(b.amount_valuation ? String(b.amount_valuation) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    setBusy(true);
    setError('');
    let res;
    if (kind === 'delete') res = await deleteBeneficiary(b.id);
    else {
      const notes = note.trim() ? [b.notes, `${kind === 'REJECTED' ? 'Not eligible' : 'Aid given'}: ${note.trim()}`].filter(Boolean).join('\n') : undefined;
      res = await updateBeneficiary(b.id, { status: kind, ...(kind === 'AID_DISBURSED' ? { amount_valuation: Number(amount) } : {}), ...(notes ? { notes } : {}) });
    }
    setBusy(false);
    if (!res.ok) { setError(errorText(res)); return; }
    onDone({
      VERIFIED: `${b.name} verified.`,
      AID_DISBURSED: `Aid of ${inr(amount)} recorded for ${b.name}.`,
      REJECTED: `${b.name} marked not eligible.`,
      APPLIED: `${b.name} reopened for checking.`,
      delete: `${b.name} removed from the register.`
    }[kind]);
  };

  const copy = {
    VERIFIED: ['Verify beneficiary', 'Confirm you or a coordinator has checked who they are and that they need this help. Your name is recorded as the verifier.', 'Verify'],
    AID_DISBURSED: ['Record aid given', 'Record this only after the money or materials have been handed over. This record cannot be deleted later.', 'Record aid given'],
    REJECTED: ['Mark not eligible', 'They will stay in the register as not eligible. You can reopen the record later.', 'Mark not eligible'],
    APPLIED: ['Reopen record', 'The record goes back to “To be checked”.', 'Reopen'],
    delete: ['Delete record', 'This removes the record permanently.', 'Delete']
  }[kind];

  return (
    <ConfirmDialog title={copy[0]} confirmLabel={copy[2]} tone={kind === 'delete' ? 'danger' : 'primary'} busy={busy} onClose={onClose} onConfirm={run}>
      <p className="font-semibold text-neutral-900">{b.name} <span className="font-normal text-neutral-muted">· {b.district}</span></p>
      <p className="mt-1">{copy[1]}</p>
      {kind === 'AID_DISBURSED' && (
        <div className="mt-3 grid gap-3">
          <Field label={`Amount or value of the ${String(b.support_type || 'aid').toLowerCase()} (₹)`}>{id => <input id={id} className={inputCls} inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} />}</Field>
          <Field label="Note" hint="Optional: what was given, cheque number, who received it.">{id => <input id={id} className={inputCls} value={note} onChange={e => setNote(e.target.value)} maxLength={200} />}</Field>
        </div>
      )}
      {kind === 'REJECTED' && (
        <div className="mt-3"><Field label="Reason" hint="Optional, kept in the notes.">{id => <input id={id} className={inputCls} value={note} onChange={e => setNote(e.target.value)} maxLength={200} />}</Field></div>
      )}
      {error && <div className="mt-3"><Notice notice={{ tone: 'error', text: error }} /></div>}
    </ConfirmDialog>
  );
}

function BeneficiaryEditor({ item, campaigns, onClose, onSaved }) {
  const isNew = !item.id;
  const [form, setForm] = useState(() => ({ ...EMPTY, ...Object.fromEntries(Object.entries(item).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ text: '', field: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const err = f => (error.field === f ? error.text : '');

  const submit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.district) { setError({ text: 'Enter the name and choose a district.', field: '' }); return; }
    setBusy(true);
    setError({ text: '', field: '' });
    const payload = { ...form, amount_valuation: Number(form.amount_valuation) || 0 };
    const res = isNew ? await createBeneficiary(payload) : await updateBeneficiary(item.id, payload);
    setBusy(false);
    if (!res.ok) { setError({ text: errorText(res), field: res.data?.field || '' }); return; }
    onSaved(res.data.beneficiary, isNew);
  };

  return (
    <Modal
      title={isNew ? 'Add beneficiary' : 'Edit beneficiary'}
      description={isNew ? 'New records start as “To be checked”.' : undefined}
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <SubmitButton form="ben-form" busy={busy}>{isNew ? 'Add to register' : 'Save changes'}</SubmitButton>
        </>
      )}
    >
      <form id="ben-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {error.text && !error.field && <div className="sm:col-span-2"><Notice notice={{ tone: 'error', text: error.text }} /></div>}
        <Field label="Name" className="sm:col-span-2">{id => <input id={id} className={inputCls} value={form.name} maxLength={160} onChange={e => set('name', e.target.value)} placeholder="Person, family or institution" />}</Field>
        <Field label="Type">{id => <select id={id} className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>}</Field>
        <Field label="District">
          {id => (
            <select id={id} className={inputCls} value={form.district} onChange={e => set('district', e.target.value)}>
              <option value="">Choose a district</option>
              {DISTRICTS.map(d => <option key={d}>{d}</option>)}
            </select>
          )}
        </Field>
        <Field label="Cause">{id => <select id={id} className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(t => <option key={t}>{t}</option>)}</select>}</Field>
        <Field label="Support needed">{id => <select id={id} className={inputCls} value={form.support_type} onChange={e => set('support_type', e.target.value)}>{SUPPORT.map(t => <option key={t}>{t}</option>)}</select>}</Field>
        <Field label="Contact number" error={err('contact_phone')} hint="Optional.">{id => <input id={id} className={inputCls} inputMode="numeric" value={form.contact_phone} onChange={e => set('contact_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />}</Field>
        <Field label="Estimated need (₹)" hint="Optional until aid is given.">{id => <input id={id} className={inputCls} inputMode="numeric" value={form.amount_valuation} onChange={e => set('amount_valuation', e.target.value.replace(/\D/g, ''))} />}</Field>
        <Field label="Funded by campaign" className="sm:col-span-2" hint="Optional.">
          {id => (
            <select id={id} className={inputCls} value={form.linked_campaign_id} onChange={e => set('linked_campaign_id', e.target.value)}>
              <option value="">Not linked to a campaign</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
        </Field>
        <Field label="Notes" className="sm:col-span-2" hint="Who referred them, what was checked, documents seen.">{id => <textarea id={id} rows={3} className={`${inputCls} py-2`} value={form.notes} maxLength={2000} onChange={e => set('notes', e.target.value)} />}</Field>
      </form>
    </Modal>
  );
}
