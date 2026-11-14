import { useCallback, useEffect, useMemo, useState } from 'react';
import Spinner from '../Spinner.jsx';
import { getRecurringPledges, createRecurringPledge, recordPledgePayment, setPledgeStatus, errorText } from '../../lib/donationService.js';
import {
  inr, formatDate, todayISO, btn, inputCls, PageHeader, StatGrid, Badge, Notice, Card, Loading, Empty,
  Tabs, SearchBox, Field, Modal, ConfirmDialog, SubmitButton, downloadCsv, TABLE
} from './donations/ui.jsx';

// Admin > Recurring Pledges. A pledge is a donor's promise to give a fixed amount
// every month, quarter or year. Nothing is debited automatically: when the money
// arrives, record it here with its bank reference and the next due date moves on.

const FREQ = { MONTHLY: { label: 'Monthly', per: 'month', months: 1 }, QUARTERLY: { label: 'Quarterly', per: 'quarter', months: 3 }, YEARLY: { label: 'Yearly', per: 'year', months: 12 } };
const STATUS = { ACTIVE: { label: 'Active', tone: 'green' }, PAUSED: { label: 'Paused', tone: 'grey' }, CANCELLED: { label: 'Cancelled', tone: 'rose' } };
const METHODS = ['UPI', 'Bank transfer', 'Standing instruction', 'Cheque', 'Cash'];
const ordinal = n => `${n}${[, 'st', 'nd', 'rd'][(n % 100 >> 3 ^ 1 && n % 10)] || 'th'}`;

