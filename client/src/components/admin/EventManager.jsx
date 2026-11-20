import { useState, useEffect, useMemo } from 'react';
import {
  getEvents,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  getEventParticipants,
  getEventAttendance,
  reviewEventProposal,
  toggleCheckout,
  submitEventReport,
  getEventReport,
  eventPhase,
  PHASE_BADGES,
  EVENT_STATUSES,
  STATUS_BADGES
} from '../../lib/eventService.js';
import { generateEventReportPdf } from '../../lib/eventReportPdf.js';
import Spinner from '../Spinner.jsx';

const INITIAL_FORM = {
  title: '',
  category: 'Palm seed plantation',
  department: 'Field Operations Department',
  description: '',
  district: 'Chennai',
  venue: '',
  wing: 'Operations Wing',
  start_date: '',
  end_date: '',
  start_time: '09:00',
  end_time: '17:00',
  capacity: 100,
  status: 'Published',
  organizer_name: '',
  organizer_contact: '',
  image_url: '',
  tags: '',
  organisers: [
    { name: '', designation: 'Lead Coordinator', phone: '', email: '' },
    { name: '', designation: 'Co-Organiser', phone: '', email: '' }
  ],
  guests: [
    { name: '', designation: '', organization: '' }
  ],
  location_url: ''
};

const TN_DISTRICTS = [
  'All Districts',
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris',
  'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
  'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
  'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
  'Viluppuram', 'Virudhunagar'
];

const CATEGORIES = [
  'All Categories',
  'Palm seed plantation',
  'Climate and environment',
  'Tree plantation drive',
  'Disaster management',
  'Education',
  'Drug-free Tamil Nadu',
  'Social responsibility',
  'Empowering volunteers',
  'Youth empowerment',
  'Health and rescue',
  'Clean-up & Sanitation'
];

const DEPARTMENTS = [
  'All Departments',
  'Administration & Human Resources Department',
  'Finance & Compliance Department',
  'Partnerships, CSR & NGO Relations Department',
  'Technology & Digital Systems Department',
  'Communication & Media Department',
  'Field Operations Department',
  'Online Volunteer Operations Department',
  'Social Responsibility, Awareness & Advocacy Department',
  'Health & Wellness Department',
  'Education & Skill Development Department',
  'Community Development Department',
  'Emergency Crisis & Disaster Management Department',
  'Environment, Sustainability & Ecological Restoration Department'
];

const WINGS = [
  'All Wings',
  'Youth Wing',
  'Women Wing',
  'Students Wing',
  'Social Action Wing'
];


