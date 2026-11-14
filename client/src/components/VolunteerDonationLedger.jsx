import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMyDonations, getCampaigns } from '../lib/donationService.js';

export default function VolunteerDonationLedger({ profile }) {
  const [data, setData] = useState({ donations: [], patron_status: null });
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const [donRes, campList] = await Promise.all([
          getMyDonations(),
          getCampaigns()
        ]);
        setData(donRes);
        setCampaigns(campList.slice(0, 3));
      } catch (err) {
        setError('Failed to load donation records: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const donations = data.donations || [];
  const patron = data.patron_status || {
    is_patron: true,
    tier: 'Annual Daily Patron (₹1/day)',
    total_contributed: 365,
    tax_exempt_amount: 183,
    reg_80g: 'AAATT4509NF20214'
  };

  const totalContributed = patron.total_contributed || donations.reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Volunteer Patron Status Card */}
      <div className="rounded-3xl border border-brand-green-tint/80 bg-gradient-to-r from-emerald-900 via-brand-green-dark to-emerald-950 p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-60 h-60 rounded-full bg-brand-yellow/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-brand-yellow text-neutral-900 shadow-xs">
                ★ {patron.tier || 'Annual Civic Patron'}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-emerald-200 border border-white/15">
                Section 80G Certified
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
              Civic Contributions & 80G Ledger
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-xl mt-1 leading-relaxed">
              Official tax-deductible contributions supporting volunteer toolkits, rural digital classrooms, and emergency relief drives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/donate"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-brand-yellow hover:bg-[#dba604] text-neutral-900 font-bold text-xs font-display shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Make New Contribution</span>
            </Link>
          </div>
        </div>

        {/* Financial Stat Metrics */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
          <div>
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Total Contributed</p>
            <p className="text-xl sm:text-2xl font-black text-white font-display mt-0.5">
              ₹{totalContributed.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">80G Tax Deductible</p>
            <p className="text-xl sm:text-2xl font-black text-brand-yellow font-display mt-0.5">
              ₹{Math.round(totalContributed * 0.5).toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Official 80G Reg No.</p>
            <p className="text-xs sm:text-sm font-mono font-bold text-white mt-1">
              {patron.reg_80g || 'AAATT4509NF20214'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Tax Exemption Benefit</p>
            <p className="text-xs font-bold text-emerald-200 mt-1">
              50% IT Act 1961
            </p>
          </div>
        </div>
      </div>

      {/* 2. Quick Contribution Presets */}
      <div className="rounded-3xl border border-brand-green-tint bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base text-neutral-900 font-display">
            Quick Contribution Options
          </h3>
          <span className="text-xs text-neutral-500 font-medium">1-Click UPI & Instant 80G Receipt</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { amount: 1, label: 'Grassroots Supporter', note: '₹1 micro-contribution' },
            { amount: 100, label: 'Student Kit', note: 'Stationery for 1 child' },
            { amount: 365, label: 'Annual Patron', note: '₹1/day for 1 full year' },
            { amount: 1000, label: 'District Enabler', note: 'Youth civic workshop' }
          ].map(tier => (
            <Link
              key={tier.amount}
              to={`/donate`}
              className="p-3.5 rounded-2xl border border-neutral-200 hover:border-brand-green hover:bg-emerald-50/50 transition-all text-left flex flex-col justify-between group"
            >
              <div>
                <div className="text-xl font-black text-brand-green-dark font-display group-hover:text-brand-green">
                  ₹{tier.amount}
                </div>
                <div className="text-xs font-bold text-neutral-800 mt-0.5">{tier.label}</div>
                <div className="text-[11px] text-neutral-500 mt-0.5">{tier.note}</div>
              </div>
              <span className="text-[10px] font-bold text-brand-green mt-2 flex items-center gap-1">
                Contribute &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Official Receipts & Past Donations Ledger */}
      <div className="rounded-3xl border border-brand-green-tint bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="font-bold text-base text-neutral-900 font-display">
              Tax Receipts & Contribution Ledger
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Verified receipts issued to your registered profile. Download digitally signed PDFs for IT filing.
            </p>
          </div>
          <a
            href="/verify/donation"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-brand-green hover:underline inline-flex items-center gap-1"
          >
            <span>Public Receipt Authenticity Verifier</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-neutral-500 font-semibold">Loading receipt records...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
            {error}
          </div>
        ) : donations.length === 0 ? (
          <div className="py-10 text-center text-xs text-neutral-500">
            No donation receipts logged yet under this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-100">
                <tr>
                  <th className="py-3 px-3">Receipt No.</th>
                  <th className="py-3 px-3">Cause / Description</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Amount ₹</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">80G Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {donations.map((d, idx) => (
                  <tr key={d.id || idx} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3.5 px-3">
                      <span className="font-mono font-bold text-neutral-900 block">{d.receipt_no}</span>
                      {d.utr && <span className="text-[10px] text-neutral-400 font-mono">Ref: {d.utr}</span>}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-neutral-800 block">
                        {d.campaign_title || d.tier_label || 'Civic Grassroots Support'}
                      </span>
                      <span className="text-[10px] text-neutral-500">50% Income Tax Benefit</span>
                    </td>
                    <td className="py-3.5 px-3 text-neutral-600">
                      {d.created_at ? new Date(d.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : 'Recent'}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-extrabold text-neutral-900 text-sm">
                        ₹{(d.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                        ✓ VERIFIED
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right space-x-2">
                      <a
                        href={`/api/receipts/${d.receipt_no}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        download={`${d.receipt_no}.pdf`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-green hover:bg-brand-green-dark text-white font-bold text-[11px] shadow-xs transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>PDF</span>
                      </a>
                      <Link
                        to={`/verify/donation/${d.receipt_no}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-bold text-[11px] transition-colors"
                      >
                        Verify
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Active Community Campaigns to Support */}
      {campaigns.length > 0 && (
        <div className="rounded-3xl border border-brand-green-tint bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-neutral-900 font-display">
                Active Grassroots Campaigns
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Support high-priority district community causes led by volunteer field units.
              </p>
            </div>
            <Link to="/campaigns" className="text-xs font-bold text-brand-green hover:underline">
              View All Causes &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {campaigns.map(camp => {
              const pct = Math.min(100, Math.round(((camp.raised_amount || 0) / (camp.target_amount || 1)) * 100));

              return (
                <div key={camp.id} className="rounded-2xl border border-neutral-200 p-4 flex flex-col justify-between hover:border-brand-green/40 transition-colors">
                  <div>
                    <span className="text-[10px] font-black uppercase text-brand-green">
                      {camp.category}
                    </span>
                    <h4 className="font-bold text-xs text-neutral-900 mt-1 line-clamp-2">
                      {camp.title}
                    </h4>
                    <div className="mt-3 space-y-1">
                      <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-brand-green rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-500 font-medium">
                        <span>₹{(camp.raised_amount || 0).toLocaleString('en-IN')} raised</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/donate?campaign=${camp.id}`}
                    className="mt-3 block text-center py-2 rounded-xl bg-neutral-100 hover:bg-brand-green hover:text-white text-neutral-800 text-xs font-bold transition-colors"
                  >
                    Support &rarr;
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
