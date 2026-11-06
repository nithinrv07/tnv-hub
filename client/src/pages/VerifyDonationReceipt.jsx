import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { verifyDonationReceipt } from '../lib/donationService.js';

export default function VerifyDonationReceipt() {
  const { receiptNo: routeReceiptNo } = useParams();
  const [inputReceiptNo, setInputReceiptNo] = useState(routeReceiptNo || '');
  const [loading, setLoading] = useState(Boolean(routeReceiptNo));
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const performVerification = async (noToVerify) => {
    if (!noToVerify || !noToVerify.trim()) {
      setError('Please enter a valid donation receipt number (e.g. TNV-DON-2026-0001).');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setData(null);
      const res = await verifyDonationReceipt(noToVerify.trim());
      if (res.ok && res.data?.verified && res.data?.receipt) {
        setData(res.data.receipt);
      } else {
        setError(res.data?.error || 'Donation receipt could not be verified in the state registry.');
      }
    } catch (err) {
      setError(err.message || 'Unable to communicate with verification registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeReceiptNo) {
      performVerification(routeReceiptNo);
    }
  }, [routeReceiptNo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    performVerification(inputReceiptNo);
  };

  return (
    <div className="min-h-screen bg-[#F7F9F7] text-neutral-ink flex flex-col justify-between antialiased">
      {/* Official Top Branding Bar */}
      <header className="bg-brand-green-dark text-white border-b border-emerald-950/60 shadow-sm py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-full bg-white p-1 ring-2 ring-brand-yellow/40 flex items-center justify-center shadow-sm">
              <img src="/tnv-logo.png" alt="TNV Emblem" className="w-9 h-9 rounded-full object-contain" />
            </div>
            <div>
              <div className="font-extrabold text-white text-base leading-tight font-display">
                Tamil Nadu Volunteers
              </div>
              <div className="text-xs text-brand-yellow font-semibold font-display">
                Official 80G Donation Receipt Verification
              </div>
            </div>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold border border-white/10">
            <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse" />
            Live Tax Exemption Registry
          </span>
        </div>
      </header>

      {/* Main Verification Section */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col justify-center">
        {/* Lookup Search Bar when no receipt or to check another */}
        <div className="bg-white rounded-2xl border border-brand-green-tint p-4 mb-6 shadow-xs">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              placeholder="Enter Receipt Number (e.g. TNV-DON-2026-0001)"
              value={inputReceiptNo}
              onChange={e => setInputReceiptNo(e.target.value.toUpperCase())}
              className="w-full text-xs font-mono font-bold rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green uppercase"
            />
            <button
              type="submit"
              className="w-full sm:w-auto shrink-0 px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold shadow-xs transition-colors"
            >
              Verify Receipt
            </button>
          </form>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl p-10 border border-brand-green-tint shadow-sm text-center">
            <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-brand-green-dark font-display">Verifying Donation Receipt...</h2>
            <p className="text-xs text-neutral-500 mt-1">Checking official Section 80G state records</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-rose-200 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-rose-900 font-display">Verification Unsuccessful</h2>
            <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/donate"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-green text-white text-xs font-bold shadow-sm hover:bg-brand-green-dark transition-colors"
              >
                Make a Civic Contribution
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50"
              >
                Home
              </Link>
            </div>
          </div>
        ) : data ? (
          <div className="bg-white rounded-3xl border border-brand-green-tint shadow-md overflow-hidden animate-in fade-in duration-300">
            {/* Header Sovereign Shield */}
            <div className="bg-gradient-to-r from-emerald-900 via-brand-green-dark to-emerald-950 text-white p-6 sm:p-8 text-center relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-yellow text-neutral-900 font-extrabold text-xs mb-3 shadow-sm">
                <svg className="w-4 h-4 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                OFFICIAL SECTION 80G DONATION RECEIPT VERIFIED
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                Valid Charitable Contribution
              </h1>
              <p className="text-emerald-200 text-xs sm:text-sm mt-1 max-w-md mx-auto font-sans">
                Official proof of charitable donation eligible for 50% tax exemption under Section 80G.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Core Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 p-4 sm:p-5 rounded-2xl border border-neutral-100 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Receipt Number</span>
                  <span className="font-mono text-base font-black text-brand-green-dark mt-0.5 block">{data.receipt_no}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Contribution Amount</span>
                  <span className="font-display text-base font-black text-neutral-900 mt-0.5 block">
                    ₹{(data.amount || 0).toLocaleString('en-IN')}.00
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Donor Name</span>
                  <span className="font-bold text-neutral-800 text-sm mt-0.5 block">
                    {data.is_anonymous ? 'Anonymous Civic Supporter' : data.donor_name}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Contribution Date</span>
                  <span className="font-semibold text-neutral-700 mt-0.5 block">
                    {data.created_at ? new Date(data.created_at).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Recorded'}
                  </span>
                </div>
              </div>

              {/* Statutory 80G Tax Exemption Specifications */}
              <div className="border border-emerald-100 rounded-2xl p-4 sm:p-5 bg-brand-green-tint/30 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                  <span className="text-neutral-500 font-medium">Statutory Trust:</span>
                  <span className="font-bold text-brand-green-dark">{data.trust_name || 'TAMILNADU VOLUNTEERS TRUST'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                  <span className="text-neutral-500 font-medium">80G Registration No:</span>
                  <span className="font-mono font-bold text-neutral-900">{data.reg_80g || 'AAATT4509NF20214'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                  <span className="text-neutral-500 font-medium">Trust PAN Number:</span>
                  <span className="font-mono font-bold text-neutral-900">{data.pan_trust || 'AAATT4509N'}</span>
                </div>
                {data.pan_number && data.pan_number !== 'NOT PROVIDED' && (
                  <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                    <span className="text-neutral-500 font-medium">Donor PAN (80G Credit):</span>
                    <span className="font-mono font-bold text-brand-green-dark">{data.pan_number}</span>
                  </div>
                )}
                <div className="flex items-center justify-between border-b border-emerald-200/50 pb-2">
                  <span className="text-neutral-500 font-medium">Payment Reference / UTR:</span>
                  <span className="font-mono font-bold text-neutral-700">{data.utr || 'UPI Direct Clearing'}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-neutral-500 font-medium">Cause / Fund:</span>
                  <span className="font-semibold text-neutral-900">{data.campaign_title || data.tier_label || 'Civic Grassroots Support'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={`/api/receipts/${data.receipt_no}.pdf`}
                  target="_blank"
                  rel="noreferrer"
                  download={`${data.receipt_no}.pdf`}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-sm transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download Original 80G PDF Receipt</span>
                </a>
                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 font-bold text-xs transition-colors"
                >
                  Print Verification Record
                </button>
              </div>

              <div className="text-center">
                <Link to="/campaigns" className="text-xs font-bold text-brand-green hover:underline">
                  &larr; Discover other grassroots civic campaigns
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer Note */}
      <footer className="py-6 text-center text-xs text-neutral-400 border-t border-neutral-200/60">
        Tamil Nadu Volunteers Trust · Registered Non-Profit Organization · 100% Transparent Civic Governance
      </footer>
    </div>
  );
}
