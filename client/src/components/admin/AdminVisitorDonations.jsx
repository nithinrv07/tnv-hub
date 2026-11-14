import { useCallback, useEffect, useMemo, useState } from 'react';
import Spinner from '../Spinner.jsx';
import {
  getDonationsList, getDonationProof, verifyDonationCredit, createDonation, getAdminCampaigns, adminReceiptUrl, errorText
} from '../../lib/donationService.js';
import {
  inr, formatDate, formatDateTime, btn, inputCls, PageHeader, StatGrid, Badge, Notice, Card, Loading, Empty,
  Tabs, SearchBox, Field, Modal, SubmitButton, downloadCsv, TABLE
} from './donations/ui.jsx';

// Admin > Visitor Donations (mode "donations") and 80G Tax Receipts (mode "receipts").
// Money given on the public page waits here until an admin sees it in the bank
// statement; only then is a receipt number issued and emailed.

const STATUS = {
  pending_verification: { label: 'Awaiting verification', tone: 'amber' },
  verified: { label: 'Verified', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'rose' },
  flagged: { label: 'Rejected', tone: 'rose' }
};
const statusOf = d => (d.status === 'flagged' ? 'rejected' : d.status || 'pending_verification');
const panOf = d => d.pan_number || d.pan || '';

// Indian financial year (April to March)
const fyStart = iso => { const d = new Date(iso); const y = d.getFullYear(); return d.getMonth() >= 3 ? y : y - 1; };
const fyLabel = y => `FY ${y}–${String((y + 1) % 100).padStart(2, '0')}`;

const CHANNELS = ['Cash', 'Cheque', 'UPI', 'Bank transfer'];
const EMPTY_FORM = { donor_name: '', donor_phone: '', donor_email: '', pan_number: '', amount: '', payment_channel: 'Cash', utr: '', campaign_id: '', confirm_received: true };

