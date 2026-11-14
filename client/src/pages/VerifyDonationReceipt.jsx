import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { verifyDonationReceipt } from '../lib/donationService.js';
import { TRUST } from '../data/site.js';

// Public check for an 80G donation receipt (linked from the receipt and its email).
// Shows only what the trust's records say; anything not on record is "not found".

const inr = n => `₹${(Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = iso => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');

function Row({ label, children, mono }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-neutral-100 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-[13px] text-neutral-500">{label}</dt>
      <dd className={`text-sm font-semibold text-neutral-900 sm:text-right ${mono ? 'font-mono' : ''}`}>{children}</dd>
    </div>
  );
}

export default function VerifyDonationReceipt() {
  const { receiptNo } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(receiptNo || '');
  const [state, setState] = useState({ status: receiptNo ? 'loading' : 'idle', receipt: null, error: '' });

  useEffect(() => {
    if (!receiptNo) { setState({ status: 'idle', receipt: null, error: '' }); return undefined; }
    let live = true;
    setInput(receiptNo);
    setState({ status: 'loading', receipt: null, error: '' });
    verifyDonationReceipt(receiptNo.trim()).then(res => {
      if (!live) return;
      if (res.ok && res.data?.verified && res.data.receipt) setState({ status: 'verified', receipt: res.data.receipt, error: '' });
      else if (res.status === 0) setState({ status: 'error', receipt: null, error: 'Could not reach the server. Check your connection and try again.' });
      else setState({ status: 'notfound', receipt: null, error: '' });
    });
    return () => { live = false; };
  }, [receiptNo]);

  const submit = e => {
    e.preventDefault();
    const no = input.trim().toUpperCase();
    if (no) navigate(`/verify/donation/${encodeURIComponent(no)}`);
  };

  const r = state.receipt;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-light text-neutral-ink">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
            <img src="/tnv-logo.png" alt="" className="h-10 w-10 object-contain" />
            <span>
              <span className="block font-display text-sm font-bold text-brand-green-dark">Tamil Nadu Volunteers</span>
              <span className="block text-xs text-neutral-500">Donation receipt check</span>
            </span>
          </Link>
          <Link to="/" className="text-xs font-semibold text-brand-green hover:underline">Home</Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="receipt-no" className="sr-only">Receipt number</label>
          <input
            id="receipt-no"
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            placeholder="Receipt number, e.g. TNV-DON-2026-0001"
            className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 font-mono text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          />
          <button type="submit" className="min-h-11 shrink-0 rounded-lg bg-brand-green px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2">
            Check receipt
          </button>
        </form>

        <div className="mt-6" aria-live="polite">
          {state.status === 'idle' && (
            <p className="text-sm leading-relaxed text-neutral-600">Enter the receipt number printed on your 80G receipt to confirm it was issued by {TRUST.name}.</p>
          )}

          {state.status === 'loading' && (
            <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600" aria-busy="true">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-green border-r-transparent" aria-hidden="true" />
              Checking the trust’s records…
            </div>
          )}

          {(state.status === 'notfound' || state.status === 'error') && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-white p-6">
              <h1 className="font-display text-lg font-bold text-rose-800">{state.status === 'error' ? 'Could not check right now' : 'Receipt not found'}</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
                {state.status === 'error'
                  ? state.error
                  : <>No issued receipt with the number <span className="font-mono font-semibold">{receiptNo}</span> is in the trust’s records. Check the number for typing mistakes. A receipt is issued only after the donation is confirmed with the bank, so a very recent donation may not have one yet.</>}
              </p>
            </div>
          )}

          {state.status === 'verified' && r && (
            <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="flex items-start gap-3 border-b border-emerald-200 bg-emerald-50 px-5 py-4">
                <svg aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <h1 className="font-display text-lg font-bold text-emerald-900">Genuine receipt</h1>
                  <p className="text-sm text-emerald-800">Issued by {TRUST.name} for a donation confirmed with the bank.</p>
                </div>
              </div>
              <dl className="px-5 py-2">
                <Row label="Receipt number" mono>{r.receipt_no}</Row>
                <Row label="Amount">{inr(r.amount)}</Row>
                <Row label="Donor">{r.donor_name}</Row>
                <Row label="Date">{date(r.created_at)}</Row>
                {r.pan_number && <Row label="Donor PAN" mono>{r.pan_number}</Row>}
                <Row label="Towards">{r.campaign_title || r.tier_label || 'General donation'}</Row>
                <Row label="Trust PAN" mono>{r.pan_trust || TRUST.pan}</Row>
                <Row label="80G registration" mono>{r.reg_80g || TRUST.reg80G}</Row>
              </dl>
              <p className="border-t border-neutral-100 bg-neutral-50 px-5 py-3 text-xs leading-relaxed text-neutral-600">
                {r.tax_benefit || TRUST.taxBenefit} The donor’s PAN and phone are partly hidden on this page. The full receipt PDF is in the email sent to the donor.
              </p>
            </article>
          )}
        </div>
      </main>

      <footer className="border-t border-neutral-200 py-5 text-center text-xs text-neutral-500">
        {TRUST.name} · <Link to="/donate" className="text-brand-green hover:underline">Donate</Link>
      </footer>
    </div>
  );
}
