import { useCallback, useEffect, useMemo, useState } from 'react';
import Spinner from '../Spinner.jsx';
import REGISTRATION from '../../data/registrationOptions.json';
import {
  getCoordinatorDonations, createCoordinator, updateCoordinator, recordCoordinatorCollection, remitCoordinatorCollection, errorText
} from '../../lib/donationService.js';
import {
  inr, formatDate, formatDateTime, todayISO, btn, inputCls, PageHeader, StatGrid, Badge, Notice, Card, Loading, Empty,
  SearchBox, Field, Modal, SubmitButton, downloadCsv, TABLE
} from './donations/ui.jsx';

// Admin > Coordinator Collections. District coordinators collect cash and UPI at
// drives. Each amount they report is recorded here and stays "with the
// coordinator" until the money reaches the trust's account and is settled with
// its bank reference.

const DISTRICTS = REGISTRATION.districts.map(d => d.name);
const MODES = ['UPI', 'Bank transfer', 'Cash deposit'];

export default function AdminCoordinatorDonations() {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [query, setQuery] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null); // { kind: 'coordinator'|'collect'|'settle'|'history', item }

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const res = await getCoordinatorDonations();
    setState({ loading: false, data: res, error: res.ok ? '' : res.error });
  }, []);
  useEffect(() => { load(); }, [load]);

  const data = state.data || { coordinators: [], total_collected: 0, total_target: 0, pending_reconciliation: 0 };
  const list = data.coordinators;
  const withPending = list.filter(c => c.pending_amount > 0);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter(c => !onlyPending || c.pending_amount > 0)
      .filter(c => !q || [c.coordinator_name, c.district, c.wing, c.phone].some(v => String(v || '').toLowerCase().includes(q)));
  }, [list, query, onlyPending]);

  const pct = data.total_target ? Math.round((data.total_collected / data.total_target) * 100) : 0;
  const stats = [
    { label: 'Coordinators', value: list.length, note: (n => `${n} district${n === 1 ? "" : "s"}`)(new Set(list.map(c => c.district)).size) },
    { label: 'Collected', value: inr(data.total_collected), note: data.total_target ? `${pct}% of ${inr(data.total_target)} target` : 'No targets set' },
    { label: 'Still with coordinators', value: inr(data.pending_reconciliation), note: withPending.length ? `${withPending.length} coordinator${withPending.length === 1 ? '' : 's'} to settle` : 'Everything has reached the trust', attention: withPending.length ? 'amber' : null },
    { label: 'Received at the trust', value: inr(data.total_collected - data.pending_reconciliation), note: 'Settled with a bank reference' }
  ];

  const done = (text, next) => {
    setModal(null);
    setNotice({ tone: 'ok', text });
    if (next) setState(s => ({ ...s, data: { ...s.data, ...next } }));
    else load();
  };

  const exportCsv = () => {
    const rows = [];
    list.forEach(c => (c.entries || []).forEach(e => rows.push([c.coordinator_name, c.district, e.collected_on, e.amount, e.donor_count, e.status === 'SETTLED' ? 'Received at trust' : 'With coordinator', e.notes, e.recorded_by])));
    downloadCsv(`TNV_coordinator_collections_${new Date().toISOString().slice(0, 10)}.csv`, ['Coordinator', 'District', 'Collected on', 'Amount (INR)', 'Donors', 'Status', 'Notes', 'Recorded by'], rows);
  };

  return (
    <section className="space-y-5">
      <PageHeader
        title="Coordinator collections"
        description="Money district coordinators collect at drives. Record each collection when it is reported, then settle it when the money reaches the trust’s account, with the bank reference."
        actions={(
          <>
            <button type="button" className={btn.primary} onClick={() => setModal({ kind: 'coordinator', item: {} })}>Add coordinator</button>
            <button type="button" className={btn.secondary} onClick={exportCsv} disabled={!list.length}>Export CSV</button>
            <button type="button" className={btn.secondary} onClick={load} disabled={state.loading}>{state.loading && <Spinner className="h-3.5 w-3.5" />}Refresh</button>
          </>
        )}
      />
      <StatGrid items={stats} />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" className="h-4 w-4 accent-brand-green" checked={onlyPending} onChange={e => setOnlyPending(e.target.checked)} />
            Only coordinators holding money ({withPending.length})
          </label>
          <SearchBox value={query} onChange={setQuery} placeholder="Name, district, phone" label="Search coordinators" />
        </div>
        {state.loading && !list.length ? <Loading label="Loading collections…" /> : state.error ? (
          <div className="p-4"><Notice notice={{ tone: 'error', text: state.error }} /></div>
        ) : !shown.length ? (
          <Empty title={list.length ? 'No matches' : 'No coordinators yet'} action={!list.length && <button type="button" className={btn.primary} onClick={() => setModal({ kind: 'coordinator', item: {} })}>Add a coordinator</button>}>
            {list.length ? 'Change the search or filter.' : 'Add each district coordinator who collects donations, with their collection target.'}
          </Empty>
        ) : (
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th scope="col" className={TABLE.th}>Coordinator</th>
                  <th scope="col" className={`${TABLE.th} min-w-[11rem]`}>Collected</th>
                  <th scope="col" className={`${TABLE.th} text-right`}>With coordinator</th>
                  <th scope="col" className={TABLE.th}>Last settled</th>
                  <th scope="col" className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(c => {
                  const p = c.target_quota ? Math.min(100, Math.round((c.collected_amount / c.target_quota) * 100)) : null;
                  return (
                    <tr key={c.id} className={TABLE.row}>
                      <td className={TABLE.td}>
                        <p className="font-semibold text-neutral-900">{c.coordinator_name}</p>
                        <p className="text-xs text-neutral-muted">{[c.district, c.wing, c.phone].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className={TABLE.td}>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-semibold tabular-nums">{inr(c.collected_amount)}</span>
                          <span className="tabular-nums text-neutral-muted">{c.target_quota ? `of ${inr(c.target_quota)}` : 'No target'}</span>
                        </div>
                        {p !== null && (
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${p}% of target`}>
                            <div className="h-full rounded-full bg-brand-green" style={{ width: `${p}%` }} />
                          </div>
                        )}
                      </td>
                      <td className={`${TABLE.td} whitespace-nowrap text-right`}>
                        {c.pending_amount > 0 ? <span className="font-semibold tabular-nums text-amber-800">{inr(c.pending_amount)}</span> : <Badge tone="green">Settled</Badge>}
                      </td>
                      <td className={`${TABLE.td} whitespace-nowrap text-xs text-neutral-600`}>
                        {c.last_remittance_date ? <>{formatDate(c.last_remittance_date)}<p className="text-neutral-muted">{c.remittance_mode}</p></> : 'Never'}
                      </td>
                      <td className={`${TABLE.td} text-right`}>
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button type="button" className={btn.small} onClick={() => setModal({ kind: 'collect', item: c })}>Record collection</button>
                          {c.pending_amount > 0 && <button type="button" className={btn.smallPrimary} onClick={() => setModal({ kind: 'settle', item: c })}>Settle</button>}
                          <button type="button" className={btn.small} onClick={() => setModal({ kind: 'history', item: c })}>History</button>
                          <button type="button" className={btn.small} onClick={() => setModal({ kind: 'coordinator', item: c })}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal?.kind === 'coordinator' && <CoordinatorForm item={modal.item} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'collect' && <CollectionForm item={modal.item} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'settle' && <SettleForm item={modal.item} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'history' && <History item={modal.item} onClose={() => setModal(null)} />}
    </section>
  );
}

function useForm(initial) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ text: '', field: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const err = f => (error.field === f ? error.text : '');
  const run = async (fn, onOk) => {
    setBusy(true);
    setError({ text: '', field: '' });
    const res = await fn();
    setBusy(false);
    if (!res.ok) { setError({ text: errorText(res), field: res.data?.field || '' }); return; }
    onOk(res.data);
  };
  const generalError = error.text && !error.field ? <div className="sm:col-span-2"><Notice notice={{ tone: 'error', text: error.text }} /></div> : null;
  return { form, set, busy, err, run, generalError };
}

function CoordinatorForm({ item, onClose, onDone }) {
  const isNew = !item.id;
  const { form, set, busy, err, run, generalError } = useForm({
    coordinator_name: item.coordinator_name || '', phone: item.phone || '', district: item.district || '', wing: item.wing || '', target_quota: item.target_quota ? String(item.target_quota) : ''
  });
  const submit = e => {
    e.preventDefault();
    const payload = { ...form, target_quota: Number(form.target_quota) || 0 };
    run(() => (isNew ? createCoordinator(payload) : updateCoordinator(item.id, payload)), d => onDone(isNew ? `${form.coordinator_name} added.` : `${form.coordinator_name} updated.`, d));
  };
  return (
    <Modal title={isNew ? 'Add coordinator' : 'Edit coordinator'} onClose={onClose} footer={<><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><SubmitButton form="coord-form" busy={busy}>{isNew ? 'Add coordinator' : 'Save changes'}</SubmitButton></>}>
      <form id="coord-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {generalError}
        <Field label="Name" className="sm:col-span-2">{id => <input id={id} className={inputCls} value={form.coordinator_name} onChange={e => set('coordinator_name', e.target.value)} />}</Field>
        <Field label="Mobile number" error={err('phone')}>{id => <input id={id} className={inputCls} inputMode="numeric" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />}</Field>
        <Field label="District">
          {id => <select id={id} className={inputCls} value={form.district} onChange={e => set('district', e.target.value)}><option value="">Choose a district</option>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select>}
        </Field>
        <Field label="Wing" hint="Optional.">{id => <input id={id} className={inputCls} value={form.wing} onChange={e => set('wing', e.target.value)} />}</Field>
        <Field label="Collection target (₹)" hint="Optional.">{id => <input id={id} className={inputCls} inputMode="numeric" value={form.target_quota} onChange={e => set('target_quota', e.target.value.replace(/\D/g, ''))} />}</Field>
      </form>
    </Modal>
  );
}

function CollectionForm({ item, onClose, onDone }) {
  const { form, set, busy, err, run, generalError } = useForm({ amount: '', donor_count: '', collected_on: todayISO(), notes: '' });
  const submit = e => {
    e.preventDefault();
    run(() => recordCoordinatorCollection(item.id, { ...form, amount: Number(form.amount), donor_count: Number(form.donor_count) || 1 }), d => onDone(`${inr(form.amount)} recorded for ${item.coordinator_name}. It stays with the coordinator until settled.`, d));
  };
  return (
    <Modal title="Record collection" description={`${item.coordinator_name} · ${item.district}`} onClose={onClose} footer={<><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><SubmitButton form="collect-form" busy={busy}>Record</SubmitButton></>}>
      <form id="collect-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {generalError}
        <Field label="Amount collected (₹)" error={err('amount')}>{id => <input id={id} className={inputCls} inputMode="decimal" value={form.amount} onChange={e => set('amount', e.target.value.replace(/[^\d.]/g, ''))} />}</Field>
        <Field label="Number of donors">{id => <input id={id} className={inputCls} inputMode="numeric" value={form.donor_count} onChange={e => set('donor_count', e.target.value.replace(/\D/g, ''))} />}</Field>
        <Field label="Collected on" error={err('collected_on')}>{id => <input id={id} type="date" max={todayISO()} className={inputCls} value={form.collected_on} onChange={e => set('collected_on', e.target.value)} />}</Field>
        <Field label="Where / notes" hint="Optional: event or place.">{id => <input id={id} className={inputCls} value={form.notes} maxLength={300} onChange={e => set('notes', e.target.value)} />}</Field>
      </form>
    </Modal>
  );
}

function SettleForm({ item, onClose, onDone }) {
  const { form, set, busy, err, run, generalError } = useForm({ remittance_mode: 'UPI', reference: '', notes: '' });
  const pending = (item.entries || []).filter(e => e.status === 'PENDING');
  const submit = e => {
    e.preventDefault();
    run(() => remitCoordinatorCollection({ id: item.id, amount: item.pending_amount, ...form }), d => onDone(`${inr(item.pending_amount)} from ${item.coordinator_name} marked as received at the trust.`, d));
  };
  return (
    <Modal title="Settle with the trust" description={`${item.coordinator_name} · ${item.district}`} onClose={onClose} footer={<><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><SubmitButton form="settle-form" busy={busy}>Mark {inr(item.pending_amount)} received</SubmitButton></>}>
      <form id="settle-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {generalError}
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm sm:col-span-2">
          <p className="text-neutral-700">Settling {pending.length} collection{pending.length === 1 ? '' : 's'} totalling <strong className="tabular-nums">{inr(item.pending_amount)}</strong>.</p>
          <p className="mt-1 text-xs text-neutral-muted">Check the credit in the trust’s bank statement first. If the coordinator sent a different amount, record a correction as a new collection before settling.</p>
          {err('amount') && <p className="mt-1 text-xs text-rose-700">{err('amount')}</p>}
        </div>
        <Field label="How it was sent" error={err('remittance_mode')}>
          {id => <select id={id} className={inputCls} value={form.remittance_mode} onChange={e => set('remittance_mode', e.target.value)}>{MODES.map(m => <option key={m}>{m}</option>)}</select>}
        </Field>
        <Field label={form.remittance_mode === 'Cash deposit' ? 'Deposit slip number' : 'UTR / bank reference'} error={err('reference')} hint={form.remittance_mode === 'Cash deposit' ? 'Optional.' : undefined}>
          {id => <input id={id} className={`${inputCls} font-mono`} value={form.reference} maxLength={60} onChange={e => set('reference', e.target.value.trim())} />}
        </Field>
        <Field label="Notes" className="sm:col-span-2" hint="Optional.">{id => <input id={id} className={inputCls} value={form.notes} maxLength={300} onChange={e => set('notes', e.target.value)} />}</Field>
      </form>
    </Modal>
  );
}

function History({ item, onClose }) {
  const entries = item.entries || [];
  const settlements = item.settlements || [];
  return (
    <Modal title={`${item.coordinator_name}: history`} description={`${item.district} · ${inr(item.collected_amount)} collected`} onClose={onClose} size="lg" footer={<button type="button" className={btn.primary} onClick={onClose}>Close</button>}>
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-sm font-semibold text-neutral-900">Collections</h4>
          {!entries.length ? <p className="text-sm text-neutral-muted">No collections recorded.</p> : (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {entries.map(e => (
                <li key={e.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums">{inr(e.amount)} <span className="font-normal text-neutral-muted">from {e.donor_count} donor{e.donor_count === 1 ? '' : 's'}</span></p>
                    <p className="text-xs text-neutral-muted">{formatDate(e.collected_on)}{e.notes ? ` · ${e.notes}` : ''} · recorded by {e.recorded_by}</p>
                  </div>
                  <Badge tone={e.status === 'SETTLED' ? 'green' : 'amber'}>{e.status === 'SETTLED' ? 'Received' : 'With coordinator'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h4 className="mb-2 text-sm font-semibold text-neutral-900">Settlements</h4>
          {!settlements.length ? <p className="text-sm text-neutral-muted">Nothing settled yet.</p> : (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {settlements.map(s => (
                <li key={s.id} className="px-3 py-2.5 text-sm">
                  <p className="font-semibold tabular-nums">{inr(s.amount)} <span className="font-normal text-neutral-muted">by {s.mode}</span></p>
                  <p className="text-xs text-neutral-muted">{formatDateTime(s.settled_at)} · {s.reference ? <span className="font-mono">{s.reference}</span> : 'no reference'} · {s.settled_by}{s.notes ? ` · ${s.notes}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