export default function EventManager({ initialStatusFilter = 'all' }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [districtFilter, setDistrictFilter] = useState('all');
  const [wingFilter, setWingFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Confirmation
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Status Updating state
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  // Volunteers Roster Modal
  const [rosterEvent, setRosterEvent] = useState(null);
  const [rosterParticipants, setRosterParticipants] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [rosterError, setRosterError] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  // user id -> 'present' | 'absent', as marked by the volunteers themselves
  const [rosterAttendance, setRosterAttendance] = useState({});

  const handleOpenRoster = async (evt) => {
    setRosterEvent(evt);
    setLoadingRoster(true);
    setRosterError('');
    setRosterSearch('');
    setRosterAttendance({});
    getEventAttendance(evt.id).then(att => {
      if (att.ok && Array.isArray(att.data?.attendance)) {
        setRosterAttendance(Object.fromEntries(att.data.attendance.map(a => [a.user_id, a.status])));
      }
    });
    const res = await getEventParticipants(evt.id);
    setLoadingRoster(false);
    if (res.ok && Array.isArray(res.data?.participants)) {
      setRosterParticipants(res.data.participants);
    } else {
      setRosterError(res.data?.error || 'Unable to load registered volunteers roster.');
    }
  };

  // Sync initialStatusFilter if prop changes
  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Load events
  const loadEvents = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const res = await getEvents();
    if (showLoading) setLoading(false);
    if (res.ok && Array.isArray(res.data?.events)) {
      setEvents(res.data.events);
      setError('');
    } else if (showLoading) {
      setError(res.data?.error || 'Unable to load events. Please refresh.');
    }
  };

  useEffect(() => {
    loadEvents(true);
    const interval = setInterval(() => {
      // Don't refresh in background if modal or roster is open to avoid disrupting user editing
      if (!isModalOpen && !rosterEvent) {
        loadEvents(false);
      }
    }, 4000);
    const onFocus = () => {
      if (!isModalOpen && !rosterEvent) {
        loadEvents(false);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isModalOpen, rosterEvent]);

  // State for Review, Scanner Creds & Report
  const [reviewingId, setReviewingId] = useState(null);
  const [rejectModalEvt, setRejectModalEvt] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approvedCredsModal, setApprovedCredsModal] = useState(null);

  const [reportModalEvt, setReportModalEvt] = useState(null);
  const [reportOverview, setReportOverview] = useState('');
  const [reportPhotos, setReportPhotos] = useState(['', '', '', '']);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = events.length;
    const pending = events.filter(e => e.status === 'Pending Approval').length;
    const published = events.filter(e => e.status === 'Published').length;
    const ongoing = events.filter(e => e.status === 'Ongoing').length;
    const draft = events.filter(e => e.status === 'Draft').length;
    const completed = events.filter(e => e.status === 'Completed').length;
    const cancelled = events.filter(e => e.status === 'Cancelled').length;
    const rejected = events.filter(e => e.status === 'Rejected').length;
    const totalVolunteers = events.reduce((sum, e) => sum + (e.registered_count || 0), 0);
    return { total, pending, published, ongoing, draft, completed, cancelled, rejected, totalVolunteers };
  }, [events]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // Status filter
      if (statusFilter !== 'all' && e.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      // District filter
      if (districtFilter !== 'all' && districtFilter !== 'All Districts') {
        const d = (e.district || '').toLowerCase();
        if (d !== 'all districts' && d !== 'statewide' && d !== districtFilter.toLowerCase()) {
          return false;
        }
      }
      // Wing filter
      if (wingFilter !== 'all' && wingFilter !== 'All Wings') {
        const w = (e.wing || '').toLowerCase();
        if (w !== 'all wings' && w !== wingFilter.toLowerCase()) {
          return false;
        }
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (e.title || '').toLowerCase().includes(q);
        const inDesc = (e.description || '').toLowerCase().includes(q);
        const inVenue = (e.venue || '').toLowerCase().includes(q);
        const inDist = (e.district || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inVenue && !inDist) return false;
      }
      return true;
    });
  }, [events, statusFilter, districtFilter, wingFilter, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setModalError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (evt) => {
    setEditingId(evt.id);
    setFormData({
      title: evt.title || '',
      category: evt.category || 'Palm seed plantation',
      department: evt.department || evt.wing || 'Field Operations Department',
      description: evt.description || '',
      district: evt.district || 'Chennai',
      venue: evt.venue || '',
      wing: evt.wing || 'Operations Wing',
      start_date: evt.start_date || '',
      end_date: evt.end_date || evt.start_date || '',
      start_time: evt.start_time || '09:00',
      end_time: evt.end_time || '17:00',
      capacity: evt.capacity === null ? '' : (evt.capacity ?? 100),
      status: evt.status || 'Published',
      organizer_name: evt.organizer_name || '',
      organizer_contact: evt.organizer_contact || '',
      image_url: evt.image_url || evt.banner_url || '',
      tags: Array.isArray(evt.tags) ? evt.tags.join(', ') : (evt.tags || ''),
      organisers: Array.isArray(evt.organisers) && evt.organisers.length > 0
        ? evt.organisers
        : [
            { name: evt.organizer_name || '', designation: 'Lead Coordinator', phone: evt.organizer_contact || '', email: '' },
            { name: '', designation: 'Co-Organiser', phone: '', email: '' }
          ],
      guests: Array.isArray(evt.guests) && evt.guests.length > 0
        ? evt.guests
        : [{ name: '', designation: '', organization: '' }],
      location_url: evt.location_url || ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Save Event
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setModalError('Event title is required.');
      return;
    }

    if (!formData.start_date) {
      setModalError('Start date is required.');
      return;
    }

    // Validate location URL
    if (formData.location_url.trim()) {
      try {
        const url = new URL(formData.location_url.trim());
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new Error();
        }
      } catch {
        setModalError('Please enter a valid location URL.');
        return;
      }
    }

    const validOrganisers = formData.organisers.filter(p => p.name && p.name.trim());
    if (validOrganisers.length < 2) {
      setModalError('Please specify at least two organisers for this event (format: Name, role in event, phone number).');
      return;
    }

    setSubmitting(true);
    setModalError('');

    const payload = {
      ...formData,
      title: formData.title.trim(),
      category: formData.category.trim(),
      department: (formData.department || formData.wing || 'Field Operations Department').trim(),
      description: formData.description.trim(),
      venue: formData.venue.trim() || 'TNV Central Hall',
      capacity: formData.capacity === '' ? null : (parseInt(formData.capacity, 10) || 100),
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      organisers: formData.organisers.filter(p => p.name && p.name.trim()),
      guests: formData.guests.filter(g => g.name && g.name.trim()),
      image_url: formData.image_url.trim(),
      banner_url: formData.image_url.trim(),
      location_url: formData.location_url.trim()
    };

    let res;
    if (editingId) {
      res = await updateEvent(editingId, payload);
    } else {
      res = await createEvent(payload);
    }

    setSubmitting(false);

    if (res.ok && res.data?.event) {
      setIsModalOpen(false);
      showToast(
        editingId
          ? 'Event updated successfully.'
          : 'New event created successfully.'
      );
      loadEvents();
    } else {
      setModalError(res.data?.error || 'Failed to save event.');
    }
  };

  // Proposal Review Actions
  const handleApproveProposal = async (evt) => {
    setReviewingId(evt.id);
    const res = await reviewEventProposal(evt.id, 'approve');
    setReviewingId(null);
    if (res.ok) {
      showToast(`Event "${evt.title}" has been approved and published!`);
      setApprovedCredsModal({
        title: evt.title,
        scanner_username: res.data?.event?.scanner_username,
        scanner_password: res.data?.event?.scanner_password
      });
      loadEvents();
    } else {
      setError(res.data?.error || 'Approval failed.');
    }
  };

  const handleRejectProposal = async (e) => {
    e.preventDefault();
    if (!rejectModalEvt) return;
    if (!rejectReason.trim()) {
      setError('Please provide a reason for the rejection.');
      return;
    }
    setReviewingId(rejectModalEvt.id);
    const res = await reviewEventProposal(rejectModalEvt.id, 'reject', rejectReason.trim());
    setReviewingId(null);
    const rejectedTitle = rejectModalEvt.title;
    setRejectModalEvt(null);
    setRejectReason('');
    if (res.ok) {
      showToast(`Event proposal "${rejectedTitle}" was rejected. Creator has been notified.`);
      loadEvents();
    } else {
      setError(res.data?.error || 'Rejection failed.');
    }
  };

  // Checkout Desk Toggle
  const handleToggleCheckout = async (evt) => {
    const nextVal = !evt.is_checkout_open;
    const res = await toggleCheckout(evt.id, nextVal);
    if (res.ok) {
      showToast(nextVal ? 'Checkout desk opened for attendees!' : 'Checkout desk closed.');
      loadEvents(false);
    } else {
      setError(res.data?.error || 'Failed to update checkout state.');
    }
  };

  // Completion Report Actions
  const handleOpenReport = (evt) => {
    setReportModalEvt(evt);
    setReportOverview(evt.completion_report?.overview || evt.description || '');
    const defaultPhotos = evt.completion_report?.photos?.length === 4
      ? evt.completion_report.photos
      : (evt.completion_report?.photos || ['', '', '', '']);
    setReportPhotos(defaultPhotos);
  };

  const handleSaveReport = async (e) => {
    e.preventDefault();
    if (!reportModalEvt) return;
    setSubmittingReport(true);
    const res = await submitEventReport(reportModalEvt.id, {
      overview: reportOverview.trim(),
      photos: reportPhotos.filter(Boolean)
    });
    setSubmittingReport(false);
    if (res.ok) {
      showToast('Event completion report saved successfully!');
      setReportModalEvt(null);
      loadEvents(false);
    } else {
      setError(res.data?.error || 'Failed to save report.');
    }
  };

  const handleDownloadPdfReport = async () => {
    if (!reportModalEvt) return;
    try {
      setGeneratingPdf(true);
      const reportData = reportModalEvt.completion_report || {
        overview: reportOverview,
        photos: reportPhotos.filter(Boolean),
        submitted_by: 'Master Admin',
        metrics: {
          total_registered: reportModalEvt.registered_count || 0,
          checked_in: reportModalEvt.registered_count || 0,
          checked_out: reportModalEvt.registered_count || 0
        }
      };
      const doc = await generateEventReportPdf({ event: reportModalEvt, report: reportData });
      doc.save(`TNV_Report_${reportModalEvt.id}.pdf`);
      showToast('Report PDF downloaded!');
    } catch (err) {
      setError('Failed to generate PDF: ' + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Quick Status Transition
  const handleStatusChange = async (id, nextStatus) => {
    setUpdatingStatusId(id);
    const res = await updateEventStatus(id, nextStatus);
    setUpdatingStatusId(null);
    if (res.ok) {
      showToast(`Event status updated to "${nextStatus}".`);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status: nextStatus } : e));
      if (statusFilter !== 'all' && statusFilter.toLowerCase() !== nextStatus.toLowerCase()) {
        setStatusFilter('all');
      }
    } else {
      setError(res.data?.error || 'Failed to update event status.');
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteEvent(deleteId);
    setDeleting(false);
    if (res.ok) {
      showToast('Event removed successfully.');
      setEvents(prev => prev.filter(e => e.id !== deleteId));
      setDeleteId(null);
    } else {
      setError(res.data?.error || 'Failed to delete event.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 text-xs">Dismiss</button>
        </div>
      )}

      {/* Top Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-green-tint shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-full bg-brand-green-tint px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-green-dark">
              Lifecycle Coordination
            </span>
            <span className="text-xs text-neutral-muted">• 38 Districts & State Secretariat</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-neutral-ink mt-1">
            TNV Event Management Workbench
          </h2>
          <p className="text-xs sm:text-sm text-neutral-muted mt-0.5">
            Coordinate public drives, volunteer rallies, workshops, and monitor lifecycle transitions from Draft to Completion.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold shadow-sm shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Create New Event
        </button>
      </div>

      {/* Status Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'All Events', count: metrics.total, key: 'all', color: 'border-brand-green-tint bg-white text-neutral-ink' },
          { label: 'Pending Approval', count: metrics.pending, key: 'Pending Approval', color: 'border-amber-300 bg-amber-50 text-amber-900', pulse: metrics.pending > 0 },
          { label: 'Ongoing', count: metrics.ongoing, key: 'Ongoing', color: 'border-emerald-200 bg-emerald-50 text-emerald-900', pulse: true },
          { label: 'Published', count: metrics.published, key: 'Published', color: 'border-blue-200 bg-blue-50 text-blue-900' },
          { label: 'Drafts', count: metrics.draft, key: 'Draft', color: 'border-neutral-muted/20 bg-neutral-50 text-neutral-800' },
          { label: 'Completed', count: metrics.completed, key: 'Completed', color: 'border-purple-200 bg-purple-50 text-purple-900' },
          { label: 'Cancelled', count: metrics.cancelled, key: 'Cancelled', color: 'border-red-200 bg-red-50 text-red-900' }
        ].map(m => (
          <button
            key={m.key}
            onClick={() => setStatusFilter(m.key)}
            className={`p-3.5 rounded-xl border text-left transition-all ${m.color} ${
              statusFilter.toLowerCase() === m.key.toLowerCase() ? 'ring-2 ring-brand-green shadow-sm' : 'hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-muted">{m.label}</span>
              {m.pulse && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />}
            </div>
            <p className="text-2xl font-bold font-display mt-1">{m.count}</p>
          </button>
        ))}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-brand-green-tint shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search events by title, district, venue, or agenda..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-muted/30 pl-9 pr-4 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <svg className="w-4 h-4 text-neutral-muted absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm text-neutral-ink focus:border-brand-green focus:outline-none"
        >
          <option value="all">All Statuses ({metrics.total})</option>
          <option value="Pending Approval">Pending Approval ({metrics.pending})</option>
          <option value="Ongoing">Ongoing ({metrics.ongoing})</option>
          <option value="Published">Published ({metrics.published})</option>
          <option value="Draft">Drafts ({metrics.draft})</option>
          <option value="Completed">Completed ({metrics.completed})</option>
          <option value="Cancelled">Cancelled ({metrics.cancelled})</option>
        </select>

        {/* District Dropdown */}
        <select
          value={districtFilter}
          onChange={e => setDistrictFilter(e.target.value)}
          className="rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm text-neutral-ink focus:border-brand-green focus:outline-none"
        >
          {TN_DISTRICTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Wing Dropdown */}
        <select
          value={wingFilter}
          onChange={e => setWingFilter(e.target.value)}
          className="rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm text-neutral-ink focus:border-brand-green focus:outline-none"
        >
          {WINGS.map(w => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>

        {(statusFilter !== 'all' || districtFilter !== 'all' || wingFilter !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setDistrictFilter('all');
              setWingFilter('all');
              setSearchQuery('');
            }}
            className="px-3 py-2 text-xs font-semibold text-brand-green hover:underline shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Events Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-brand-green-tint p-12 text-center">
          <Spinner className="mx-auto h-8 w-8 text-brand-green" />
          <p className="mt-3 text-sm text-neutral-muted">Loading TNV events repository...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-green-tint p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-green-tint text-brand-green mx-auto flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-bold text-neutral-ink text-base font-display">No Events Found</h3>
          <p className="text-xs text-neutral-muted mt-1 max-w-sm mx-auto">
            No events match your current filter settings. Adjust your filters or click "Create New Event" to publish a new one.
          </p>
          <button
            onClick={handleOpenCreate}
            className="btn-primary mt-4 px-4 py-2 text-xs font-semibold"
          >
            Create Event
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-neutral-muted px-1">
            Showing {filteredEvents.length} of {events.length} total events
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredEvents.map(evt => {
              const badge = STATUS_BADGES[evt.status] || STATUS_BADGES.Draft;
              const isUpdatingThis = updatingStatusId === evt.id;

              return (
                <div
                  key={evt.id}
                  className="bg-white rounded-2xl border border-brand-green-tint p-5 shadow-xs hover:shadow-sm transition-all flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between"
                >
                  {/* Left Column: Event Details */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        {evt.status}
                      </span>

                      {/* Timing: Upcoming until the event date, then Live */}
                      {['upcoming', 'live'].includes(eventPhase(evt)) && (evt.status === 'Published' || evt.status === 'Ongoing') && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${PHASE_BADGES[eventPhase(evt)].bg} ${PHASE_BADGES[eventPhase(evt)].text} ${PHASE_BADGES[eventPhase(evt)].border}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${PHASE_BADGES[eventPhase(evt)].dot}`} />
                          {PHASE_BADGES[eventPhase(evt)].label}
                        </span>
                      )}

                      {/* District Pill */}
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700">
                        📍 {evt.district}
                      </span>

                      {/* Wing / Department Pill */}
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-brand-green-tint text-brand-green-dark">
                        🏛️ {evt.department || evt.wing}
                      </span>

                      <span className="text-xs text-neutral-muted font-mono">
                        {evt.id}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      {(evt.image_url || evt.banner_url) && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-neutral-200 hidden sm:block">
                          <img src={evt.image_url || evt.banner_url} alt={evt.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <h3 className={`text-base sm:text-lg font-bold font-display leading-snug ${
                          evt.status === 'Completed' ? 'line-through text-neutral-500' : 'text-neutral-ink'
                        }`}>
                          {evt.title}
                        </h3>

                        {evt.description && (
                          <p className="text-xs sm:text-sm text-neutral-muted line-clamp-2 leading-relaxed mt-0.5">
                            {evt.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metadata strip */}
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-neutral-muted pt-1">
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {evt.start_date} {evt.end_date && evt.end_date !== evt.start_date ? `to ${evt.end_date}` : ''}
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {evt.start_time} - {evt.end_time}
                      </span>

                      <span className="inline-flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {evt.venue}
                      </span>

                      {evt.location_url && (
                        <a
                          href={evt.location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand-green hover:underline font-semibold"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Map View
                        </a>
                      )}

                      <span className="inline-flex items-center gap-1 font-semibold text-brand-green-dark">
                        👥 {evt.registered_count || 0} / {evt.capacity == null ? 'Unlimited' : evt.capacity} Registered
                      </span>
                    </div>

                    {/* Organisers Line: strictly Name, role in the event, phone number */}
                    {Array.isArray(evt.organisers) && evt.organisers.length > 0 && (
                      <div className="text-xs text-neutral-600 pt-0.5">
                        <span className="font-bold text-neutral-700">Organisers: </span>
                        {evt.organisers.map((org, i) => (
                          <span key={i} className="inline-block mr-2">
                            {org.name}{org.designation ? `, ${org.designation}` : ''}{org.phone ? `, ${org.phone}` : ''}{i < evt.organisers.length - 1 ? ' • ' : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Special Guests highlight */}
                    {Array.isArray(evt.guests) && evt.guests.some(g => g.name) && (
                      <div className="text-xs text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block mt-0.5">
                        <span className="font-bold">🌟 Special Guests: </span>
                        {evt.guests.filter(g => g.name).map((g, i, arr) => (
                          <span key={i} className="font-medium">
                            {g.name} ({g.designation || 'Honored Guest'}{g.organization ? `, ${g.organization}` : ''}){i < arr.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Member Proposal Banner */}
                    {evt.status === 'Pending Approval' && (
                      <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="text-xs text-amber-900">
                          <span className="font-bold">Event Proposal submitted by: </span>
                          <span className="font-semibold">{evt.created_by_name || 'Registered Member'}</span>
                          {evt.created_by_email && <span className="text-amber-800"> ({evt.created_by_email})</span>}
                          <p className="text-[0.6875rem] text-amber-700 mt-0.5">
                            Approving publishes the event to the public landing page and generates scanner credentials for organizers.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={reviewingId === evt.id}
                            onClick={() => handleApproveProposal(evt)}
                            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs inline-flex items-center gap-1 transition-all"
                          >
                            {reviewingId === evt.id ? <Spinner className="w-3 h-3" /> : '✓'} Approve & Publish
                          </button>
                          <button
                            type="button"
                            disabled={reviewingId === evt.id}
                            onClick={() => {
                              setRejectModalEvt(evt);
                              setRejectReason('');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rejection notice banner */}
                    {evt.status === 'Rejected' && evt.rejection_reason && (
                      <div className="mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                        <span className="font-bold">Rejection Reason: </span> {evt.rejection_reason}
                      </div>
                    )}

                    {/* Scanner Desk & Checkout strip for Published/Ongoing */}
                    {(evt.status === 'Published' || evt.status === 'Ongoing') && evt.scanner_username && (
                      <div className="mt-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="font-bold text-neutral-700">📱 QR Scanner:</span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-neutral-200 text-neutral-800">
                            User: <strong>{evt.scanner_username}</strong>
                          </span>
                          <span className="font-mono bg-white px-2 py-0.5 rounded border border-neutral-200 text-neutral-800">
                            Pass: <strong>{evt.scanner_password}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`Event: ${evt.title}\nScanner User: ${evt.scanner_username}\nScanner Pass: ${evt.scanner_password}`);
                              showToast('Scanner credentials copied!');
                            }}
                            className="text-[0.6875rem] font-bold text-brand-green hover:underline ml-1"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCheckout(evt)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                              evt.is_checkout_open
                                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200'
                            }`}
                            title="When open, attendees can check out with rating & feedback to get certificate"
                          >
                            {evt.is_checkout_open ? '🔓 Checkout Open' : '🔒 Open Checkout'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Lifecycle Actions & Controls */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100 w-full lg:w-auto">
                    {/* Lifecycle Status Quick Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[0.6875rem] font-bold text-neutral-muted uppercase tracking-wider block sm:inline">
                        Transition:
                      </span>

                      {evt.status === 'Draft' && (
                        <button
                          disabled={isUpdatingThis}
                          onClick={() => handleStatusChange(evt.id, 'Published')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-all"
                        >
                          Publish Event
                        </button>
                      )}

                      {evt.status === 'Published' && (
                        <button
                          disabled={isUpdatingThis}
                          onClick={() => handleStatusChange(evt.id, 'Ongoing')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all"
                        >
                          Start Drive (Ongoing)
                        </button>
                      )}

                      {evt.status === 'Ongoing' && (
                        <button
                          disabled={isUpdatingThis}
                          onClick={() => handleStatusChange(evt.id, 'Completed')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-xs transition-all"
                        >
                          Mark Completed
                        </button>
                      )}

                      {evt.status === 'Completed' && (
                        <>
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Completed
                          </span>
                          <button
                            disabled={isUpdatingThis}
                            onClick={() => handleStatusChange(evt.id, 'Ongoing')}
                            className="px-2 py-1 text-xs font-medium rounded-lg text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-all"
                          >
                            Reopen Drive
                          </button>
                        </>
                      )}

                      {evt.status !== 'Cancelled' && evt.status !== 'Completed' && (
                        <button
                          disabled={isUpdatingThis}
                          onClick={() => handleStatusChange(evt.id, 'Cancelled')}
                          className="px-2 py-1 text-xs font-medium rounded-lg text-red-700 hover:bg-red-50 border border-red-200 transition-all"
                        >
                          Cancel
                        </button>
                      )}

                      {evt.status === 'Cancelled' && (
                        <button
                          disabled={isUpdatingThis}
                          onClick={() => handleStatusChange(evt.id, 'Draft')}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg text-neutral-700 hover:bg-neutral-100 border border-neutral-200 transition-all"
                        >
                          Reset to Draft
                        </button>
                      )}

                      {/* Dropdown for arbitrary status override */}
                      <select
                        disabled={isUpdatingThis}
                        value={evt.status}
                        onChange={e => handleStatusChange(evt.id, e.target.value)}
                        className="rounded-lg border border-neutral-muted/30 px-2 py-1 text-xs text-neutral-ink bg-white focus:outline-none"
                      >
                        {EVENT_STATUSES.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    {/* Secondary Management Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleOpenRoster(evt)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all inline-flex items-center gap-1 shadow-xs"
                        title="View Registered Volunteers & Tickets"
                      >
                        👥 Volunteers ({evt.registered_count || 0})
                      </button>

                      <button
                        onClick={() => handleOpenReport(evt)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-all inline-flex items-center gap-1 shadow-xs"
                        title="View or upload 4-photo completion report and generate PDF"
                      >
                        📄 Report {evt.completion_report ? '✓' : ''}
                      </button>

                      <button
                        onClick={() => handleOpenEdit(evt)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-all"
                      >
                        Edit Details
                      </button>

                      <button
                        onClick={() => setDeleteId(evt.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 transition-all"
                        title="Delete Event"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-brand-green-tint my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 shrink-0 bg-white">
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-display text-neutral-ink">
                  {editingId ? 'Edit Event Details' : 'Create New Civic Event'}
                </h3>
                <p className="text-xs text-neutral-muted mt-0.5">
                  Set event specifics, native district jurisdiction, and initial lifecycle status.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-2xl font-bold leading-none p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Form (Body scrolls, Footer stays visible) */}
            <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
                {modalError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
                    {modalError}
                  </div>
                )}

                {/* Event Picture / Banner URL */}
                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Event Banner / Picture URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or hosted image URL"
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                  />
                  {formData.image_url && (
                    <div className="mt-2 h-32 w-full rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center">
                      <img
                        src={formData.image_url}
                        alt="Event Banner Preview"
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  <p className="text-[0.6875rem] text-neutral-muted mt-1">
                    Displayed at the top of the event card and modal on the public landing page.
                  </p>
                </div>

                {/* Event Title */}
                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pasumai Tamil Nadu Tree Plantation Drive"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>

                {/* Category & Department Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Event Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    >
                      {CATEGORIES.filter(c => c !== 'All Categories').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      TNV Department
                    </label>
                    <select
                      value={formData.department}
                      onChange={e => setFormData({ ...formData, department: e.target.value, wing: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    >
                      {DEPARTMENTS.filter(d => d !== 'All Departments').map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description / Agenda */}
                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Description & Volunteer Agenda
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detail the operational plan, volunteer tasks, gathering guidelines..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>

                {/* District & Venue Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Native District
                    </label>
                    <select
                      value={formData.district}
                      onChange={e => setFormData({ ...formData, district: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    >
                      {TN_DISTRICTS.filter(d => d !== 'All Districts').map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                      <option value="Statewide">Statewide / All Districts</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Specific Venue / Location Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Marina Beach Gathering Point, Chennai"
                      value={formData.venue}
                      onChange={e => setFormData({ ...formData, venue: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    >
                    </input>
                  </div>
                </div>

                {/* Location Link (Google Maps) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Location Link (Google Maps)
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/?q=..."
                    value={formData.location_url}
                    onChange={e => setFormData({ ...formData, location_url: e.target.value })}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                  />
                  <p className="text-[0.6875rem] text-neutral-muted mt-1">Direct map navigation link shown to registered volunteers and attendees.</p>
                </div>

                {/* Dates & Times Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-2 py-1.5 text-xs focus:border-brand-green focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-2 py-1.5 text-xs focus:border-brand-green focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.start_time}
                      onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-2 py-1.5 text-xs focus:border-brand-green focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-2 py-1.5 text-xs focus:border-brand-green focus:outline-none"
                    />
                  </div>
                </div>

                {/* Capacity & Initial Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Volunteer Target / Capacity
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Leave blank for unlimited"
                      value={formData.capacity}
                      onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    />
                    <p className="mt-1 text-[0.6875rem] text-neutral-muted">Leave blank to allow unlimited volunteers.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Lifecycle Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    >
                      {EVENT_STATUSES.map(st => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Organisers Section (Min 2 required) */}
                <div className="space-y-3 pt-2 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-neutral-ink">
                        Event Organisers (Min. 2 required) <span className="text-red-500">*</span>
                      </label>
                      <p className="text-[0.6875rem] text-neutral-muted">
                        Format on landing page: <strong>Name, role in the event, phone number</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        organisers: [...formData.organisers, { name: '', designation: 'Co-Organiser', phone: '', email: '' }]
                      })}
                      className="text-xs font-bold text-brand-green hover:underline"
                    >
                      + Add Organiser
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.organisers.map((person, index) => (
                      <div key={index} className="p-3 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2">
                        <div className="flex items-center justify-between text-[0.6875rem] font-bold text-neutral-500">
                          <span>Organiser #{index + 1}</span>
                          {formData.organisers.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                organisers: formData.organisers.filter((_, i) => i !== index)
                              })}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Full Name *"
                            value={person.name}
                            onChange={e => {
                              const updated = [...formData.organisers];
                              updated[index].name = e.target.value;
                              setFormData({ ...formData, organisers: updated });
                            }}
                            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
                          />
                          <input
                            type="text"
                            placeholder="Role / Designation (e.g. Field Lead)"
                            value={person.designation}
                            onChange={e => {
                              const updated = [...formData.organisers];
                              updated[index].designation = e.target.value;
                              setFormData({ ...formData, organisers: updated });
                            }}
                            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
                          />
                          <input
                            type="tel"
                            placeholder="Phone Number *"
                            value={person.phone || ''}
                            onChange={e => {
                              const updated = [...formData.organisers];
                              updated[index].phone = e.target.value;
                              setFormData({ ...formData, organisers: updated });
                            }}
                            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Guests Section */}
                <div className="space-y-3 pt-2 border-t border-neutral-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-neutral-ink">
                        Special Guests & Dignitaries
                      </label>
                      <p className="text-[0.6875rem] text-neutral-muted">
                        Highlighted with Name, Designation, and Organization.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        guests: [...formData.guests, { name: '', designation: '', organization: '' }]
                      })}
                      className="text-xs font-bold text-brand-green hover:underline"
                    >
                      + Add Guest
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.guests.map((guest, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center bg-neutral-50/60 p-2.5 rounded-xl border border-neutral-200">
                        <input
                          type="text"
                          placeholder="Guest Name"
                          value={guest.name}
                          onChange={e => {
                            const updated = [...formData.guests];
                            updated[index].name = e.target.value;
                            setFormData({ ...formData, guests: updated });
                          }}
                          className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Designation (e.g. Chief Guest)"
                          value={guest.designation}
                          onChange={e => {
                            const updated = [...formData.guests];
                            updated[index].designation = e.target.value;
                            setFormData({ ...formData, guests: updated });
                          }}
                          className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Organization / Dept"
                            value={guest.organization}
                            onChange={e => {
                              const updated = [...formData.guests];
                              updated[index].organization = e.target.value;
                              setFormData({ ...formData, guests: updated });
                            }}
                            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs bg-white flex-1"
                          />
                          {formData.guests.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                guests: formData.guests.filter((_, i) => i !== index)
                              })}
                              className="text-red-500 font-bold px-1.5 hover:text-red-700"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary Contact Phone / WhatsApp */}
                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Lead Contact Phone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+91 94440 00000"
                    value={formData.organizer_contact}
                    onChange={e => setFormData({ ...formData, organizer_contact: e.target.value })}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                  />
                </div>
              </div>
              {/* Modal Footer (Fixed at bottom) */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 shrink-0 bg-neutral-50/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-200/70 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2 text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
                >
                  {submitting && <Spinner className="w-3.5 h-3.5" />}
                  {editingId ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-red-200 text-center my-auto">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h4 className="font-bold text-neutral-ink text-base font-display">Delete Event?</h4>
            <p className="text-xs text-neutral-muted mt-1">
              Are you sure you want to remove this event from the system? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1.5"
              >
                {deleting && <Spinner className="w-3.5 h-3.5" />}
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOLUNTEERS ROSTER MODAL */}
      {rosterEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-brand-green-tint my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-start justify-between border-b border-neutral-100 px-6 py-4 shrink-0 bg-white">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
                  Volunteer Coordination Roster
                </span>
                <h3 className="text-lg sm:text-xl font-bold font-display text-neutral-ink mt-0.5">
                  {rosterEvent.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-neutral-muted">
                  <span>📍 {rosterEvent.district}</span>
                  <span>•</span>
                  <span>📅 {rosterEvent.start_date}</span>
                  <span>•</span>
                  <span className="font-semibold text-brand-green-dark">
                    {rosterParticipants.length} / {rosterEvent.capacity == null ? 'Unlimited' : rosterEvent.capacity} Registered
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRosterEvent(null)}
                className="text-neutral-400 hover:text-neutral-700 text-2xl font-bold leading-none p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {rosterError && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
                  {rosterError}
                </div>
              )}

              {loadingRoster ? (
                <div className="py-12 text-center">
                  <Spinner className="mx-auto h-6 w-6 text-brand-green" />
                  <p className="mt-2 text-xs text-neutral-muted">Loading volunteer roster...</p>
                </div>
              ) : rosterParticipants.length === 0 ? (
                <div className="py-12 text-center bg-neutral-50 rounded-xl border border-neutral-200">
                  <p className="text-sm font-semibold text-neutral-700">No Volunteers Registered Yet</p>
                  <p className="text-xs text-neutral-muted mt-1 max-w-md mx-auto">
                    Once volunteers click "Volunteer Now" on their dashboard or the events page, their registrations will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Search volunteer by name, phone or email..."
                      value={rosterSearch}
                      onChange={e => setRosterSearch(e.target.value)}
                      className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 focus:border-brand-green focus:outline-none"
                    />
                  </div>

                  <div className="overflow-x-auto border border-neutral-100 rounded-xl max-h-80 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Volunteer</th>
                          <th className="py-2.5 px-3">Contact</th>
                          <th className="py-2.5 px-3">District & Wing</th>
                          <th className="py-2.5 px-3">Registered At</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {rosterParticipants
                          .filter(p => {
                            if (!rosterSearch.trim()) return true;
                            const q = rosterSearch.toLowerCase();
                            return (
                              (p.volunteer_name && p.volunteer_name.toLowerCase().includes(q)) ||
                              (p.volunteer_email && p.volunteer_email.toLowerCase().includes(q)) ||
                              (p.volunteer_phone && p.volunteer_phone.includes(q))
                            );
                          })
                          .map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-neutral-50/50">
                              <td className="py-2.5 px-3 font-semibold text-neutral-ink">
                                {p.volunteer_name}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-600">
                                <div>{p.volunteer_phone || '—'}</div>
                                <div className="text-[0.6875rem] text-neutral-400">{p.volunteer_email || '—'}</div>
                              </td>
                              <td className="py-2.5 px-3 text-neutral-600">
                                <div>{p.district || '—'}</div>
                                <div className="text-[0.6875rem] text-brand-green-dark">{p.wing || '—'}</div>
                              </td>
                              <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                                {p.registered_at ? new Date(p.registered_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-bold bg-emerald-100 text-emerald-800">
                                  {p.status || 'REGISTERED'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                {rosterAttendance[p.user_id] ? (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.625rem] font-bold ${rosterAttendance[p.user_id] === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {rosterAttendance[p.user_id] === 'present' ? 'Present' : 'Absent'}
                                  </span>
                                ) : (
                                  <span className="text-[0.6875rem] text-neutral-400">Not marked</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Fixed at bottom) */}
            <div className="border-t border-neutral-100 px-6 py-3.5 flex justify-end shrink-0 bg-neutral-50/80">
              <button
                onClick={() => setRosterEvent(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT PROPOSAL MODAL */}
      {rejectModalEvt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 my-auto">
            <h4 className="font-bold text-neutral-ink text-base font-display">Reject Event Proposal</h4>
            <p className="text-xs text-neutral-muted mt-1">
              Rejecting "<strong>{rejectModalEvt.title}</strong>". Please provide the reason below; this explanation will be emailed to the submitting member ({rejectModalEvt.created_by_email || 'member'}).
            </p>
            <form onSubmit={handleRejectProposal} className="mt-4 space-y-3">
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete venue permissions, schedule overlap with state drive..."
                className="w-full text-xs rounded-xl border border-neutral-300 p-3 focus:border-red-500 focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalEvt(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewingId === rejectModalEvt.id}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1.5 shadow-xs"
                >
                  {reviewingId === rejectModalEvt.id && <Spinner className="w-3.5 h-3.5" />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPROVED SCANNER CREDS MODAL */}
      {approvedCredsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-200 text-center my-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3 text-xl font-bold">
              ✓
            </div>
            <h4 className="font-bold text-neutral-ink text-base font-display">Event Approved & Published!</h4>
            <p className="text-xs text-neutral-muted mt-1">
              "<strong>{approvedCredsModal.title}</strong>" is now live on the public landing page.
            </p>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 text-left my-4 space-y-2">
              <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-800">
                Organizer QR Scanner Credentials
              </div>
              <div className="text-xs text-emerald-950 font-mono space-y-1">
                <div>Username: <strong className="bg-white px-2 py-0.5 rounded border border-emerald-300">{approvedCredsModal.scanner_username}</strong></div>
                <div>Password: <strong className="bg-white px-2 py-0.5 rounded border border-emerald-300">{approvedCredsModal.scanner_password}</strong></div>
              </div>
              <p className="text-[0.6875rem] text-emerald-700 pt-1">
                These credentials were automatically emailed to all appointed organizers for attendee QR check-in on drive day.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`Event: ${approvedCredsModal.title}\nScanner User: ${approvedCredsModal.scanner_username}\nScanner Pass: ${approvedCredsModal.scanner_password}`);
                  showToast('Credentials copied to clipboard!');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
              >
                Copy Credentials
              </button>
              <button
                type="button"
                onClick={() => setApprovedCredsModal(null)}
                className="btn-primary px-5 py-2 text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETION REPORT & PDF MODAL */}
      {reportModalEvt && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-indigo-200 my-auto max-h-[92vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 shrink-0 bg-white">
              <div>
                <h3 className="text-lg font-bold font-display text-neutral-ink">
                  Event Completion Report & PDF
                </h3>
                <p className="text-xs text-neutral-muted mt-0.5">
                  {reportModalEvt.title} • 4 event photographs, overview & attendees roster
                </p>
              </div>
              <button
                onClick={() => setReportModalEvt(null)}
                className="text-neutral-400 hover:text-neutral-700 text-2xl font-bold leading-none p-1.5 rounded-lg hover:bg-neutral-100"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-neutral-ink mb-1">
                  Complete Event Overview (Start to End) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={reportOverview}
                  onChange={e => setReportOverview(e.target.value)}
                  placeholder="Document the highlights, community turnout, activities completed, key impact metrics..."
                  className="w-full text-xs rounded-xl border border-neutral-300 p-3 focus:border-brand-green focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-ink mb-1">
                  4 Event Photographs (URLs or Data URIs)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map(idx => (
                    <div key={idx} className="space-y-1.5">
                      <input
                        type="text"
                        placeholder={`Photo #${idx + 1} Image URL`}
                        value={reportPhotos[idx] || ''}
                        onChange={e => {
                          const next = [...reportPhotos];
                          next[idx] = e.target.value;
                          setReportPhotos(next);
                        }}
                        className="w-full text-xs rounded-lg border border-neutral-300 px-3 py-1.5 focus:border-brand-green focus:outline-none"
                      />
                      {reportPhotos[idx] && (
                        <div className="h-24 w-full rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center">
                          <img
                            src={reportPhotos[idx]}
                            alt={`Photo ${idx + 1}`}
                            className="h-full w-full object-cover"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-neutral-50/80 shrink-0">
              <button
                type="button"
                disabled={generatingPdf}
                onClick={handleDownloadPdfReport}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1.5 shadow-xs"
              >
                {generatingPdf ? <Spinner className="w-3.5 h-3.5" /> : '📥'} Download Single PDF Report
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReportModalEvt(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-200/70"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={submittingReport}
                  onClick={handleSaveReport}
                  className="btn-primary px-5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  {submittingReport && <Spinner className="w-3.5 h-3.5" />} Save Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
