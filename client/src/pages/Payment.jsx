import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { recordPayment, getMyProfile } from '../lib/volunteerService.js';
import { getToken } from '../lib/session.js';
import Spinner from '../components/Spinner.jsx';

// Verification by the admin team takes up to 72 hours and does not depend on payment
const VERIFICATION_NOTICE =
  'Our admin team will verify your registration within 72 hours, whether or not your payment has gone through. You can use your dashboard in the meantime.';

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(location.state?.profile || null);
  const [loadingProfile, setLoadingProfile] = useState(!location.state?.profile && Boolean(getToken()));

  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);
  // null until a payment attempt; then { status: 'paid' | 'failed' | 'pending', ... }
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Opened directly (not straight after registering): load the signed-in volunteer
  useEffect(() => {
    if (profile || !getToken()) return;
    getMyProfile().then(res => {
      if (res.ok && res.data) setProfile(res.data.profile || res.data);
      setLoadingProfile(false);
    });
  }, []);

  const alreadyPaid = Boolean(profile?.membership_paid);

  const handleVerifyPayment = async e => {
    e.preventDefault();
    const ref = utr.trim();
    if (!/^\d{12}$/.test(ref)) {
      setError('Enter the 12-digit UPI reference (UTR) number from your payment app.');
      return;
    }

    setLoading(true);
    setError('');
    const res = await recordPayment({ profile_id: profile.id, utr: ref, payment_mode: 'UPI_QR' });
    setLoading(false);

    if (res.ok && res.data?.status === 'paid') {
      setResult({ status: 'paid', ...res.data });
    } else if (res.status === 0 || res.status >= 500 || res.status === 404) {
      // The payment may well have gone through; we just couldn't confirm it
      setResult({ status: 'pending' });
    } else {
      setResult({ status: 'failed', error: res.data?.error });
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
        <div className="container-page max-w-md rounded-xl border border-neutral-muted/20 bg-white p-8 text-center shadow-sm">
          <h1 className="font-display text-2xl font-bold text-neutral-ink">Sign in to pay</h1>
          <p className="mt-2 text-sm text-neutral-muted">Sign in with the account you registered, then pay your ₹365 membership fee.</p>
          <Link to="/login" className="btn-primary min-h-tap mt-6 inline-flex items-center justify-center px-6">Sign In</Link>
        </div>
      </div>
    );
  }

  const receiptLink = result?.signed_url || (result?.receipt_no ? `/api/receipts/${result.receipt_no}.pdf` : null);

  return (
    <div className="bg-neutral-bg py-12 sm:py-16">
      <div className="container-page max-w-2xl">
        {/* Registration saved: the dashboard already exists */}
        <div className="mb-8 rounded-xl border border-brand-green/30 bg-brand-green-tint p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">Registration saved</h1>
          <p className="mt-2 text-base text-neutral-ink">
            Welcome, <strong className="font-semibold">{profile.full_name}</strong>
            {profile.username ? <> (@{profile.username})</> : null}. Your dashboard is ready. Please pay your annual ₹365 membership fee below.
          </p>
        </div>

        {alreadyPaid && !result ? (
          <StatusCard
            tone="success"
            title="Membership fee already paid"
            text={`Receipt ${profile.receipt_no || ''}`.trim()}
          >
            <DashboardButton onClick={() => navigate('/dashboard')} />
          </StatusCard>
        ) : result?.status === 'paid' ? (
          <StatusCard tone="success" title="Payment successful" text={`Receipt number: ${result.receipt_no}`}>
            <p className="mt-2 text-sm text-neutral-muted">
              {result.email_sent
                ? `We've emailed your receipt to ${profile.email || 'your registered email'}.`
                : 'You can download your receipt now. It is also kept in your dashboard.'}
            </p>
            <p className="mt-2 text-sm text-neutral-muted">{VERIFICATION_NOTICE}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {receiptLink && (
                <a href={receiptLink} target="_blank" rel="noreferrer" className="btn-outline min-h-tap inline-flex items-center justify-center px-6">
                  Download Receipt PDF
                </a>
              )}
              <DashboardButton onClick={() => navigate('/dashboard')} />
            </div>
          </StatusCard>
        ) : result ? (
          <StatusCard
            tone="warning"
            title={result.status === 'pending' ? 'Payment not confirmed yet' : 'Payment unsuccessful'}
            text={
              result.status === 'pending'
                ? "We couldn't confirm your payment right now. If money was taken from your account, it will be matched to your registration."
                : result.error || 'Your payment could not be verified.'
            }
          >
            <p className="mt-3 text-sm text-neutral-ink">{VERIFICATION_NOTICE}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => { setResult(null); setUtr(''); }}
                className="btn-outline min-h-tap inline-flex items-center justify-center px-6"
              >
                Try payment again
              </button>
              <DashboardButton onClick={() => navigate('/dashboard')} />
            </div>
          </StatusCard>
        ) : (
          <div className="rounded-xl border border-neutral-muted/20 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-col items-start justify-between gap-2 border-b border-brand-green-tint pb-4 sm:flex-row sm:items-center">
              <div>
                <span className="inline-block rounded-full bg-brand-yellow-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-green-dark">
                  Annual Membership Fee
                </span>
                <h2 className="mt-1 font-display text-xl font-bold text-neutral-ink sm:text-2xl">Pay ₹365 via UPI</h2>
              </div>
              <div className="font-display text-2xl font-extrabold text-brand-green sm:text-3xl">
                ₹365<span className="text-sm font-normal text-neutral-muted">/year</span>
              </div>
            </div>

            <p className="mb-6 text-sm text-neutral-muted">
              The annual ₹365 contribution (₹1 a day) supports community drives, disaster relief equipment and volunteer identity cards across all 38 districts of Tamil Nadu.
            </p>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="flex flex-col items-center justify-center rounded-xl border border-brand-green-tint bg-brand-green-tint/30 p-6 text-center">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-muted">Pay to UPI ID</div>
                <div className="mt-2 break-all font-mono text-lg font-semibold text-brand-green-dark">tnvvolunteers@sbi</div>
                <div className="mt-1 text-xs text-neutral-muted">GPay, PhonePe, Paytm or BHIM</div>
                <div className="mt-4 font-display text-2xl font-extrabold text-brand-green">₹365</div>
              </div>

              <form onSubmit={handleVerifyPayment} className="flex flex-col justify-between space-y-4">
                <div>
                  <label htmlFor="utrInput" className="mb-1.5 block text-sm font-semibold text-neutral-ink">
                    UPI Reference / UTR Number
                  </label>
                  <input
                    id="utrInput"
                    type="text"
                    inputMode="numeric"
                    maxLength={12}
                    value={utr}
                    onChange={e => { setUtr(e.target.value.replace(/\D/g, '')); setError(''); }}
                    placeholder="12-digit UPI reference number"
                    className="min-h-tap block w-full rounded-lg border border-neutral-muted/40 px-3 py-2.5 font-mono text-base text-neutral-ink focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
                  />
                  <p className="mt-1 text-xs text-neutral-muted">Shown in your UPI app after paying.</p>
                  {error && (
                    <p className="mt-2 text-sm font-medium text-status-no-answer" role="alert">{error}</p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-register min-h-tap w-full text-base font-semibold shadow-sm">
                  {loading ? <Spinner className="mr-2 h-5 w-5" /> : null}
                  Confirm Payment
                </button>

                <div className="rounded-lg bg-brand-yellow-tint/60 p-3 text-xs text-neutral-ink">{VERIFICATION_NOTICE}</div>
              </form>
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
    <div className={`rounded-xl border bg-white p-8 text-center shadow-sm ${success ? 'border-brand-green/40' : 'border-brand-yellow/60'}`} role="status">
      <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${success ? 'bg-brand-green-tint text-brand-green' : 'bg-brand-yellow-tint text-amber-700'}`}>
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          {success ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
      </div>
      <h2 className="font-display text-2xl font-bold text-brand-green-dark">{title}</h2>
      {text && <p className="mt-2 text-sm text-neutral-muted">{text}</p>}
      {children}
    </div>
  );
}

function DashboardButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="btn-register min-h-tap inline-flex items-center justify-center px-8">
      Go to Your Dashboard &rarr;
    </button>
  );
}
