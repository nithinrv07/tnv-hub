import { useCallback, useEffect, useMemo, useState } from 'react';
import Spinner from '../Spinner.jsx';
import { getInKindDonations, createInKindDonation, updateInKindDonation, errorText } from '../../lib/donationService.js';
import { TRUST } from '../../data/site.js';
import {
  inr, formatDate, formatDateTime, todayISO, btn, inputCls, PageHeader, StatGrid, Badge, Notice, Card, Loading, Empty,
  Tabs, SearchBox, Field, Modal, SubmitButton, downloadCsv, TABLE
} from './donations/ui.jsx';

// Admin > In-Kind / Material Gifts: rice, clothes, books, equipment given instead
// of money. Each gift gets an acknowledgement number and moves one way only:
// received → sent out → distributed, with who did what and when.

const CATEGORIES = ['Food and groceries', 'Clothes and blankets', 'Books and stationery', 'Medical supplies', 'Saplings and garden', 'Equipment', 'Other'];
const UNITS = ['units', 'kg', 'bags', 'boxes', 'packets', 'litres', 'sets', 'pieces'];
const STATUS = {
  RECEIVED: { label: 'In store', tone: 'amber' },
  IN_TRANSIT: { label: 'Sent out', tone: 'blue' },
  DISTRIBUTED: { label: 'Distributed', tone: 'green' }
};
const EMPTY = { item_name: '', category: 'Food and groceries', quantity: '', unit: 'units', estimated_valuation: '', donor_name: '', donor_phone: '', recipient_unit: 'State office store', received_on: todayISO() };

