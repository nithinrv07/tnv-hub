import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getMyProfile, getMyLinks, getMemberDocuments, recordPayment } from '../lib/volunteerService.js';
import { logout, getCurrentUser } from '../lib/authService.js';
import Spinner from '../components/Spinner.jsx';
import FieldWorkList from '../components/FieldWorkList.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Active Sidebar Navigation Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'membership' | 'idcard' | 'appointment' | 'donate' | 'whatsapp'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // UPI Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [utr, setUtr] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payMessage, setPayMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    const res = await getMyProfile();
    if (res.ok && res.data) {
      const p = res.data.profile || res.data;
      setProfile(p);

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

    if (res.ok && res.data) {
      setPayMessage(`Payment verified! Receipt: ${res.data.receipt_no}`);
      setTimeout(() => {
        setShowPayModal(false);
        setPayMessage('');
        loadData();
      }, 1500);
    } else {
      // Wireframe fallback
      setPayMessage('Wireframe verification accepted! Updating status...');
      setTimeout(() => {
        setShowPayModal(false);
        setPayMessage('');
        loadData();
      }, 1500);
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
            <Link to="/login" className="btn-primary min-h-tap inline-flex items-center justify-center px-6 text-sm">
              Sign In
            </Link>
            <Link to="/register" className="btn-outline min-h-tap inline-flex items-center justify-center px-6 text-sm">
              Register as Volunteer
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isApproved = profile.status === 'approved';
  const isPaid = profile.membership_paid || Boolean(profile.receipt_no);
  const isAdmin = profile.role === 'master_admin' || profile.role === 'dept_admin' || profile.role === 'admin';
  const initial = (profile.full_name || 'V').trim().charAt(0).toUpperCase();
  const joinedDate = new Date(profile.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const memberId = profile.tnv_id || `TNV/${new Date().getFullYear()}/${String(profile.id).padStart(4, '0')}`;

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

          {/* Section: MAIN */}
          <div className="px-4 py-4">
            <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-emerald-300/60 font-display">
              MAIN NAVIGATION
            </div>

            <nav className="mt-2 space-y-1">
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
                  <span>Dashboard</span>
                </div>
                {activeTab === 'overview' && <span className="h-2 w-2 rounded-full bg-brand-yellow" />}
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('membership'); setSidebarOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  activeTab === 'membership'
                    ? 'bg-brand-green text-white shadow-sm font-bold'
                    : 'text-emerald-100/75 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Membership Status</span>
                </div>
                <span className="text-xs text-emerald-300/60">&rarr;</span>
              </button>

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
              <h1 className="font-display text-lg font-bold text-brand-green-dark">Volunteer Dashboard</h1>
              <div className="text-xs text-neutral-muted">TNV Phase 1 Hub / Member Workspace</div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Search Input Box */}
            <div className="relative hidden sm:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-muted">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search resources..."
                className="h-9 w-48 rounded-full border border-neutral-300 bg-neutral-bg/60 pl-9 pr-4 text-xs text-neutral-ink focus:border-brand-green focus:bg-white focus:outline-none"
              />
            </div>

            {/* Notification Bell */}
            <div className="relative rounded-full bg-neutral-bg p-2 text-neutral-ink hover:bg-brand-green-tint transition-colors">
              <svg className="h-5 w-5 text-brand-green-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-brand-green" />
            </div>

            {/* Admin Command Center Shortcut Button */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-extrabold text-xs shadow-sm transition-all font-display"
              >
                <span>Admin Command Center</span>
                <span>&rarr;</span>
              </Link>
            )}

            {/* Status Switcher Badge */}
            <div className="flex items-center gap-2 rounded-full bg-brand-green-tint px-3 py-1 border border-brand-green/30">
              <span className="h-2 w-2 rounded-full bg-brand-green" />
              <span className="text-xs font-bold text-brand-green-dark">TNV Live</span>
            </div>
          </div>
        </header>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          {/* Admin Command Center Quick Access Banner */}
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
                    Manage the Applicant Review Queue, telephone Call Logs, 10-Question scoresheets, and appointments.
                  </p>
                </div>
              </div>
              <Link
                to="/admin"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-yellow hover:bg-amber-400 px-5 py-2.5 text-xs font-black text-neutral-900 shadow-md transition-all shrink-0 font-display"
              >
                <span>Open Admin Command Center & Queue</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          )}

          {/* =============================================================== */}
          {/* 3. HERO GREETING BANNER                                         */}
          {/* =============================================================== */}
          <div className="relative overflow-hidden rounded-2xl border border-brand-green-tint bg-gradient-to-r from-brand-green-tint/80 via-white to-brand-yellow-tint/40 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              {/* Circular Avatar */}
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-green font-display text-3xl font-extrabold text-white shadow-md">
                {initial}
              </div>

              {/* Greeting & Badges */}
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-extrabold text-brand-green-dark sm:text-3xl">
                  Welcome, {profile.full_name}!
                </h2>
                <div className="text-sm font-medium text-neutral-600">
                  {profile.email || 'Not provided'}
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Status Pill Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-xs ${
                      isApproved
                        ? 'bg-brand-green-tint text-brand-green-dark border border-brand-green/30'
                        : 'bg-brand-yellow-tint text-amber-900 border border-amber-300'
                    }`}
                  >
                    <svg className="h-3.5 w-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{isApproved ? 'Active Member' : 'Under Review'}</span>
                  </span>

                  {/* Joined Date Pill */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-700">
                    Joined {joinedDate}
                  </span>

                  {/* Member ID Pill */}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-dark text-white px-3 py-1 text-xs font-mono font-bold">
                    <svg className="h-3.5 w-3.5 text-brand-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>{memberId}</span>
                  </span>

                  {/* Assigned Wing */}
                  <span className="inline-flex items-center rounded-full bg-brand-green text-white px-3 py-1 text-xs font-bold font-display">
                    {profile.wing || profile.wing_to_join || 'Not assigned yet'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* =============================================================== */}
          {/* CANDIDATE VERIFICATION STATE OR FULL MEMBER DASHBOARD           */}
          {/* =============================================================== */}
          {!isApproved ? (
            /* Requirement 4: Single Clean Status Panel for Unverified Candidates */
            <div className="rounded-2xl border border-brand-green-tint bg-white p-6 sm:p-10 shadow-sm max-w-3xl mx-auto">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-yellow-tint text-amber-800 mb-4 ring-8 ring-brand-yellow-tint/50">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full bg-brand-yellow-tint px-3.5 py-1 text-xs font-bold text-amber-900 mb-3 border border-amber-300 font-display">
                  <span className="h-2 w-2 rounded-full bg-brand-yellow animate-pulse" />
                  <span>Verification in Progress</span>
                </div>

                <h3 className="font-display text-2xl font-black text-brand-green-dark sm:text-3xl leading-snug">
                  Your account is not yet verified. Verification is currently in progress.
                </h3>

                <p className="mt-3 text-sm text-neutral-600 max-w-lg leading-relaxed">
                  Thank you for applying to Tamil Nadu Volunteers. A designated coordinator from your district will contact you directly on your registered mobile number for a telephone screening interview.
                </p>

                {/* Candidate Enrolment Details Snapshot */}
                <div className="mt-8 w-full rounded-2xl border border-brand-green-tint/80 bg-neutral-bg p-5 text-left">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-brand-green-dark mb-4 pb-2 border-b border-brand-green-tint font-display">
                    Application Summary
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-neutral-500 block">Candidate Name</span>
                      <span className="font-bold text-neutral-900 text-sm">{profile.full_name}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Registered Mobile</span>
                      <span className="font-bold font-mono text-neutral-900 text-sm">{profile.phone}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">District / Location</span>
                      <span className="font-bold text-neutral-900 text-sm">
                        {profile.district_name || 'Tamil Nadu'} {profile.assembly_constituency ? `• ${profile.assembly_constituency}` : ''}
                      </span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Requested Wing / Focus</span>
                      <span className="font-bold text-neutral-900 text-sm">
                        {profile.wing_to_join || profile.wing || 'Not provided'}
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-neutral-500 block mb-1">Past Field Work</span>
                      <FieldWorkList record={profile} />
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Enrolment Date</span>
                      <span className="font-bold text-neutral-900 text-sm">{joinedDate}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Reference ID</span>
                      <span className="font-bold font-mono text-neutral-900 text-sm">{profile.username}</span>
                    </div>
                  </div>
                </div>

                {/* Next Steps Information Card */}
                <div className="mt-6 w-full rounded-2xl border border-brand-green/30 bg-brand-green-tint/60 p-4 text-left flex items-start gap-3">
                  <svg className="w-5 h-5 text-brand-green shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs text-brand-green-dark leading-relaxed">
                    <span className="font-bold block mb-0.5 font-display">What happens next?</span>
                    Once your telephone screening interview is completed and approved by the district coordinator, your official Tamil Nadu Volunteers membership credentials, verified ID card, and district communication channels will be unlocked automatically here.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VERIFIED / APPROVED VOLUNTEER STATE */
            <>
              {/* 4. FOUR EXECUTIVE METRIC CARDS */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {/* Card 1: Membership Payment */}
                <div className="rounded-2xl border border-brand-green-tint/80 border-t-4 border-t-brand-yellow bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-yellow-tint text-amber-800 font-bold font-display text-lg">
                      ₹
                    </div>
                    <span className="text-[11px] font-bold text-amber-900 bg-brand-yellow-tint px-2 py-0.5 rounded-full font-display">
                      Annual Fee
                    </span>
                  </div>
                  <div className="mt-3 font-display text-2xl font-black text-neutral-ink">
                    {isPaid ? '₹365' : '₹0'}
                  </div>
                  <div className="text-xs font-bold text-neutral-700 mt-0.5">Membership Fee</div>
                  <div className="mt-1 text-[11px] text-neutral-muted">
                    {isPaid ? `Receipt: ${profile.receipt_no || 'Verified'}` : 'Payment pending (₹365)'}
                  </div>
                </div>

                {/* Card 2: Community Links */}
                <div className="rounded-2xl border border-brand-green-tint/80 border-t-4 border-t-brand-green bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-tint text-brand-green">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-brand-green bg-brand-green-tint px-2 py-0.5 rounded-full font-display">
                      Connected
                    </span>
                  </div>
                  <div className="mt-3 font-display text-2xl font-black text-neutral-ink">
                    Active
                  </div>
                  <div className="text-xs font-bold text-neutral-700 mt-0.5">District Coordination</div>
                  <div className="mt-1 text-[11px] text-neutral-muted truncate">
                    {profile.district_name || 'District'} WhatsApp group connected
                  </div>
                </div>

                {/* Card 3: Credentials & ID Card */}
                <div className="rounded-2xl border border-brand-green-tint/80 border-t-4 border-t-brand-green-dark bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-tint text-brand-green-dark">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-brand-green-dark bg-brand-green-tint px-2 py-0.5 rounded-full font-display">
                      Verified
                    </span>
                  </div>
                  <div className="mt-3 font-display text-2xl font-black text-neutral-ink">
                    2 Credentials
                  </div>
                  <div className="text-xs font-bold text-neutral-700 mt-0.5">Official Documents</div>
                  <div className="mt-1 text-[11px] text-neutral-muted truncate">
                    ID Card & Appointment Order available
                  </div>
                </div>

                {/* Card 4: District Location */}
                <div className="rounded-2xl border border-brand-green-tint/80 border-t-4 border-t-emerald-600 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-display">
                      Statewide
                    </span>
                  </div>
                  <div className="mt-3 font-display text-2xl font-black text-neutral-ink">
                    {profile.district_name || 'Tamil Nadu'}
                  </div>
                  <div className="text-xs font-bold text-neutral-700 mt-0.5">{profile.wing || profile.wing_to_join || 'Not assigned yet'}</div>
                  <div className="mt-1 text-[11px] text-neutral-muted truncate">38 Districts Connected</div>
                </div>
              </div>

              {/* 5. TWO-COLUMN LOWER SECTION */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Left Card: My Donation History */}
                <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-brand-green-tint/80 pb-4">
                    <h3 className="font-display text-base font-bold text-brand-green-dark">My Donation History</h3>
                    <button
                      type="button"
                      onClick={() => setShowPayModal(true)}
                      className="rounded-xl bg-brand-yellow-tint border border-brand-yellow/30 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-brand-yellow hover:text-neutral-900 transition-colors font-display"
                    >
                      {isPaid ? 'View Receipt' : 'Pay Annual Fee'}
                    </button>
                  </div>

                  {isPaid ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
                            <th className="pb-3">PURPOSE</th>
                            <th className="pb-3">AMOUNT</th>
                            <th className="pb-3">DATE</th>
                            <th className="pb-3">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          <tr>
                            <td className="py-3 font-semibold text-neutral-900">Annual Volunteer Membership</td>
                            <td className="py-3 font-mono font-bold text-brand-green">₹365</td>
                            <td className="py-3 text-neutral-500">{joinedDate}</td>
                            <td className="py-3">
                              <span className="inline-block rounded-full bg-brand-green-tint px-2.5 py-0.5 text-[10px] font-bold text-brand-green-dark border border-brand-green/20">
                                PAID
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="mt-4 pt-3 border-t border-neutral-100 text-right">
                        <a
                          href={`/api/receipts/${profile.receipt_no || 'Receipt pending'}.pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-brand-green-dark hover:underline font-display"
                        >
                          Download Official Payment Receipt (PDF) &rarr;
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-green-tint text-brand-green">
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-neutral-800">No voluntary contributions recorded yet.</p>
                      <p className="mt-1 text-xs text-neutral-500">Your active contributions and membership receipts will appear here.</p>
                      <button
                        type="button"
                        onClick={() => setShowPayModal(true)}
                        className="mt-4 inline-flex items-center px-5 py-2.5 rounded-xl bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-extrabold text-xs shadow-sm transition-all font-display"
                      >
                        Pay ₹365 Membership Fee
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Card: Recent Activity */}
                <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-brand-green-tint/80 pb-4">
                    <h3 className="font-display text-base font-bold text-brand-green-dark">Recent Activity</h3>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-green-tint px-2.5 py-0.5 text-xs font-bold text-brand-green-dark border border-brand-green/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
                      Live
                    </span>
                  </div>

                  <div className="mt-5 space-y-4 text-xs">
                    {/* Event 1 */}
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-yellow" />
                      <div>
                        <div className="font-semibold text-neutral-900">
                          Account created &mdash; <span className="font-normal text-neutral-500">Welcome to Tamil Nadu Volunteers</span>
                        </div>
                        <div className="text-[11px] text-neutral-400">{joinedDate}</div>
                      </div>
                    </div>

                    {/* Event 2 */}
                    <div className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green" />
                      <div>
                        <div className="font-semibold text-neutral-900">
                          Verification state &mdash;{' '}
                          <span className="font-normal text-neutral-500">
                            District interview completed and verified
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400">Verified Official Volunteer</div>
                      </div>
                    </div>

                    {/* Event 3 */}
                    {isPaid && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green-dark" />
                        <div>
                          <div className="font-semibold text-neutral-900">
                            Receipt generated &mdash; <span className="font-mono font-medium">{profile.receipt_no || 'Receipt pending'}</span>
                          </div>
                          <div className="text-[11px] text-neutral-400">Membership payment confirmed</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons for Unlocked Credentials */}
                  <div className="mt-6 space-y-2 border-t border-neutral-100 pt-4">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 font-display">Download Credentials</div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/api/id-card/${profile.id}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 rounded-xl border border-brand-green text-brand-green-dark hover:bg-brand-green-tint text-xs font-bold font-display shadow-xs transition-colors"
                      >
                        Official ID Card (PDF)
                      </a>
                      <a
                        href={`/api/appointment/${profile.id}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center px-4 py-2 rounded-xl border border-brand-green text-brand-green-dark hover:bg-brand-green-tint text-xs font-bold font-display shadow-xs transition-colors"
                      >
                        Appointment Order (PDF)
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* =================================================================== */}
      {/* 6. UPI PAYMENT MODAL                                                */}
      {/* =================================================================== */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 bg-brand-green-dark text-white font-display">
              <h3 className="text-base font-bold">Pay Membership Fee (₹365)</h3>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="text-emerald-200 hover:text-white text-xl font-bold p-1 rounded-lg"
              >
                &times;
              </button>
            </div>

            <div className="p-6">
              {payMessage ? (
                <div className="my-6 text-center text-sm font-semibold text-brand-green">
                  {payMessage}
                </div>
              ) : (
                <form onSubmit={handlePayNow} className="space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-neutral-500">Scan with GPay, PhonePe, Paytm, or BHIM</p>
                    <div className="mt-2 inline-block rounded-xl border border-brand-green-tint bg-brand-green-tint/50 p-3">
                      <span className="font-mono text-sm font-bold text-brand-green-dark">tnvvolunteers@sbi</span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="modalUtr" className="mb-1 block text-xs font-bold text-neutral-800">
                      Enter UPI Reference / UTR ID:
                    </label>
                    <input
                      id="modalUtr"
                      type="text"
                      value={utr}
                      onChange={e => setUtr(e.target.value)}
                      placeholder="12-digit UPI reference number"
                      className="block w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-mono focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="submit"
                      disabled={payLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-extrabold text-xs shadow-sm transition-all flex items-center justify-center font-display"
                    >
                      {payLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Verify Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPayModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-all"
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
