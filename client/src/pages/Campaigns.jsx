import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCampaigns } from '../lib/donationService.js';

const CAUSES = [
  { id: 'All', label: 'All Causes' },
  { id: 'Education', label: 'Rural Education' },
  { id: 'Environment', label: 'Afforestation & Coast' },
  { id: 'Disaster Relief', label: 'Disaster Readiness' },
  { id: 'Healthcare', label: 'First-Responders & Health' }
];

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCause, setSelectedCause] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const list = await getCampaigns(selectedCause);
        setCampaigns(list);
      } catch (_err) {
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedCause]);

  const filtered = campaigns.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return c.title.toLowerCase().includes(term) || (c.story && c.story.toLowerCase().includes(term));
  });

  const featuredCampaign = campaigns.find(c => c.featured && c.status === 'ACTIVE') || campaigns[0];

  const totalRaised = campaigns.reduce((sum, c) => sum + (c.raised_amount || 0), 0);
  const totalDonors = campaigns.reduce((sum, c) => sum + (c.donor_count || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-neutral-ink">
      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-brand-green-dark via-[#0d381e] to-brand-green-dark text-white pt-14 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-brand-yellow/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-white/10 text-emerald-200 border border-white/15 mb-4 shadow-xs backdrop-blur-xs">
            <svg className="w-4 h-4 text-brand-yellow" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            100% Direct Civic Impact · Section 80G Tax Deductible
          </span>

          <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white max-w-4xl mx-auto leading-tight">
            Crowdfunding for Grassroots Social Action in Tamil Nadu
          </h1>
          <p className="mt-4 text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
            Choose a grassroots initiative that moves you. Every rupee directly funds digital rural classrooms, coastal mangrove bio-shields, cyclone flood kits, and student toolkits across all 38 districts.
          </p>

          {/* Quick Metrics Strip */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
              <p className="text-xl sm:text-2xl font-black text-white font-display">₹{totalRaised.toLocaleString('en-IN')}</p>
              <p className="text-[11px] text-emerald-200 font-medium">Public Contributions</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
              <p className="text-xl sm:text-2xl font-black text-brand-yellow font-display">{totalDonors}+</p>
              <p className="text-[11px] text-emerald-200 font-medium">Grassroots Donors</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
              <p className="text-xl sm:text-2xl font-black text-white font-display">38</p>
              <p className="text-[11px] text-emerald-200 font-medium">Districts Covered</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-3.5 border border-white/10">
              <p className="text-xl sm:text-2xl font-black text-white font-display">50%</p>
              <p className="text-[11px] text-emerald-200 font-medium">80G Tax Benefit</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* FEATURED SPOTLIGHT CAMPAIGN */}
        {featuredCampaign && (
          <div className="bg-white rounded-3xl border border-brand-green-tint shadow-md overflow-hidden hover:border-brand-green/40 transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              <div className="lg:col-span-7 relative min-h-[260px] lg:min-h-full">
                <img
                  src={featuredCampaign.cover_image || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'}
                  alt={featuredCampaign.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-brand-yellow text-neutral-900 shadow-sm">
                    ★ Featured Spotlight
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                    {featuredCampaign.category}
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark font-display leading-tight">
                    {featuredCampaign.title}
                  </h2>
                  <p className="mt-3 text-xs sm:text-sm text-neutral-600 line-clamp-3 leading-relaxed">
                    {featuredCampaign.story}
                  </p>

                  {/* Goal Progress */}
                  <div className="mt-6 space-y-2">
                    {(() => {
                      const pct = Math.min(100, Math.round(((featuredCampaign.raised_amount || 0) / (featuredCampaign.target_amount || 1)) * 100));
                      const daysLeft = featuredCampaign.end_date
                        ? Math.max(0, Math.ceil((new Date(featuredCampaign.end_date).getTime() - Date.now()) / 86400000))
                        : 30;

                      return (
                        <>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-brand-green-dark text-sm">
                              ₹{(featuredCampaign.raised_amount || 0).toLocaleString('en-IN')}
                              <span className="text-neutral-400 font-normal text-xs ml-1">
                                raised of ₹{(featuredCampaign.target_amount || 0).toLocaleString('en-IN')}
                              </span>
                            </span>
                            <span className="text-brand-green font-extrabold text-sm">{pct}%</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-brand-green to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                            <span>{featuredCampaign.donor_count || (featuredCampaign.donors?.length || 0)} Grassroots Donors</span>
                            <span className="font-semibold text-neutral-700">{daysLeft} days left</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-col sm:flex-row items-center gap-3">
                  <Link
                    to={`/donate?campaign=${featuredCampaign.id}`}
                    className="w-full sm:w-auto flex-1 btn-register text-center py-3 px-6 text-xs font-bold font-display rounded-xl shadow-sm"
                  >
                    Donate to this Campaign &rarr;
                  </Link>
                  <Link
                    to="/donate"
                    className="w-full sm:w-auto px-4 py-3 text-center rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-bold transition-colors"
                  >
                    Custom Contribution
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cause Category Tabs & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {CAUSES.map(cause => (
              <button
                key={cause.id}
                onClick={() => setSelectedCause(cause.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedCause === cause.id
                    ? 'bg-brand-green text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {cause.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search active causes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="text-xs bg-white text-neutral-800 rounded-xl px-3.5 py-2.5 border border-neutral-200 focus:border-brand-green focus:ring-1 focus:ring-brand-green w-full sm:w-64 shadow-xs"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Campaigns Cards Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-neutral-500">Loading civic crowdfunding campaigns...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-brand-green-tint">
            <h3 className="text-base font-bold text-neutral-700 font-display">No campaigns found</h3>
            <p className="text-xs text-neutral-500 mt-1">Try selecting another cause category or clear your search.</p>
            <button
              onClick={() => { setSelectedCause('All'); setSearchTerm(''); }}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-green text-white text-xs font-bold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(camp => {
              const pct = Math.min(100, Math.round(((camp.raised_amount || 0) / (camp.target_amount || 1)) * 100));
              const daysLeft = camp.end_date
                ? Math.max(0, Math.ceil((new Date(camp.end_date).getTime() - Date.now()) / 86400000))
                : 30;

              return (
                <div
                  key={camp.id}
                  className="bg-white rounded-3xl border border-brand-green-tint shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md hover:border-brand-green/50 transition-all duration-200"
                >
                  <div>
                    {/* Cover Photo */}
                    <div className="relative h-48 w-full bg-neutral-100 overflow-hidden">
                      <img
                        src={camp.cover_image || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'}
                        alt={camp.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                          {camp.category}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-brand-green text-white shadow-xs">
                          {daysLeft} days left
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-3">
                      <h3 className="font-bold text-base text-neutral-900 font-display leading-snug line-clamp-2">
                        {camp.title}
                      </h3>
                      <p className="text-xs text-neutral-600 line-clamp-3 leading-relaxed">
                        {camp.story || 'Direct civic assistance initiative powered by Tamil Nadu Volunteers.'}
                      </p>

                      {/* Progress bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-brand-green-dark">
                            ₹{(camp.raised_amount || 0).toLocaleString('en-IN')}
                            <span className="text-neutral-400 font-normal ml-1">
                              / ₹{(camp.target_amount || 0).toLocaleString('en-IN')}
                            </span>
                          </span>
                          <span className="text-brand-green font-extrabold">{pct}%</span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-brand-green to-emerald-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                          <span>{camp.donor_count || (camp.donors?.length || 0)} Supporters</span>
                          <span className="font-semibold text-emerald-700">80G Tax Exempt</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-4 bg-neutral-50/70 border-t border-neutral-100">
                    <Link
                      to={`/donate?campaign=${camp.id}`}
                      className="w-full block py-2.5 text-center rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      Support this Cause &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 100% Transparency & Tax Benefit Guarantee Card */}
        <section className="bg-white rounded-3xl border border-brand-green-tint p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-green-tint text-brand-green flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900 font-display">Section 80G Tax Deduction</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  All monetary donations to Tamil Nadu Volunteers qualify for 50% tax exemption under Section 80G (Reg: AAATT4509NF20214).
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-brand-yellow-tint text-amber-900 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900 font-display">Instant Digital Receipt & Verification</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Every contribution generates a QR-coded digital tax receipt verifiable on our public state portal.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-sm text-neutral-900 font-display">100% Direct Deployment</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Zero administrative deductions. Contributions directly reach verified beneficiaries and rural field centers.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
