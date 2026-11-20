import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  scannerLogin,
  scannerCheckin,
  toggleCheckout,
  getEventParticipants
} from '../lib/eventService.js';
import Spinner from '../components/Spinner.jsx';

// Instant audio confirmation chime using Web Audio API
function playChime(success = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    if (success) {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    } else {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.1);
    }
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (_e) {}
  if (navigator.vibrate) {
    try { navigator.vibrate(success ? [80, 40, 80] : [200]); } catch (_e) {}
  }
}

export default function ScannerDesk() {
  const location = useLocation();

  // Login form state
  const [username, setUsername] = useState(location.state?.username || '');
  const [password, setPassword] = useState(location.state?.password || '');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Active session
  const [scannerSession, setScannerSession] = useState(() => {
    try {
      const saved = sessionStorage.getItem('tnv_scanner_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Camera QR scanner state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [camerasList, setCamerasList] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const html5QrCodeRef = useRef(null);
  const lastScannedTimeRef = useRef(0);
  const lastScannedCodeRef = useRef('');

  // Manual ticket code state
  const [ticketInput, setTicketInput] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { type: 'success' | 'warning' | 'error', message, attendee, timestamp }
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

  // Sync session
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
    stopCamera();
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
      setLoginError(res.data?.error || 'Invalid scanner username or password. Please verify credentials.');
    }
  };

  // Fetch Live Attendee Roster
  const fetchRoster = async () => {
    if (!scannerSession?.event?.id || !scannerSession?.token) return;
    setLoadingRoster(true);
    const res = await getEventParticipants(scannerSession.event.id, scannerSession.token);
    setLoadingRoster(false);

    if (res.ok && Array.isArray(res.data?.participants)) {
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
      playChime(!isAlready);

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
      playChime(false);
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

  // Camera Management
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (_e) {}
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (cameraId = null) => {
    setCameraError('');
    try {
      // First ensure clean state
      await stopCamera();

      // List available cameras if not already populated
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          setCamerasList(devices);
          if (!cameraId && !selectedCameraId) {
            // Prefer back/rear camera on phones
            const backCam = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1];
            cameraId = backCam.id;
            setSelectedCameraId(backCam.id);
          }
        }
      } catch (_e) {}

      const qrInstance = new Html5Qrcode('tnv-camera-reader');
      html5QrCodeRef.current = qrInstance;

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' };

      await qrInstance.start(
        cameraConfig,
        {
          fps: 12,
          qrbox: { width: 240, height: 240 }
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce same QR scan within 2.5 seconds
          if (decodedText === lastScannedCodeRef.current && (now - lastScannedTimeRef.current) < 2500) {
            return;
          }
          lastScannedCodeRef.current = decodedText;
          lastScannedTimeRef.current = now;
          handleCheckin(decodedText);
        },
        () => {
          // Frame parse error - ignore standard noise
        }
      );

      setIsCameraActive(true);
    } catch (err) {
      setIsCameraActive(false);
      setCameraError('Unable to access camera: ' + (err.message || 'Please grant camera permissions in your browser.'));
    }
  };

  // Auto cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
        message: nextVal ? '🔓 Checkout Desk Opened! Participants can now submit ratings and download certificates.' : '🔒 Checkout Desk Closed.',
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

  // Counts
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

  // ==========================================
  // VIEW 1: LOGIN (TNV Green & White Signature Theme)
  // ==========================================
  if (!scannerSession) {
    return (
      <div className="min-h-screen bg-neutral-bg flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl border border-brand-green-tint p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-brand-green-tint text-brand-green-dark mx-auto flex items-center justify-center text-3xl shadow-xs">
              📱
            </div>
            <span className="inline-block rounded-full bg-brand-green-tint px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-green-dark">
              Tamil Nadu Volunteers · Gate Desk
            </span>
            <h1 className="text-2xl font-black font-display text-neutral-ink">
              Event QR Scanner Desk
            </h1>
            <p className="text-xs text-neutral-muted">
              Enter the temporary scanner username & password generated upon event approval.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs font-semibold">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-ink mb-1.5">
                Scanner Username
              </label>
              <input
                type="text"
                required
                placeholder="e.g. scan_366x252"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-xl bg-white border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-ink placeholder-neutral-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-ink mb-1.5">
                Scanner Password
              </label>
              <input
                type="password"
                required
                placeholder="e.g. TNV654321"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-ink placeholder-neutral-400 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="btn-primary w-full py-3 text-sm font-bold shadow-md inline-flex items-center justify-center gap-2"
            >
              {loggingIn ? <Spinner className="w-4 h-4" /> : 'Sign In to Gate Scanner Desk &rarr;'}
            </button>
          </form>

          <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <Link to="/events" className="hover:text-brand-green-dark hover:underline font-medium">
              &larr; Events Calendar
            </Link>
            <Link to="/dashboard" className="hover:text-brand-green-dark hover:underline font-medium">
              Member Dashboard &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ACTIVE SCANNER DESK (TNV Green & White Signature Theme)
  // ==========================================
  return (
    <div className="min-h-screen bg-neutral-bg text-neutral-ink flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-brand-green-tint px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
            📱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-brand-green-dark">
                Gate Check-In Active
              </span>
              <span className="text-[0.6875rem] text-neutral-muted">
                • Operator: <strong className="text-neutral-700 font-mono">{scannerSession.username}</strong>
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold font-display text-neutral-ink leading-tight">
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
                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                : 'bg-neutral-100 text-neutral-800 border-neutral-300 hover:bg-neutral-200'
            }`}
            title="When checkout is open, participants can provide ratings and download their certificates"
          >
            {togglingCheckout ? <Spinner className="w-3.5 h-3.5" /> : isCheckoutOpen ? '🔓 Checkout Open' : '🔒 Open Checkout'}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Scanner Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Camera Scanner & Code Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Metric Ribbon */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-brand-green-tint shadow-xs">
              <span className="text-[0.6875rem] text-neutral-muted font-bold uppercase tracking-wider">Total Registered</span>
              <p className="text-2xl font-bold font-display text-neutral-ink mt-1">{totalAttendees}</p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="text-[0.6875rem] text-emerald-800 font-bold uppercase tracking-wider">Checked In</span>
              <p className="text-2xl font-bold font-display text-emerald-900 mt-1">{checkedInCount}</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 shadow-xs">
              <span className="text-[0.6875rem] text-amber-800 font-bold uppercase tracking-wider">Pending Gate</span>
              <p className="text-2xl font-bold font-display text-amber-900 mt-1">{pendingCount}</p>
            </div>
          </div>

          {/* Camera Scanner Viewfinder Card */}
          <div className="bg-white rounded-3xl border border-brand-green-tint p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold font-display text-neutral-ink flex items-center gap-2">
                  <span>📷 Live QR Camera Scanner</span>
                  {isCameraActive && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-emerald-100 text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Live Stream
                    </span>
                  )}
                </h2>
                <p className="text-xs text-neutral-muted">
                  Point device camera at participant's QR code for instant check-in verification.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-3.5 py-1.5 rounded-xl bg-red-100 text-red-800 hover:bg-red-200 text-xs font-bold transition-all inline-flex items-center gap-1.5"
                  >
                    ⏹️ Stop Camera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="btn-primary px-4 py-2 text-xs font-bold shadow-xs inline-flex items-center gap-1.5"
                  >
                    📷 Open Camera Scanner
                  </button>
                )}
              </div>
            </div>

            {/* Camera error */}
            {cameraError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold">
                {cameraError}
              </div>
            )}

            {/* Video Feed / Viewfinder Container */}
            {isCameraActive && (
              <div className="relative mx-auto max-w-sm rounded-2xl overflow-hidden border-2 border-brand-green/40 bg-neutral-900 shadow-inner">
                <div id="tnv-camera-reader" className="w-full" />
                <div className="p-2 text-center text-white text-[0.6875rem] font-medium bg-neutral-950/80">
                  Align QR code inside green square to auto-verify
                </div>
              </div>
            )}

            {/* Camera device picker if multiple available */}
            {camerasList.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-neutral-600">
                <span className="font-semibold">Switch Camera:</span>
                <select
                  value={selectedCameraId}
                  onChange={e => {
                    setSelectedCameraId(e.target.value);
                    if (isCameraActive) startCamera(e.target.value);
                  }}
                  className="rounded-lg border border-neutral-300 px-2 py-1 text-xs bg-white"
                >
                  {camerasList.map(c => (
                    <option key={c.id} value={c.id}>{c.label || `Camera ${c.id.slice(0, 5)}`}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Manual Ticket Input / USB Scanner Fallback */}
            <div className="pt-3 border-t border-neutral-100">
              <label className="block text-xs font-bold text-neutral-ink mb-1.5">
                Manual Barcode / Ticket Code Entry:
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCheckin();
                }}
                className="flex gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Paste or type ticket code (e.g. tkt-1234-...)"
                  value={ticketInput}
                  onChange={e => setTicketInput(e.target.value)}
                  className="flex-1 rounded-xl bg-neutral-50 border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-ink placeholder-neutral-400 font-mono focus:border-brand-green focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={checkingIn || !ticketInput.trim()}
                  className="btn-primary px-5 py-2.5 text-xs font-bold shadow-xs shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {checkingIn && <Spinner className="w-3.5 h-3.5" />}
                  Verify Ticket
                </button>
              </form>
            </div>

            {/* Instant Verification Result Banner */}
            {scanResult && (
              <div className={`p-4 rounded-2xl border transition-all animate-fade-in ${
                scanResult.type === 'success'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : scanResult.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-red-50 border-red-300 text-red-950'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {scanResult.type === 'success' ? '✅' : scanResult.type === 'warning' ? '⚠️' : '❌'}
                      </span>
                      <span className="font-bold text-sm sm:text-base">{scanResult.message}</span>
                    </div>

                    {scanResult.attendee && (
                      <div className="text-xs pt-1 space-y-0.5 text-neutral-700">
                        <div>Attendee: <strong className="text-neutral-900">{scanResult.attendee.name}</strong></div>
                        <div>Ticket ID: <span className="font-mono">{scanResult.attendee.ticket_id}</span></div>
                        <div>Mobile: <span>{scanResult.attendee.phone || '—'}</span></div>
                      </div>
                    )}
                  </div>
                  <span className="text-[0.6875rem] text-neutral-500 font-mono">{scanResult.timestamp}</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Scans Strip */}
          {recentScans.length > 0 && (
            <div className="bg-white rounded-2xl border border-brand-green-tint p-4 space-y-3 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-muted block">
                Recent Scans Log ({recentScans.length})
              </span>
              <div className="space-y-2">
                {recentScans.slice(0, 5).map((scan, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{scan.type === 'success' ? '✓' : scan.type === 'warning' ? '⚠️' : '✗'}</span>
                      <span className="font-semibold text-neutral-ink truncate">
                        {scan.attendee?.name || scan.message}
                      </span>
                      {scan.attendee?.ticket_id && (
                        <span className="font-mono text-neutral-500 text-[0.6875rem] truncate">({scan.attendee.ticket_id})</span>
                      )}
                    </div>
                    <span className="text-[0.6875rem] text-neutral-400 font-mono shrink-0">{scan.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Live Attendee Roster & Manual Verification */}
        <div className="bg-white rounded-3xl border border-brand-green-tint p-5 flex flex-col h-[650px] shadow-sm">
          <div className="space-y-3 pb-3 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-display text-neutral-ink">
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
            <div className="flex gap-1.5 p-1 bg-neutral-100 rounded-xl">
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
                    rosterFilter === f.key ? 'bg-white text-neutral-ink shadow-xs' : 'text-neutral-500 hover:text-neutral-800'
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
              className="w-full text-xs rounded-xl bg-neutral-50 border border-neutral-300 px-3 py-2 text-neutral-ink placeholder-neutral-400 focus:outline-none focus:border-brand-green focus:bg-white"
            />
          </div>

          {/* Scrollable list of attendees */}
          <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
            {filteredRoster.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400">
                No attendees match current filter.
              </div>
            ) : (
              filteredRoster.map((att, idx) => (
                <div
                  key={att.ticket_id || idx}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                    att.checked_in
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-neutral-ink truncate">{att.name}</span>
                      {att.is_primary && (
                        <span className="text-[0.5625rem] font-bold px-1 rounded bg-brand-green-tint text-brand-green-dark">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-[0.6875rem] text-neutral-500 font-mono truncate">
                      {att.ticket_id}
                    </div>
                    <div className="text-[0.625rem] text-neutral-400">
                      📱 {att.phone || att.registered_phone || '—'}
                    </div>
                  </div>

                  <div>
                    {att.checked_in ? (
                      <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ Inside
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCheckin(att.ticket_id)}
                        className="btn-primary px-3 py-1 text-[0.6875rem] font-bold shadow-xs"
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
