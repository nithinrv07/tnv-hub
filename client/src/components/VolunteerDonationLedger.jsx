import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyDonations, getCampaigns } from '../lib/donationService.js';
import { TRUST } from '../data/site.js';

// Member dashboard > Donations: the member's own donations as the trust has
// recorded them. Receipts appear once a donation is confirmed with the bank.

const inr = n => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;
const date = iso => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—');
const STATUS = {
  verified: ['Receipt issued', 'border-emerald-200 bg-emerald-50 text-emerald-800'],
  pending_verification: ['Being confirmed', 'border-amber-200 bg-amber-50 text-amber-800']
};

export default function VolunteerDonationLedger() {
  const [state, setState] = useState({ loading: true, donations: [], patron: null, error: '' });
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    let live = true;
    Promise.all([getMyDonations(), getCampaigns()]).then(([mine, camps]) => {
      if (!live) return;
      setState({
        loading: false,
        donations: mine.donations || [],
        patron: mine.patron_status || null,
        error: mine.ok === false ? 'Could not load your donations. Refresh the page to try again.' : ''
      });
      setCampaigns(camps.filter(c => c.status === 'ACTIVE').slice(0, 3));
    });
    return () => { live = false; };
  }, []);

  const { donations, patron } = state;
  const total = patron?.total_contributed || 0;
  const pending = donations.filter(d => d.status === 'pending_verification');

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-neutral-ink">Your donations</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-neutral-600">
              Donations made with your registered phone number or email. Each one is confirmed with the bank before the 80G receipt is issued.
            </p>
          </div>
          <Link to="/donate" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-brand-green px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2">
            Make a donation
          </Link>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-neutral-200 p-3.5">
            <dt className="text-[13px] font-semibold text-neutral-600">Given (confirmed)</dt>
            <dd className="mt-2 font-display text-2xl font-bold tabular-nums text-neutral-ink">{inr(total)}</dd>
          </div>
          <div className="rounded-lg border border-neutral-200 p-3.5">
            <dt className="text-[13px] font-semibold text-neutral-600">Deductible under 80G</dt>
            <dd className="mt-2 font-display text-2xl font-bold tabular-nums text-neutral-ink">{inr(patron?.tax_exempt_amount || 0)}</dd>
            <dd className="mt-1 text-xs text-neutral-500">50% of confirmed donations</dd>
          </div>
          <div className="col-span-2 rounded-lg border border-neutral-200 p-3.5 sm:col-span-1">
            <dt className="text-[13px] font-semibold text-neutral-600">Being confirmed</dt>
            <dd className="mt-2 font-display text-2xl font-bold tabular-nums text-neutral-ink">{pending.length}</dd>
            <dd className="mt-1 text-xs text-neutral-500">{pending.length ? `${inr(pending.reduce((s, d) => s + Number(d.amount || 0), 0))} awaiting the bank check` : 'Nothing waiting'}</dd>
          </div>
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-col gap-1 border-b border-neutral-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display text-base font-bold text-neutral-ink">Receipts</h3>
          <p className="text-xs text-neutral-500">{TRUST.name} · 80G registration <span className="font-mono">{TRUST.reg80G}</span></p>
        </div>
        {state.loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-500" aria-busy="true">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-green border-r-transparent" aria-hidden="true" /> Loading your donations…
          </div>
        ) : state.error ? (
          <p role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{state.error}</p>
        ) : !donations.length ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-neutral-800">No donations yet</p>
            <p className="mx-auto mt-1 max-w-sm text-[13px] text-neutral-500">Donations you make with your registered phone number or email will show here with their receipts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Date</th>
                  <th scope="col" className="px-4 py-2.5">Towards</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Amount</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-right"><span className="sr-only">Receipt</span></th>
                </tr>
              </thead>
              <tbody>
                {donations.map(d => {
                  const [label, cls] = STATUS[d.status] || STATUS.pending_verification;
                  return (
                    <tr key={d.id} className="border-b border-neutral-100 align-top last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-neutral-600">{date(d.created_at)}</td>
                      <td className="px-4 py-3 text-neutral-800">{d.campaign_title || d.tier_label || 'General donation'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{inr(d.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>
                        {d.receipt_no && <p className="mt-1 font-mono text-[11px] text-neutral-600">{d.receipt_no}</p>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {d.pdf_url ? (
                          <a href={d.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center rounded-md border border-neutral-300 px-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
                            Download receipt
                          </a>
                        ) : <span className="text-xs text-neutral-400">After confirmation</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {campaigns.length > 0 && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-bold text-neutral-ink">Campaigns you can support</h3>
            <Link to="/campaigns" className="text-xs font-semibold text-brand-green hover:underline">All campaigns</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {campaigns.map(c => {
              const pct = c.target_amount ? Math.min(100, Math.round(((c.raised_amount || 0) / c.target_amount) * 100)) : 0;
              return (
                <Link key={c.id} to={`/donate?campaign=${c.id}`} className="group flex flex-col rounded-lg border border-neutral-200 p-4 transition-colors hover:border-brand-green/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
                  <span className="text-xs text-neutral-500">{c.category}</span>
                  <span className="mt-1 line-clamp-2 text-sm font-semibold text-neutral-900 group-hover:text-brand-green-dark">{c.title}</span>
                  <span className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-100"><span className="block h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} /></span>
                  <span className="mt-1.5 text-xs text-neutral-500">{inr(c.raised_amount)} of {inr(c.target_amount)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