export default function AdminVisitorDonations({ mode = 'donations', onCountChange }) {
  const receipts = mode === 'receipts';
  const [state, setState] = useState({ loading: true, list: [], error: '' });
  const [tab, setTab] = useState(receipts ? 'all' : 'pending');
  const [query, setQuery] = useState('');
  const [fy, setFy] = useState('');
  const [notice, setNotice] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [showDesk, setShowDesk] = useState(false);

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const res = await getDonationsList();
    setState({ loading: false, list: res.donations, error: res.ok ? '' : res.error });
    if (res.ok && onCountChange) onCountChange(res.donations.filter(d => statusOf(d) === 'pending_verification').length);
  }, [onCountChange]);
  useEffect(() => { load(); }, [load]);

  const list = state.list;
  const verified = useMemo(() => list.filter(d => statusOf(d) === 'verified'), [list]);
  const pending = useMemo(() => list.filter(d => statusOf(d) === 'pending_verification'), [list]);
  const rejected = useMemo(() => list.filter(d => statusOf(d) === 'rejected'), [list]);
  const years = useMemo(() => [...new Set(verified.map(d => fyStart(d.verified_at || d.created_at)))].sort((a, b) => b - a), [verified]);

  const shown = useMemo(() => {
    let rows = receipts ? verified : tab === 'pending' ? pending : tab === 'verified' ? verified : tab === 'rejected' ? rejected : list;
    if (receipts) {
      if (tab === 'pan') rows = rows.filter(d => panOf(d));
      if (tab === 'nopan') rows = rows.filter(d => !panOf(d));
      if (fy) rows = rows.filter(d => String(fyStart(d.verified_at || d.created_at)) === fy);
      rows = [...rows].sort((a, b) => String(b.receipt_no).localeCompare(String(a.receipt_no)));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(d => [d.donor_name, d.donor_phone, d.donor_email, panOf(d), d.utr, d.receipt_no, d.campaign_title, d.id]
        .some(v => String(v || '').toLowerCase().includes(q)));
    }
    return rows;
  }, [receipts, tab, fy, query, list, verified, pending, rejected]);

  const sum = rows => rows.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const stats = receipts
    ? [
      { label: 'Receipts issued', value: verified.length, note: `${inr(sum(verified))} in total` },
      { label: 'With donor PAN', value: verified.filter(d => panOf(d)).length, note: 'Can be reported in Form 10BD' },
      { label: 'Without PAN', value: verified.filter(d => !panOf(d)).length, note: 'Donor cannot claim 80G without PAN', attention: verified.some(d => !panOf(d)) ? 'amber' : null },
      { label: 'Awaiting verification', value: pending.length, note: 'No receipt until verified', attention: pending.length ? 'amber' : null }
    ]
    : [
      { label: 'Verified donations', value: inr(sum(verified)), note: `${verified.length} donation${verified.length === 1 ? '' : 's'}` },
      { label: 'Awaiting verification', value: pending.length, note: pending.length ? `${inr(sum(pending))} to check against the bank` : 'Nothing waiting', attention: pending.length ? 'amber' : null },
      { label: 'Receipts issued', value: verified.filter(d => d.receipt_no).length, note: '80G receipts emailed to donors' },
      { label: 'Rejected', value: rejected.length, note: 'No matching bank credit or duplicate' }
    ];

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (receipts) {
      downloadCsv(`TNV_80G_receipts_${fy ? fyLabel(Number(fy)).replace(/\s|–/g, '_') : 'all'}_${stamp}.csv`,
        ['Receipt no', 'Receipt date', 'Donor name', 'PAN', 'Phone', 'Email', 'Amount (INR)', 'Mode', 'Reference', 'Purpose'],
        shown.map(d => [d.receipt_no, formatDate(d.verified_at || d.created_at), d.donor_name, panOf(d), d.donor_phone, d.donor_email, d.amount, d.payment_channel, d.utr, d.campaign_title || d.tier_label]));
    } else {
      downloadCsv(`TNV_donations_${stamp}.csv`,
        ['Reference', 'Date', 'Donor name', 'Phone', 'Email', 'PAN', 'Amount (INR)', 'Mode', 'UTR', 'Purpose', 'Status', 'Receipt no', 'Verified by', 'Rejection reason'],
        shown.map(d => [d.id, formatDateTime(d.created_at), d.donor_name, d.donor_phone, d.donor_email, panOf(d), d.amount, d.payment_channel, d.utr, d.campaign_title || d.tier_label, STATUS[statusOf(d)].label, d.receipt_no, d.verified_by, d.rejection_reason]));
    }
  };

  const onReviewed = (updated, text) => {
    setState(s => {
      const next = s.list.map(d => (d.id === updated.id ? { ...d, ...updated } : d));
      if (onCountChange) onCountChange(next.filter(d => statusOf(d) === 'pending_verification').length);
      return { ...s, list: next };
    });
    setReviewing(null);
    setNotice({ tone: 'ok', text });
  };

  const tabs = receipts
    ? [
      { id: 'all', label: 'All receipts', count: verified.length },
      { id: 'pan', label: 'With PAN', count: verified.filter(d => panOf(d)).length },
      { id: 'nopan', label: 'Without PAN', count: verified.filter(d => !panOf(d)).length }
    ]
    : [
      { id: 'pending', label: 'Awaiting verification', count: pending.length },
      { id: 'verified', label: 'Verified', count: verified.length },
      { id: 'rejected', label: 'Rejected', count: rejected.length },
      { id: 'all', label: 'All', count: list.length }
    ];

  return (
    <section className="space-y-5">
      <PageHeader
        title={receipts ? '80G tax receipts' : 'Visitor donations'}
        description={receipts
          ? 'Every receipt issued for a verified donation. Open or resend a receipt, and export a financial year for Form 10BD. Receipts without the donor’s PAN cannot be claimed under Section 80G.'
          : 'Donations made on the public Donate page and at the office. Check each one against the bank statement before verifying it: verifying issues the 80G receipt and emails it to the donor.'}
        actions={(
          <>
            {!receipts && <button type="button" className={btn.primary} onClick={() => setShowDesk(true)}>Record a donation</button>}
            <button type="button" className={btn.secondary} onClick={exportCsv} disabled={!shown.length}>Export CSV</button>
            <button type="button" className={btn.secondary} onClick={load} disabled={state.loading} aria-busy={state.loading || undefined}>
              {state.loading && <Spinner className="h-3.5 w-3.5" />}Refresh
            </button>
          </>
        )}
      />

      <StatGrid items={stats} />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-neutral-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs tabs={tabs} value={tab} onChange={setTab} label={receipts ? 'Filter receipts' : 'Filter donations'} />
            {receipts && years.length > 0 && (
              <>
                <label htmlFor="receipt-fy" className="sr-only">Financial year</label>
                <select id="receipt-fy" value={fy} onChange={e => setFy(e.target.value)} className={`${inputCls} min-h-9 w-auto py-1`}>
                  <option value="">All years</option>
                  {years.map(y => <option key={y} value={y}>{fyLabel(y)}</option>)}
                </select>
              </>
            )}
          </div>
          <SearchBox value={query} onChange={setQuery} placeholder={receipts ? 'Receipt no, donor, PAN' : 'Name, phone, UTR, receipt no'} label={receipts ? 'Search receipts' : 'Search donations'} />
        </div>

        {state.loading && !list.length ? (
          <Loading label="Loading donations…" />
        ) : state.error ? (
          <div className="p-4"><Notice notice={{ tone: 'error', text: state.error }} /></div>
        ) : !shown.length ? (
          <Empty title={query ? 'No matches' : receipts ? 'No receipts yet' : tab === 'pending' ? 'Nothing waiting for verification' : 'No donations here'}>
            {query ? 'Try a different name, phone number or reference.' : receipts ? 'A receipt is issued when a donation is verified on the Visitor donations page.' : 'Donations made on the Donate page appear here as soon as the donor submits the payment details.'}
          </Empty>
        ) : receipts ? (
          <ReceiptTable rows={shown} onCopied={text => setNotice({ tone: 'ok', text })} />
        ) : (
          <DonationTable rows={shown} onReview={setReviewing} />
        )}
      </Card>

      {reviewing && <ReviewModal donation={reviewing} onClose={() => setReviewing(null)} onDone={onReviewed} />}
      {showDesk && (
        <DeskModal
          onClose={() => setShowDesk(false)}
          onSaved={text => { setShowDesk(false); setNotice({ tone: 'ok', text }); load(); }}
        />
      )}
    </section>
  );
}

