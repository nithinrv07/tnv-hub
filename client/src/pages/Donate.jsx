import { useState } from 'react';
import { Link } from 'react-router-dom';

const PRESET_TIERS = [
  { amount: 100, label: 'Community Friend', desc: 'Provides educational stationery kit for 1 student' },
  { amount: 365, label: 'Annual Patron (₹1/day)', desc: 'Sponsors 1 grassroots volunteer toolkit for a full year', popular: true },
  { amount: 1000, label: 'District Enabler', desc: 'Funds 1 taluk-level youth civic awareness drive' },
  { amount: 5000, label: 'Leadership Pillar', desc: 'Equips 5 rural learning centers with digital materials' }
];

export default function Donate() {
  const [selectedTier, setSelectedTier] = useState(365);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeAmount = customAmount ? Number(customAmount) : selectedTier;

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-neutral-light py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Banner */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-green/10 text-brand-green-dark mb-3">
            <svg className="w-4 h-4 text-brand-green" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            Transparent Civic Giving
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-ink tracking-tight font-display">
            Support Grassroots Social Action in Tamil Nadu
          </h1>
          <p className="mt-3 text-base sm:text-lg text-neutral-600 max-w-2xl mx-auto">
            100% of public contributions directly fund volunteer-led community service, educational kits, and disaster readiness across 38 districts.
          </p>
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-ink">Nandri! Thank You for Your Support</h2>
            <p className="mt-2 text-neutral-600 text-sm">
              Your contribution of <strong className="text-neutral-ink">₹{activeAmount}</strong> has been recorded. Reference UTR: <span className="font-mono text-brand-green-dark">{utrNumber || 'DON-PENDING-REF'}</span>.
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              A formal 80G tax exemption receipt will be dispatched to {isAnonymous ? 'your verified phone' : donorEmail || 'your email'} once bank clearance completes.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/" className="btn bg-brand-green text-white hover:bg-brand-green-dark rounded-xl px-6 py-2.5 text-sm font-semibold">
                Back to Home
              </Link>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="btn border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-xl px-6 py-2.5 text-sm font-semibold"
              >
                Make Another Donation
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Donation Tiers & Details */}
            <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-neutral-ink mb-4 font-display">1. Choose Donation Tier</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {PRESET_TIERS.map((tier) => (
                  <button
                    key={tier.amount}
                    type="button"
                    onClick={() => { setSelectedTier(tier.amount); setCustomAmount(''); }}
                    className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                      !customAmount && selectedTier === tier.amount
                        ? 'border-brand-green bg-brand-green-tint/40 shadow-sm ring-2 ring-brand-green/20'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    {tier.popular && (
                      <span className="absolute -top-2.5 right-3 bg-brand-yellow text-neutral-ink text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
                        Most Popular
                      </span>
                    )}
                    <div className="text-2xl font-black text-neutral-ink font-display">₹{tier.amount}</div>
                    <div className="text-xs font-bold text-brand-green-dark mt-0.5">{tier.label}</div>
                    <div className="text-[11px] text-neutral-500 mt-1 leading-snug">{tier.desc}</div>
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="mb-6">
                <label htmlFor="custom-amount" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Or Enter Custom Amount (₹)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 font-bold">
                    ₹
                  </div>
                  <input
                    id="custom-amount"
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="block w-full pl-8 pr-4 py-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm"
                  />
                </div>
              </div>

              {/* Donor Information */}
              <h2 className="text-xl font-bold text-neutral-ink mb-4 font-display">2. Donor Information</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center mb-2">
                  <input
                    id="anonymous-check"
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="h-4 w-4 text-brand-green focus:ring-brand-green rounded border-neutral-300"
                  />
                  <label htmlFor="anonymous-check" className="ml-2 text-xs font-medium text-neutral-700">
                    Make my donation anonymous (donor name withheld from public reports)
                  </label>
                </div>

                {!isAnonymous && (
                  <div>
                    <label htmlFor="donor-name" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      id="donor-name"
                      type="text"
                      required
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="donor-phone" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Phone Number (WhatsApp) *
                    </label>
                    <input
                      id="donor-phone"
                      type="tel"
                      required
                      maxLength="10"
                      placeholder="10-digit mobile"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="donor-email" className="block text-xs font-semibold text-neutral-700 mb-1">
                      Email Address (for 80G Receipt)
                    </label>
                    <input
                      id="donor-email"
                      type="email"
                      value={donorEmail}
                      onChange={(e) => setDonorEmail(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="donor-pan" className="block text-xs font-semibold text-neutral-700 mb-1">
                    PAN Number (Optional, required for 80G Tax Exemption Certificate)
                  </label>
                  <input
                    id="donor-pan"
                    type="text"
                    maxLength="10"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm font-mono uppercase"
                  />
                </div>

                <div>
                  <label htmlFor="donor-utr" className="block text-xs font-semibold text-neutral-700 mb-1">
                    UPI Transaction ID / UTR Number (After completing payment)
                  </label>
                  <input
                    id="donor-utr"
                    type="text"
                    placeholder="12-digit UPI reference number"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.trim())}
                    className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || activeAmount <= 0}
                  className="w-full btn bg-brand-green text-white hover:bg-brand-green-dark rounded-xl py-3 text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <span>Confirming Contribution...</span>
                  ) : (
                    <>
                      <span>Contribute ₹{activeAmount} via UPI</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Payment Gateway / UPI Wireframe */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 text-center">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                  Instant UPI Scan & Pay
                </span>
                <div className="text-3xl font-black text-brand-green-dark font-display mb-3">
                  ₹{activeAmount}
                </div>

                {/* Inline SVG QR Code Wireframe */}
                <div className="p-3 bg-white border-2 border-dashed border-neutral-300 rounded-xl inline-block shadow-inner mx-auto">
                  <svg className="w-44 h-44 mx-auto" viewBox="0 0 160 160" fill="none">
                    <rect width="160" height="160" fill="#FFFFFF" rx="8" />
                    {/* Corner Position Targets */}
                    <rect x="12" y="12" width="40" height="40" rx="4" stroke="#0F172A" strokeWidth="6" fill="none" />
                    <rect x="22" y="22" width="20" height="20" rx="2" fill="#124D29" />
                    <rect x="108" y="12" width="40" height="40" rx="4" stroke="#0F172A" strokeWidth="6" fill="none" />
                    <rect x="118" y="22" width="20" height="20" rx="2" fill="#124D29" />
                    <rect x="12" y="108" width="40" height="40" rx="4" stroke="#0F172A" strokeWidth="6" fill="none" />
                    <rect x="22" y="118" width="20" height="20" rx="2" fill="#124D29" />
                    {/* Simulated QR Payload Matrix */}
                    <rect x="64" y="16" width="8" height="16" fill="#124D29" />
                    <rect x="80" y="24" width="16" height="8" fill="#0F172A" />
                    <rect x="60" y="44" width="40" height="8" fill="#124D29" />
                    <rect x="20" y="64" width="24" height="8" fill="#0F172A" />
                    <rect x="52" y="60" width="16" height="16" fill="#D39E00" />
                    <rect x="76" y="60" width="24" height="24" rx="4" fill="#124D29" />
                    <rect x="108" y="64" width="36" height="8" fill="#0F172A" />
                    <rect x="24" y="84" width="16" height="12" fill="#124D29" />
                    <rect x="48" y="88" width="20" height="8" fill="#0F172A" />
                    <rect x="112" y="84" width="20" height="16" fill="#124D29" />
                    <rect x="64" y="96" width="16" height="20" fill="#0F172A" />
                    <rect x="88" y="92" width="16" height="16" fill="#124D29" />
                    <rect x="60" y="124" width="40" height="8" fill="#0F172A" />
                    <rect x="108" y="112" width="16" height="32" fill="#124D29" />
                    <rect x="132" y="128" width="16" height="16" fill="#0F172A" />
                  </svg>
                </div>

                <div className="mt-3 text-xs text-neutral-600">
                  Scan using Google Pay, PhonePe, Paytm, or BHIM
                </div>
                <div className="mt-1 font-mono text-xs font-bold text-neutral-800 bg-neutral-100 py-1 px-3 rounded-lg inline-block">
                  tnvdonations@sbi
                </div>
              </div>

              {/* Direct Bank Account Details */}
              <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5 text-xs text-neutral-600">
                <h3 className="font-bold text-neutral-ink text-sm mb-2 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Direct NEFT / RTGS Bank Transfer
                </h3>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between border-b border-neutral-100 pb-1">
                    <span className="text-neutral-500 font-sans">Account Name:</span>
                    <span className="font-bold text-neutral-800">Tamil Nadu Volunteers Trust</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 pb-1">
                    <span className="text-neutral-500 font-sans">Bank:</span>
                    <span className="font-bold text-neutral-800">State Bank of India</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 pb-1">
                    <span className="text-neutral-500 font-sans">Account No:</span>
                    <span className="font-bold text-neutral-800">39876543210</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">IFSC Code:</span>
                    <span className="font-bold text-brand-green-dark">SBIN0001234</span>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-emerald-50 text-emerald-800 rounded-lg text-[10px] leading-relaxed">
                  ✓ Eligible for 50% Tax Deduction under Section 80G of the Income Tax Act.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
