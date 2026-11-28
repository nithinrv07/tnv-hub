import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getEvents,
  registerForEvent,
  submitCheckout,
  lookupCertificate,
  STATUS_BADGES,
  eventPhase,
  PHASE_BADGES
} from '../lib/eventService.js';
import {
  TN_DISTRICTS,
  EVENT_CATEGORIES,
  EVENT_DEPARTMENTS,
  matchesCategory,
  matchesDepartment
} from '../lib/eventCategories.js';
import { getToken } from '../lib/session.js';
import { getCurrentUser } from '../lib/authService.js';
import Spinner from '../components/Spinner.jsx';
import QRCode from 'qrcode';

function initialDistrictFilter(searchParams) {
  const requested = searchParams.get('district');
  if (!requested) return 'All Districts';
  return TN_DISTRICTS.find(district => district.toLowerCase() === requested.toLowerCase()) || 'All Districts';
}
function getEventCategory(event) {
  const firstTag = Array.isArray(event.tags) ? event.tags[0] : event.tags;
  return event.category || event.category_name || firstTag || 'Civic Drive';
}

function formatEventDate(value) {
  if (!value) return '';
  const isoDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB').format(date);
}

function getEventMapsUrl(event) {
  if (event.location_url) {
    const trimmed = event.location_url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    if (trimmed.startsWith('maps.') || trimmed.startsWith('goo.gl') || trimmed.startsWith('google.com/maps')) {
      return `https://${trimmed}`;
    }
  }
  const primaryLocation = [event.location, event.venue]
    .find(value => typeof value === 'string' && value.trim())
    ?.trim();
  const district = typeof event.district === 'string' ? event.district.trim() : '';
  const location = primaryLocation
    ? district && !primaryLocation.toLowerCase().includes(district.toLowerCase())
      ? `${primaryLocation}, ${district}`
      : primaryLocation
    : district;
  if (!location) return null;

  const query = new URLSearchParams({ api: '1', query: location });
  return `https://www.google.com/maps/search/?${query.toString()}`;
}

