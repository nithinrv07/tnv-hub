import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  scannerLogin,
  scannerCheckin,
  toggleCheckout,
  getEventParticipants
} from '../lib/eventService.js';
import Spinner from '../components/Spinner.jsx';

export default function ScannerDesk() {
  const location = useLocation();
  const navigate = useNavigate();

  // Login form state (supports prefill from location state)
  const [username, setUsername] = useState(location.state?.username || '');
  const [password, setPassword] = useState(location.state?.password || '');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Active session state (persisted in sessionStorage)
  const [scannerSession, setScannerSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tnv_scanner_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Scanner desk operational state
  const [ticketInput, setTicketInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { type: 'success' | 'warning' | 'error', message, attendee }
  const [recentScans, setRecentScans] = useState([]);

  // Roster & Live Counts
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState('all'); // all | checked_in | pending

  // Checkout desk state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [togglingCheckout, setTogglingCheckout] = useState(false);

  const inputRef = useRef(null);

  // Auto-focus input when logged in
  useEffect(() => {
    if (scannerSession && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scannerSession]);

  // Sync session changes to storage
  const saveSession = (sess) => {
    setScannerSession(sess);
    if (sess) {
      sessionStorage.setItem('tnv_scanner_session', JSON.stringify(sess));
      setIsCheckoutOpen(Boolean(sess.event?.checkout_open));
    } else {
      sessionStorage.removeItem('tnv_scanner_session');
    }
  };

  const handleLogout = () => {
    saveSession(null);
    setScanResult(null);
    setRecentScans([]);
    setRoster([]);
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter both scanner username and password.');
      return;
    }

    setLoggingIn(true);
    setLoginError('');

    const res = await scannerLogin(username.trim(), password.trim());
    setLoggingIn(false);

    if (res.ok && res.data?.scanner_token && res.data?.event) {
      saveSession({
        token: res.data.scanner_token,
        event: res.data.event,
        username: username.trim()
      });
      setLoginError('');
    } else {
      setLoginError(res.data?.error || 'Invalid scanner username or password. Please verify your credentials.');
    }
  };

  // Fetch Live Attendee Roster
  const fetchRoster = async () => {
    if (!scannerSession?.event?.id || !scannerSession?.token) return;
    setLoadingRoster(true);
    const res = await getEventParticipants(scannerSession.event.id, scannerSession.token);
    setLoadingRoster(false);

    if (res.ok && Array.isArray(res.data?.participants)) {
      // Flatten all registered attendees across primary and extra members
      const allAttendees = [];
      res.data.participants.forEach(reg => {
        if (Array.isArray(reg.attendees) && reg.attendees.length > 0) {
          reg.attendees.forEach(att => {
            allAttendees.push({
              ...att,
              registration_id: reg.id,
              primary_name: reg.volunteer_name,
              primary_email: reg.volunteer_email,
              registered_phone: att.phone || reg.volunteer_phone
            });
          });
        } else {
          allAttendees.push({
            ticket_id: `tkt-${reg.id}`,
            name: reg.volunteer_name,
            phone: reg.volunteer_phone,
            email: reg.volunteer_email,
            is_primary: true,
            checked_in: Boolean(reg.status === 'ATTENDED' || reg.checked_in)
          });
        }
      });
      setRoster(allAttendees);
    }
  };

  useEffect(() => {
    if (scannerSession?.event?.id) {
      fetchRoster();
    }
  }, [scannerSession?.event?.id]);

  // Execute Ticket Check-in
  const handleCheckin = async (codeToVerify = null) => {
    const code = (codeToVerify || ticketInput).trim();
    if (!code) return;

    setCheckingIn(true);
    setScanResult(null);

    const res = await scannerCheckin(scannerSession.event.id, code, scannerSession.token);
    setCheckingIn(false);
    setTicketInput('');

    if (res.ok && res.data?.attendee) {
      const att = res.data.attendee;
      const isAlready = res.data.already_checked_in;
      const resultObj = {
        type: isAlready ? 'warning' : 'success',
        message: isAlready
          ? `Attendee "${att.name}" was ALREADY checked in earlier at ${att.checked_in_at ? new Date(att.checked_in_at).toLocaleTimeString('en-IN') : 'gate'}.`
          : `✓ Check-in Verified! Welcome ${att.name}!`,
        attendee: att,
        timestamp: new Date().toLocaleTimeString('en-IN')
      };
      setScanResult(resultObj);
      setRecentScans(prev => [resultObj, ...prev.slice(0, 9)]);

      // Update local roster
      setRoster(prev => prev.map(a => a.ticket_id === att.ticket_id ? { ...a, checked_in: true, checked_in_at: att.checked_in_at } : a));
    } else {
      const errorObj = {
        type: 'error',
        message: res.data?.error || `Ticket "${code}" not found for this event. Please verify with attendee.`,
        timestamp: new Date().toLocaleTimeString('en-IN')
      };
      setScanResult(errorObj);
      setRecentScans(prev => [errorObj, ...prev.slice(0, 9)]);
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Toggle Checkout Desk (Rule 12)
  const handleToggleCheckoutDesk = async () => {
    if (!scannerSession?.event?.id) return;
    setTogglingCheckout(true);
    const nextVal = !isCheckoutOpen;
    const res = await toggleCheckout(scannerSession.event.id, nextVal, scannerSession.token);
    setTogglingCheckout(false);

    if (res.ok) {
      setIsCheckoutOpen(nextVal);
      setScanResult({
        type: 'success',
        message: nextVal ? '🔓 Checkout Desk Opened! Participants can now checkout and submit ratings.' : '🔒 Checkout Desk Closed.',
        timestamp: new Date().toLocaleTimeString('en-IN')
      });
    } else {
      setScanResult({
        type: 'error',
        message: res.data?.error || 'Failed to toggle checkout desk status.',
        timestamp: new Date().toLocaleTimeString('en-IN')
      });
    }
  };

  // Metrics
  const totalAttendees = roster.length;
  const checkedInCount = roster.filter(a => a.checked_in).length;
  const pendingCount = Math.max(0, totalAttendees - checkedInCount);

  // Filtered Roster
  const filteredRoster = roster.filter(a => {
    if (rosterFilter === 'checked_in' && !a.checked_in) return false;
    if (rosterFilter === 'pending' && a.checked_in) return false;
    if (rosterSearch.trim()) {
      const q = rosterSearch.toLowerCase();
      const inName = (a.name || '').toLowerCase().includes(q);
      const inTicket = (a.ticket_id || '').toLowerCase().includes(q);
      const inPhone = (a.phone || a.registered_phone || '').includes(q);
      return inName || inTicket || inPhone;
    }
    return true;
  });

  // SCREEN 1: LOGIN
  if (!scannerSession) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-850 rounded-3xl border border-neutral-700/80 p-7 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-brand-green/20 border border-brand-green/50 text-brand-green mx-auto flex items-center justify-center text-2xl shadow-inner">
              📱
            </div>
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-brand-green">
              Tamil Nadu Volunteers · Gate Control
            </span>
            <h1 className="text-2xl font-black font-display text-white">
              Event QR Scanner Desk
            </h1>
            <p className="text-xs text-neutral-400">
              Sign in with the temporary scanner username & password generated upon event approval.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                Scanner Username
              </label>
              <input
                type="text"
                required
                placeholder="e.g. scan_123456"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-brand-green focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                Scanner Password
              </label>
              <input
                type="password"
                required
                placeholder="e.g. TNV654321"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:border-brand-green focus:outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-sm font-bold shadow-lg transition-all inline-flex items-center justify-center gap-2"
            >
              {loggingIn ? <Spinner className="w-4 h-4" /> : 'Sign In to Scanner Desk &rarr;'}
            </button>
          </form>

          <div className="pt-4 border-t border-neutral-800 text-center flex items-center justify-between text-xs text-neutral-500">
            <Link to="/events" className="hover:text-neutral-300 transition-colors">
              &larr; Public Events Calendar
            </Link>
            <Link to="/dashboard" className="hover:text-neutral-300 transition-colors">
              Organizer Dashboard &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 2: ACTIVE SCANNER WORKBENCH
  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      {/* Top Bar */}
      <header className="bg-neutral-850 border-b border-neutral-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/20 text-brand-green flex items-center justify-center text-xl shrink-0">
            📱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-400">
                Gate Check-In Active
              </span>
              <span className="text-[0.6875rem] text-neutral-400">
                • User: <strong className="text-neutral-300 font-mono">{scannerSession.username}</strong>
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold font-display text-white leading-tight">
              {scannerSession.event?.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Checkout Desk Toggle Button (Rule 12) */}
          <button
            type="button"
            disabled={togglingCheckout}
            onClick={handleToggleCheckoutDesk}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-1.5 ${
              isCheckoutOpen
                ? 'bg-amber-400 text-neutral-950 border-amber-300 hover:bg-amber-300'
                : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-750'
            }`}
            title="When checkout is open, participants can provide ratings and download their certificates"
          >
            {togglingCheckout ? <Spinner className="w-3.5 h-3.5" /> : isCheckoutOpen ? '🔓 Checkout Open' : '🔒 Open Checkout'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Scanner Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Scan Barcode Input & Live Result */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Metric Ribbon */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-neutral-850 p-4 rounded-2xl border border-neutral-800">
              <span className="text-[0.6875rem] text-neutral-400 font-bold uppercase">Total Registered</span>
              <p className="text-2xl font-bold font-display text-white mt-1">{totalAttendees}</p>
            </div>
            <div className="bg-emerald-950/40 p-4 rounded-2xl border border-emerald-800/60">
              <span className="text-[0.6875rem] text-emerald-400 font-bold uppercase">Checked In</span>
              <p className="text-2xl font-bold font-display text-emerald-300 mt-1">{checkedInCount}</p>
            </div>
            <div className="bg-neutral-850 p-4 rounded-2xl border border-neutral-800">
              <span className="text-[0.6875rem] text-neutral-400 font-bold uppercase">Pending Gate</span>
              <p className="text-2xl font-bold font-display text-neutral-300 mt-1">{pendingCount}</p>
            </div>
          </div>

          {/* Ticket Scan Card */}
          <div className="bg-neutral-850 rounded-3xl border border-neutral-800 p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold font-display text-white flex items-center justify-between">
              <span>Scan or Enter Participant Pass</span>
              <span className="text-[0.6875rem] text-neutral-400 font-normal">
                Compatible with camera scanners, USB barcode readers, & manual entry
              </span>
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCheckin();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan QR or paste ticket code (e.g. tkt-1234-...)"
                  value={ticketInput}
                  onChange={e => setTicketInput(e.target.value)}
                  className="w-full rounded-2xl bg-neutral-900 border-2 border-neutral-700 px-4 py-3.5 text-base text-white placeholder-neutral-500 font-mono focus:border-brand-green focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={checkingIn || !ticketInput.trim()}
                className="px-6 py-3.5 rounded-2xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-sm transition-all shrink-0 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {checkingIn && <Spinner className="w-4 h-4" />}
                Verify & Check-In
              </button>
            </form>

            {/* Instant Verification Result Banner */}
            {scanResult && (
              <div className={`p-4 rounded-2xl border transition-all animate-fade-in ${
                scanResult.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                  : scanResult.type === 'warning'
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                  : 'bg-red-950/80 border-red-600 text-red-200'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {scanResult.type === 'success' ? '✅' : scanResult.type === 'warning' ? '⚠️' : '❌'}
                      </span>
                      <span className="font-bold text-base">{scanResult.message}</span>
                    </div>

                    {scanResult.attendee && (
                      <div className="text-xs pt-1 space-y-0.5 text-neutral-300">
                        <div>Attendee: <strong className="text-white">{scanResult.attendee.name}</strong></div>
                        <div>Ticket ID: <span className="font-mono">{scanResult.attendee.ticket_id}</span></div>
                        <div>Mobile: <span>{scanResult.attendee.phone || '—'}</span></div>
                      </div>
                    )}
                  </div>
                  <span className="text-[0.6875rem] opacity-75">{scanResult.timestamp}</span>
                </div>
              </div>
            )}
          </div>

            {/* Recent Scans Strip */}
            {recentScans.length > 0 && (
              <div className="bg-neutral-850 rounded-2xl border border-neutral-800 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">
                  Recent Scans ({recentScans.length})
                </span>
                <div className="space-y-2">
                  {recentScans.slice(0, 5).map((scan, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span>{scan.type === 'success' ? '✓' : scan.type === 'warning' ? '⚠️' : '✗'}</span>
                        <span className="font-semibold text-white">
                          {scan.attendee?.name || scan.message}
                        </span>
                        {scan.attendee?.ticket_id && (
                          <span className="font-mono text-neutral-400 text-[0.6875rem]">({scan.attendee.ticket_id})</span>
                        )}
                      </div>
                      <span className="text-[0.6875rem] text-neutral-500">{scan.timestamp}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Right Col: Live Attendee Roster & Manual Verification */}
        <div className="bg-neutral-850 rounded-3xl border border-neutral-800 p-5 flex flex-col h-[650px] shadow-xl">
          <div className="space-y-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-white">
                Live Attendee Roster
              </h3>
              <button
                type="button"
                onClick={fetchRoster}
                className="text-xs text-brand-green hover:underline font-semibold"
              >
                {loadingRoster ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>

            {/* Filter buttons */}
            <div className="flex gap-1.5 p-1 bg-neutral-900 rounded-xl">
              {[
                { key: 'all', label: `All (${totalAttendees})` },
                { key: 'checked_in', label: `In (${checkedInCount})` },
                { key: 'pending', label: `Pending (${pendingCount})` }
              ].map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setRosterFilter(f.key)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                    rosterFilter === f.key ? 'bg-neutral-750 text-white shadow-xs' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search by name, phone or ticket..."
              value={rosterSearch}
              onChange={e => setRosterSearch(e.target.value)}
              className="w-full text-xs rounded-xl bg-neutral-900 border border-neutral-700 px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-brand-green"
            />
          </div>

          {/* Scrollable list of attendees */}
          <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
            {filteredRoster.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500">
                No attendees match current filter.
              </div>
            ) : (
              filteredRoster.map((att, idx) => (
                <div
                  key={att.ticket_id || idx}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                    att.checked_in
                      ? 'bg-emerald-950/30 border-emerald-800/40'
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white truncate">{att.name}</span>
                      {att.is_primary && (
                        <span className="text-[0.5625rem] font-bold px-1 rounded bg-brand-green/20 text-brand-green">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-[0.6875rem] text-neutral-400 font-mono truncate">
                      {att.ticket_id}
                    </div>
                    <div className="text-[0.625rem] text-neutral-500">
                      📱 {att.phone || att.registered_phone || '—'}
                    </div>
                  </div>

                  <div>
                    {att.checked_in ? (
                      <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                        ✓ Inside
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCheckin(att.ticket_id)}
                        className="px-2.5 py-1 rounded-lg text-[0.6875rem] font-bold bg-brand-green hover:bg-brand-green-dark text-white shadow-xs"
                      >
                        Check In
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
