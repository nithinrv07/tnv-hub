import { useState, useEffect, useMemo } from 'react';
import {
  getEvents,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  EVENT_STATUSES,
  STATUS_BADGES
} from '../../lib/eventService.js';
import Spinner from '../Spinner.jsx';

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

const WINGS = [
  'All Wings',
  'Youth Wing',
  'Women Wing',
  'Students Wing',
  'Social Action Wing'
];

const INITIAL_FORM = {
  title: '',
  description: '',
  district: 'Chennai',
  venue: '',
  wing: 'Youth Wing',
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date().toISOString().split('T')[0],
  start_time: '09:00',
  end_time: '17:00',
  capacity: 100,
  status: 'Draft',
  organizer_name: '',
  organizer_contact: '',
  tags: ''
};

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

  // Sync initialStatusFilter if prop changes
  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Load events
  const loadEvents = async () => {
    setLoading(true);
    setError('');
    const res = await getEvents();
    setLoading(false);
    if (res.ok && Array.isArray(res.data?.events)) {
      setEvents(res.data.events);
    } else {
      setError(res.data?.error || 'Unable to load events. Please refresh.');
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = events.length;
    const published = events.filter(e => e.status === 'Published').length;
    const ongoing = events.filter(e => e.status === 'Ongoing').length;
    const draft = events.filter(e => e.status === 'Draft').length;
    const completed = events.filter(e => e.status === 'Completed').length;
    const cancelled = events.filter(e => e.status === 'Cancelled').length;
    const totalVolunteers = events.reduce((sum, e) => sum + (e.registered_count || 0), 0);
    return { total, published, ongoing, draft, completed, cancelled, totalVolunteers };
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
      description: evt.description || '',
      district: evt.district || 'Chennai',
      venue: evt.venue || '',
      wing: evt.wing || 'Youth Wing',
      start_date: evt.start_date || '',
      end_date: evt.end_date || evt.start_date || '',
      start_time: evt.start_time || '09:00',
      end_time: evt.end_time || '17:00',
      capacity: evt.capacity || 100,
      status: evt.status || 'Draft',
      organizer_name: evt.organizer_name || '',
      organizer_contact: evt.organizer_contact || '',
      tags: Array.isArray(evt.tags) ? evt.tags.join(', ') : (evt.tags || '')
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

    setSubmitting(true);
    setModalError('');

    const payload = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      venue: formData.venue.trim() || 'TNV Central Hall',
      capacity: parseInt(formData.capacity, 10) || 100,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
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
      showToast(editingId ? 'Event updated successfully.' : 'New event created successfully.');
      loadEvents();
    } else {
      setModalError(res.data?.error || 'Failed to save event. Please check inputs.');
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'All Events', count: metrics.total, key: 'all', color: 'border-brand-green-tint bg-white text-neutral-ink' },
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

                      {/* District Pill */}
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700">
                        📍 {evt.district}
                      </span>

                      {/* Wing Pill */}
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-medium bg-brand-green-tint text-brand-green-dark">
                        🏛️ {evt.wing}
                      </span>

                      <span className="text-xs text-neutral-muted font-mono">
                        {evt.id}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-neutral-ink font-display leading-snug">
                      {evt.title}
                    </h3>

                    {evt.description && (
                      <p className="text-xs sm:text-sm text-neutral-muted line-clamp-2 leading-relaxed">
                        {evt.description}
                      </p>
                    )}

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

                      <span className="inline-flex items-center gap-1 font-semibold text-brand-green-dark">
                        👥 {evt.registered_count || 0} / {evt.capacity} Volunteers Registered
                      </span>

                      {evt.organizer_name && (
                        <span className="text-neutral-500">
                          Lead: {evt.organizer_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Lifecycle Actions & Controls */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100 w-full lg:w-auto">
                    {/* Lifecycle Status Quick Buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-neutral-muted uppercase tracking-wider block sm:inline">
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

                      {evt.status !== 'Cancelled' && (
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
                    <div className="flex items-center gap-2">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-brand-green-tint my-8">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-xl font-bold font-display text-neutral-ink">
                  {editingId ? 'Edit Event Details' : 'Create New Civic Event'}
                </h3>
                <p className="text-xs text-neutral-muted mt-0.5">
                  Set event specifics, native district jurisdiction, and initial lifecycle status.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-xl font-bold leading-none p-1"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="mt-5 space-y-4">
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

              {/* District & Wing Row */}
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
                    TNV Wing / Department
                  </label>
                  <select
                    value={formData.wing}
                    onChange={e => setFormData({ ...formData, wing: e.target.value })}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                  >
                    {WINGS.filter(w => w !== 'All Wings').map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                    <option value="All Wings">All Wings Combined</option>
                  </select>
                </div>
              </div>

              {/* Venue */}
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
                />
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
                    placeholder="100"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                  />
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

              {/* Organizer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Organizer / Lead Coordinator
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. District Coordinator S. Muthu"
                    value={formData.organizer_name}
                    onChange={e => setFormData({ ...formData, organizer_name: e.target.value })}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Contact Phone / WhatsApp
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

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-neutral-ink mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tree Plantation, Environmental, Coastal Relief"
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-100"
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
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-red-200 text-center">
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
    </div>
  );
}