export default function Events() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState(() => initialDistrictFilter(searchParams));
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'Ongoing', 'Published'
  const [search, setSearch] = useState('');
  
  // Modals & User Interaction
  const [selectedEventId, setSelectedEventId] = useState(() => searchParams.get('event'));
  const [registerModalEvent, setRegisterModalEvent] = useState(null);
  const [isMemberRegMode, setIsMemberRegMode] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', phone: '', email: '', extra_members: [] });
  const [submittingReg, setSubmittingReg] = useState(false);
  const [regSuccessData, setRegSuccessData] = useState(null);
  const [successQrs, setSuccessQrs] = useState({});
  const [regError, setRegError] = useState('');

  // Checkout Modal State
  const [checkoutModalEvent, setCheckoutModalEvent] = useState(null);
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutMultipleAttendees, setCheckoutMultipleAttendees] = useState(null);
  const [checkoutSelectedTicketId, setCheckoutSelectedTicketId] = useState('');
  const [checkoutRating, setCheckoutRating] = useState(5);
  const [checkoutFeedback, setCheckoutFeedback] = useState('');
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [checkoutSuccessMsg, setCheckoutSuccessMsg] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // Certificate Modal State
  const [certModalEvent, setCertModalEvent] = useState(null);
  const [certPhone, setCertPhone] = useState('');
  const [certMultipleAttendees, setCertMultipleAttendees] = useState(null);
  const [certSelectedTicketId, setCertSelectedTicketId] = useState('');
  const [lookingUpCert, setLookingUpCert] = useState(false);
  const [certResult, setCertResult] = useState(null);
  const [certError, setCertError] = useState('');
  const [downloadingCert, setDownloadingCert] = useState(false);
  const certCanvasRef = useRef(null);

  // Toast
  const [toast, setToast] = useState('');
  const [toastMapsUrl, setToastMapsUrl] = useState(null);

  const closeEventDetails = () => {
    setSelectedEventId(null);
    if (searchParams.has('event')) {
      const next = new URLSearchParams(searchParams);
      next.delete('event');
      setSearchParams(next, { replace: true });
    }
  };

  const load = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const res = await getEvents({ public: 'true' });
    if (showLoading) setLoading(false);
    if (res.ok && Array.isArray(res.data?.events)) {
      setEvents(res.data.events);
      setError('');
    } else if (showLoading) {
      setError('Unable to load upcoming events at this moment.');
    }
  };

  useEffect(() => {
    load(true);
    const interval = setInterval(() => {
      // Don't background-refresh while user is filling a modal
      if (!registerModalEvent && !checkoutModalEvent && !certModalEvent) {
        load(false);
      }
    }, 5000);
    const onFocus = () => {
      if (!registerModalEvent && !checkoutModalEvent && !certModalEvent) {
        load(false);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [registerModalEvent, checkoutModalEvent, certModalEvent]);

  useEffect(() => {
    const closeOnEscape = (e) => {
      if (e.key === 'Escape') {
        closeEventDetails();
        setRegisterModalEvent(null);
        setCheckoutModalEvent(null);
        setCertModalEvent(null);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [searchParams, setSearchParams]);

  const showToast = (msg, event = null) => {
    setToast(msg);
    setToastMapsUrl(event ? getEventMapsUrl(event) : null);
    setTimeout(() => setToast(''), 6000);
  };

  // Open "Register if already a member"
  const handleOpenMemberRegister = (evt) => {
    const token = getToken();
    const user = getCurrentUser();
    if (!token) {
      navigate('/login', {
        state: {
          from: '/events',
          autoOpenEventId: evt.id,
          message: `Please sign in with your TNV credentials to register for "${evt.title}".`
        }
      });
      return;
    }
    const profile = user?.profile || {};
    setIsMemberRegMode(true);
    setRegForm({
      name: profile.full_name || user?.full_name || '',
      phone: profile.phone || '',
      email: profile.email || '',
      extra_members: []
    });
    setRegError('');
    setRegSuccessData(null);
    setRegisterModalEvent(evt);
  };

  // Open "Register only for this event" (Visitor)
  const handleOpenVisitorRegister = (evt) => {
    setIsMemberRegMode(false);
    setRegForm({
      name: '',
      phone: '',
      email: '',
      extra_members: []
    });
    setRegError('');
    setRegSuccessData(null);
    setRegisterModalEvent(evt);
  };

  // Add extra accompanying attendee
  const handleAddExtraMember = () => {
    setRegForm(prev => ({
      ...prev,
      extra_members: [...prev.extra_members, { name: '', phone: '' }]
    }));
  };

  const handleUpdateExtraMember = (index, field, val) => {
    setRegForm(prev => {
      const updated = [...prev.extra_members];
      updated[index][field] = val;
      return { ...prev, extra_members: updated };
    });
  };

  const handleRemoveExtraMember = (index) => {
    setRegForm(prev => ({
      ...prev,
      extra_members: prev.extra_members.filter((_, i) => i !== index)
    }));
  };

  // Submit Registration
  const handleSubmitRegistration = async (e) => {
    e.preventDefault();
    if (!registerModalEvent) return;

    if (!regForm.name.trim() || !regForm.phone.trim() || !regForm.email.trim()) {
      setRegError('Please provide your name, phone number, and a valid email address.');
      return;
    }

    setSubmittingReg(true);
    setRegError('');

    const res = await registerForEvent(registerModalEvent.id, {
      name: regForm.name.trim(),
      phone: regForm.phone.trim(),
      email: regForm.email.trim(),
      extra_members: regForm.extra_members.filter(m => m.name && m.name.trim())
    });

    setSubmittingReg(false);

    if (res.ok) {
      setRegSuccessData(res.data);
      const qrs = {};
      if (Array.isArray(res.data.attendees)) {
        for (const att of res.data.attendees) {
          try {
            qrs[att.ticket_id] = await QRCode.toDataURL(att.ticket_id, {
              width: 140,
              margin: 1,
              color: { dark: '#043424', light: '#ffffff' }
            });
          } catch (_e) {}
        }
      }
      setSuccessQrs(qrs);
      // Update local events list
      setEvents(prev => prev.map(e => e.id === registerModalEvent.id ? {
        ...e,
        is_registered: true,
        registered_count: res.data?.registered_count ?? ((e.registered_count || 0) + 1)
      } : e));
    } else {
      setRegError(res.data?.error || 'Registration could not be completed. Please try again.');
    }
  };

  // Submit Checkout & Rating
  const handleSubmitCheckout = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!checkoutModalEvent) return;

    if (checkoutModalEvent.status === 'Completed' || !checkoutModalEvent.is_checkout_open) {
      setCheckoutError('Checkout is closed for this event. Checkout is only available during the event up to the event end time.');
      return;
    }

    if (!checkoutPhone.trim() && !checkoutSelectedTicketId) {
      setCheckoutError('Please enter your registered mobile number or ticket ID.');
      return;
    }

    setSubmittingCheckout(true);
    setCheckoutError('');
    setCheckoutSuccessMsg('');

    const res = await submitCheckout(checkoutModalEvent.id, {
      phone: checkoutPhone.trim(),
      ticket_id: checkoutSelectedTicketId || undefined,
      rating: checkoutRating,
      feedback: checkoutFeedback.trim()
    });

    setSubmittingCheckout(false);

    if (res.ok) {
      if (res.data?.multiple) {
        setCheckoutMultipleAttendees(res.data.attendees || []);
        return;
      }
      setCheckoutMultipleAttendees(null);
      setCheckoutSelectedTicketId('');
      setCheckoutSuccessMsg(res.data?.message || 'Thank you! Your feedback has been recorded.');
      // Refresh event rating if returned
      if (res.data?.average_rating !== undefined) {
        setEvents(prev => prev.map(e => e.id === checkoutModalEvent.id ? {
          ...e,
          average_rating: res.data.average_rating,
          rating_count: res.data.rating_count
        } : e));
      }
    } else {
      setCheckoutError(res.data?.error || 'Checkout submission failed. Please verify your phone number or ticket ID.');
    }
  };

  // Certificate Lookup
  const handleLookupCertificate = async (e, directTicketId = null) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!certModalEvent) return;

    const lookupQuery = directTicketId
      ? { ticket_id: directTicketId }
      : (certSelectedTicketId
        ? { ticket_id: certSelectedTicketId }
        : { phone: certPhone.trim() });

    if (!lookupQuery.phone && !lookupQuery.ticket_id) {
      setCertError('Please enter your registered mobile number or ticket ID.');
      return;
    }

    setLookingUpCert(true);
    setCertError('');
    setCertResult(null);

    const res = await lookupCertificate(certModalEvent.id, lookupQuery);
    setLookingUpCert(false);

    if (res.ok) {
      if (res.data?.multiple) {
        setCertMultipleAttendees(res.data.attendees || []);
        return;
      }
      setCertMultipleAttendees(null);
      if (res.data?.eligible) {
        setCertResult(res.data);
      } else {
        setCertError('Certificate not yet eligible.');
      }
    } else {
      setCertError(res.data?.error || 'No verified checked-out certificate record found for this mobile number or ticket.');
    }
  };

  // Canvas Certificate PNG Generator & Downloader
  const handleDownloadCertificate = async () => {
    if (!certResult || !certResult.template) return;
    setDownloadingCert(true);
    try {
      const tmpl = certResult.template;
      const attendeeName = certResult.attendee?.name || 'Volunteer';
      const bgUrl = tmpl.image_url || tmpl.background_image_url;
      if (!bgUrl) {
        showToast('Certificate background template not available.');
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load certificate template image'));
        img.src = bgUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 1200;
      canvas.height = img.naturalHeight || 850;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Draw template background
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 2. Draw attendee name
      const namePos = tmpl.name_position || { x: 50, y: 50, fontSize: 28, fontColor: '#1a1a1a' };
      const pixelX = ((namePos.x || 50) / 100) * canvas.width;
      const pixelY = ((namePos.y || 50) / 100) * canvas.height;
      const fontSize = Math.round((namePos.fontSize || 28) * (canvas.width / 1200));

      ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", Georgia, serif`;
      ctx.fillStyle = namePos.fontColor || '#1a1a1a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(attendeeName, pixelX, pixelY);

      // 3. Draw QR code pointing to certificate verification
      const qrPos = tmpl.qr_position || { x: 85, y: 80, size: 70 };
      const qrPixelX = ((qrPos.x || 85) / 100) * canvas.width;
      const qrPixelY = ((qrPos.y || 80) / 100) * canvas.height;
      const qrPixelSize = Math.round((qrPos.size || 70) * (canvas.width / 1200));

      const verificationUrl = `${window.location.origin}/verify/certificate/${encodeURIComponent(certResult.attendee?.ticket_id || certResult.event?.id || 'TNV')}`;
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        width: qrPixelSize,
        color: { dark: '#043424', light: '#ffffff' }
      });
      const qrImg = new Image();
      await new Promise((resolve) => {
        qrImg.onload = resolve;
        qrImg.src = qrDataUrl;
      });
      ctx.drawImage(qrImg, qrPixelX - qrPixelSize / 2, qrPixelY - qrPixelSize / 2, qrPixelSize, qrPixelSize);

      // Trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `TNV_Certificate_${attendeeName.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Certificate downloaded successfully for ${attendeeName}!`);
    } catch (err) {
      showToast('Error generating certificate: ' + err.message);
    } finally {
      setDownloadingCert(false);
    }
  };

  // Filtered Events
  const filtered = useMemo(() => {
    return events.filter(e => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter.toLowerCase() === 'ongoing' && e.status.toLowerCase() !== 'ongoing') return false;
        if (statusFilter.toLowerCase() === 'published' && e.status.toLowerCase() !== 'published') return false;
      }

      // District filter
      if (selectedDistrict !== 'All Districts') {
        const d = (e.district || '').toLowerCase();
        if (d !== 'all districts' && d !== 'statewide' && d !== selectedDistrict.toLowerCase()) {
          return false;
        }
      }

      // Category filter (using case-insensitive matcher)
      if (selectedCategory !== 'All Categories') {
        const cat = e.category || '';
        const tags = Array.isArray(e.tags) ? e.tags : [];
        if (!matchesCategory(cat, selectedCategory) && !tags.some(t => matchesCategory(t, selectedCategory))) {
          return false;
        }
      }

      // Department filter (using case-insensitive matcher)
      if (selectedDepartment !== 'All Departments') {
        const dep = e.department || e.wing || '';
        if (!matchesDepartment(dep, selectedDepartment)) {
          return false;
        }
      }

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = (e.title || '').toLowerCase().includes(q);
        const inVenue = (e.venue || '').toLowerCase().includes(q);
        const inDesc = (e.description || '').toLowerCase().includes(q);
        const inDist = (e.district || '').toLowerCase().includes(q);
        const inCat = (e.category || '').toLowerCase().includes(q);
        const inDep = (e.department || '').toLowerCase().includes(q);
        if (!inTitle && !inVenue && !inDesc && !inDist && !inCat && !inDep) return false;
      }

      return true;
    });
  }, [events, statusFilter, selectedDistrict, selectedCategory, selectedDepartment, search]);

  const selectedEvent = events.find(event => event.id === selectedEventId);

  return (
    <div className="bg-neutral-bg min-h-screen py-10 sm:py-16">
      <div className="container-page max-w-6xl">
        {/* Toast */}
        {toast && (
          <div className="mb-6 rounded-xl border border-brand-green/30 bg-brand-green-tint p-4 text-sm font-semibold text-brand-green-dark shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />
              {toast}
            </div>
            <div className="flex items-center gap-3">
              {toastMapsUrl && (
                <a
                  href={toastMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-brand-green-dark hover:underline"
                >
                  Open in Maps &rarr;
                </a>
              )}
              <button onClick={() => { setToast(''); setToastMapsUrl(null); }} className="text-xs text-brand-green-dark hover:underline">Dismiss</button>
            </div>
          </div>
        )}

        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-block rounded-full bg-brand-green-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-green-dark">
            Tamil Nadu Volunteers · State Action Hub
          </span>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-neutral-ink sm:text-4xl lg:text-5xl">
            TNV Events & Volunteer Drives
          </h1>
          <p className="mt-3 text-base text-neutral-muted sm:text-lg">
            Join grassroots civic drives across all 38 districts of Tamil Nadu. Tree plantations, flood preparedness drills, riverbank restorations, and civic leadership workshops.
          </p>
        </div>

        {/* Status Tabs Bar */}
        <div className="bg-white rounded-2xl border border-brand-green-tint p-4 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-xl overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-neutral-ink shadow-xs'
                  : 'text-neutral-muted hover:text-neutral-ink'
              }`}
            >
              All Active Drives ({events.length})
            </button>

            <button
              onClick={() => setStatusFilter('Ongoing')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                statusFilter === 'Ongoing'
                  ? 'bg-brand-green text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${statusFilter === 'Ongoing' ? 'bg-amber-300' : 'bg-emerald-500'} animate-ping`} />
              Ongoing Now ({events.filter(e => e.status === 'Ongoing').length})
            </button>

            <button
              onClick={() => setStatusFilter('Published')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'Published'
                  ? 'bg-white text-blue-800 shadow-xs'
                  : 'text-neutral-muted hover:text-blue-800'
              }`}
            >
              Upcoming ({events.filter(e => e.status === 'Published').length})
            </button>
          </div>

          {/* Search bar & Scanner Desk Link */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:flex-1 max-w-lg">
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                placeholder="Search drives by name, venue, district..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="min-h-tap w-full rounded-xl border border-neutral-muted/30 pl-9 pr-3 py-2 text-sm sm:text-xs focus:border-brand-green focus:outline-none"
              />
              <svg className="w-4 h-4 text-neutral-muted absolute left-3 top-3.5 sm:top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <Link
              to="/scanner"
              className="min-h-tap px-3.5 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs shrink-0"
              title="Gate Check-In: login with temporary scanner username & password"
            >
              📱 Scanner Desk
            </Link>
          </div>
        </div>

        {/* 3-Way Filter Controls Row */}
        <div className="bg-white rounded-2xl border border-brand-green-tint/80 p-4 shadow-xs mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* District Filter */}
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-neutral-muted mb-1">
              Filter by District
            </label>
            <select
              value={selectedDistrict}
              onChange={e => setSelectedDistrict(e.target.value)}
              className="w-full rounded-xl border border-neutral-muted/30 px-3 py-2 text-xs font-semibold text-neutral-ink focus:border-brand-green focus:outline-none"
            >
              {['All Districts', ...TN_DISTRICTS].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-neutral-muted mb-1">
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-neutral-muted/30 px-3 py-2 text-xs font-semibold text-neutral-ink focus:border-brand-green focus:outline-none"
            >
              {['All Categories', ...EVENT_CATEGORIES].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[0.6875rem] font-bold uppercase tracking-wider text-neutral-muted mb-1">
              Filter by Department
            </label>
            <select
              value={selectedDepartment}
              onChange={e => setSelectedDepartment(e.target.value)}
              className="w-full rounded-xl border border-neutral-muted/30 px-3 py-2 text-xs font-semibold text-neutral-ink focus:border-brand-green focus:outline-none"
            >
              {['All Departments', ...EVENT_DEPARTMENTS].map(dep => (
                <option key={dep} value={dep}>{dep}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-brand-green-tint p-16 text-center shadow-xs">
            <Spinner className="mx-auto h-8 w-8 text-brand-green" />
            <p className="mt-3 text-sm text-neutral-muted">Fetching latest civic initiatives...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-200 p-12 text-center text-red-800 shadow-xs">
            <p className="font-semibold">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-brand-green-tint p-16 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-brand-green-tint text-brand-green mx-auto flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-neutral-ink text-lg font-display">No Events Found</h3>
            <p className="text-xs text-neutral-muted mt-1 max-w-md mx-auto">
              There are currently no events matching your criteria in this selection. Clear filters or check back soon for upcoming field drives.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(evt => {
              const isOngoing = evt.status === 'Ongoing';
              const badge = STATUS_BADGES[evt.status] || STATUS_BADGES.Published;
              const isFull = evt.capacity != null && (evt.registered_count || 0) >= evt.capacity;
              const photo = evt.image_url || evt.banner_url;

              // Organisers display format
              const primaryOrg = Array.isArray(evt.organisers) && evt.organisers.length > 0
                ? evt.organisers[0]
                : { name: evt.organizer_name || 'TNV Lead', designation: 'Coordinator', phone: evt.organizer_contact || 'N/A' };

              return (
                <div
                  key={evt.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEventId(evt.id)}
                  onKeyDown={e => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedEventId(evt.id);
                    }
                  }}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer border ${
                    isOngoing ? 'border-brand-green ring-2 ring-brand-green/20' : 'border-brand-green-tint'
                  }`}
                >
                  {/* Event Picture at top */}
                  <div className="relative h-44 w-full bg-neutral-100 overflow-hidden shrink-0">
                    {photo ? (
                      <img
                        src={photo}
                        alt={evt.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-brand-green to-brand-green-dark flex flex-col items-center justify-center p-4 text-center">
                        <span className="text-white/80 font-display font-bold text-base uppercase tracking-wider">Tamil Nadu Volunteers</span>
                        <span className="text-amber-300 text-xs mt-1 font-semibold">{getEventCategory(evt)}</span>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                        isOngoing
                          ? 'bg-emerald-600 text-white'
                          : evt.status === 'Completed'
                          ? 'bg-neutral-800 text-white'
                          : `${badge.bg} ${badge.text} border ${badge.border}`
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isOngoing ? 'bg-amber-300 animate-ping' : evt.status === 'Completed' ? 'bg-neutral-400' : badge.dot}`} />
                        {isOngoing ? 'ONGOING NOW' : evt.status === 'Completed' ? 'CONCLUDED' : 'UPCOMING'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-white">
                        📍 {evt.district}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[0.6875rem] font-bold uppercase tracking-wider text-brand-green-dark">
                        <span>{getEventCategory(evt)}</span>
                        <div className="flex items-center gap-2">
                          {evt.average_rating && (
                            <span className="inline-flex items-center gap-1 text-[0.6875rem] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              ★ {evt.average_rating} ({evt.rating_count || 1})
                            </span>
                          )}
                          <span>{evt.department || evt.wing}</span>
                        </div>
                      </div>

                      <h3 className={`text-xl font-bold font-display leading-snug ${
                        evt.status === 'Completed' ? 'line-through text-neutral-500' : 'text-neutral-ink'
                      }`}>
                        {evt.title}
                      </h3>

                      <p className="text-xs leading-relaxed text-neutral-muted line-clamp-2">
                        {evt.description}
                      </p>

                      {/* Info Rows */}
                      <div className="space-y-1.5 pt-2 text-xs text-neutral-600 border-t border-neutral-100">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-brand-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>
                            <strong>Date:</strong> {formatEventDate(evt.start_date)} ({evt.start_time} - {evt.end_time})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-brand-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span className="truncate">
                            <strong>Venue:</strong> {evt.venue}
                          </span>
                        </div>

                        {/* Organiser format: Name, role in the event, phone number */}
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-brand-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="truncate">
                            <strong>Organiser:</strong> {primaryOrg.name}, {primaryOrg.designation || 'Lead'}, {primaryOrg.phone || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Guest Highlights */}
                      {Array.isArray(evt.guests) && evt.guests.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs">
                          <span className="font-bold text-amber-900 block mb-0.5">Special Guest(s):</span>
                          {evt.guests.slice(0, 2).map((g, gi) => (
                            <span key={gi} className="text-amber-800 font-medium mr-2">
                              ⭐ <strong>{g.name}</strong> ({g.designation})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Section */}
                    <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[0.6875rem] font-semibold text-neutral-muted">
                        <span className="text-brand-green-dark font-bold">{evt.registered_count || 0}</span>
                        <span> / {evt.capacity == null ? 'Unlimited' : evt.capacity} registered</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {evt.status === 'Completed' ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCertModalEvent(evt);
                                setCertPhone('');
                                setCertError('');
                                setCertResult(null);
                                setCertMultipleAttendees(null);
                                setCertSelectedTicketId('');
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-900 hover:bg-emerald-200 transition-colors"
                            >
                              🎓 Certificate
                            </button>
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 text-neutral-400 cursor-not-allowed"
                            >
                              Concluded
                            </button>
                          </>
                        ) : (
                          <>
                            {evt.is_checkout_open && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCheckoutModalEvent(evt);
                                  setCheckoutSuccessMsg('');
                                  setCheckoutError('');
                                  setCheckoutMultipleAttendees(null);
                                  setCheckoutSelectedTicketId('');
                                }}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors"
                              >
                                ⭐ Checkout / Rate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEventId(evt.id);
                              }}
                              className="btn-primary text-xs font-semibold px-4 py-1.5 shadow-xs"
                            >
                              View & Register &rarr;
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: EVENT FULL DETAILS VIEW */}
        {selectedEvent && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-fade-in"
            onClick={closeEventDetails}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-brand-green-tint max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Header Picture at Top */}
              <div className="relative h-56 sm:h-64 w-full bg-neutral-900 shrink-0">
                {selectedEvent.image_url || selectedEvent.banner_url ? (
                  <img
                    src={selectedEvent.image_url || selectedEvent.banner_url}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-brand-green-dark to-brand-green flex items-center justify-center p-6 text-center">
                    <span className="text-white text-lg font-bold font-display uppercase tracking-wider">{selectedEvent.title}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={closeEventDetails}
                  className="absolute top-3 right-3 text-white bg-black/50 hover:bg-black/75 rounded-full p-2 text-xl font-bold leading-none transition-colors"
                  aria-label="Close modal"
                >
                  &times;
                </button>
                <div className="absolute bottom-3 left-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-neutral-ink shadow-sm">
                    📍 {selectedEvent.district}
                  </span>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-brand-green-dark mb-1">
                    <span>{getEventCategory(selectedEvent)}</span>
                    <span>{selectedEvent.department || selectedEvent.wing}</span>
                  </div>
                  <h2 className="font-display text-2xl font-extrabold text-neutral-ink">
                    {selectedEvent.title}
                  </h2>
                </div>

                {/* Description */}
                <div className="prose prose-sm text-neutral-ink max-w-none">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                    {selectedEvent.description}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
                  <div>
                    <span className="font-bold text-neutral-muted block mb-0.5">Date & Time</span>
                    <span className="font-semibold text-neutral-ink">
                      {formatEventDate(selectedEvent.start_date)} ({selectedEvent.start_time} - {selectedEvent.end_time})
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-neutral-muted block mb-0.5">Venue & Location</span>
                    <span className="font-semibold text-neutral-ink">{selectedEvent.venue}</span>
                  </div>
                  {getEventMapsUrl(selectedEvent) && (
                    <div className="sm:col-span-2 pt-1 border-t border-neutral-200">
                      <a
                        href={getEventMapsUrl(selectedEvent)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-green-dark font-bold hover:underline inline-flex items-center gap-1"
                      >
                        📍 Open Location in Google Maps &rarr;
                      </a>
                    </div>
                  )}
                </div>

                {/* Organisers Section (Name, role in the event, phone number) */}
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-brand-green-dark">
                    Official Event Organisers
                  </h4>
                  <div className="space-y-1.5">
                    {Array.isArray(selectedEvent.organisers) && selectedEvent.organisers.length > 0 ? (
                      selectedEvent.organisers.map((org, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                          <span className="font-semibold text-neutral-ink">
                            {org.name} <span className="text-neutral-500 font-normal">({org.designation || 'Coordinator'})</span>
                          </span>
                          <span className="font-mono text-neutral-600">{org.phone || 'N/A'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs p-2 rounded-lg bg-neutral-50 text-neutral-600">
                        {selectedEvent.organizer_name || 'TNV State Coordinator'}, Phone: {selectedEvent.organizer_contact || 'N/A'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Distinguished Guests Section */}
                {Array.isArray(selectedEvent.guests) && selectedEvent.guests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
                      Distinguished Guests
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedEvent.guests.map((g, i) => (
                        <div key={i} className="p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-xs">
                          <p className="font-bold text-amber-950 text-sm">⭐ {g.name}</p>
                          <p className="text-amber-800 font-medium mt-0.5">{g.designation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Long Term Volunteer Notice Banner */}
                <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <strong className="block font-bold">Thinking long term?</strong>
                    <span>Register as a permanent TNV Volunteer — this event registration will be automatically linked!</span>
                  </div>
                  <Link
                    to="/register"
                    className="shrink-0 px-3.5 py-1.5 rounded-lg bg-brand-green text-white font-bold text-xs hover:bg-brand-green-dark transition-colors shadow-xs"
                  >
                    Register as Volunteer
                  </Link>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 sm:p-5 border-t border-neutral-100 bg-neutral-50/90 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-end">
                {selectedEvent.status === 'Completed' ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCertModalEvent(selectedEvent);
                        setCertPhone('');
                        setCertError('');
                        setCertResult(null);
                        setCertMultipleAttendees(null);
                        setCertSelectedTicketId('');
                        closeEventDetails();
                      }}
                      className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-200 transition-colors"
                    >
                      🎓 Get Participation Certificate
                    </button>
                    <span className="text-xs font-semibold text-neutral-500 py-2">
                      Event Concluded · Registration Closed
                    </span>
                  </div>
                ) : (
                  <>
                    {selectedEvent.is_checkout_open && (
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutModalEvent(selectedEvent);
                          setCheckoutSuccessMsg('');
                          setCheckoutError('');
                          setCheckoutMultipleAttendees(null);
                          setCheckoutSelectedTicketId('');
                          closeEventDetails();
                        }}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors"
                      >
                        ⭐ Attendee Checkout & Rating
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        handleOpenVisitorRegister(selectedEvent);
                        closeEventDetails();
                      }}
                      className="px-4 py-2.5 text-xs font-bold rounded-xl border border-brand-green text-brand-green-dark hover:bg-emerald-50 transition-colors"
                    >
                      Register only for this event
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleOpenMemberRegister(selectedEvent);
                        closeEventDetails();
                      }}
                      className="btn-primary px-5 py-2.5 text-xs font-bold shadow-sm"
                    >
                      Register if already a member
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal: REGISTRATION (Temporary Visitor or Registered Member) */}
        {registerModalEvent && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-fade-in"
            onClick={() => setRegisterModalEvent(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-brand-green-tint max-h-[92vh] flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h3 className="font-display font-bold text-lg text-neutral-ink">
                    {isMemberRegMode ? 'Member Event Registration' : 'Event Pass Registration'}
                  </h3>
                  <p className="text-xs text-neutral-muted mt-0.5">{registerModalEvent.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRegisterModalEvent(null)}
                  className="text-neutral-400 hover:text-neutral-700 text-2xl font-bold leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {regSuccessData ? (
                <div className="p-6 text-center space-y-4 overflow-y-auto max-h-[85vh]">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-2xl font-bold">
                    ✓
                  </div>
                  <h3 className="font-display text-xl font-bold text-neutral-ink">
                    Registration Confirmed!
                  </h3>
                  <p className="text-xs text-neutral-600 max-w-md mx-auto">
                    Check-in QR passes generated for <strong>{regSuccessData.attendees?.length || 1} participant(s)</strong>.
                    You can show or scan these QR passes directly at the gate.
                  </p>

                  {/* QR Tickets Display */}
                  <div className="space-y-3 max-h-72 overflow-y-auto text-left">
                    {regSuccessData.attendees?.map((att, i) => (
                      <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-neutral-ink text-sm">{att.name}</span>
                            {att.is_primary && (
                              <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-brand-green-tint text-brand-green-dark">
                                Primary Registrant
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-600 font-mono">
                            Ticket: <strong>{att.ticket_id}</strong>
                          </div>
                          <div className="text-[0.6875rem] text-neutral-500">
                            Mobile: {att.phone || regForm.phone}
                          </div>
                        </div>

                        {successQrs[att.ticket_id] && (
                          <div className="shrink-0 flex flex-col items-center p-2 bg-white rounded-xl border border-neutral-200 shadow-xs">
                            <img src={successQrs[att.ticket_id]} alt={att.ticket_id} className="w-24 h-24" />
                            <span className="text-[0.5625rem] font-bold font-mono text-brand-green-dark mt-1">SCAN AT GATE</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs text-amber-900 space-y-1">
                    <p className="font-semibold">📧 Email Dispatch Status:</p>
                    <p className="text-[0.6875rem] text-amber-800">
                      Dispatched to <strong>{regForm.email}</strong>. If you don't see it in your inbox or spam folder, your server environment may be running in local/log mode without a configured outbound email API key (<code className="bg-amber-100 px-1 py-0.5 rounded">RESEND_API_KEY</code>). You can screenshot or save the QR passes above to check in at the event!
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-bold transition-all"
                    >
                      🖨️ Print / Save Passes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterModalEvent(null);
                        setRegSuccessData(null);
                      }}
                      className="btn-primary flex-1 py-2 text-xs font-bold"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitRegistration} className="flex flex-col flex-1 overflow-hidden">
                  <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    {regError && (
                      <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
                        {regError}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-neutral-ink mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={regForm.name}
                        onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                        placeholder="Your full name"
                        className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-neutral-ink mb-1">
                          Mobile Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          value={regForm.phone}
                          onChange={e => setRegForm({ ...regForm, phone: e.target.value })}
                          placeholder="e.g. 9840112233"
                          className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-ink mb-1">
                          Email (for QR Passes) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={regForm.email}
                          onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                          placeholder="name@example.com"
                          className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Capacity status */}
                    {registerModalEvent.capacity != null && (
                      <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs flex items-center justify-between">
                        <span className="text-neutral-600">Event Capacity: <strong>{registerModalEvent.capacity}</strong></span>
                        <span className="text-brand-green-dark font-bold">
                          Available: {Math.max(0, registerModalEvent.capacity - (registerModalEvent.registered_count || 0))} spots
                        </span>
                      </div>
                    )}

                    {/* Extra Accompanying Members (Unlimited) */}
                    <div className="pt-2 border-t border-neutral-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-bold text-neutral-ink block">
                            Extra Accompanying Members ({regForm.extra_members.length})
                          </label>
                          <span className="text-[0.6875rem] text-neutral-muted">
                            Accommodate any number of persons with you — individual QR passes will be generated.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddExtraMember}
                          className="text-xs font-bold text-brand-green hover:underline px-2 py-1 bg-brand-green-tint rounded-lg"
                        >
                          + Add Member
                        </button>
                      </div>

                      {regForm.extra_members.map((m, idx) => (
                        <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                          <input
                            type="text"
                            placeholder={`Member #${idx + 1} Name`}
                            value={m.name}
                            onChange={e => handleUpdateExtraMember(idx, 'name', e.target.value)}
                            className="rounded-lg border border-neutral-muted/30 px-2.5 py-1.5 text-xs focus:border-brand-green focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              placeholder="Phone Number"
                              value={m.phone}
                              onChange={e => handleUpdateExtraMember(idx, 'phone', e.target.value)}
                              className="w-full rounded-lg border border-neutral-muted/30 px-2.5 py-1.5 text-xs focus:border-brand-green focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveExtraMember(idx)}
                              className="text-red-500 hover:text-red-700 font-bold px-2 text-xs"
                            >
                              &times;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border-t border-neutral-100 bg-neutral-50/80 flex items-center justify-end gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRegisterModalEvent(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReg}
                      className="btn-primary px-5 py-2 text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                    >
                      {submittingReg && <Spinner className="w-3.5 h-3.5" />}
                      Confirm Registration ({1 + regForm.extra_members.length} Passes)
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal: ATTENDEE CHECKOUT & STAR RATING */}
        {checkoutModalEvent && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-fade-in"
            onClick={() => setCheckoutModalEvent(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-brand-green-tint p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-display font-bold text-lg text-neutral-ink">
                  Event Checkout & Feedback
                </h3>
                <button
                  type="button"
                  onClick={() => setCheckoutModalEvent(null)}
                  className="text-neutral-400 hover:text-neutral-700 text-2xl font-bold leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {checkoutSuccessMsg ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-xl font-bold">
                    ✓
                  </div>
                  <h4 className="font-bold text-neutral-ink">Checkout Complete!</h4>
                  <p className="text-xs text-neutral-600">{checkoutSuccessMsg}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCertModalEvent(checkoutModalEvent);
                      setCertPhone(checkoutPhone);
                      setCheckoutModalEvent(null);
                    }}
                    className="btn-primary w-full py-2 text-xs font-bold mt-2"
                  >
                    Check / Download Certificate &rarr;
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitCheckout} className="space-y-4">
                  {checkoutError && (
                    <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
                      {checkoutError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Registered Mobile Number or Ticket ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9840112233 or tkt-..."
                      value={checkoutPhone}
                      onChange={e => {
                        setCheckoutPhone(e.target.value);
                        setCheckoutMultipleAttendees(null);
                        setCheckoutSelectedTicketId('');
                      }}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    />
                  </div>

                  {checkoutMultipleAttendees && checkoutMultipleAttendees.length > 0 && (
                    <div className="space-y-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-xs font-bold text-amber-900">
                        Multiple participants found under this mobile. Choose participant:
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {checkoutMultipleAttendees.map((att) => (
                          <div
                            key={att.ticket_id}
                            onClick={() => setCheckoutSelectedTicketId(att.ticket_id)}
                            className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between border ${
                              checkoutSelectedTicketId === att.ticket_id
                                ? 'bg-amber-100 border-amber-400 font-bold text-amber-950'
                                : 'bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50'
                            }`}
                          >
                            <div>
                              <div>{att.name} {att.is_primary ? '(Primary)' : ''}</div>
                              <div className="text-[0.625rem] text-neutral-500 font-mono">{att.ticket_id}</div>
                            </div>
                            <span className={`text-[0.625rem] px-2 py-0.5 rounded font-bold ${
                              att.checked_out ? 'bg-neutral-200 text-neutral-700' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {att.checked_out ? 'Checked Out' : 'Pending'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Event Star Rating: {checkoutRating} / 5 Stars
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setCheckoutRating(star)}
                          className={`text-2xl transition-transform hover:scale-125 ${
                            star <= checkoutRating ? 'text-amber-400' : 'text-neutral-300'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Feedback & Experience Overview
                    </label>
                    <textarea
                      rows={3}
                      value={checkoutFeedback}
                      onChange={e => setCheckoutFeedback(e.target.value)}
                      placeholder="Share what you liked, learned, or how we can improve..."
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-xs focus:border-brand-green focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCheckoutModalEvent(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingCheckout}
                      className="btn-primary px-5 py-2 text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                    >
                      {submittingCheckout && <Spinner className="w-3.5 h-3.5" />}
                      Submit Checkout
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Modal: CERTIFICATE PREVIEW & DOWNLOAD */}
        {certModalEvent && (
          <div
            className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-6 flex items-center justify-center animate-fade-in"
            onClick={() => setCertModalEvent(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-brand-green-tint p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-display font-bold text-lg text-neutral-ink">
                  Download Participation Certificate
                </h3>
                <button
                  type="button"
                  onClick={() => setCertModalEvent(null)}
                  className="text-neutral-400 hover:text-neutral-700 text-2xl font-bold leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {certError && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
                  {certError}
                </div>
              )}

              {certResult ? (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center text-xl font-bold">
                    🎓
                  </div>
                  <h4 className="font-bold text-base text-neutral-ink">
                    Certificate Verified for {certResult.attendee?.name}!
                  </h4>
                  <p className="text-xs text-neutral-600">
                    {certResult.event?.title} · {certResult.event?.district}
                  </p>

                  {certResult.template?.background_image_url && (
                    <div className="border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
                      <img
                        src={certResult.template.background_image_url}
                        alt="Certificate Preview"
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={downloadingCert}
                    onClick={handleDownloadCertificate}
                    className="btn-primary w-full py-2.5 text-xs font-bold inline-flex items-center justify-center gap-2"
                  >
                    {downloadingCert ? <Spinner className="w-4 h-4 text-white" /> : '📥'}
                    {downloadingCert ? 'Generating Certificate...' : 'Download Certificate (PNG)'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLookupCertificate} className="space-y-4">
                  <p className="text-xs text-neutral-600">
                    Certificates are released to participants who completed event attendance and checkout before checkout closed. Enter your registered mobile number or ticket ID below:
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Registered Mobile Number or Ticket ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 9840112233 or tkt-..."
                      value={certPhone}
                      onChange={e => {
                        setCertPhone(e.target.value);
                        setCertMultipleAttendees(null);
                        setCertSelectedTicketId('');
                      }}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    />
                  </div>

                  {certMultipleAttendees && certMultipleAttendees.length > 0 && (
                    <div className="space-y-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <p className="text-xs font-bold text-amber-900">
                        Multiple participants found under this mobile. Choose participant:
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {certMultipleAttendees.map((att) => (
                          <div
                            key={att.ticket_id}
                            onClick={() => {
                              setCertSelectedTicketId(att.ticket_id);
                              handleLookupCertificate(null, att.ticket_id);
                            }}
                            className="p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between border bg-white border-neutral-200 text-neutral-800 hover:border-brand-green hover:bg-emerald-50"
                          >
                            <div>
                              <div className="font-bold text-neutral-ink">{att.name} {att.is_primary ? '(Primary)' : ''}</div>
                              <div className="text-[0.625rem] text-neutral-500 font-mono">{att.ticket_id}</div>
                            </div>
                            <span className={`text-[0.625rem] px-2 py-0.5 rounded font-bold ${
                              att.checked_out ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {att.checked_out ? 'Eligible' : 'Needs Checkout'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCertModalEvent(null)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={lookingUpCert}
                      className="btn-primary px-5 py-2 text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                    >
                      {lookingUpCert && <Spinner className="w-3.5 h-3.5" />}
                      Verify & Fetch Certificate
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
