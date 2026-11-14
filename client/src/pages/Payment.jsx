import { useEffect, useState, useId } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { recordPayment, getMyProfile } from '../lib/volunteerService.js';
import { getToken } from '../lib/session.js';
import Spinner from '../components/Spinner.jsx';
import { TRUST } from '../data/site.js';

// Verification notice
const VERIFICATION_NOTICE =
  'Our admin team will verify your registration within 72 hours, whether or not your payment has gone through. You can use your dashboard in the meantime.';

const UPI_VPA = TRUST.upiVpa;
const PAYEE_NAME = 'TAMILNADU VOLUNTEERS';
const MEMBERSHIP_FEE = 365;
const SESSION_TIMEOUT_SECONDS = 600; // 10 minutes session validity

// Official Bank Account Details
const BANK_DETAILS = {
  bankName: 'HDFC BANK',
  branch: 'CIT NAGAR, CHENNAI',
  accountNumber: '50200078305862',
  accountType: 'Current Account (CA)',
  ifscCode: 'HDFC0002043',
  panNumber: TRUST.pan,
  accountName: 'TAMILNADU VOLUNTEERS',
  upiId: TRUST.upiVpa
};

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputId = useId();

  const [profile, setProfile] = useState(location.state?.profile || null);
  const [loadingProfile, setLoadingProfile] = useState(!location.state?.profile && Boolean(getToken()));

  const [utr, setUtr] = useState('');
  const [screenshotData, setScreenshotData] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copiedVpa, setCopiedVpa] = useState(false);

  // Track if user clicked a mobile UPI app link to pay
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  // 10-Minute Countdown Timer
  const [timeLeft, setTimeLeft] = useState(SESSION_TIMEOUT_SECONDS);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionNonce, setSessionNonce] = useState(() => Date.now());

  useEffect(() => {
    if (sessionExpired) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setSessionExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionExpired, sessionNonce]);

  const handleRefreshSession = () => {
    setTimeLeft(SESSION_TIMEOUT_SECONDS);
    setSessionExpired(false);
    setPaymentInitiated(false);
    setSessionNonce(Date.now());
    setScreenshotData(null);
    setScreenshotPreview(null);
    setUtr('');
    setError('');
  };

  // Opened directly (not straight after registering): load the signed-in volunteer
  useEffect(() => {
    if (profile || !getToken()) return;
    getMyProfile().then(res => {
      if (res.ok && res.data) setProfile(res.data.profile || res.data);
      setLoadingProfile(false);
    });
  }, []);

  const alreadyPaid = Boolean(profile?.membership_paid);

  // Construct NPCI Standard UPI Pay Deep-link
  const refCode = profile?.id ? `TNV${profile.id.replace(/-/g, '').slice(0, 10)}${sessionNonce.toString().slice(-4)}` : `TNV${sessionNonce}`;
  const upiNote = encodeURIComponent(`TNV Annual Membership - ${profile?.username || profile?.full_name || 'Volunteer'}`);
  const upiIntentUri = `upi://pay?pa=${UPI_VPA}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${MEMBERSHIP_FEE}.00&cu=INR&tn=${upiNote}&tr=${refCode}`;

  // Generate crisp dynamic QR code
  useEffect(() => {
    if (upiIntentUri) {
      QRCode.toDataURL(upiIntentUri, {
        width: 250,
        margin: 1,
        color: {
          dark: '#0D381E',
          light: '#FFFFFF'
        }
      }).then(url => setQrDataUrl(url)).catch(() => { });
    }
  }, [upiIntentUri]);

  // Window Focus Detection: when user switches back from UPI app to browser
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && paymentInitiated) {
        // Automatically scroll to the screenshot upload zone
        const dropzone = document.getElementById(fileInputId);
        if (dropzone) dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [paymentInitiated, fileInputId]);

  const handleLaunchUpi = () => {
    setPaymentInitiated(true);
    setError('');
  };

  const handleCopyVpa = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(UPI_VPA);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2500);
    }
  };

  // Handle Screenshot File Selection
  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot file size must be under 5 MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result);
      setScreenshotPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotData(null);
    setScreenshotPreview(null);
  };

  const handleVerifyPayment = async e => {
    e.preventDefault();
    if (sessionExpired) {
      setError('This payment session has timed out. Please click "Renew Session" to generate a fresh QR.');
      return;
    }

    if (!screenshotData && !utr.trim()) {
      setError('Please upload your payment screenshot from your UPI app (Google Pay, PhonePe, Paytm, etc.).');
      return;
    }

    setLoading(true);
    setError('');

    const res = await recordPayment({
      profile_id: profile.id,
      utr: utr.trim() || undefined,
      screenshot: screenshotData,
      payment_mode: 'UPI_QR'
    });
    setLoading(false);

    const isSuccess = res.ok && (
      res.data?.success === true ||
      res.data?.status === 'paid' ||
      res.data?.status === 'pending_verification' ||
      res.data?.payment_status === 'pending_verification' ||
      res.status === 200
    );

    if (isSuccess) {
      // Immediately navigate candidate to their dashboard with success notice
      navigate('/dashboard', {
        replace: true,
        state: {
          paymentSubmitted: true,
          message: 'Payment proof submitted successfully! Verification is in progress.'
        }
      });
      return;
    } else if (res.status === 409) {
      setError('This payment proof has already been registered for another membership.');
    } else if (res.status === 0 || res.status >= 500 || res.status === 404) {
      setResult({ status: 'pending' });
    } else {
      setError(res.data?.error || 'Verification failed. Please try again.');
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-neutral-bg">
        <Spinner className="h-10 w-10 text-brand-green" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-neutral-bg py-16">
        <div className="container-page max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-neutral-900">Sign in to pay</h1>
          <p className="mt-2 text-sm text-neutral-600">Sign in with your registered account to complete your ₹{MEMBERSHIP_FEE} annual membership contribution.</p>
          <Link to="/login" className="btn-primary min-h-tap mt-6 inline-flex items-center justify-center px-6 w-full shadow-sm">Sign In</Link>
        </div>
      </div>
    );
  }

  const receiptLink = result?.signed_url || (result?.receipt_no ? `/api/receipts/${result.receipt_no}.pdf` : null);

  return (
    <div className="bg-neutral-50 min-h-screen py-10 sm:py-16">
      <div className="container-page max-w-2xl px-4 sm:px-6">
        {/* Registration status banner */}
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 sm:p-6 text-center shadow-xs">
          <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-brand-green text-white shadow-xs">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-brand-green-dark">Volunteer Profile Registered</h1>
          <p className="mt-1 text-sm text-neutral-700">
            Welcome, <strong className="font-semibold text-neutral-900">{profile.full_name}</strong>
            {profile.username ? <> (@{profile.username})</> : null}. Complete your annual civic contribution of ₹{MEMBERSHIP_FEE} below.
          </p>
        </div>

        {alreadyPaid && !result ? (
          /* Double Payment Lock: Volunteer has already paid */
          <StatusCard
            tone="success"
            title="Annual Membership Fee Already Paid"
            text={`Your membership is active with Receipt No: ${profile.receipt_no || 'Recorded'}`}
          >
            <div className="my-4 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 max-w-md mx-auto">
              ✓ Double payment prevented. Your annual dues are already settled and verified for 365 days.
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`/api/receipts/${profile.receipt_no || 'TNV-R-2026-0001'}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="btn-outline min-h-tap inline-flex items-center justify-center gap-1.5 px-6 text-xs font-bold"
              >
                <svg className="w-3.5 h-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Receipt PDF</span>
              </a>
              <DashboardButton onClick={() => navigate('/dashboard')} />
            </div>
          </StatusCard>
        ) : result?.status === 'pending_verification' ? (
          /* Payment Proof Submitted - Awaiting Admin Bank Verification */
          <StatusCard
            tone="success"
            title="Payment Proof Submitted Successfully"
            text="Your screenshot has been received and queued for administrative verification."
          >
            <div className="my-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 max-w-lg mx-auto text-left space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                <svg className="w-4 h-4 text-emerald-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                What happens next:
              </div>
              <ul className="list-disc list-inside space-y-1 text-emerald-900/90 pl-1">
                <li>Our administration team will cross-check your screenshot with our HDFC bank statement.</li>
                <li>Once confirmed, your official TNV membership receipt will be generated automatically.</li>
                <li>You will receive a confirmation email, and your receipt will appear on your dashboard.</li>
              </ul>
            </div>
            <p className="mt-2 text-xs text-neutral-500">{VERIFICATION_NOTICE}</p>
            <div className="mt-6 flex justify-center">
              <DashboardButton onClick={() => navigate('/dashboard')} />
            </div>
          </StatusCard>
        ) : result?.status === 'paid' ? (
          /* Payment Succeeded state */
          <StatusCard tone="success" title="Payment Proof Submitted Successfully" text={`Official Receipt Number: ${result.receipt_no}`}>
            <p className="mt-2 text-xs sm:text-sm text-neutral-600">
              {result.email_sent
                ? `An official copy has been dispatched to ${profile.email || 'your registered email'}.`
                : 'Your payment proof has been recorded and an official membership receipt generated.'}
            </p>
            <p className="mt-2 text-xs text-neutral-500">{VERIFICATION_NOTICE}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href={receiptLink || `/api/receipts/${result?.receipt_no || 'TNV-R-2026-0001'}.pdf`}
                target="_blank"
                rel="noreferrer"
                className="btn-outline min-h-tap inline-flex items-center justify-center gap-1.5 px-6 text-xs font-bold"
              >
                <svg className="w-3.5 h-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Official Receipt PDF</span>
              </a>
              <DashboardButton onClick={() => navigate('/dashboard')} />
            </div>
          </StatusCard>
        ) : (
          /* Main Payment Interface */
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm">
            {/* Header: Amount Details */}
            <div className="mb-6 flex flex-col items-start justify-between gap-2 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center">
              <div>
                <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800">
                  Annual Civic Contribution
                </span>
                <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-bold text-neutral-900">Direct UPI Portal</h2>
              </div>
              <div className="text-left sm:text-right">
                <div className="font-display text-2xl sm:text-3xl font-extrabold text-brand-green">
                  ₹{MEMBERSHIP_FEE}<span className="text-xs font-normal text-neutral-500"> / year</span>
                </div>
                <div className="text-[11px] text-neutral-500 font-medium">80G Tax-Deductible · ₹1/day</div>
                {/* Active Session Countdown Indicator */}
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-neutral-200 bg-neutral-50">
                  <span className={`w-2 h-2 rounded-full ${sessionExpired ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                  <span className={sessionExpired ? 'text-rose-600' : 'text-neutral-700'}>
                    {sessionExpired ? 'Session Expired' : `Valid for ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`}
                  </span>
                </div>
              </div>
            </div>

            {/* CLEAR INSTRUCTIONS FOR VOLUNTEER */}
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                How to Complete Your Payment in 2 Simple Steps:
              </h3>
              <ol className="mt-2 text-xs text-neutral-700 space-y-1.5 list-decimal list-inside pl-1">
                <li><strong className="text-neutral-900">Pay ₹365:</strong> Tap the green button below on mobile or scan the QR code using Google Pay, PhonePe, Paytm, or BHIM.</li>
                <li><strong className="text-neutral-900">Take a Screenshot & Upload:</strong> Take a screenshot of the payment success screen in your UPI app and upload it below. <em>No need to type long reference numbers manually!</em></li>
              </ol>
            </div>

            <div className="space-y-6">
              {/* STEP 1: MOBILE ONE-TAP & DESKTOP QR */}
              <div className="rounded-xl bg-gradient-to-br from-emerald-50/70 to-neutral-50 border border-emerald-200/80 p-5 text-center">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-950 mb-1">
                  Step 1: Open Your UPI App to Pay
                </div>
                <p className="text-xs text-neutral-600 max-w-md mx-auto mb-4">
                  Tap below on mobile to launch your UPI app with ₹{MEMBERSHIP_FEE} pre-filled.
                </p>

                {/* Primary Intent Button */}
                <a
                  href={upiIntentUri}
                  onClick={handleLaunchUpi}
                  className="inline-flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Pay ₹{MEMBERSHIP_FEE} via Any UPI App</span>
                </a>

                {/* Quick App Specific Buttons */}
                <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                  <a href={upiIntentUri} onClick={handleLaunchUpi} className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-bold text-neutral-700 shadow-xs">Google Pay</a>
                  <a href={upiIntentUri} onClick={handleLaunchUpi} className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-bold text-neutral-700 shadow-xs">PhonePe</a>
                  <a href={upiIntentUri} onClick={handleLaunchUpi} className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-bold text-neutral-700 shadow-xs">Paytm</a>
                  <a href={upiIntentUri} onClick={handleLaunchUpi} className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-bold text-neutral-700 shadow-xs">BHIM / CRED</a>
                </div>
              </div>

              {/* QR Code & VPA Display for Desktop Users */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center p-4 rounded-xl border border-neutral-200 bg-neutral-50/50">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative bg-white p-2.5 rounded-xl border border-neutral-200 shadow-xs">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="UPI Payment QR Code"
                        className={`w-40 h-40 object-contain mx-auto transition-all ${sessionExpired ? 'filter blur-[3px] opacity-25' : ''}`}
                      />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-xs text-neutral-400">Loading QR...</div>
                    )}
                    {sessionExpired && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-white/80 rounded-xl">
                        <span className="text-xs font-black text-rose-700">QR Expired</span>
                        <button
                          type="button"
                          onClick={handleRefreshSession}
                          className="mt-2 px-3 py-1 bg-brand-green text-white text-[11px] font-bold rounded-lg shadow-sm hover:bg-brand-green-dark"
                        >
                          Renew QR
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-500 font-medium">
                    {sessionExpired ? 'QR code expired. Click Renew to generate new code.' : 'Scan using phone camera or any UPI App'}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Official Organization UPI ID</span>
                    <div className="mt-1 flex items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-neutral-200">
                      <code className="text-xs font-mono font-bold text-brand-green-dark">{UPI_VPA}</code>
                      <button
                        type="button"
                        onClick={handleCopyVpa}
                        className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 rounded-md hover:bg-emerald-100 transition-colors"
                      >
                        {copiedVpa ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-600 space-y-1">
                    <div>• <strong>Account Name:</strong> {BANK_DETAILS.accountName}</div>
                    <div>• <strong>Bank:</strong> {BANK_DETAILS.bankName} ({BANK_DETAILS.branch})</div>
                    <div>• <strong>Account No:</strong> <code className="font-mono font-bold text-neutral-800">{BANK_DETAILS.accountNumber}</code> ({BANK_DETAILS.accountType})</div>
                    <div>• <strong>IFSC:</strong> <code className="font-mono font-bold text-neutral-800">{BANK_DETAILS.ifscCode}</code></div>
                    <div>• <strong>Fixed Amount:</strong> ₹{MEMBERSHIP_FEE}.00</div>
                  </div>
                </div>
              </div>

              {/* STEP 2: UPLOAD PAYMENT SCREENSHOT (NO MANUAL TYPING NEEDED) */}
              <div className={`pt-4 border-t border-neutral-200 transition-opacity ${paymentInitiated ? 'opacity-100' : 'opacity-95'}`}>
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[11px] font-bold">2</span>
                      Step 2: Upload Payment Screenshot
                    </span>
                    {paymentInitiated && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Awaiting Proof
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-600">
                    Take a screenshot of the payment confirmation screen in your UPI app and upload it here. Our system and admin team will verify it directly.
                  </p>
                </div>

                <form onSubmit={handleVerifyPayment} className="space-y-4">
                  {/* File Upload Dropzone / Thumbnail Box */}
                  <div className="rounded-xl border-2 border-dashed border-neutral-300 hover:border-emerald-500 bg-neutral-50/60 p-5 text-center transition-colors">
                    {screenshotPreview ? (
                      <div className="space-y-3">
                        <div className="relative inline-block mx-auto rounded-lg overflow-hidden border border-neutral-200 shadow-sm max-h-56">
                          <img src={screenshotPreview} alt="Uploaded Payment Proof" className="max-h-56 w-auto object-contain" />
                          <button
                            type="button"
                            onClick={handleRemoveScreenshot}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md text-xs"
                            title="Remove image"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-emerald-700 font-bold">✓ Screenshot attached successfully</p>
                      </div>
                    ) : (
                      <div>
                        <input
                          id={fileInputId}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor={fileInputId}
                          className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                        >
                          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="text-sm font-bold text-neutral-800">
                            Click to select payment screenshot
                          </div>
                          <p className="text-[11px] text-neutral-500">
                            Supports GPay, PhonePe, Paytm, or BHIM success screens (JPG, PNG, WebP)
                          </p>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Optional UTR input toggle if volunteer still wants to type it */}
                  <details className="text-xs text-neutral-600">
                    <summary className="cursor-pointer font-bold text-neutral-700 hover:text-emerald-800">
                      + Or enter 12-digit UTR manually (Optional)
                    </summary>
                    <div className="mt-2.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={12}
                        value={utr}
                        onChange={e => {
                          setUtr(e.target.value.replace(/\D/g, ''));
                          setError('');
                        }}
                        placeholder="Optional: e.g. 412356789012"
                        className="block w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 font-mono text-sm tracking-wider text-neutral-900 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                      />
                    </div>
                  </details>

                  {error && (
                    <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200" role="alert">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-register min-h-tap w-full text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Spinner className="h-4 w-4" /> : null}
                    <span>{loading ? 'Submitting Proof...' : 'Submit Payment Proof & Claim Membership'}</span>
                  </button>

                  <div className="rounded-xl bg-amber-50/80 border border-amber-200/60 p-3 text-[11px] text-amber-900 leading-relaxed">
                    {VERIFICATION_NOTICE}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({ tone, title, text, children }) {
  const success = tone === 'success';
  return (
    <div className={`rounded-2xl border bg-white p-8 text-center shadow-sm ${success ? 'border-emerald-300' : 'border-amber-300'}`} role="status">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${success ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          {success ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
      </div>
      <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900">{title}</h2>
      {text && <p className="mt-2 text-xs sm:text-sm text-neutral-600 font-medium">{text}</p>}
      {children}
    </div>
  );
}

function DashboardButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="btn-register min-h-tap inline-flex items-center justify-center px-6 text-xs font-bold shadow-sm">
      Open Your Dashboard &rarr;
    </button>
  );
}
