import { useState, useEffect, useId } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { recordDonation } from '../lib/volunteerService.js';
import { getCampaignById } from '../lib/donationService.js';

const UPI_VPA = '9791126662.1@hdfc';
const PAYEE_NAME = 'TAMILNADU VOLUNTEERS';

const PRESET_TIERS = [
  { amount: 1, label: 'Grassroots Supporter', desc: '₹1 micro-contribution to empower grassroots youth' },
  { amount: 100, label: 'Community Friend', desc: 'Provides educational stationery kit for 1 student' },
  { amount: 365, label: 'Annual Patron (₹1/day)', desc: 'Sponsors 1 grassroots volunteer toolkit for a full year', popular: true },
  { amount: 1000, label: 'District Enabler', desc: 'Funds 1 taluk-level youth civic awareness drive' },
  { amount: 5000, label: 'Leadership Pillar', desc: 'Equips rural learning centers with civic materials' }
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
  const [screenshotData, setScreenshotData] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [copiedAcc, setCopiedAcc] = useState(false);
  const [copiedIfsc, setCopiedIfsc] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedResult, setSubmittedResult] = useState(null);

  // Active Session 10-Minute Timeout Timer
  const [timeLeft, setTimeLeft] = useState(600);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionNonce, setSessionNonce] = useState(() => Date.now());

  const fileInputId = useId();

  const [searchParams] = useSearchParams();
  const campaignParam = searchParams.get('campaign');
  const [linkedCampaign, setLinkedCampaign] = useState(null);

  useEffect(() => {
    if (campaignParam) {
      getCampaignById(campaignParam).then(camp => {
        if (camp) setLinkedCampaign(camp);
      });
    }
  }, [campaignParam]);

  // Determine active amount (min Rs 1 enforced)
  const parsedCustom = customAmount ? parseFloat(customAmount) : NaN;
  const activeAmount = !isNaN(parsedCustom) ? Math.max(1, parsedCustom) : selectedTier;
  const activeTierObj = PRESET_TIERS.find(t => t.amount === activeAmount);
  const activeTierLabel = activeTierObj ? activeTierObj.label : `Custom Contribution (₹${activeAmount})`;

  // Session countdown
  useEffect(() => {
    if (submittedResult) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setSessionExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [submittedResult]);

  const handleRefreshSession = () => {
    setTimeLeft(600);
    setSessionExpired(false);
    setSessionNonce(Date.now());
  };

  // Construct Standard NPCI UPI URI
  const refCode = `TNVDON${sessionNonce.toString().slice(-8)}`;
  const donorLabel = isAnonymous ? 'Anonymous' : (donorName ? donorName.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 15) : 'Supporter');
  const upiNote = encodeURIComponent(`TNV Donation - ${donorLabel}`);
  const upiIntentUri = `upi://pay?pa=${UPI_VPA}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${activeAmount.toFixed(2)}&cu=INR&tn=${upiNote}&tr=${refCode}`;

  // Generate crisp dynamic QR code whenever amount or session updates
  useEffect(() => {
    if (upiIntentUri) {
      QRCode.toDataURL(upiIntentUri, {
        width: 250,
        margin: 1,
        color: {
          dark: '#0D381E',
          light: '#FFFFFF'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [upiIntentUri]);

  // Window Focus Detection: when donor returns from UPI app, scroll to proof dropzone
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && paymentInitiated && !submittedResult) {
        const dropzone = document.getElementById(fileInputId);
        if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [paymentInitiated, submittedResult, fileInputId]);

  const handleCopyVpa = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(UPI_VPA);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2500);
    }
  };

  const handleCopyAcc = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('50200078305862');
      setCopiedAcc(true);
      setTimeout(() => setCopiedAcc(false), 2500);
    }
  };

  const handleCopyIfsc = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('HDFC0002043');
      setCopiedIfsc(true);
      setTimeout(() => setCopiedIfsc(false), 2500);
    }
  };

  // Handle Screenshot Selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, or JPEG screenshot).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('The image file is too large. Please select a screenshot smaller than 8MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setScreenshotData(dataUrl);
      setScreenshotPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotData(null);
    setScreenshotPreview(null);
    const input = document.getElementById(fileInputId);
    if (input) input.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (activeAmount < 1) {
      setError('Please enter a valid contribution amount of at least ₹1.');
      return;
    }

    if (!isAnonymous && !donorName.trim()) {
      setError('Please enter your full name, or check the anonymous contribution box.');
      return;
    }

    const cleanPhone = donorPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number for 80G receipt delivery.');
      return;
    }

    if (!screenshotData && !utrNumber.trim()) {
      setError('Please upload your payment screenshot or enter the 12-digit UPI UTR reference.');
      return;
    }

    setLoading(true);

    try {
      const res = await recordDonation({
        amount: activeAmount,
        donor_name: isAnonymous ? 'Anonymous Civic Supporter' : donorName.trim(),
        donor_phone: cleanPhone,
        donor_email: donorEmail.trim() || undefined,
        pan_number: panNumber.trim() || undefined,
        is_anonymous: isAnonymous,
        utr: utrNumber.trim() || undefined,
        screenshot: screenshotData,
        tier_label: linkedCampaign ? `Campaign: ${linkedCampaign.title}` : activeTierLabel,
        campaign_id: linkedCampaign ? linkedCampaign.id : (campaignParam || undefined),
        campaign_title: linkedCampaign ? linkedCampaign.title : undefined
      });

      setLoading(false);

      if (res.ok && res.data?.success) {
        setSubmittedResult(res.data);
      } else {
        setError(res.data?.error || 'Failed to submit donation. Please verify details and try again.');
      }
    } catch (err) {
      setLoading(false);
      setError('Network communication failed: ' + err.message);
    }
  };

  const handleReset = () => {
    setSubmittedResult(null);
    setSelectedTier(365);
    setCustomAmount('');
    setDonorName('');
    setDonorPhone('');
    setDonorEmail('');
    setPanNumber('');
    setIsAnonymous(false);
    setUtrNumber('');
    setScreenshotData(null);
    setScreenshotPreview(null);
    setError('');
    handleRefreshSession();
  };

  return (
    <div className="min-h-screen bg-neutral-light py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Banner */}
        <div className="text-center mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-brand-green/10 text-brand-green-dark mb-3 shadow-xs">
            <svg className="w-4 h-4 text-brand-green" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
            100% Transparent Civic Giving · Section 80G Tax Exempt
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-ink tracking-tight font-display">
            Support Grassroots Social Action in Tamil Nadu
          </h1>
          <p className="mt-2 text-sm sm:text-base text-neutral-600 max-w-2xl mx-auto">
            100% of public contributions directly fund grassroots volunteer toolkits, educational stationery, disaster readiness, and community learning centers across 38 districts.
          </p>
        </div>

        {/* VIEW A: SUCCESS & 80G RECEIPT CONFIRMATION */}
        {submittedResult ? (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-200 p-8 sm:p-10 text-center max-w-xl mx-auto animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-ink font-display">
              Nandri! Thank You for Your Support
            </h2>
            <p className="mt-2 text-neutral-600 text-sm">
              Your contribution of <strong className="text-brand-green-dark font-bold text-base">₹{submittedResult.amount}</strong> has been successfully recorded.
            </p>

            {/* Receipt Summary Card */}
            <div className="mt-6 rounded-2xl bg-neutral-50 border border-neutral-200 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-neutral-200 pb-2">
                <span className="text-neutral-500 font-medium">Receipt Reference No:</span>
                <span className="font-mono font-bold text-brand-green-dark">{submittedResult.receipt_no}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200 pb-2">
                <span className="text-neutral-500 font-medium">Donor Name:</span>
                <span className="font-bold text-neutral-800">{isAnonymous ? 'Anonymous Civic Supporter' : (donorName || 'Civic Supporter')}</span>
              </div>
              <div className="flex justify-between border-b border-neutral-200 pb-2">
                <span className="text-neutral-500 font-medium">Organization PAN:</span>
                <span className="font-mono font-bold text-neutral-800">AAETT5126E</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-medium">Tax Exemption:</span>
                <span className="font-semibold text-emerald-800">50% Deduction under Section 80G</span>
              </div>
            </div>

            {/* Direct 80G Receipt PDF Download */}
            {submittedResult.pdf_url && (
              <div className="mt-6">
                <a
                  href={submittedResult.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-sm shadow-md hover:shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Official 80G Receipt (PDF)</span>
                </a>
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Link
                to={`/verify/donation/${submittedResult.receipt_no}`}
                target="_blank"
                className="btn border border-emerald-300 text-brand-green-dark hover:bg-emerald-50 rounded-xl px-5 py-2.5 text-xs font-bold"
              >
                Verify 80G Authenticity &rarr;
              </Link>
              <Link
                to="/"
                className="btn border border-neutral-300 text-neutral-700 hover:bg-neutral-50 rounded-xl px-5 py-2.5 text-xs font-bold"
              >
                Back to Home
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="btn bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl px-5 py-2.5 text-xs font-bold"
              >
                Make Another Contribution
              </button>
            </div>
          </div>
        ) : (
          /* VIEW B: MAIN DONATION WORKFLOW */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (7 cols): Donation Tiers & Donor Form */}
            <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-neutral-200 p-6 sm:p-8">
              {/* LINKED CAMPAIGN BANNER IF ANY */}
              {linkedCampaign && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    {linkedCampaign.cover_image && (
                      <img src={linkedCampaign.cover_image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    )}
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-brand-green bg-white px-2 py-0.5 rounded-full border border-brand-green/20">
                        Designated Cause
                      </span>
                      <h3 className="font-bold text-sm text-neutral-900 mt-0.5">{linkedCampaign.title}</h3>
                      <p className="text-[11px] text-neutral-500">
                        ₹{(linkedCampaign.raised_amount || 0).toLocaleString('en-IN')} raised of ₹{(linkedCampaign.target_amount || 0).toLocaleString('en-IN')} goal
                      </p>
                    </div>
                  </div>
                  <Link to="/campaigns" className="text-xs font-bold text-brand-green hover:underline shrink-0">
                    Browse Other Causes &rarr;
                  </Link>
                </div>
              )}

              {/* STEP 1: CHOOSE CONTRIBUTION TIER */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-neutral-ink font-display flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs flex items-center justify-center font-bold">1</span>
                    Select Contribution Amount
                  </h2>
                  <span className="text-xs text-neutral-500 font-medium">Starting from ₹1</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {PRESET_TIERS.map((tier) => {
                    const isSelected = !customAmount && selectedTier === tier.amount;
                    return (
                      <button
                        key={tier.amount}
                        type="button"
                        onClick={() => { setSelectedTier(tier.amount); setCustomAmount(''); }}
                        className={`relative p-3.5 rounded-2xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-brand-green bg-emerald-50/70 shadow-sm ring-2 ring-brand-green/20'
                            : 'border-neutral-200 hover:border-neutral-300 bg-white'
                        }`}
                      >
                        {tier.popular && (
                          <span className="absolute -top-2.5 right-3 bg-brand-yellow text-neutral-900 text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider uppercase shadow-xs">
                            Most Popular
                          </span>
                        )}
                        <div className="text-2xl font-black text-neutral-ink font-display">₹{tier.amount}</div>
                        <div className="text-xs font-bold text-brand-green-dark mt-0.5">{tier.label}</div>
                        <div className="text-[11px] text-neutral-500 mt-1 leading-snug">{tier.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Field */}
                <div>
                  <label htmlFor="custom-amount" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Or Enter Any Custom Amount (Minimum ₹1)
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 font-bold text-sm">
                      ₹
                    </div>
                    <input
                      id="custom-amount"
                      type="number"
                      min="1"
                      step="any"
                      placeholder="e.g. 500, 2500, 10000"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="block w-full pl-8 pr-4 py-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 2: DONOR INFORMATION & PROOF UPLOAD */}
              <div className="border-t border-neutral-100 pt-6">
                <h2 className="text-lg font-bold text-neutral-ink mb-3 font-display flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs flex items-center justify-center font-bold">2</span>
                  Donor Information & 80G Tax Details
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Anonymous Checkbox */}
                  <div className="flex items-center p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                    <input
                      id="anonymous-check"
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="h-4 w-4 text-brand-green focus:ring-brand-green rounded border-neutral-300"
                    />
                    <label htmlFor="anonymous-check" className="ml-2.5 text-xs font-medium text-neutral-700 cursor-pointer">
                      Make my contribution anonymous (name withheld from public volunteer roster)
                    </label>
                  </div>

                  {!isAnonymous && (
                    <div>
                      <label htmlFor="donor-name" className="block text-xs font-bold text-neutral-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        id="donor-name"
                        type="text"
                        required={!isAnonymous}
                        placeholder="Your full legal name"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="donor-phone" className="block text-xs font-bold text-neutral-700 mb-1">
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="donor-email" className="block text-xs font-bold text-neutral-700 mb-1">
                        Email Address (for 80G PDF Receipt)
                      </label>
                      <input
                        id="donor-email"
                        type="email"
                        placeholder="donor@example.com"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="donor-pan" className="block text-xs font-bold text-neutral-700 mb-1">
                      PAN Number (Optional, required for Section 80G Tax Exemption)
                    </label>
                    <input
                      id="donor-pan"
                      type="text"
                      maxLength="10"
                      placeholder="e.g. ABCDE1234F"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm font-mono uppercase"
                    />
                  </div>

                  {/* SCREENSHOT PROOF UPLOAD DROPZONE */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-neutral-800 mb-1">
                      Upload Payment Screenshot (No typing required) *
                    </label>
                    <p className="text-[11px] text-neutral-500 mb-2">
                      After completing your payment in GPay, PhonePe, Paytm, or BHIM, capture a screenshot and upload it here.
                    </p>

                    {screenshotPreview ? (
                      <div className="relative rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 p-4 text-center">
                        <img
                          src={screenshotPreview}
                          alt="Donation Proof Preview"
                          className="max-h-48 mx-auto rounded-xl object-contain shadow-xs border border-emerald-200"
                        />
                        <div className="mt-2.5 flex items-center justify-center gap-3">
                          <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                            ✓ Screenshot Attached
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveScreenshot}
                            className="text-xs font-bold text-rose-600 hover:text-rose-800 underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => document.getElementById(fileInputId)?.click()}
                        className="cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 hover:border-brand-green bg-neutral-50/70 hover:bg-emerald-50/30 p-6 text-center transition-all"
                      >
                        <input
                          id={fileInputId}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div className="text-xs font-bold text-neutral-800">
                          Click or drag to upload payment screenshot
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          Supports PNG, JPG, or JPEG (Max 8MB)
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Optional UTR Field */}
                  <div>
                    <label htmlFor="donor-utr" className="block text-xs font-semibold text-neutral-600 mb-1">
                      UPI Reference / UTR Number (Optional if screenshot uploaded)
                    </label>
                    <input
                      id="donor-utr"
                      type="text"
                      placeholder="12-digit UPI reference ID (optional)"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.trim())}
                      className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-xs font-mono"
                    />
                  </div>

                  {/* Error Notification */}
                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || activeAmount < 1}
                    className="w-full btn bg-brand-green hover:bg-brand-green-dark text-white rounded-xl py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 active:scale-[0.99]"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Recording Contribution...</span>
                      </span>
                    ) : (
                      <>
                        <span>Submit Contribution of ₹{activeAmount}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column (5 cols): Dynamic UPI QR, 1-Tap Mobile Intent & Bank Info */}
            <div className="lg:col-span-5 space-y-6">
              {/* Dynamic UPI Payment Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-6 text-center">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    Instant UPI Portal
                  </span>
                  {/* Session Timer */}
                  <span className={`text-[11px] font-bold ${sessionExpired ? 'text-rose-600' : 'text-neutral-500'}`}>
                    {sessionExpired ? 'Session Expired' : `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                  </span>
                </div>

                <div className="text-3xl font-black text-brand-green-dark font-display mb-1">
                  ₹{activeAmount}
                </div>
                <p className="text-xs text-neutral-500 mb-4">{activeTierLabel}</p>

                {/* 1-Tap Mobile Button */}
                <div className="mb-4">
                  <a
                    href={upiIntentUri}
                    onClick={() => setPaymentInitiated(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Pay ₹{activeAmount} on Mobile via Any UPI App</span>
                  </a>

                  {/* Quick App Badges */}
                  <div className="mt-2.5 flex items-center justify-center gap-1.5 flex-wrap">
                    <a href={upiIntentUri} onClick={() => setPaymentInitiated(true)} className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[10px] font-bold text-neutral-700">Google Pay</a>
                    <a href={upiIntentUri} onClick={() => setPaymentInitiated(true)} className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[10px] font-bold text-neutral-700">PhonePe</a>
                    <a href={upiIntentUri} onClick={() => setPaymentInitiated(true)} className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[10px] font-bold text-neutral-700">Paytm</a>
                    <a href={upiIntentUri} onClick={() => setPaymentInitiated(true)} className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[10px] font-bold text-neutral-700">BHIM / CRED</a>
                  </div>
                </div>

                {/* Real Dynamic QR Code Display */}
                <div className="relative p-3 bg-white border-2 border-dashed border-emerald-300 rounded-2xl inline-block shadow-inner mx-auto">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`UPI QR for ₹${activeAmount}`}
                      className={`w-44 h-44 mx-auto object-contain rounded-lg transition-all ${
                        sessionExpired ? 'filter blur-[3px] opacity-25' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-neutral-400">
                      Generating UPI QR...
                    </div>
                  )}

                  {sessionExpired && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-white/85 rounded-2xl">
                      <span className="text-xs font-black text-rose-700">Session Expired</span>
                      <button
                        type="button"
                        onClick={handleRefreshSession}
                        className="mt-2 px-3 py-1 bg-brand-green text-white text-[11px] font-bold rounded-lg shadow-xs hover:bg-brand-green-dark"
                      >
                        Renew QR
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 text-xs text-neutral-600 font-medium">
                  Scan using phone camera, Google Pay, PhonePe, or Paytm
                </div>

                {/* Copyable Official VPA */}
                <div className="mt-2 flex items-center justify-center gap-2 p-2 bg-neutral-50 rounded-xl border border-neutral-200 max-w-xs mx-auto">
                  <code className="text-xs font-mono font-bold text-brand-green-dark">{UPI_VPA}</code>
                  <button
                    type="button"
                    onClick={handleCopyVpa}
                    className="px-2 py-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors"
                  >
                    {copiedVpa ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Direct Bank Account Details Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-neutral-200 p-5 text-xs text-neutral-600">
                <h3 className="font-bold text-neutral-ink text-sm mb-2.5 flex items-center gap-1.5 font-display">
                  <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>Direct NEFT / RTGS Bank Transfer</span>
                </h3>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="flex justify-between border-b border-neutral-100 pb-1.5">
                    <span className="text-neutral-500 font-sans">Account Name:</span>
                    <span className="font-bold text-neutral-800">TAMILNADU VOLUNTEERS</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-100 pb-1.5">
                    <span className="text-neutral-500 font-sans">Bank & Branch:</span>
                    <span className="font-bold text-neutral-800 text-right">HDFC BANK (CIT NAGAR, CHENNAI)</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-1.5">
                    <span className="text-neutral-500 font-sans">Account No:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-800">50200078305862 (CA)</span>
                      <button
                        type="button"
                        onClick={handleCopyAcc}
                        className="text-[10px] font-sans text-brand-green-dark hover:underline"
                      >
                        {copiedAcc ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-1.5">
                    <span className="text-neutral-500 font-sans">IFSC Code:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-brand-green-dark">HDFC0002043</span>
                      <button
                        type="button"
                        onClick={handleCopyIfsc}
                        className="text-[10px] font-sans text-brand-green-dark hover:underline"
                      >
                        {copiedIfsc ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500 font-sans">Trust PAN:</span>
                    <span className="font-bold text-neutral-800">AAETT5126E</span>
                  </div>
                </div>

                <div className="mt-3.5 p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-[11px] leading-relaxed border border-emerald-100 font-medium">
                  ✓ Eligible for 50% Tax Exemption under Section 80G of the Income Tax Act. A formal PDF receipt will be issued immediately upon recording.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
