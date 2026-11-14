import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function VerifyCertificate() {
  const { regId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function verify() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/certificates/verify/${encodeURIComponent(regId || '')}`);
        const json = await res.json();
        if (!res.ok || !json.ok || !json.verified) {
          throw new Error(json.error || 'Certificate could not be verified or is invalid.');
        }
        setData(json);
      } catch (err) {
        setError(err.message || 'Unable to verify certificate authenticity.');
      } finally {
        setLoading(false);
      }
    }
    if (regId) {
      verify();
    }
  }, [regId]);

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
                Official Certificate Verification Portal
              </div>
            </div>
          </Link>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold border border-white/10">
            <span className="w-2 h-2 rounded-full bg-brand-yellow animate-pulse" />
            Live Verification System
          </span>
        </div>
      </header>

      {/* Main Verification Card */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 flex flex-col justify-center">
        {loading ? (
          <div className="bg-white rounded-3xl p-10 border border-brand-green-tint shadow-sm text-center">
            <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-brand-green-dark font-display">Verifying Certificate...</h2>
            <p className="text-xs text-neutral-muted mt-1">Checking state digital certificate registry</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-rose-200 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-rose-50/50">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-rose-900 font-display">Verification Unsuccessful</h2>
            <p className="text-sm text-neutral-muted mt-2 max-w-md mx-auto">{error}</p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-brand-green text-white text-xs font-bold shadow-sm hover:bg-brand-green-dark transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-brand-green-tint shadow-md overflow-hidden animate-in fade-in duration-300">
            {/* Header Badge */}
            <div className="bg-gradient-to-r from-emerald-900 via-brand-green-dark to-emerald-950 text-white p-6 sm:p-8 text-center relative overflow-hidden">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-yellow text-neutral-900 font-extrabold text-xs mb-3 shadow-sm">
                <svg className="w-4 h-4 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                OFFICIAL TNV CERTIFICATE VERIFIED
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-white">
                Certificate of Appreciation
              </h1>
              <p className="text-emerald-200 text-xs sm:text-sm mt-1 max-w-md mx-auto font-sans">
                This authentic document was issued by Tamil Nadu Volunteers in recognition of selfless service.
              </p>
            </div>

            {/* Recipient Details */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-brand-green-tint/40 rounded-2xl p-5 border border-brand-green-tint flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted font-display">
                    Certificate Recipient
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-brand-green-dark font-display mt-0.5">
                    {data.recipient_name}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-brand-green text-brand-yellow flex items-center justify-center font-bold text-lg font-display shrink-0 shadow-sm">
                  ✓
                </div>
              </div>

              {/* Grid of properties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                  <span className="text-[10px] font-bold uppercase text-neutral-muted block mb-1">
                    Event Title
                  </span>
                  <span className="font-bold text-neutral-900 text-sm block">
                    {data.event_title}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                  <span className="text-[10px] font-bold uppercase text-neutral-muted block mb-1">
                    Event Date & District
                  </span>
                  <span className="font-bold text-neutral-900 text-sm block">
                    {data.event_date ? new Date(data.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'State Level'} &bull; {data.district}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                  <span className="text-[10px] font-bold uppercase text-neutral-muted block mb-1">
                    Certificate Ref ID
                  </span>
                  <span className="font-mono font-bold text-neutral-900 text-xs block truncate">
                    {data.certificate_id}
                  </span>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                  <span className="text-[10px] font-bold uppercase text-neutral-muted block mb-1">
                    Issuer
                  </span>
                  <span className="font-bold text-brand-green-dark text-xs block">
                    {data.issued_by}
                  </span>
                </div>
              </div>

              {/* Digital Seal Footer */}
              <div className="pt-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-muted">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Digital Cryptographic Record Verified</span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/"
                    className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold transition-colors"
                  >
                    TNV Portal
                  </Link>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold transition-colors"
                  >
                    Print Record
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-xs text-neutral-muted">
        &copy; {new Date().getFullYear()} Tamil Nadu Volunteers (TNV). All rights reserved.
      </footer>
    </div>
  );
}
