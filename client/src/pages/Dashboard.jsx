import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyProfile, getMyLinks, getMemberDocuments, recordPayment } from '../lib/volunteerService.js';
import { logout } from '../lib/authService.js';
import { getToken } from '../lib/session.js';
import Spinner from '../components/Spinner.jsx';
import FieldWorkList from '../components/FieldWorkList.jsx';
import { getEvents, registerForEvent, STATUS_BADGES } from '../lib/eventService.js';
import SocialIcon from '../components/SocialIcon.jsx';
import { ORG, MANAGEMENT, IMPACT, PROGRAMS, CREDENTIALS, NEWS, SOCIAL_LINKS, CONTACT } from '../data/site.js';

const MEMBERSHIP_FEE = 365;

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// One year of membership from the payment date
const validUntil = (paidAt) => {
  const d = new Date(paidAt);
  if (!paidAt || isNaN(d.getTime())) return '';
  d.setFullYear(d.getFullYear() + 1);
  return formatDate(d);
};

function VolunteerEventsFeed({ userDistrict }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [registeringId, setRegisteringId] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function fetchFeed() {
      setLoading(true);
      const res = await getEvents({ public: 'true' });
      setLoading(false);
      if (res.ok && Array.isArray(res.data?.events)) {
        setEvents(res.data.events);
      }
    }
    fetchFeed();
  }, []);

  const handleJoin = async (id, title) => {
    setRegisteringId(id);
    const res = await registerForEvent(id);
    setRegisteringId(null);
    if (res.ok) {
      setRegisteredIds(prev => new Set([...prev, id]));
      setMsg(`You're confirmed as a volunteer for "${title}"!`);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, registered_count: (e.registered_count || 0) + 1 } : e));
      setTimeout(() => setMsg(''), 4000);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Spinner className="mx-auto h-6 w-6 text-brand-green" />
        <p className="text-xs text-neutral-muted mt-2">Loading active drives...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-neutral-muted">
        No active drives scheduled right now. Check back soon!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="text-xs text-emerald-700">Dismiss</button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map(evt => {
          const badge = STATUS_BADGES[evt.status] || STATUS_BADGES.Published;
          const isRegistered = registeredIds.has(evt.id);
          const isUserDist = userDistrict && evt.district && (evt.district.toLowerCase() === userDistrict.toLowerCase() || evt.district.toLowerCase() === 'all districts');

          return (
            <div key={evt.id} className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${isUserDist ? 'border-brand-green bg-brand-green-tint/15' : 'border-neutral-200 bg-white'}`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                    {evt.status === 'Ongoing' ? 'Live Now' : 'Upcoming'}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                    📍 {evt.district}
                  </span>
                </div>
                <h4 className="text-sm font-bold font-display text-neutral-ink leading-snug">
                  {evt.title}
                </h4>
                <p className="text-xs text-neutral-muted line-clamp-2">
                  {evt.description}
                </p>
                <div className="text-[11px] text-neutral-500 space-y-0.5 pt-1">
                  <div>📅 {evt.start_date} ({evt.start_time} - {evt.end_time})</div>
                  <div className="truncate">📍 {evt.venue}</div>
                  <div>👥 {evt.registered_count || 0} / {evt.capacity} Volunteers Signed Up</div>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] text-neutral-muted">Wing: {evt.wing}</span>
                <button
                  disabled={isRegistered || registeringId === evt.id}
                  onClick={() => handleJoin(evt.id, evt.title)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                    isRegistered
                      ? 'bg-emerald-100 text-emerald-800 cursor-default'
                      : 'btn-primary'
                  }`}
                >
                  {registeringId === evt.id ? (
                    <Spinner className="w-3 h-3" />
                  ) : isRegistered ? (
                    '✓ Registered'
                  ) : (
                    'Volunteer Now'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Sidebar Navigation Tab
  // 'overview' | 'profile' | 'membership' | 'idcard' | 'appointment' | 'whatsapp' | 'donate'
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [idCardSide, setIdCardSide] = useState('front'); // 'front' | 'back'

  // Initial UPI Payment Modal (for unverified / first-time fee)
  const [showPayModal, setShowPayModal] = useState(false);
  const [utr, setUtr] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payMessage, setPayMessage] = useState('');

  // Payment Renewal Modal & State (Requirement 5)
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [renewalUtr, setRenewalUtr] = useState('');
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [renewalSuccess, setRenewalSuccess] = useState(null);
  const [renewalError, setRenewalError] = useState('');

  // Dynamic Payment History Ledger (Requirement 4 & 5)
  const [paymentHistory, setPaymentHistory] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    const res = await getMyProfile();
    if (res.ok && res.data) {
      const p = res.data.profile || res.data;
      setProfile(p);

      // Payment history comes only from the server: nothing is shown until a payment is recorded
      const paidAt = p.membership_paid_at || p.paid_at || null;
      setPaymentHistory(
        p.membership_paid
          ? [{
              id: 'membership',
              receipt_no: p.receipt_no || 'Issued',
              purpose: 'Annual Volunteer Membership',
              amount: MEMBERSHIP_FEE,
              date: formatDate(paidAt) || 'Recorded',
              valid_until: validUntil(paidAt),
              payment_mode: 'UPI',
              utr: p.utr || p.gateway_ref || '',
              status: 'PAID'
            }]
          : []
      );

      if (p.status === 'approved') {
        const [lRes, dRes] = await Promise.all([getMyLinks(), getMemberDocuments()]);
        if (lRes.ok) setLinks(lRes.data);
        if (dRes.ok) setDocuments(dRes.data);
      }
    } else {
      setError('You are not logged in, or your session has expired.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePayNow = async e => {
    e.preventDefault();
    if (!utr.trim()) return;

    setPayLoading(true);
    const res = await recordPayment({
      profile_id: profile.id,
      utr: utr.trim(),
      payment_mode: 'UPI_QR'
    });
    setPayLoading(false);

    if (res.ok && res.data?.status === 'paid') {
      setPayMessage(`Payment recorded. Receipt: ${res.data.receipt_no}`);
      setTimeout(() => {
        setShowPayModal(false);
        setPayMessage('');
        loadData();
      }, 1200);
    } else {
      setPayMessage(res.data?.error || "We couldn't confirm this payment. Please check the reference number and try again.");
    }
  };

  // Payment Renewal Submission Handler (Requirement 5)
  const handleRenewalSubmit = async e => {
    e.preventDefault();
    if (!renewalUtr.trim()) {
      setRenewalError('Please enter your 12-digit UPI transaction reference (UTR) number.');
      return;
    }

    setRenewalLoading(true);
    setRenewalError('');

    const res = await recordPayment({
      profile_id: profile.id,
      utr: renewalUtr.trim(),
      payment_mode: 'UPI_QR'
    });
    setRenewalLoading(false);

    if (res.ok && res.data?.status === 'paid' && res.data.receipt_no && res.data.receipt_no !== profile.receipt_no) {
      setRenewalSuccess({ receipt_no: res.data.receipt_no, valid_until: validUntil(res.data.paid_at || new Date()) });
      setRenewalUtr('');
      loadData();
    } else if (res.ok && res.data?.status === 'paid') {
      setRenewalError('This year\'s membership fee is already paid. Renewal opens when your membership is due.');
    } else {
      setRenewalError(res.data?.error || "We couldn't confirm this payment. Please check the reference number and try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F9FB]">
        <Spinner className="h-10 w-10 text-brand-green" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F9FB] px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-neutral-muted/20 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-green-tint text-brand-green-dark">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-neutral-ink">Sign In Required</h1>
          <p className="mt-2 text-sm text-neutral-muted">{error || 'Please sign in to access your volunteer member dashboard.'}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/login" className="btn-primary min-h-tap inline-flex items-center justify-center px-6 text-sm font-bold">
              Sign In
            </Link>
            <Link to="/register" className="btn-outline min-h-tap inline-flex items-center justify-center px-6 text-sm font-bold">
              Register as Volunteer
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isApproved = profile.status === 'approved';
  const isPaid = Boolean(profile.membership_paid);
  const isAdmin = profile.role === 'master_admin' || profile.role === 'dept_admin' || profile.role === 'admin';
  const initial = (profile.full_name || 'V').trim().charAt(0).toUpperCase();
  const joinedDate = new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const authToken = getToken();
  const cacheKey = profile.approved_at || profile.updated_at || profile.status || '1';
  const idCardPdfUrl = `/api/id-card/${profile.id}.pdf?v=${encodeURIComponent(cacheKey)}${authToken ? `&t=${encodeURIComponent(authToken)}` : ''}`;
  const apptPdfUrl = `/api/appointment/${profile.id}.pdf?v=${encodeURIComponent(cacheKey)}${authToken ? `&t=${encodeURIComponent(authToken)}` : ''}`;
  const memberId = profile.tnv_id || `TNV/${new Date().getFullYear()}/${String(profile.id).padStart(4, '0')}`;

  // Dynamic Joining Date & Validity (+1 Year)
  const regDateObj = new Date(profile.approved_at || profile.membership_paid_at || profile.created_at || Date.now());
  const validRegDate = isNaN(regDateObj.getTime()) ? new Date() : regDateObj;
  const pad2 = n => String(n).padStart(2, '0');
  const joiningDateFormatted = `${pad2(validRegDate.getDate())}-${pad2(validRegDate.getMonth() + 1)}-${validRegDate.getFullYear()}`;
  const validityDateFormatted = `${pad2(validRegDate.getDate())}-${pad2(validRegDate.getMonth() + 1)}-${validRegDate.getFullYear() + 1}`;
  const dynamicStartYear = validRegDate.getFullYear();
  const dynamicYearString = `${dynamicStartYear} - ${dynamicStartYear + 1}`;
  const salutation = (profile.gender && String(profile.gender).toLowerCase() === 'female') ? 'Ms.' : 'Mr.';
  const currentValidity = isPaid ? (paymentHistory[0]?.valid_until || 'one year from payment') : 'fee not paid yet';
  const totalAmountPaid = paymentHistory.reduce((acc, curr) => acc + (curr.amount || MEMBERSHIP_FEE), 0);

  return (
    <div className="flex min-h-screen bg-neutral-bg font-sans antialiased text-neutral-ink">
      {/* =================================================================== */}
      {/* 1. TNV CIVIC FOREST GREEN SIDEBAR                                   */}
      {/* =================================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col justify-between bg-brand-green-dark text-slate-200 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Organization Brand Header */}
          <div className="flex items-center gap-3.5 border-b border-emerald-950/60 px-6 py-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm">
              <img src="/tnv-logo.png" alt="TNV" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-display text-sm font-extrabold tracking-wide text-white">
                Tamil Nadu Volunteers
              </h2>
              <p className="truncate text-xs font-semibold text-brand-yellow font-display">TNV Volunteer Hub</p>
            </div>
          </div>

          {/* Admin Switcher Card in Sidebar (If Admin) */}
          {isAdmin && (
            <div className="p-3 border-b border-emerald-950/60 bg-white/5">
              <Link
                to="/admin"
                className="flex items-center justify-between rounded-xl bg-brand-yellow/15 border border-brand-yellow/40 p-2.5 text-xs font-bold text-amber-200 hover:bg-brand-yellow hover:text-neutral-900 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-yellow text-neutral-900 font-black text-xs font-display">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  <span className="font-display font-bold">Admin Command Center</span>
                </div>
                <span className="text-[10px] bg-brand-yellow text-neutral-900 px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold">
                  Queue &rarr;
                </span>
              </Link>
            </div>
          )}

          {/* Section: MAIN NAVIGATION */}
          <div className="px-4 py-4">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-emerald-300/60 font-display">
              MAIN NAVIGATION
            </div>

            <nav className="mt-2 space-y-1">
              {/* Overview Tab */}
              <button
                type="button"
                onClick={() => { setActiveTab('overview'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span>Dashboard Overview</span>
                </div>
                {activeTab === 'overview' && <span className="h-2 w-2 rounded-full bg-brand-yellow" />}
              </button>

              {/* Requirement 4: Dedicated Volunteer Profile Tab */}
              <button
                type="button"
                onClick={() => { setActiveTab('profile'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                  activeTab === 'profile'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Volunteer Profile</span>
                </div>
                {activeTab === 'profile' ? (
                  <span className="h-2 w-2 rounded-full bg-brand-yellow" />
                ) : (
                  <span className="text-[10px] bg-brand-yellow text-neutral-900 px-1.5 py-0.2 rounded font-bold uppercase">
                    New
                  </span>
                )}
              </button>

              {/* Requirement 5: Membership & Renewal Tab */}
              <button
                type="button"
                onClick={() => { setActiveTab('membership'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                  activeTab === 'membership'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Membership & Renewal</span>
                </div>
                {activeTab === 'membership' ? (
                  <span className="h-2 w-2 rounded-full bg-brand-yellow" />
                ) : (
                  <span className="text-xs text-emerald-300/60">&rarr;</span>
                )}
              </button>

              {/* Generate ID Card Tab */}
              <button
                type="button"
                onClick={() => { setActiveTab('idcard'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  activeTab === 'idcard'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <span>Generate ID Card</span>
                </div>
                <span className="text-xs text-emerald-300/60">&rarr;</span>
              </button>

              {/* Appointment Letter Tab */}
              <button
                type="button"
                onClick={() => { setActiveTab('appointment'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  activeTab === 'appointment'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Appointment Letter</span>
                </div>
                <span className="text-xs text-emerald-300/60">&rarr;</span>
              </button>

              {/* WhatsApp Community Tab */}
              <button
                type="button"
                onClick={() => { setActiveTab('whatsapp'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  activeTab === 'whatsapp'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>WhatsApp Community</span>
                </div>
                <span className="text-xs text-emerald-300/60">&rarr;</span>
              </button>

              {/* Events & Drives Tab */}
              <button
                type="button"
                onClick={() => { setActiveTab('events'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  activeTab === 'events'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Events & Drives</span>
                </div>
                <span className="text-xs text-emerald-300/60">&rarr;</span>
              </button>

              {/* About TNV Tab */}
              <button
                type="button"
                onClick={() => { setActiveTab('about'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  activeTab === 'about'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>About TNV</span>
                </div>
                <span className="text-xs text-emerald-300/60">&rarr;</span>
              </button>

              {/* Donate Tab */}
              <button
                type="button"
                onClick={() => { setActiveTab('donate'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  activeTab === 'donate'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>Donate Now</span>
                </div>
                <span className="text-xs text-emerald-300/60">&rarr;</span>
              </button>
            </nav>
          </div>
        </div>

        {/* User Card at Bottom of Sidebar */}
        <div className="border-t border-emerald-950/60 p-4">
          <div className="flex items-center justify-between rounded-xl bg-black/20 border border-white/5 p-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow font-black font-display text-neutral-900 shadow-sm">
                {initial}
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">{profile.full_name}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-brand-yellow font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-yellow animate-pulse" />
                  <span className="capitalize">{isApproved ? 'Verified Member' : 'Applicant'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar Overlay on Mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      {/* =================================================================== */}
      {/* 2. MAIN APPLICATION WORKSPACE CANVAS                                */}
      {/* =================================================================== */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-brand-green-tint/80 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-bg lg:hidden"
              aria-label="Toggle sidebar"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h1 className="font-display text-base sm:text-lg font-bold text-brand-green-dark">
                {activeTab === 'profile'
                  ? 'Volunteer Profile & History'
                  : activeTab === 'membership'
                  ? 'Membership Status & Renewal'
                  : activeTab === 'idcard'
                  ? 'Official Identity Card'
                  : activeTab === 'appointment'
                  ? 'Official Appointment Order'
                  : activeTab === 'whatsapp'
                  ? 'District WhatsApp Network'
                  : activeTab === 'events'
                  ? 'Civic Action & Volunteer Drives'
                  : activeTab === 'donate'
                  ? 'Support & Donations'
                  : 'Volunteer Dashboard'}
              </h1>
              <div className="text-[11px] text-neutral-muted">Tamil Nadu Volunteers / Member Workspace</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Quick Renewal Action in Top Bar */}
            <button
              type="button"
              onClick={() => setRenewalModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-extrabold text-xs shadow-xs transition-all font-display"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Renew Membership</span>
            </button>

            {/* Status Switcher Badge */}
            <div className="flex items-center gap-2 rounded-full bg-brand-green-tint px-3 py-1 border border-brand-green/30">
              <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
              <span className="text-xs font-bold text-brand-green-dark">Live</span>
            </div>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">

          {/* =============================================================== */}
          {/* VIEW 1: VOLUNTEER PROFILE SECTION (Requirement 4)               */}
          {/* =============================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Profile Hero Header Card */}
              <div className="rounded-2xl border border-brand-green-tint bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-brand-green-dark font-display text-3xl font-black text-brand-yellow shadow-md ring-4 ring-brand-green-tint">
                      {initial}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-2xl font-black text-neutral-ink">
                          {profile.full_name}
                        </h2>
                        <span className="rounded-full bg-brand-green-tint px-2.5 py-0.5 text-xs font-bold text-brand-green-dark border border-brand-green/30 font-display">
                          {isApproved ? 'Verified Member' : 'Application in Progress'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        @{profile.username} &bull; Member ID: <strong className="font-mono text-neutral-900">{memberId}</strong> &bull; Enrolled {joinedDate}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-lg bg-neutral-100 px-2.5 py-1 font-semibold text-neutral-700 border border-neutral-200">
                          📍 {profile.district_name || 'Tamil Nadu'}
                        </span>
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 border border-emerald-200">
                          🛡️ {profile.wing_to_join || profile.wing || 'Not assigned yet'}
                        </span>
                        <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-bold text-amber-900 border border-amber-200 font-display">
                          📅 Valid until {currentValidity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Action Buttons */}
                  <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRenewalModalOpen(true)}
                      className="btn-register py-2.5 px-5 text-xs font-bold shadow-sm font-display flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Renew Membership (₹365)</span>
                    </button>
                    <a
                      href={idCardPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline py-2.5 px-5 text-xs font-bold font-display flex items-center justify-center gap-1.5"
                    >
                      <span>Official ID Card (PDF)</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* 3-Column Profile Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Personal & Contact Details */}
                <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-brand-green-tint">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-green-tint text-brand-green">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <h3 className="font-display text-sm font-bold text-brand-green-dark">Personal Information</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-neutral-500 block">Registered Mobile</span>
                      <span className="font-mono font-bold text-neutral-900 text-sm">{profile.phone}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Email Address</span>
                      <span className="font-semibold text-neutral-900">{profile.email}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Date of Birth & Gender</span>
                      <span className="font-semibold text-neutral-900">{profile.dob || 'Not specified'} &bull; {profile.gender || 'Male'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Blood Group</span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200">
                        🩸 {profile.blood_group || 'O+'}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Aadhaar (Masked)</span>
                      <span className="font-mono font-semibold text-neutral-700">•••• •••• {profile.aadhaar ? profile.aadhaar.slice(-4) : '8912'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. District & Location Details */}
                <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-brand-green-tint">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-green-tint text-brand-green">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </span>
                    <h3 className="font-display text-sm font-bold text-brand-green-dark">Location & Jurisdiction</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-neutral-500 block">District</span>
                      <span className="font-bold text-neutral-900 text-sm">{profile.district_name || 'Tamil Nadu'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Assembly Constituency</span>
                      <span className="font-semibold text-neutral-900">{profile.assembly_constituency || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Panchayat / Local Ward</span>
                      <span className="font-semibold text-neutral-900">{profile.panchayat || 'Headquarters'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Pincode</span>
                      <span className="font-mono font-semibold text-neutral-900">{profile.pincode || '600001'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Residential Address</span>
                      <span className="text-neutral-700 leading-relaxed block">{profile.address || 'Tamil Nadu, India'}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Volunteering Wings & Track Record */}
                <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-brand-green-tint">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-green-tint text-brand-green">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <h3 className="font-display text-sm font-bold text-brand-green-dark">Volunteering Details</h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-neutral-500 block">Affiliation Type</span>
                      <span className="font-bold text-neutral-900">{profile.affiliation || 'Individual'} {profile.organization_name ? `(${profile.organization_name})` : ''}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Assigned Wing</span>
                      <span className="font-bold text-brand-green-dark">{profile.wing_to_join || profile.wing || 'Not assigned yet'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Department</span>
                      <span className="font-semibold text-neutral-900">{profile.department || 'Field Relief & Social Welfare'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Mode of Work & Role</span>
                      <span className="font-semibold text-neutral-900">{profile.mode_of_work || 'Not provided'} &bull; {profile.preferred_designation || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Past Volunteering Experience</span>
                      <FieldWorkList record={profile} className="mt-1" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement 4: Official Payment History & Transactions Ledger */}
              <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-green-tint pb-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-brand-green-dark">
                      Membership Payment History & Receipts
                    </h3>
                    <p className="text-xs text-neutral-muted">
                      Complete verified payment audit log for annual dues, renewals, and receipt PDFs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRenewalModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-extrabold text-xs shadow-xs transition-all font-display self-start sm:self-auto"
                  >
                    <span>Renew Membership (₹365)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                        <th className="pb-3">RECEIPT NO.</th>
                        <th className="pb-3">PURPOSE</th>
                        <th className="pb-3">AMOUNT</th>
                        <th className="pb-3">DATE</th>
                        <th className="pb-3">VALID UNTIL</th>
                        <th className="pb-3">MODE</th>
                        <th className="pb-3">STATUS</th>
                        <th className="pb-3 text-right">OFFICIAL RECEIPT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {paymentHistory.length === 0 && (
                        <tr><td colSpan={8} className="py-4 text-center text-xs text-neutral-500">No payment recorded yet.</td></tr>
                      )}
                      {paymentHistory.map(item => (
                        <tr key={item.id} className="hover:bg-neutral-50/60 transition-colors">
                          <td className="py-3.5 font-mono font-bold text-neutral-900">{item.receipt_no}</td>
                          <td className="py-3.5 font-semibold text-neutral-800">{item.purpose}</td>
                          <td className="py-3.5 font-mono font-bold text-brand-green">₹{item.amount}</td>
                          <td className="py-3.5 text-neutral-600">{item.date}</td>
                          <td className="py-3.5 font-medium text-emerald-800">{item.valid_until}</td>
                          <td className="py-3.5 text-neutral-600">{item.payment_mode}</td>
                          <td className="py-3.5">
                            <span className="inline-block rounded-full bg-brand-green-tint px-2.5 py-0.5 text-[10px] font-bold text-brand-green-dark border border-brand-green/20">
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <a
                              href={`/api/receipts/${item.receipt_no}.pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-display text-xs font-bold text-brand-green hover:underline inline-flex items-center gap-1"
                            >
                              <span>Download PDF</span>
                              <span>&darr;</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl bg-brand-green-tint/40 border border-brand-green/20 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="text-brand-green-dark">
                    <strong>Total Contributions Recorded:</strong> ₹{totalAmountPaid} &bull; Next renewal due on or before <strong>{currentValidity}</strong>.
                  </div>
                  <div className="text-neutral-500 text-[11px]">
                    All payments eligible for 80G tax exemption &bull; Official receipts verifiable statewide
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 2: MEMBERSHIP STATUS & PAYMENT RENEWAL (Requirement 5)      */}
          {/* =============================================================== */}
          {activeTab === 'membership' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Membership Renewal Hero Card */}
              <div className="rounded-2xl border-2 border-brand-yellow/50 bg-gradient-to-r from-brand-yellow-tint/40 via-white to-brand-green-tint/30 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <span className="inline-block rounded-full bg-brand-yellow-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900 font-display mb-2 border border-amber-300">
                      Annual Membership Validity
                    </span>
                    <h2 className="font-display text-2xl font-black text-neutral-ink">
                      {isPaid ? 'Membership Fee Paid' : 'Membership Fee Not Paid Yet'}
                    </h2>
                    <p className="mt-1 text-xs sm:text-sm text-neutral-600 max-w-xl">
                      Your annual contribution of ₹365 (₹1/day) directly sustains volunteer mobilization, crisis relief supplies, and verified identity cards across Tamil Nadu.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 bg-brand-green-tint px-3 py-1.5 rounded-xl border border-brand-green/20 font-display">
                        <span>Fee Status:</span>
                        <span className="uppercase">{isPaid ? 'Paid' : 'Not paid'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 bg-brand-yellow-tint px-3 py-1.5 rounded-xl border border-amber-300 font-display">
                        <span>Valid Until:</span>
                        <span>{currentValidity}</span>
                      </div>
                      <div className="font-mono text-neutral-600">
                        Volunteer ID: <strong>{memberId}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Renew Button */}
                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setRenewalModalOpen(true)}
                      className="btn-register py-3 px-6 text-sm font-bold shadow-md font-display flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Renew Membership (₹365)</span>
                    </button>
                    <span className="text-[11px] text-center text-neutral-500">
                      Extends membership by 1 full year
                    </span>
                  </div>
                </div>
              </div>

              {/* Renewal Benefits & Guidelines Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm space-y-3">
                  <h3 className="font-display text-base font-bold text-brand-green-dark">
                    What is Included in Your Annual Membership
                  </h3>
                  <ul className="space-y-2.5 text-xs text-neutral-700">
                    <li className="flex items-start gap-2">
                      <span className="text-brand-green font-bold">✓</span>
                      <span><strong>Statewide Accredited Volunteer Status:</strong> Recognized identity card valid across 38 districts and government civil bodies.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-green font-bold">✓</span>
                      <span><strong>Disaster Relief Operations:</strong> Priority dispatch and ground support resources during emergency relief drives.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-green font-bold">✓</span>
                      <span><strong>District Command Access:</strong> Entry to private district WhatsApp coordinators group and appointment order.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-brand-green font-bold">✓</span>
                      <span><strong>80G Tax Exemption:</strong> Annual contributions are eligible for income tax benefits under Sec 80G.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm space-y-3">
                  <h3 className="font-display text-base font-bold text-brand-green-dark">
                    How Membership Renewal Works
                  </h3>
                  <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
                    <p>
                      Tamil Nadu Volunteers follows a transparent annual renewal cycle of ₹365 per year. When you renew, your validity date is automatically extended by 365 days from your existing expiration date.
                    </p>
                    <p>
                      You may renew at any time before or after expiry. Your volunteer profile, member ID, appointment letter, and attendance history remain permanently linked to your profile.
                    </p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setRenewalModalOpen(true)}
                        className="text-brand-green font-bold text-xs hover:underline font-display"
                      >
                        Click here to launch the Renewal Verification Dialog &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment History in Membership View */}
              <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm">
                <h3 className="font-display text-base font-bold text-brand-green-dark mb-4 pb-2 border-b border-brand-green-tint">
                  Transaction & Receipt Archive
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                        <th className="pb-3">RECEIPT NUMBER</th>
                        <th className="pb-3">PERIOD</th>
                        <th className="pb-3">AMOUNT</th>
                        <th className="pb-3">DATE</th>
                        <th className="pb-3">STATUS</th>
                        <th className="pb-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {paymentHistory.length === 0 && (
                        <tr><td colSpan={8} className="py-4 text-center text-xs text-neutral-500">No payment recorded yet.</td></tr>
                      )}
                      {paymentHistory.map(item => (
                        <tr key={item.id}>
                          <td className="py-3 font-mono font-bold text-neutral-900">{item.receipt_no}</td>
                          <td className="py-3 text-neutral-700">{item.purpose}</td>
                          <td className="py-3 font-mono font-bold text-brand-green">₹{item.amount}</td>
                          <td className="py-3 text-neutral-500">{item.date}</td>
                          <td className="py-3">
                            <span className="rounded-full bg-brand-green-tint px-2 py-0.5 text-[10px] font-bold text-brand-green-dark">
                              PAID
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <a
                              href={`/api/receipts/${item.receipt_no}.pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-green font-bold hover:underline"
                            >
                              Download Receipt &rarr;
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 3: OFFICIAL ID CARD TAB                                     */}
          {/* =============================================================== */}
          {activeTab === 'idcard' && !isApproved && <NotIssuedYet title="Volunteer ID Card" />}
          {activeTab === 'idcard' && isApproved && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-green-tint">
                  <div>
                    <h2 className="font-display text-xl font-bold text-brand-green-dark">
                      Official Volunteer Identity Card
                    </h2>
                    <p className="text-xs text-neutral-muted mt-0.5">
                      Government recognized credential card for field deployments and civic drives.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Front / Back Side Switcher */}
                    <div className="inline-flex rounded-xl bg-neutral-100 p-1 border border-neutral-200 text-xs font-bold font-display">
                      <button
                        type="button"
                        onClick={() => setIdCardSide('front')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          idCardSide === 'front' ? 'bg-brand-green text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        Front Side
                      </button>
                      <button
                        type="button"
                        onClick={() => setIdCardSide('back')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          idCardSide === 'back' ? 'bg-brand-green text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        Back Side
                      </button>
                    </div>

                    <a
                      href={idCardPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-register py-2 px-5 text-xs font-bold shadow-sm font-display inline-flex items-center gap-2"
                    >
                      <span>Download ID Card (PDF)</span>
                      <span>&darr;</span>
                    </a>
                  </div>
                </div>

                {/* Vertical ID Card Graphical Preview */}
                <div className="mt-8 flex flex-col items-center">
                  <div className="relative w-full max-w-[340px] aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 select-none bg-neutral-100">
                    {idCardSide === 'front' ? (
                      /* FRONT SIDE */
                      <div className="relative w-full h-full">
                        <img
                          src="/id-card/front-template.png"
                          alt="ID Card Front Template"
                          className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* 1. Dynamic Vertical Year (Top Right) */}
                        <div className="absolute top-[8.8%] right-[6.8%] flex flex-col items-center justify-center bg-[#fcfcfd] py-1 px-0.5 z-10">
                          <span className="text-[10px] font-extrabold text-neutral-800 tracking-[0.22em] [writing-mode:vertical-lr]">
                            {dynamicYearString}
                          </span>
                        </div>

                        {/* 2. Volunteer Portrait Photo */}
                        <div className="absolute top-[32.2%] left-[16.25%] w-[33.0%] h-[22.9%] rounded-[14px] overflow-hidden flex items-center justify-center bg-sky-50 z-10 shadow-inner">
                          {profile.photo_path || profile.photo_url ? (
                            <img
                              src={profile.photo_path || profile.photo_url}
                              alt={profile.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-sky-700 w-full h-full bg-gradient-to-b from-sky-100 to-sky-200">
                              <span className="font-display text-2xl font-black">{initial}</span>
                              <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">Photo</span>
                            </div>
                          )}
                        </div>

                        {/* 3. Name & Role */}
                        <div className="absolute top-[57.6%] left-[14.4%] right-[10%] z-10">
                          <h3 className="font-sans font-black text-[13.5px] leading-tight text-[#00321f] uppercase tracking-wide truncate">
                            {profile.full_name}
                          </h3>
                          <p className="font-sans font-bold text-[9.5px] leading-tight text-[#873a10] uppercase tracking-wider mt-0.5 truncate">
                            {profile.role || profile.preferred_designation || 'Volunteer'}
                          </p>
                        </div>

                        {/* 4. Dynamic Fields (ID, Mobile, Email, District) - Individually calibrated to align with colons */}
                        <div className="absolute top-[66.3%] -translate-y-1/2 left-[42.5%] right-[8%] font-sans font-black text-[9.5px] leading-none text-black truncate z-10">
                          {memberId}
                        </div>
                        <div className="absolute top-[70.1%] -translate-y-1/2 left-[42.5%] right-[8%] font-sans font-black text-[9.5px] leading-none text-black truncate z-10">
                          {profile.phone}
                        </div>
                        <div className="absolute top-[73.8%] -translate-y-1/2 left-[42.5%] right-[8%] font-sans font-black text-[9px] leading-none text-black truncate z-10">
                          {profile.email}
                        </div>
                        <div className="absolute top-[77.6%] -translate-y-1/2 left-[42.5%] right-[8%] font-sans font-black text-[9.5px] leading-none text-black truncate z-10">
                          {profile.district_name || 'Tamil Nadu'}
                        </div>
                      </div>
                    ) : (
                      /* BACK SIDE */
                      <div className="relative w-full h-full">
                        <img
                          src="/id-card/back-template.png"
                          alt="ID Card Back Template"
                          className="absolute inset-0 w-full h-full object-cover"
                        />

                        {/* Dynamic Joining Date and Validity */}
                        <div className="absolute top-[56.6%] left-[58.0%] font-sans font-black text-[9.5px] leading-none text-black z-10">
                          {joiningDateFormatted}
                        </div>
                        <div className="absolute top-[59.7%] left-[58.0%] font-sans font-black text-[9.5px] leading-none text-black z-10">
                          {validityDateFormatted}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-xs text-neutral-500 font-medium">
                    Click <strong>{idCardSide === 'front' ? 'Back Side' : 'Front Side'}</strong> above to inspect both sides of your official credential.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 4: APPOINTMENT LETTER TAB                                   */}
          {/* =============================================================== */}
          {activeTab === 'appointment' && !isApproved && <NotIssuedYet title="Appointment Letter" />}
          {activeTab === 'appointment' && isApproved && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-brand-green-tint">
                  <div>
                    <h2 className="font-display text-xl font-bold text-brand-green-dark">
                      Official Appointment Order
                    </h2>
                    <p className="text-xs text-neutral-muted mt-0.5">
                      Formal appointment letter issued by the Tamil Nadu Volunteers State Directorate.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={apptPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-50 text-xs font-bold font-display inline-flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <span>Open in New Tab</span>
                      <span>&nearr;</span>
                    </a>
                    <a
                      href={apptPdfUrl}
                      download={`TNV-Appointment-Letter-${profile.username || 'Volunteer'}.pdf`}
                      className="btn-register py-2.5 px-6 text-xs font-bold shadow-sm font-display inline-flex items-center gap-2"
                    >
                      <span>Download Official Order (PDF)</span>
                      <span>&darr;</span>
                    </a>
                  </div>
                </div>

                {/* 100% Selectable Native Vector PDF Viewer */}
                <div className="mt-8 flex flex-col items-center w-full">
                  <div className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-neutral-200 bg-white">
                    <iframe
                      src={`${apptPdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                      title="Official TNV Appointment Letter"
                      className="w-full h-[780px] sm:h-[950px] border-0 bg-white"
                    />
                  </div>

                  <p className="mt-4 text-xs text-neutral-500 font-medium text-center">
                    This official letter is issued by Tamil Nadu Volunteers State Directorate. Every word is vector-rendered and fully selectable with the blue text cursor.
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* =============================================================== */}
          {/* VIEW 5: WHATSAPP COMMUNITY TAB                                   */}
          {/* =============================================================== */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="font-display text-xl font-bold text-brand-green-dark mb-2">
                  District WhatsApp Command Network
                </h2>
                <p className="text-xs text-neutral-muted mb-6">
                  Join verified district communication groups for real-time task alerts, event volunteering, and coordinator updates.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-brand-green/30 bg-brand-green-tint/40 p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green text-white font-bold text-lg">
                        WA
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-brand-green-dark">
                          {profile.district_name || 'District'} Volunteer Network
                        </h3>
                        <p className="text-[11px] text-neutral-500">Official District Group</p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600">
                      Connect with local coordinators in {profile.district_name || 'your district'} for field drives and meeting schedules.
                    </p>
                    <a
                      href="https://wa.me/919087293339"
                      target="_blank"
                      rel="noreferrer"
                      className="btn-register inline-flex w-full items-center justify-center py-2.5 text-xs font-bold"
                    >
                      Connect with District Coordinator &rarr;
                    </a>
                  </div>

                  <div className="rounded-2xl border border-brand-yellow/40 bg-brand-yellow-tint/40 p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-yellow text-neutral-900 font-bold text-lg">
                        WG
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-neutral-900">
                          {profile.wing_to_join || profile.wing || 'Youth'} Wing Statewide Group
                        </h3>
                        <p className="text-[11px] text-neutral-500">State Coordination</p>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-600">
                      Collaborate on specialized state projects including the 1 Crore Palm Plantation and tuition centres.
                    </p>
                    <a
                      href="https://wa.me/919087293339"
                      target="_blank"
                      rel="noreferrer"
                      className="btn inline-flex w-full items-center justify-center rounded-xl bg-brand-green-dark text-white py-2.5 text-xs font-bold hover:bg-brand-green"
                    >
                      Join Wing Coordination &rarr;
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW: EVENTS & DRIVES TAB */}
          {activeTab === 'events' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-100">
                  <div>
                    <h2 className="font-display text-xl font-bold text-brand-green-dark">
                      Field Drives & Civic Events
                    </h2>
                    <p className="text-xs text-neutral-muted mt-0.5">
                      Participate in environmental, relief, and youth empowerment initiatives across Tamil Nadu.
                    </p>
                  </div>
                  <Link
                    to="/events"
                    className="btn-primary text-xs font-semibold px-4 py-2 shrink-0 self-start sm:self-auto"
                  >
                    View Public Calendar &rarr;
                  </Link>
                </div>
                <VolunteerEventsFeed userDistrict={profile?.district_name} />
              </div>
            </div>
          )}

          {/* VIEW 6: DONATE TAB                                               */}
          {/* =============================================================== */}
          {activeTab === 'donate' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 sm:p-8 shadow-sm">
                <h2 className="font-display text-xl font-bold text-brand-green-dark mb-2">
                  Support Tamil Nadu Volunteers
                </h2>
                <p className="text-xs text-neutral-muted mb-6">
                  Project Social Connect: 1 Day 1 Rupee scheme to support emergency relief and tribal welfare.
                </p>

                <div className="max-w-md mx-auto text-center space-y-4">
                  <div className="inline-block rounded-2xl border border-brand-green bg-brand-green-tint/50 p-4">
                    <span className="font-mono text-base font-bold text-brand-green-dark">tnvvolunteers@sbi</span>
                  </div>
                  <p className="text-xs text-neutral-600">
                    All voluntary contributions receive official 80G tax benefit receipts.
                  </p>
                  <Link to="/donate" className="btn-register inline-flex px-8 py-3 text-xs font-bold font-display">
                    Open Donation Portal &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'about' && <AboutTnv links={links} isApproved={isApproved} />}

          {/* =============================================================== */}
          {/* VIEW 7: DASHBOARD OVERVIEW (Default)                             */}
          {/* =============================================================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Admin Command Center Quick Access Banner (If Admin) */}
              {isAdmin && (
                <div className="rounded-2xl border-2 border-brand-yellow/40 bg-gradient-to-r from-brand-green-dark via-[#14532D] to-brand-green p-5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-yellow text-neutral-900 font-black shadow-sm">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold uppercase tracking-wider text-brand-yellow font-display">
                          Administrator Command Desk
                        </span>
                        <span className="bg-brand-yellow text-neutral-900 text-[10px] font-black px-2 py-0.5 rounded-full font-display">
                          Statewide Queue
                        </span>
                      </div>
                      <p className="text-xs text-emerald-100 mt-0.5">
                        Manage Applicant Review Queue, telephone Call Logs, 10-Question scoresheets, and appointments.
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/admin"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-yellow hover:bg-amber-400 px-5 py-2.5 text-xs font-black text-neutral-900 shadow-md transition-all shrink-0 font-display"
                  >
                    <span>Open Admin Queue</span>
                    <span>&rarr;</span>
                  </Link>
                </div>
              )}

              {/* Hero Greeting Banner */}
              <div className="relative overflow-hidden rounded-2xl border border-brand-green-tint bg-gradient-to-r from-brand-green-tint/80 via-white to-brand-yellow-tint/40 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-green font-display text-3xl font-extrabold text-white shadow-md">
                      {initial}
                    </div>

                    <div className="space-y-1.5">
                      <h2 className="font-display text-xl sm:text-2xl font-black text-brand-green-dark">
                        Welcome, {profile.full_name}!
                      </h2>
                      <div className="text-xs font-medium text-neutral-600">
                        {profile.email || 'Email not provided'} &bull; ID: <strong className="font-mono text-neutral-900">{memberId}</strong>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold bg-brand-green-tint text-brand-green-dark border border-brand-green/30">
                          <span>{isApproved ? 'Active Member' : 'Under Review'}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                          Joined {joinedDate}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-brand-yellow-tint text-amber-900 border border-amber-300 px-2.5 py-0.5 text-xs font-bold font-display">
                          Valid until {currentValidity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Profile & Renewal Shortcut Buttons */}
                  <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="btn-outline py-2 px-4 text-xs font-bold font-display flex items-center justify-center gap-1.5"
                    >
                      <span>View Volunteer Profile</span>
                      <span>&rarr;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenewalModalOpen(true)}
                      className="btn-register py-2 px-4 text-xs font-bold font-display flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Renew Membership</span>
                    </button>
                  </div>
                </div>
              </div>

              <VerificationProgress profile={profile} isPaid={isPaid} isApproved={isApproved} onPay={() => navigate('/register/payment', { state: { profile } })} />

              {/* 4 Executive Metric Cards */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Card 1: Membership Fee & Validity */}
                <div
                  onClick={() => setActiveTab('membership')}
                  className="rounded-2xl border border-brand-green-tint/80 border-t-4 border-t-brand-yellow bg-white p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-yellow-tint text-amber-800 font-bold font-display text-lg">
                      ₹
                    </div>
                    <span className="text-[10px] font-bold text-amber-900 bg-brand-yellow-tint px-2 py-0.5 rounded-full font-display">
                      Renewable
                    </span>
                  </div>
                  <div className="mt-3 font-display text-2xl font-black text-neutral-ink">
                    ₹{totalAmountPaid}
                  </div>
                  <div className="text-xs font-bold text-neutral-700 mt-0.5">Membership Dues Paid</div>
                  <div className="mt-1 text-[11px] text-brand-green font-medium">
                    Valid until {currentValidity} &rarr;
                  </div>
                </div>

                {/* Card 2: Volunteer Profile */}
                <div
                  onClick={() => setActiveTab('profile')}
                  className="rounded-2xl border border-brand-green-tint/80 border-t-4 border-t-brand-green bg-white p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-tint text-brand-green">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-brand-green bg-brand-green-tint px-2 py-0.5 rounded-full font-display">
                      View Profile
                    </span>
                  </div>
                  <div className="mt-3 font-display text-xl font-black text-neutral-ink truncate">
                    {profile.affiliation || 'Individual'}
                  </div>
                  <div className="text-xs font-bold text-neutral-700 mt-0.5">Category & Dossier</div>
                  <div className="mt-1 text-[11px] text-neutral-muted truncate">
                    Payment history & details &rarr;
                  </div>
                </div>

                {/* Card 3: Credentials */}
                <div
                  onClick={() => setActiveTab('idcard')}
                  className="rounded-2xl border border-brand-green-tint/80 border-t-4 border-t-brand-green-dark bg-white p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-tint text-brand-green-dark">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-brand-green-dark bg-brand-green-tint px-2 py-0.5 rounded-full font-display">
                      Credentials
                    </span>
                  </div>
                  <div className="mt-3 font-display text-2xl font-black text-neutral-ink">
                    ID Card
                  </div>
                  <div className="text-xs font-bold text-neutral-700 mt-0.5">Identity Documents</div>
                  <div className="mt-1 text-[11px] text-neutral-muted truncate">
                    ID Card & Order PDF &rarr;
                  </div>
                </div>

                {/* Card 4: Location */}
                <div
                  onClick={() => setActiveTab('whatsapp')}
                  className="rounded-2xl border border-brand-green-tint/80 border-t-4 border-t-emerald-600 bg-white p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-display">
                      Community
                    </span>
                  </div>
                  <div className="mt-3 font-display text-2xl font-black text-neutral-ink truncate">
                    {profile.district_name || 'Tamil Nadu'}
                  </div>
                  <div className="text-xs font-bold text-neutral-700 mt-0.5">{profile.wing_to_join || profile.wing || 'Not assigned yet'}</div>
                  <div className="mt-1 text-[11px] text-neutral-muted truncate">WhatsApp Network &rarr;</div>
                </div>
              </div>

              {/* Upcoming Events Banner in Overview */}
              <div className="rounded-2xl border border-brand-green-tint bg-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold font-display text-neutral-ink text-sm sm:text-base">
                      Civic Action & Field Drives
                    </h3>
                    <p className="text-xs text-neutral-muted">
                      Join active tree plantations, cleanliness rallies, and flood relief drills in {profile?.district_name || 'Tamil Nadu'}.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('events')}
                  className="btn-primary text-xs font-semibold px-4 py-2 shrink-0 self-start sm:self-auto"
                >
                  Explore Drives &rarr;
                </button>
              </div>

              {/* Two Column Section: Payment Ledger Preview & Recent Activity */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left Card: Payment History Preview */}
                <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-brand-green-tint/80 pb-3">
                    <h3 className="font-display text-base font-bold text-brand-green-dark">Payment History</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="text-xs font-bold text-brand-green hover:underline font-display"
                    >
                      View Full Profile &rarr;
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
                          <th className="pb-2.5">RECEIPT</th>
                          <th className="pb-2.5">AMOUNT</th>
                          <th className="pb-2.5">DATE</th>
                          <th className="pb-2.5">STATUS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {paymentHistory.length === 0 && (
                          <tr><td colSpan={4} className="py-4 text-center text-xs text-neutral-500">No payment recorded yet.</td></tr>
                        )}
                        {paymentHistory.map(p => (
                          <tr key={p.id}>
                            <td className="py-2.5 font-mono font-bold text-neutral-900">{p.receipt_no}</td>
                            <td className="py-2.5 font-mono font-bold text-brand-green">₹{p.amount}</td>
                            <td className="py-2.5 text-neutral-500">{p.date}</td>
                            <td className="py-2.5">
                              <span className="rounded-full bg-brand-green-tint px-2 py-0.5 text-[10px] font-bold text-brand-green-dark">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">Valid until {currentValidity}</span>
                    <button
                      type="button"
                      onClick={() => setRenewalModalOpen(true)}
                      className="text-xs font-bold text-amber-800 bg-brand-yellow-tint border border-amber-300 px-3 py-1 rounded-lg hover:bg-brand-yellow transition-colors font-display"
                    >
                      Renew (+1 Year)
                    </button>
                  </div>
                </div>

                {/* Right Card: Quick Actions & Credentials */}
                <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-brand-green-tint/80 pb-3">
                      <h3 className="font-display text-base font-bold text-brand-green-dark">Issued Documents</h3>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${isApproved ? 'bg-brand-green-tint text-brand-green-dark' : 'bg-brand-yellow-tint text-amber-900'}`}>
                        {isApproved ? 'Issued' : 'After approval'}
                      </span>
                    </div>

                    {!isApproved ? (
                      <p className="mt-4 text-xs text-neutral-600">
                        Your ID card and appointment letter are issued when the admin team approves your registration. They will appear here and be sent to {profile.email || 'your registered email'}.
                      </p>
                    ) : (
                    <div className="mt-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl border border-brand-green/20 bg-brand-green-tint/20">
                        <div>
                          <div className="font-bold text-neutral-900">Official Volunteer ID Card</div>
                          <div className="text-[11px] text-neutral-500">Includes QR Code & District Badge</div>
                        </div>
                        <a
                          href={idCardPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-outline px-3 py-1.5 text-xs font-bold font-display"
                        >
                          Download PDF
                        </a>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl border border-brand-green/20 bg-brand-green-tint/20">
                        <div>
                          <div className="font-bold text-neutral-900">Appointment Order Letter</div>
                          <div className="text-[11px] text-neutral-500">Signed by State Chairman & Secretary</div>
                        </div>
                        <a
                          href={apptPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-outline px-3 py-1.5 text-xs font-bold font-display"
                        >
                          Download PDF
                        </a>
                      </div>
                    </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500">Need to update district or wing?</span>
                    <a
                      href="https://wa.me/919087293339"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-brand-green hover:underline font-display"
                    >
                      Contact Support &rarr;
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* 3. MEMBERSHIP RENEWAL MODAL (Requirement 5)                         */}
      {/* =================================================================== */}
      {renewalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-brand-green-dark text-white font-display">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-yellow text-neutral-900 font-black text-sm">
                  ₹
                </span>
                <h3 className="text-base font-bold">Annual Membership Renewal</h3>
              </div>
              <button
                type="button"
                onClick={() => { setRenewalModalOpen(false); setRenewalSuccess(null); setRenewalError(''); }}
                className="text-emerald-200 hover:text-white text-xl font-bold p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6">
              {renewalSuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-green-tint text-brand-green">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="font-display text-2xl font-extrabold text-brand-green-dark">
                    Membership Successfully Renewed!
                  </h4>
                  <p className="text-sm text-neutral-600 max-w-sm mx-auto">
                    Your Tamil Nadu Volunteers membership has been extended for another year. Validity extended to <strong className="text-neutral-900 font-bold">{renewalSuccess.valid_until}</strong>.
                  </p>
                  <div className="rounded-xl border border-brand-green-tint bg-brand-green-tint/30 p-3 text-xs font-mono font-bold text-brand-green-dark">
                    Renewal Receipt: {renewalSuccess.receipt_no}
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                    <a
                      href={`/api/receipts/${renewalSuccess.receipt_no}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-outline px-5 py-2 text-xs font-bold font-display"
                    >
                      Download Renewal Receipt (PDF)
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setRenewalModalOpen(false);
                        setRenewalSuccess(null);
                        setActiveTab('profile');
                      }}
                      className="btn-register px-6 py-2 text-xs font-bold font-display"
                    >
                      View in Volunteer Profile &rarr;
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRenewalSubmit} className="space-y-4">
                  {/* Renewal Details Card */}
                  <div className="rounded-xl border border-brand-green-tint/80 bg-brand-green-tint/30 p-4 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Member Name:</span>
                      <span className="font-bold text-neutral-900">{profile.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Volunteer ID:</span>
                      <span className="font-mono font-bold text-brand-green-dark">{memberId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-600">Renewal Term:</span>
                      <span className="font-semibold text-neutral-800">1 Year Extension (Annual Renewal)</span>
                    </div>
                    <div className="flex justify-between border-t border-brand-green-tint pt-2">
                      <span className="text-neutral-800 font-bold">Annual Contribution:</span>
                      <span className="font-mono font-extrabold text-brand-green text-sm">₹365</span>
                    </div>
                  </div>

                  {/* QR & UPI info */}
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center">
                    <div className="text-xs text-neutral-600 mb-2">
                      Scan via GPay, PhonePe, Paytm, BHIM or any UPI App:
                    </div>
                    <div className="inline-block rounded-xl border border-brand-green bg-white px-4 py-2 shadow-xs">
                      <span className="font-mono text-sm font-bold text-brand-green-dark">
                        tnvvolunteers@sbi
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-500">
                      Amount: ₹365 (₹1/day for volunteer community projects)
                    </div>
                  </div>

                  {/* UTR Input */}
                  <div>
                    <label htmlFor="renewalUtrInput" className="mb-1 block text-xs font-bold text-neutral-800">
                      Enter UPI Reference / UTR Number *
                    </label>
                    <input
                      id="renewalUtrInput"
                      type="text"
                      required
                      value={renewalUtr}
                      onChange={e => setRenewalUtr(e.target.value)}
                      placeholder="12-digit UPI reference number"
                      className="block w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm font-mono focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">
                      12-digit transaction ID from your UPI payment success screen.
                    </p>
                    {renewalError && (
                      <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
                        {renewalError}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="submit"
                      disabled={renewalLoading}
                      className="flex-1 py-3 px-4 rounded-xl bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-extrabold text-xs shadow-sm transition-all flex items-center justify-center font-display"
                    >
                      {renewalLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Verify & Confirm Renewal (₹365)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenewalModalOpen(false)}
                      className="px-4 py-3 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Registration → fee → admin verification (call + interview) → approval → documents.
// Payment and verification are tracked separately: verification never waits on payment.
function VerificationProgress({ profile, isPaid, isApproved, onPay }) {
  const called = profile.call_status && !['Not Called', 'not_called'].includes(profile.call_status);
  const steps = [
    { label: 'Registration saved', done: true, note: formatDate(profile.created_at) },
    { label: 'Membership fee', done: isPaid, note: isPaid ? 'Paid' : 'Not paid yet', separate: true },
    { label: 'Admin call and interview', done: isApproved || called, note: isApproved || called ? 'Done' : 'Our team will call you' },
    { label: 'Approval and role', done: isApproved, note: isApproved ? (profile.role || 'Approved') : 'Pending' },
    { label: 'ID card and appointment letter', done: isApproved, note: isApproved ? 'Issued' : 'After approval' }
  ];
  return (
    <section className="rounded-2xl border border-brand-green-tint/80 bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="font-display text-base font-bold text-brand-green-dark">Your verification progress</h3>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${isApproved ? 'bg-brand-green-tint text-brand-green-dark' : 'bg-brand-yellow-tint text-amber-900'}`}>
          {isApproved ? 'Verified' : 'Under verification'}
        </span>
      </div>
      <ol className="grid gap-3 sm:grid-cols-5">
        {steps.map((st, i) => (
          <li key={st.label} className="flex sm:flex-col gap-3 sm:gap-2 min-w-0">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${st.done ? 'bg-brand-green text-white' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'}`}>
              {st.done ? '✓' : i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-neutral-900">{st.label}</p>
              <p className="text-[11px] text-neutral-500">{st.note}</p>
            </div>
          </li>
        ))}
      </ol>
      {!isApproved && (
        <p className="mt-4 rounded-xl bg-brand-yellow-tint/60 p-3 text-xs text-neutral-800">
          Our admin team will verify your registration within 72 hours{isPaid ? '' : ', whether or not you have paid'}. Payment and verification are separate steps.
        </p>
      )}
      {!isPaid && (
        <button type="button" onClick={onPay} className="btn-register mt-3 min-h-tap px-5 text-xs font-bold">
          Pay ₹{MEMBERSHIP_FEE} membership fee
        </button>
      )}
    </section>
  );
}

function NotIssuedYet({ title }) {
  return (
    <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-8 text-center shadow-sm">
      <h2 className="font-display text-xl font-bold text-brand-green-dark">{title}</h2>
      <span className="mt-2 inline-block rounded-full bg-brand-yellow-tint px-3 py-1 text-xs font-bold text-amber-900">Issued after approval</span>
      <p className="mx-auto mt-3 max-w-md text-sm text-neutral-600">
        Once the admin team approves your registration, your {title.toLowerCase()} is generated, shown here and sent to your registered email.
      </p>
    </div>
  );
}

// TNV's story: vision, mission, activities, leadership, events and achievements, plus how to connect
function AboutTnv({ links, isApproved }) {
  const groupLink = (Array.isArray(links?.links) ? links.links : []).find(l => l.kind === 'district')?.url || null;
  const card = 'rounded-2xl border border-brand-green-tint/80 bg-white p-5 sm:p-6 shadow-sm';
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-brand-green-dark p-6 sm:p-8 text-white shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-yellow">{ORG.nameTa}</p>
        <h2 className="mt-1 font-display text-2xl font-black">{ORG.name}</h2>
        <p className="mt-1 font-display text-sm text-brand-yellow">{ORG.motto}</p>
        <p className="mt-4 max-w-3xl text-sm text-emerald-50/90">{ORG.about}</p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={card}>
          <h3 className="font-display text-base font-bold text-brand-green-dark">Our vision</h3>
          <p className="mt-2 text-sm text-neutral-700">{ORG.vision}</p>
        </section>
        <section className={card}>
          <h3 className="font-display text-base font-bold text-brand-green-dark">Our mission</h3>
          <p className="mt-2 text-sm text-neutral-700">{ORG.mission}</p>
        </section>
      </div>

      <section className={card}>
        <h3 className="font-display text-base font-bold text-brand-green-dark">What we do</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PROGRAMS.map(p => (
            <div key={p.name} className="rounded-xl bg-neutral-bg p-4">
              <p className="text-sm font-bold text-neutral-900">{p.name}</p>
              <p className="mt-1 text-xs text-neutral-600">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={card}>
        <h3 className="font-display text-base font-bold text-brand-green-dark">Our achievements</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {IMPACT.map(i => (
            <div key={i.label} className="rounded-xl bg-brand-green-tint/50 p-3 text-center">
              <p className="font-display text-lg font-black text-brand-green-dark">{i.value.toLocaleString('en-IN')}+</p>
              <p className="text-[11px] text-neutral-600">{i.label}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 space-y-1.5 text-xs text-neutral-700">
          {CREDENTIALS.map(c => (
            <li key={c.label}><strong className="text-neutral-900">{c.label}:</strong> {c.detail}</li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className={card}>
          <h3 className="font-display text-base font-bold text-brand-green-dark">Leadership</h3>
          <ul className="mt-3 space-y-2">
            {MANAGEMENT.map(m => (
              <li key={m.name} className="text-sm"><strong className="text-neutral-900">{m.name}</strong><span className="block text-xs text-neutral-500">{m.role}</span></li>
            ))}
          </ul>
        </section>
        <section className={card}>
          <h3 className="font-display text-base font-bold text-brand-green-dark">Events and news</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {NEWS.map(n => (
              <li key={n.text}>
                {n.href ? (
                  <a href={n.href} target="_blank" rel="noopener noreferrer" className="text-brand-green hover:underline">{n.text}</a>
                ) : (
                  <Link to={n.to} className="text-brand-green hover:underline">{n.text}</Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={card}>
        <h3 className="font-display text-base font-bold text-brand-green-dark">Follow and join the community</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {SOCIAL_LINKS.map(l => (
            <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-2 rounded-xl border border-brand-green-tint px-3 text-xs font-bold text-brand-green-dark hover:bg-brand-green-tint">
              <SocialIcon name={l.icon} className="h-4 w-4" />
              {l.name}
            </a>
          ))}
          <a href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700">
            WhatsApp TNV
          </a>
          {groupLink ? (
            <a href={groupLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-2 rounded-xl bg-brand-green px-3 text-xs font-bold text-white hover:bg-brand-green-dark">
              Join your district WhatsApp group
            </a>
          ) : (
            <span className="inline-flex min-h-tap items-center rounded-xl bg-neutral-100 px-3 text-xs text-neutral-600">
              {isApproved ? 'Your district group link will be shared by your coordinator.' : 'Your district WhatsApp group link appears after approval.'}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