function DonorCell({ d }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-neutral-900">{d.donor_name || 'Anonymous supporter'}{d.is_anonymous && <span className="ml-1.5 text-xs font-normal text-neutral-500">(anonymous)</span>}</p>
      <p className="text-xs text-neutral-muted">{[d.donor_phone, d.donor_email].filter(Boolean).join(' · ') || 'No contact details'}</p>
    </div>
  );
}

function DonationTable({ rows, onReview }) {
  return (
    <div className={TABLE.wrap}>
      <table className={TABLE.table}>
        <thead className={TABLE.head}>
          <tr>
            <th scope="col" className={TABLE.th}>Received</th>
            <th scope="col" className={TABLE.th}>Donor</th>
            <th scope="col" className={`${TABLE.th} text-right`}>Amount</th>
            <th scope="col" className={TABLE.th}>Payment</th>
            <th scope="col" className={TABLE.th}>Purpose</th>
            <th scope="col" className={TABLE.th}>Status</th>
            <th scope="col" className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(d => {
            const s = STATUS[statusOf(d)];
            return (
              <tr key={d.id} className={TABLE.row}>
                <td className={`${TABLE.td} whitespace-nowrap text-xs text-neutral-600`}>{formatDateTime(d.created_at)}</td>
                <td className={TABLE.td}><DonorCell d={d} /></td>
                <td className={`${TABLE.td} whitespace-nowrap text-right font-semibold tabular-nums`}>{inr(d.amount)}</td>
                <td className={`${TABLE.td} text-xs`}>
                  <p className="text-neutral-800">{d.payment_channel || 'UPI'}</p>
                  <p className="font-mono text-neutral-muted">{d.utr || (d.has_proof ? 'Screenshot only' : '—')}</p>
                </td>
                <td className={`${TABLE.td} max-w-[14rem] text-xs text-neutral-700`}>
                  <p className="line-clamp-2">{d.campaign_title || d.tier_label || 'General donation'}</p>
                  {d.source === 'admin_desk' && <p className="text-neutral-muted">Recorded at the office</p>}
                </td>
                <td className={TABLE.td}>
                  <Badge tone={s.tone}>{s.label}</Badge>
                  {d.receipt_no && <p className="mt-1 font-mono text-[11px] text-neutral-600">{d.receipt_no}</p>}
                </td>
                <td className={`${TABLE.td} text-right`}>
                  <button type="button" className={statusOf(d) === 'pending_verification' ? btn.smallPrimary : btn.small} onClick={() => onReview(d)}>
                    {statusOf(d) === 'pending_verification' ? 'Review' : 'Details'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReceiptTable({ rows, onCopied }) {
  const copy = async no => {
    const url = `${window.location.origin}/verify/donation/${encodeURIComponent(no)}`;
    try { await navigator.clipboard.writeText(url); onCopied(`Verification link for ${no} copied.`); } catch (_e) { onCopied(url); }
  };
  return (
    <div className={TABLE.wrap}>
      <table className={TABLE.table}>
        <thead className={TABLE.head}>
          <tr>
            <th scope="col" className={TABLE.th}>Receipt no</th>
            <th scope="col" className={TABLE.th}>Date</th>
            <th scope="col" className={TABLE.th}>Donor</th>
            <th scope="col" className={TABLE.th}>PAN</th>
            <th scope="col" className={`${TABLE.th} text-right`}>Amount</th>
            <th scope="col" className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(d => (
            <tr key={d.id} className={TABLE.row}>
              <td className={`${TABLE.td} whitespace-nowrap font-mono text-xs font-semibold text-neutral-900`}>{d.receipt_no}</td>
              <td className={`${TABLE.td} whitespace-nowrap text-xs text-neutral-600`}>{formatDate(d.verified_at || d.created_at)}</td>
              <td className={TABLE.td}><DonorCell d={d} /></td>
              <td className={`${TABLE.td} whitespace-nowrap font-mono text-xs`}>{panOf(d) || <span className="font-sans text-amber-700">Not given</span>}</td>
              <td className={`${TABLE.td} whitespace-nowrap text-right font-semibold tabular-nums`}>{inr(d.amount)}</td>
              <td className={`${TABLE.td} whitespace-nowrap text-right`}>
                <div className="inline-flex gap-1.5">
                  <a className={btn.small} href={adminReceiptUrl(d.receipt_no)} target="_blank" rel="noopener noreferrer">Open PDF</a>
                  <button type="button" className={btn.small} onClick={() => copy(d.receipt_no)}>Copy check link</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ label, children, mono }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-neutral-muted">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm text-neutral-900 ${mono ? 'font-mono' : ''}`}>{children || '—'}</dd>
    </div>
  );
}

function ReviewModal({ donation: d, onClose, onDone }) {
  const [proof, setProof] = useState({ loading: Boolean(d.has_proof), src: '', error: '' });
  const [step, setStep] = useState('view'); // view | confirm | reject
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = statusOf(d);

  useEffect(() => {
    let live = true;
    if (!d.has_proof) return undefined;
    getDonationProof(d.id).then(r => { if (live) setProof({ loading: false, src: r.ok ? r.screenshot : '', error: r.ok ? '' : r.error }); });
    return () => { live = false; };
  }, [d.id, d.has_proof]);

  const act = async action => {
    setBusy(true);
    setError('');
    const res = await verifyDonationCredit({ donation_id: d.id, action, reason: action === 'reject' ? reason.trim() : undefined });
    setBusy(false);
    if (!res.ok) { setError(errorText(res)); return; }
    const updated = res.data.donation || { ...d, status: res.data.status, receipt_no: res.data.receipt_no };
    onDone(updated, action === 'verify'
      ? `Verified. Receipt ${res.data.receipt_no} issued${d.donor_email ? ` and emailed to ${d.donor_email}` : ' (no email on record, so share the PDF with the donor)'}.`
      : `Donation from ${d.donor_name || 'the donor'} marked as rejected.`);
  };

  const footer = status !== 'pending_verification' ? (
    <>
      {d.receipt_no && <a className={btn.secondary} href={adminReceiptUrl(d.receipt_no)} target="_blank" rel="noopener noreferrer">Open receipt PDF</a>}
      <button type="button" className={btn.primary} onClick={onClose}>Close</button>
    </>
  ) : step === 'confirm' ? (
    <>
      <button type="button" className={btn.secondary} onClick={() => setStep('view')} disabled={busy}>Back</button>
      <button type="button" className={btn.primary} onClick={() => act('verify')} disabled={busy} aria-busy={busy || undefined}>{busy && <Spinner className="h-3.5 w-3.5" />}Yes, verify and issue receipt</button>
    </>
  ) : step === 'reject' ? (
    <>
      <button type="button" className={btn.secondary} onClick={() => setStep('view')} disabled={busy}>Back</button>
      <button type="button" className={btn.dangerSolid} onClick={() => act('reject')} disabled={busy || reason.trim().length < 4} aria-busy={busy || undefined}>{busy && <Spinner className="h-3.5 w-3.5" />}Reject donation</button>
    </>
  ) : (
    <>
      <button type="button" className={btn.danger} onClick={() => setStep('reject')}>Reject</button>
      <button type="button" className={btn.primary} onClick={() => setStep('confirm')}>Verify payment</button>
    </>
  );

  return (
    <Modal title={`${inr(d.amount)} from ${d.donor_name || 'Anonymous supporter'}`} description={`Reference ${d.id}`} onClose={onClose} footer={footer} size="lg">
      <div className="space-y-4">
        {error && <Notice notice={{ tone: 'error', text: error }} />}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Detail label="Status"><Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge></Detail>
          <Detail label="Submitted">{formatDateTime(d.created_at)}</Detail>
          <Detail label="Payment mode">{d.payment_channel}</Detail>
          <Detail label="UTR / reference" mono>{d.utr}</Detail>
          <Detail label="Phone">{d.donor_phone}</Detail>
          <Detail label="Email">{d.donor_email}</Detail>
          <Detail label="PAN" mono>{panOf(d)}</Detail>
          <Detail label="Purpose">{d.campaign_title || d.tier_label}</Detail>
          {d.receipt_no && <Detail label="Receipt no" mono>{d.receipt_no}</Detail>}
          {d.verified_by && <Detail label="Verified by">{`${d.verified_by}, ${formatDate(d.verified_at)}`}</Detail>}
          {d.recorded_by && <Detail label="Recorded by">{d.recorded_by}</Detail>}
          {status === 'rejected' && <Detail label="Reason for rejection">{d.rejection_reason || d.flag_reason}</Detail>}
        </dl>

        {d.has_proof && (
          <div>
            <p className="mb-1.5 text-xs text-neutral-muted">Payment screenshot from the donor</p>
            <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
              {proof.loading ? <Spinner className="h-5 w-5 text-neutral-400" /> : proof.src
                ? <a href={proof.src} target="_blank" rel="noopener noreferrer" className="block"><img src={proof.src} alt={`Payment screenshot for ${inr(d.amount)}`} className="max-h-[420px] w-auto object-contain" /></a>
                : <p className="p-4 text-sm text-neutral-muted">{proof.error || 'The screenshot could not be loaded.'}</p>}
            </div>
          </div>
        )}

        {status === 'pending_verification' && step === 'view' && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-[13px] leading-relaxed text-neutral-700">
            Find a credit of <strong>{inr(d.amount)}</strong>{d.utr ? <> with reference <span className="font-mono">{d.utr}</span></> : ''} in the trust’s bank statement before verifying. A screenshot alone is not proof that the money arrived.
          </p>
        )}
        {step === 'confirm' && (
          <Notice notice={{ tone: 'warn', text: `This issues the next 80G receipt number${d.donor_email ? ` and emails it to ${d.donor_email}` : ''}. A receipt cannot be withdrawn here once issued.` }} />
        )}
        {step === 'reject' && (
          <Field label="Reason for rejecting" hint="Kept with the record, for example: no matching credit in the bank statement.">
            {id => <textarea id={id} rows={3} value={reason} onChange={e => setReason(e.target.value)} className={`${inputCls} py-2`} maxLength={300} />}
          </Field>
        )}
      </div>
    </Modal>
  );
}

function DeskModal({ onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [campaigns, setCampaigns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ text: '', field: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const cashOrCheque = form.payment_channel === 'Cash' || form.payment_channel === 'Cheque';

  useEffect(() => { getAdminCampaigns().then(r => setCampaigns(r.campaigns.filter(c => c.status === 'ACTIVE'))); }, []);

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError({ text: '', field: '' });
    const res = await createDonation({
      ...form,
      amount: Number(form.amount),
      utr: form.payment_channel === 'Cheque' ? '' : form.utr.trim(),
      tier_label: form.payment_channel === 'Cheque' && form.utr.trim() ? `Cheque no. ${form.utr.trim()}` : undefined,
      campaign_id: form.campaign_id || undefined
    });
    setBusy(false);
    if (!res.ok) { setError({ text: errorText(res), field: res.data?.field || '' }); return; }
    onSaved(res.data.receipt_no
      ? `Recorded. Receipt ${res.data.receipt_no} issued${form.donor_email ? ` and emailed to ${form.donor_email}` : ''}.`
      : 'Recorded. It is waiting for verification in the list.');
  };

  const err = f => (error.field === f ? error.text : '');

  return (
    <Modal
      title="Record a donation"
      description="For money handed in at the office or sent directly to the trust’s account."
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <SubmitButton form="desk-donation" busy={busy}>{form.confirm_received ? 'Record and issue receipt' : 'Record donation'}</SubmitButton>
        </>
      )}
    >
      <form id="desk-donation" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {error.text && !error.field && <div className="sm:col-span-2"><Notice notice={{ tone: 'error', text: error.text }} /></div>}
        <Field label="Donor name" error={err('donor_name')}>{id => <input id={id} className={inputCls} value={form.donor_name} onChange={e => set('donor_name', e.target.value)} autoComplete="off" required />}</Field>
        <Field label="Mobile number" error={err('donor_phone')}>{id => <input id={id} className={inputCls} value={form.donor_phone} onChange={e => set('donor_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" required />}</Field>
        <Field label="Email" hint="The receipt is emailed here." error={err('donor_email')}>{id => <input id={id} type="email" className={inputCls} value={form.donor_email} onChange={e => set('donor_email', e.target.value)} />}</Field>
        <Field label="PAN" hint="Needed for the donor to claim 80G." error={err('pan_number')}>{id => <input id={id} className={`${inputCls} font-mono uppercase`} value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))} placeholder="ABCDE1234F" />}</Field>
        <Field label="Amount (₹)" error={err('amount')}>{id => <input id={id} className={inputCls} value={form.amount} onChange={e => set('amount', e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" required />}</Field>
        <Field label="Paid by">
          {id => (
            <select id={id} className={inputCls} value={form.payment_channel} onChange={e => set('payment_channel', e.target.value)}>
              {CHANNELS.map(c => <option key={c}>{c}</option>)}
            </select>
          )}
        </Field>
        {form.payment_channel !== 'Cash' && (
          <Field label={form.payment_channel === 'Cheque' ? 'Cheque number' : 'UTR (12 digits)'} error={err('utr')}>
            {id => <input id={id} className={`${inputCls} font-mono`} value={form.utr} onChange={e => set('utr', e.target.value.replace(/\s/g, ''))} inputMode="numeric" />}
          </Field>
        )}
        <Field label="Campaign" hint="Leave blank for a general donation." error={err('campaign_id')}>
          {id => (
            <select id={id} className={inputCls} value={form.campaign_id} onChange={e => set('campaign_id', e.target.value)}>
              <option value="">General donation</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
        </Field>
        <label className="flex items-start gap-2.5 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm sm:col-span-2">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-brand-green" checked={form.confirm_received} onChange={e => set('confirm_received', e.target.checked)} />
          <span>
            <span className="font-semibold text-neutral-900">{cashOrCheque ? 'I have the money in hand' : 'I have seen this credit in the bank statement'}</span>
            <span className="block text-xs text-neutral-muted">Issues the 80G receipt now. Untick to leave it for verification later{form.payment_channel === 'Cheque' ? ', for example until the cheque clears' : ''}.</span>
          </span>
        </label>
      </form>
    </Modal>
  );
}