export default function AdminAutoPay() {
  const [state, setState] = useState({ loading: true, pledges: [], stats: null, error: '' });
  const [tab, setTab] = useState('ACTIVE');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null); // { kind: 'new'|'pay'|'status'|'history', item, to }

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const res = await getRecurringPledges();
    setState({ loading: false, pledges: res.pledges, stats: res.stats, error: res.ok ? '' : res.error });
  }, []);
  useEffect(() => { load(); }, [load]);

  const today = todayISO();
  const isOverdue = p => p.status === 'ACTIVE' && p.next_due_date && p.next_due_date < today;
  const pledges = state.pledges;
  const st = state.stats || { mrr: 0, active_count: 0, total_raised: 0, overdue_count: 0 };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pledges
      .filter(p => tab === 'all' || (tab === 'OVERDUE' ? isOverdue(p) : p.status === tab))
      .filter(p => !q || [p.donor_name, p.donor_phone, p.donor_email].some(v => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => String(a.next_due_date || '9').localeCompare(String(b.next_due_date || '9')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pledges, tab, query, today]);

  const stats = [
    { label: 'Active pledges', value: st.active_count, note: `${pledges.length} in total` },
    { label: 'Expected each month', value: inr(st.mrr), note: 'Active pledges, averaged per month' },
    { label: 'Received so far', value: inr(st.total_raised), note: 'Payments recorded against pledges' },
    { label: 'Overdue', value: st.overdue_count, note: st.overdue_count ? 'Past the due date with no payment recorded' : 'Nothing overdue', attention: st.overdue_count ? 'rose' : null }
  ];

  const done = text => { setModal(null); setNotice({ tone: 'ok', text }); load(); };

  const exportCsv = () => downloadCsv(`TNV_pledges_${today}.csv`,
    ['Donor', 'Phone', 'Email', 'Amount (INR)', 'Frequency', 'Day', 'Method', 'Status', 'Next due', 'Payments', 'Received (INR)', 'Last paid'],
    shown.map(p => [p.donor_name, p.donor_phone, p.donor_email, p.amount, FREQ[p.frequency]?.label, p.cycle_day, p.payment_method, STATUS[p.status]?.label, p.next_due_date, p.successful_cycles, p.total_contributed, p.last_paid_on]));

  const count = s => pledges.filter(p => p.status === s).length;

  return (
    <section className="space-y-5">
      <PageHeader
        title="Recurring pledges"
        description="Donors who have promised to give regularly. Nothing is charged automatically: record each payment when it reaches the trust’s account, and follow up on anything overdue."
        actions={(
          <>
            <button type="button" className={btn.primary} onClick={() => setModal({ kind: 'new' })}>Add pledge</button>
            <button type="button" className={btn.secondary} onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
            <button type="button" className={btn.secondary} onClick={load} disabled={state.loading}>{state.loading && <Spinner className="h-3.5 w-3.5" />}Refresh</button>
          </>
        )}
      />
      <StatGrid items={stats} />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            label="Filter pledges"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'ACTIVE', label: 'Active', count: count('ACTIVE') },
              { id: 'OVERDUE', label: 'Overdue', count: pledges.filter(isOverdue).length },
              { id: 'PAUSED', label: 'Paused', count: count('PAUSED') },
              { id: 'CANCELLED', label: 'Cancelled', count: count('CANCELLED') },
              { id: 'all', label: 'All', count: pledges.length }
            ]}
          />
          <SearchBox value={query} onChange={setQuery} placeholder="Donor name, phone, email" label="Search pledges" />
        </div>
        {state.loading && !pledges.length ? <Loading label="Loading pledges…" /> : state.error ? (
          <div className="p-4"><Notice notice={{ tone: 'error', text: state.error }} /></div>
        ) : !shown.length ? (
          <Empty title={pledges.length ? 'No pledges here' : 'No pledges yet'} action={!pledges.length && <button type="button" className={btn.primary} onClick={() => setModal({ kind: 'new' })}>Add the first pledge</button>}>
            {pledges.length ? (tab === 'OVERDUE' ? 'Every active pledge is up to date.' : 'Change the filter or search.') : 'Add a donor who has agreed to give every month, quarter or year.'}
          </Empty>
        ) : (
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th scope="col" className={TABLE.th}>Donor</th>
                  <th scope="col" className={TABLE.th}>Pledge</th>
                  <th scope="col" className={TABLE.th}>Next due</th>
                  <th scope="col" className={`${TABLE.th} text-right`}>Received</th>
                  <th scope="col" className={TABLE.th}>Status</th>
                  <th scope="col" className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(p => {
                  const overdue = isOverdue(p);
                  return (
                    <tr key={p.id} className={TABLE.row}>
                      <td className={TABLE.td}>
                        <p className="font-semibold text-neutral-900">{p.donor_name}</p>
                        <p className="text-xs text-neutral-muted">{[p.donor_phone, p.donor_email].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className={`${TABLE.td} text-xs`}>
                        <p className="font-semibold tabular-nums text-neutral-900">{inr(p.amount)} <span className="font-normal text-neutral-muted">per {FREQ[p.frequency]?.per}</span></p>
                        <p className="text-neutral-muted">On the {ordinal(p.cycle_day)} · {p.payment_method}</p>
                      </td>
                      <td className={`${TABLE.td} whitespace-nowrap text-xs`}>
                        {p.status === 'CANCELLED' ? <span className="text-neutral-400">—</span> : (
                          <>
                            <p className={overdue ? 'font-semibold text-rose-700' : 'text-neutral-800'}>{formatDate(p.next_due_date)}</p>
                            {overdue && <p className="text-rose-700">Overdue</p>}
                          </>
                        )}
                      </td>
                      <td className={`${TABLE.td} whitespace-nowrap text-right text-xs`}>
                        <p className="font-semibold tabular-nums text-neutral-900">{inr(p.total_contributed)}</p>
                        <p className="text-neutral-muted">{p.successful_cycles || 0} payment{p.successful_cycles === 1 ? '' : 's'}</p>
                      </td>
                      <td className={TABLE.td}><Badge tone={STATUS[p.status]?.tone}>{STATUS[p.status]?.label || p.status}</Badge></td>
                      <td className={`${TABLE.td} text-right`}>
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {p.status !== 'CANCELLED' && <button type="button" className={btn.smallPrimary} onClick={() => setModal({ kind: 'pay', item: p })}>Record payment</button>}
                          {p.status === 'ACTIVE' && <button type="button" className={btn.small} onClick={() => setModal({ kind: 'status', item: p, to: 'PAUSED' })}>Pause</button>}
                          {p.status === 'PAUSED' && <button type="button" className={btn.small} onClick={() => setModal({ kind: 'status', item: p, to: 'ACTIVE' })}>Resume</button>}
                          <button type="button" className={btn.small} onClick={() => setModal({ kind: 'history', item: p })}>Payments</button>
                          {p.status !== 'CANCELLED' && <button type="button" className={`${btn.small} text-rose-700`} onClick={() => setModal({ kind: 'status', item: p, to: 'CANCELLED' })}>Cancel</button>}
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

      {modal?.kind === 'new' && <PledgeForm onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'pay' && <PaymentForm pledge={modal.item} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'status' && <StatusChange pledge={modal.item} to={modal.to} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'history' && (
        <Modal title={`${modal.item.donor_name}: payments`} description={`${inr(modal.item.amount)} per ${FREQ[modal.item.frequency]?.per} · since ${formatDate(modal.item.started_at)}`} onClose={() => setModal(null)} footer={<button type="button" className={btn.primary} onClick={() => setModal(null)}>Close</button>}>
          {!(modal.item.payments || []).length ? <p className="text-sm text-neutral-muted">No payments recorded yet.</p> : (
            <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {modal.item.payments.map(pay => (
                <li key={pay.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold tabular-nums">{inr(pay.amount)}</p>
                    <p className="text-xs text-neutral-muted">Received {formatDate(pay.received_on)}{pay.for_due_date ? ` · for ${formatDate(pay.for_due_date)}` : ''} · {pay.recorded_by}</p>
                  </div>
                  <span className="font-mono text-xs text-neutral-600">{pay.reference}</span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </section>
  );
}

function PledgeForm({ onClose, onDone }) {
  const [form, setForm] = useState({ donor_name: '', donor_phone: '', donor_email: '', amount: '', frequency: 'MONTHLY', cycle_day: '5', payment_method: 'UPI', start_date: todayISO() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ text: '', field: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const err = f => (error.field === f ? error.text : '');
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError({ text: '', field: '' });
    const res = await createRecurringPledge({ ...form, amount: Number(form.amount), cycle_day: Number(form.cycle_day) });
    setBusy(false);
    if (!res.ok) { setError({ text: errorText(res), field: res.data?.field || '' }); return; }
    onDone(`Pledge added for ${form.donor_name}. First payment due ${formatDate(res.data.pledge.next_due_date)}.`);
  };
  return (
    <Modal title="Add pledge" description="Record the donor’s promise. Payments are added when they arrive." onClose={onClose} size="lg" footer={<><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><SubmitButton form="pledge-form" busy={busy}>Add pledge</SubmitButton></>}>
      <form id="pledge-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {error.text && !error.field && <div className="sm:col-span-2"><Notice notice={{ tone: 'error', text: error.text }} /></div>}
        <Field label="Donor name" className="sm:col-span-2">{id => <input id={id} className={inputCls} value={form.donor_name} maxLength={120} onChange={e => set('donor_name', e.target.value)} />}</Field>
        <Field label="Mobile number" error={err('donor_phone')}>{id => <input id={id} className={inputCls} inputMode="numeric" value={form.donor_phone} onChange={e => set('donor_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} />}</Field>
        <Field label="Email" error={err('donor_email')} hint="Optional.">{id => <input id={id} type="email" className={inputCls} value={form.donor_email} onChange={e => set('donor_email', e.target.value)} />}</Field>
        <Field label="Amount (₹)" error={err('amount')}>{id => <input id={id} className={inputCls} inputMode="numeric" value={form.amount} onChange={e => set('amount', e.target.value.replace(/\D/g, ''))} />}</Field>
        <Field label="How often">{id => <select id={id} className={inputCls} value={form.frequency} onChange={e => set('frequency', e.target.value)}>{Object.entries(FREQ).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select>}</Field>
        <Field label="Day of the month" hint="1 to 28, so every month has it.">{id => <select id={id} className={inputCls} value={form.cycle_day} onChange={e => set('cycle_day', e.target.value)}>{Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{ordinal(i + 1)}</option>)}</select>}</Field>
        <Field label="Usually paid by">{id => <select id={id} className={inputCls} value={form.payment_method} onChange={e => set('payment_method', e.target.value)}>{METHODS.map(m => <option key={m}>{m}</option>)}</select>}</Field>
        <Field label="Starting from" className="sm:col-span-2" hint="The first payment is due on the chosen day on or after this date.">{id => <input id={id} type="date" className={inputCls} value={form.start_date} onChange={e => set('start_date', e.target.value)} />}</Field>
      </form>
    </Modal>
  );
}

function PaymentForm({ pledge, onClose, onDone }) {
  const [amount, setAmount] = useState(String(pledge.amount));
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ text: '', field: '' });
  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError({ text: '', field: '' });
    const res = await recordPledgePayment(pledge.id, { amount: Number(amount), reference: reference.trim() });
    setBusy(false);
    if (!res.ok) { setError({ text: errorText(res), field: res.data?.field || '' }); return; }
    onDone(`${inr(amount)} recorded for ${pledge.donor_name}. Next payment due ${formatDate(res.data.pledge.next_due_date)}.`);
  };
  const err = f => (error.field === f ? error.text : '');
  return (
    <Modal title="Record payment" description={`${pledge.donor_name} · due ${formatDate(pledge.next_due_date)}`} size="sm" onClose={onClose} footer={<><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><SubmitButton form="pay-form" busy={busy}>Record payment</SubmitButton></>}>
      <form id="pay-form" onSubmit={submit} className="space-y-4" noValidate>
        {error.text && !error.field && <Notice notice={{ tone: 'error', text: error.text }} />}
        <Field label="Amount received (₹)" error={err('amount')}>{id => <input id={id} className={inputCls} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />}</Field>
        <Field label="UTR / bank reference" error={err('reference')} hint="From the trust’s bank statement. Each reference can be used once.">{id => <input id={id} className={`${inputCls} font-mono`} value={reference} maxLength={40} onChange={e => setReference(e.target.value.replace(/\s/g, ''))} />}</Field>
        <p className="text-xs text-neutral-muted">For an 80G receipt, also record this payment on the Visitor donations page with the same reference.</p>
      </form>
    </Modal>
  );
}

function StatusChange({ pledge, to, onClose, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const copy = {
    PAUSED: ['Pause pledge', 'It will not show as overdue while paused. Resume it when the donor restarts.', 'Pause'],
    ACTIVE: ['Resume pledge', `Payments will be expected again from ${formatDate(pledge.next_due_date)}.`, 'Resume'],
    CANCELLED: ['Cancel pledge', 'Use this when the donor has stopped giving. A cancelled pledge cannot be restarted; add a new one instead. Payments already recorded are kept.', 'Cancel pledge']
  }[to];
  const run = async () => {
    setBusy(true);
    const res = await setPledgeStatus(pledge.id, to);
    setBusy(false);
    if (!res.ok) { setError(errorText(res)); return; }
    onDone(`${pledge.donor_name}’s pledge ${to === 'PAUSED' ? 'paused' : to === 'ACTIVE' ? 'resumed' : 'cancelled'}.`);
  };
  return (
    <ConfirmDialog title={copy[0]} confirmLabel={copy[2]} tone={to === 'CANCELLED' ? 'danger' : 'primary'} busy={busy} onClose={onClose} onConfirm={run}>
      <p className="font-semibold text-neutral-900">{pledge.donor_name} · {inr(pledge.amount)} per {FREQ[pledge.frequency]?.per}</p>
      <p className="mt-1">{copy[1]}</p>
      {error && <div className="mt-3"><Notice notice={{ tone: 'error', text: error }} /></div>}
    </ConfirmDialog>
  );
}