export default function AdminInKindDonations() {
  const [state, setState] = useState({ loading: true, items: [], total: 0, error: '' });
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null); // { kind: 'new'|'move'|'history', item, to }

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const res = await getInKindDonations();
    setState({ loading: false, items: res.items, total: res.total_valuation, error: res.ok ? '' : res.error });
  }, []);
  useEffect(() => { load(); }, [load]);

  const items = state.items;
  const count = s => items.filter(d => d.status === s).length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(d => tab === 'all' || d.status === tab)
      .filter(d => !q || [d.item_name, d.donor_name, d.donor_phone, d.certificate_no, d.distributed_to, d.category].some(v => String(v || '').toLowerCase().includes(q)));
  }, [items, tab, query]);

  const stats = [
    { label: 'Gifts recorded', value: items.length, note: (n => `${n} donor${n === 1 ? "" : "s"}`)(new Set(items.map(d => d.donor_name)).size) },
    { label: 'Estimated value', value: inr(state.total), note: 'As stated by the donor or valued at receipt' },
    { label: 'In store', value: count('RECEIVED'), note: 'Received, not yet sent out', attention: count('RECEIVED') ? 'amber' : null },
    { label: 'Distributed', value: count('DISTRIBUTED'), note: `${count('IN_TRANSIT')} on the way` }
  ];

  const done = text => { setModal(null); setNotice({ tone: 'ok', text }); load(); };

  const exportCsv = () => downloadCsv(`TNV_in_kind_gifts_${new Date().toISOString().slice(0, 10)}.csv`,
    ['Acknowledgement no', 'Received on', 'Item', 'Category', 'Quantity', 'Unit', 'Estimated value (INR)', 'Donor', 'Donor phone', 'Stored at', 'Status', 'Distributed to', 'Recorded by'],
    shown.map(d => [d.certificate_no, d.received_on, d.item_name, d.category, d.quantity, d.unit, d.estimated_valuation, d.donor_name, d.donor_phone, d.recipient_unit, STATUS[d.status]?.label, d.distributed_to, d.recorded_by]));

  return (
    <section className="space-y-5">
      <PageHeader
        title="In-kind and material gifts"
        description="Goods given instead of money. Record each gift when it arrives, give the donor the acknowledgement, and mark where it went. Gifts in kind are not eligible for 80G, so the acknowledgement is not a tax receipt."
        actions={(
          <>
            <button type="button" className={btn.primary} onClick={() => setModal({ kind: 'new' })}>Record a gift</button>
            <button type="button" className={btn.secondary} onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
            <button type="button" className={btn.secondary} onClick={load} disabled={state.loading}>{state.loading && <Spinner className="h-3.5 w-3.5" />}Refresh</button>
          </>
        )}
      />
      <StatGrid items={stats} />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs label="Filter by status" value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: items.length }, ...Object.entries(STATUS).map(([id, s]) => ({ id, label: s.label, count: count(id) }))]} />
          <SearchBox value={query} onChange={setQuery} placeholder="Item, donor, acknowledgement no" label="Search gifts" />
        </div>
        {state.loading && !items.length ? <Loading label="Loading gifts…" /> : state.error ? (
          <div className="p-4"><Notice notice={{ tone: 'error', text: state.error }} /></div>
        ) : !shown.length ? (
          <Empty title={items.length ? 'No matches' : 'No gifts recorded yet'} action={!items.length && <button type="button" className={btn.primary} onClick={() => setModal({ kind: 'new' })}>Record the first gift</button>}>
            {items.length ? 'Change the filter or search.' : 'Record rice bags, clothes, books or equipment when they arrive at the office or a district store.'}
          </Empty>
        ) : (
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th scope="col" className={TABLE.th}>Gift</th>
                  <th scope="col" className={TABLE.th}>Donor</th>
                  <th scope="col" className={`${TABLE.th} text-right`}>Value</th>
                  <th scope="col" className={TABLE.th}>Status</th>
                  <th scope="col" className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(d => (
                  <tr key={d.id} className={TABLE.row}>
                    <td className={`${TABLE.td} max-w-xs`}>
                      <p className="font-semibold text-neutral-900">{d.item_name}</p>
                      <p className="text-xs text-neutral-muted">{Number(d.quantity).toLocaleString('en-IN')} {d.unit} · {d.category}</p>
                      <p className="font-mono text-[11px] text-neutral-500">{d.certificate_no} · {formatDate(d.received_on)}</p>
                    </td>
                    <td className={`${TABLE.td} text-xs`}><p className="font-semibold text-neutral-900">{d.donor_name}</p><p className="text-neutral-muted">{d.donor_phone || '—'}</p></td>
                    <td className={`${TABLE.td} whitespace-nowrap text-right tabular-nums`}>{d.estimated_valuation ? inr(d.estimated_valuation) : '—'}</td>
                    <td className={`${TABLE.td} max-w-[14rem]`}>
                      <Badge tone={STATUS[d.status]?.tone}>{STATUS[d.status]?.label || d.status}</Badge>
                      <p className="mt-1 text-[11px] text-neutral-muted">{d.status === 'DISTRIBUTED' ? (d.distributed_to ? `To ${d.distributed_to}` : '') : `At ${d.recipient_unit}`}</p>
                    </td>
                    <td className={`${TABLE.td} text-right`}>
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        {d.status === 'RECEIVED' && <button type="button" className={btn.small} onClick={() => setModal({ kind: 'move', item: d, to: 'IN_TRANSIT' })}>Mark sent out</button>}
                        {d.status !== 'DISTRIBUTED' && <button type="button" className={btn.smallPrimary} onClick={() => setModal({ kind: 'move', item: d, to: 'DISTRIBUTED' })}>Mark distributed</button>}
                        <button type="button" className={btn.small} onClick={() => printAcknowledgement(d)}>Acknowledgement</button>
                        <button type="button" className={btn.small} onClick={() => setModal({ kind: 'history', item: d })}>History</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal?.kind === 'new' && <GiftForm onClose={() => setModal(null)} onDone={d => done(`Gift recorded with acknowledgement ${d.certificate_no}.`)} />}
      {modal?.kind === 'move' && <MoveForm item={modal.item} to={modal.to} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'history' && (
        <Modal title={modal.item.item_name} description={`${modal.item.certificate_no} · from ${modal.item.donor_name}`} onClose={() => setModal(null)} footer={<button type="button" className={btn.primary} onClick={() => setModal(null)}>Close</button>}>
          <ol className="space-y-3">
            {(modal.item.history || []).map((h, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                <div>
                  <p className="font-semibold text-neutral-900">{STATUS[h.status]?.label || h.status}</p>
                  <p className="text-xs text-neutral-muted">{formatDateTime(h.at)} · {h.by}{h.note ? ` · ${h.note}` : ''}</p>
                </div>
              </li>
            ))}
          </ol>
        </Modal>
      )}
    </section>
  );
}

function GiftForm({ onClose, onDone }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ text: '', field: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const err = f => (error.field === f ? error.text : '');
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError({ text: '', field: '' });
    const res = await createInKindDonation({ ...form, quantity: Number(form.quantity), estimated_valuation: Number(form.estimated_valuation) || 0 });
    setBusy(false);
    if (!res.ok) { setError({ text: errorText(res), field: res.data?.field || '' }); return; }
    onDone(res.data.donation);
  };
  return (
    <Modal title="Record a gift" description="The donor gets an acknowledgement number for this gift." onClose={onClose} size="lg" footer={<><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><SubmitButton form="gift-form" busy={busy}>Record gift</SubmitButton></>}>
      <form id="gift-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {error.text && !error.field && <div className="sm:col-span-2"><Notice notice={{ tone: 'error', text: error.text }} /></div>}
        <Field label="What was given" className="sm:col-span-2">{id => <input id={id} className={inputCls} value={form.item_name} maxLength={160} onChange={e => set('item_name', e.target.value)} placeholder="Rice, 25 kg bags" />}</Field>
        <Field label="Category">{id => <select id={id} className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>}</Field>
        <div className="grid grid-cols-[1fr_8rem] gap-2">
          <Field label="Quantity" error={err('quantity')}>{id => <input id={id} className={inputCls} inputMode="decimal" value={form.quantity} onChange={e => set('quantity', e.target.value.replace(/[^\d.]/g, ''))} />}</Field>
          <Field label="Unit">{id => <select id={id} className={inputCls} value={form.unit} onChange={e => set('unit', e.target.value)}>{UNITS.map(u => <option key={u}>{u}</option>)}</select>}</Field>
        </div>
        <Field label="Donor name">{id => <input id={id} className={inputCls} value={form.donor_name} maxLength={120} onChange={e => set('donor_name', e.target.value)} />}</Field>
        <Field label="Donor mobile" error={err('donor_phone')} hint="Optional.">{id => <input id={id} className={inputCls} inputMode="numeric" value={form.donor_phone} onChange={e => set('donor_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />}</Field>
        <Field label="Estimated value (₹)" hint="Optional. Used for reporting only.">{id => <input id={id} className={inputCls} inputMode="numeric" value={form.estimated_valuation} onChange={e => set('estimated_valuation', e.target.value.replace(/\D/g, ''))} />}</Field>
        <Field label="Received on">{id => <input id={id} type="date" max={todayISO()} className={inputCls} value={form.received_on} onChange={e => set('received_on', e.target.value)} />}</Field>
        <Field label="Stored at" className="sm:col-span-2">{id => <input id={id} className={inputCls} value={form.recipient_unit} maxLength={120} onChange={e => set('recipient_unit', e.target.value)} />}</Field>
      </form>
    </Modal>
  );
}

function MoveForm({ item, to, onClose, onDone }) {
  const [where, setWhere] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const distributing = to === 'DISTRIBUTED';
  const submit = async e => {
    e.preventDefault();
    if (distributing && where.trim().length < 3) { setError('Say where or to whom it was given.'); return; }
    setBusy(true);
    setError('');
    const res = await updateInKindDonation(item.id, { status: to, distributed_to: distributing ? where.trim() : undefined, note: note.trim() || (!distributing && where.trim() ? `To ${where.trim()}` : undefined) });
    setBusy(false);
    if (!res.ok) { setError(errorText(res)); return; }
    onDone(distributing ? `${item.item_name} marked distributed to ${where.trim()}.` : `${item.item_name} marked as sent out.`);
  };
  return (
    <Modal
      title={distributing ? 'Mark distributed' : 'Mark sent out'}
      description={`${item.item_name} · ${Number(item.quantity).toLocaleString('en-IN')} ${item.unit}`}
      size="sm"
      onClose={onClose}
      footer={<><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><SubmitButton form="move-form" busy={busy}>{distributing ? 'Mark distributed' : 'Mark sent out'}</SubmitButton></>}
    >
      <form id="move-form" onSubmit={submit} className="space-y-4" noValidate>
        {error && <Notice notice={{ tone: 'error', text: error }} />}
        <Field label={distributing ? 'Given to' : 'Sent to'} hint={distributing ? 'Camp, school, village or beneficiary.' : 'Optional.'}>{id => <input id={id} className={inputCls} value={where} maxLength={160} onChange={e => setWhere(e.target.value)} />}</Field>
        <Field label="Note" hint="Optional.">{id => <input id={id} className={inputCls} value={note} maxLength={200} onChange={e => setNote(e.target.value)} />}</Field>
        <p className="text-xs text-neutral-muted">This step cannot be undone. Status only moves forward so the record stays reliable.</p>
      </form>
    </Modal>
  );
}

// A one-page acknowledgement for the donor, printed from its own window.
function printAcknowledgement(d) {
  const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.certificate_no)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1f2937; margin: 0; }
  .wrap { max-width: 680px; margin: 24px auto; border: 1px solid #d1d5db; padding: 36px 40px; }
  header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #1B6B3A; padding-bottom: 14px; }
  header img { height: 56px; }
  h1 { font-size: 20px; margin: 0; color: #124D29; }
  .sub { font: 12px Arial, sans-serif; color: #6b7280; margin-top: 2px; }
  h2 { font-size: 16px; text-align: center; margin: 28px 0 6px; letter-spacing: .02em; }
  .no { text-align: center; font: 12px Arial, sans-serif; color: #374151; }
  p { font-size: 14px; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin: 18px 0; font: 13px Arial, sans-serif; }
  td { border: 1px solid #e5e7eb; padding: 8px 10px; vertical-align: top; }
  td:first-child { width: 38%; color: #6b7280; }
  .note { font: 11px Arial, sans-serif; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 28px; }
  .sign { margin-top: 48px; display: flex; justify-content: flex-end; font: 12px Arial, sans-serif; text-align: center; }
  .sign div { border-top: 1px solid #9ca3af; padding-top: 6px; width: 200px; }
  @media print { .wrap { border: 0; margin: 0; } }
</style></head><body><div class="wrap">
<header><img src="${window.location.origin}/tnv-logo.png" alt="" onerror="this.remove()"><div><h1>${esc(TRUST.name)}</h1><div class="sub">PAN ${esc(TRUST.pan)} · ${esc(TRUST.bank)}</div></div></header>
<h2>Acknowledgement of gift in kind</h2>
<div class="no">No. ${esc(d.certificate_no)} · ${esc(formatDate(d.received_on))}</div>
<p>We gratefully acknowledge the following gift received from <strong>${esc(d.donor_name)}</strong> for the charitable work of Tamil Nadu Volunteers.</p>
<table>
<tr><td>Item</td><td>${esc(d.item_name)}</td></tr>
<tr><td>Category</td><td>${esc(d.category)}</td></tr>
<tr><td>Quantity</td><td>${esc(Number(d.quantity).toLocaleString('en-IN'))} ${esc(d.unit)}</td></tr>
${d.estimated_valuation ? `<tr><td>Value stated by the donor</td><td>${esc(inr(d.estimated_valuation))}</td></tr>` : ''}
<tr><td>Received at</td><td>${esc(d.recipient_unit)}</td></tr>
</table>
<p>Thank you for your generosity.</p>
<div class="sign"><div>Authorised signatory<br>${esc(TRUST.name)}</div></div>
<div class="note">This acknowledges a gift of goods. Under the Income Tax Act, only donations of money qualify for deduction under Section 80G, so this document is not a tax receipt.</div>
</div><script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`);
  w.document.close();
}
