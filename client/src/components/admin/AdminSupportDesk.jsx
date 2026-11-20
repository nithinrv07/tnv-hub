import { useState, useEffect, useMemo, useCallback } from 'react';
import Spinner from '../Spinner.jsx';
import { getAdminSupportTickets, replyAdminSupportTicket } from '../../lib/supportService.js';
import { portfolioPath } from '../../lib/portfolio.js';

export default function AdminSupportDesk() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tickets, setTickets] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, new: 0, in_progress: 0, resolved: 0 });
  const [toastNotice, setToastNotice] = useState('');

  // Segregated Views: 'visitors' | 'members'
  const [activeTab, setActiveTab] = useState('visitors');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Review & Reply Modal State
  const [activeTicket, setActiveTicket] = useState(null);
  const [modalStatus, setModalStatus] = useState('resolved');
  const [adminReplyText, setAdminReplyText] = useState('');
  const [sendEmailCheckbox, setSendEmailCheckbox] = useState(true);
  const [savingReply, setSavingReply] = useState(false);
  const [replySuccessMsg, setReplySuccessMsg] = useState('');
  const [replyErrorMsg, setReplyErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await getAdminSupportTickets();
    setLoading(false);
    if (!res.ok) {
      setError(res.error || 'Failed to load support tickets.');
      return;
    }
    setTickets(res.items || []);
    setMetrics(res.metrics || { total: 0, new: 0, in_progress: 0, resolved: 0 });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openReviewModal = (ticket) => {
    setActiveTicket(ticket);
    setModalStatus(ticket.status === 'new' ? 'resolved' : ticket.status);
    setAdminReplyText(ticket.admin_reply || '');
    setSendEmailCheckbox(true);
    setReplySuccessMsg('');
    setReplyErrorMsg('');
  };

  const closeReviewModal = () => {
    setActiveTicket(null);
    setReplySuccessMsg('');
    setReplyErrorMsg('');
  };

  const handleSaveReply = async (sendEmail = false) => {
    if (!activeTicket) return;
    setSavingReply(true);
    setReplyErrorMsg('');

    const res = await replyAdminSupportTicket({
      id: activeTicket.id,
      ticket_number: activeTicket.ticket_number,
      status: modalStatus,
      admin_reply: adminReplyText.trim(),
      send_email: sendEmail
    });
    setSavingReply(false);

    if (!res.ok) {
      setReplyErrorMsg(res.error || 'Failed to update ticket.');
      return;
    }

    const ticketCode = activeTicket.ticket_number;
    const isVisitor = activeTicket.type === 'visitor_query';

    // Requirement: clicking submit on any panel should close that panel immediately
    closeReviewModal();

    setToastNotice(
      sendEmail && isVisitor
        ? `Official reply saved and email dispatched to visitor (${activeTicket.email})!`
        : `Ticket ${ticketCode} updated to ${modalStatus}.`
    );

    // Refresh tickets in background
    loadData();
    setTimeout(() => {
      setToastNotice('');
    }, 4500);
  };

  // Segregated list filtering
  const visitorTickets = useMemo(() => tickets.filter(t => t.type === 'visitor_query'), [tickets]);
  const memberComplaints = useMemo(() => tickets.filter(t => t.type === 'member_complaint'), [tickets]);

  const displayedTickets = useMemo(() => {
    const baseList = activeTab === 'visitors' ? visitorTickets : memberComplaints;
    return baseList.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = (t.name || '').toLowerCase().includes(q);
        const matchCode = (t.ticket_number || '').toLowerCase().includes(q);
        const matchPhone = (t.mobile || '').includes(q);
        const matchSubj = (t.subject || '').toLowerCase().includes(q);
        const matchDistrict = (t.member_district || '').toLowerCase().includes(q);
        return matchName || matchCode || matchPhone || matchSubj || matchDistrict;
      }
      return true;
    });
  }, [activeTab, visitorTickets, memberComplaints, statusFilter, search]);

  const unresolvedCount = metrics.new + metrics.in_progress;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-display text-xs font-bold uppercase tracking-wider text-brand-green">
            Administrative Operations
          </span>
          <h1 className="mt-0.5 font-display text-2xl font-black text-brand-green-dark sm:text-3xl">
            Queries & Complaints Hub
          </h1>
          <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
            Triage visitor inquiries and manage registered volunteer field and technical grievances.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-700 shadow-xs hover:bg-neutral-50 disabled:opacity-50"
        >
          <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Desk</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      )}

      {toastNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-bold text-emerald-950 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice('')}
            className="text-emerald-700 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. FLOATING KPI METRIC CARDS ON TOP (Exactly as requested) */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {/* Total Queries & Complaints */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-neutral-500">
              Total Tickets
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-neutral-900">{metrics.total}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-medium text-neutral-400">
            <span>{visitorTickets.length} Visitor · {memberComplaints.length} Member</span>
          </div>
        </div>

        {/* New Queries / Complaints */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-amber-800">
              New / Pending
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-950">{metrics.new}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-medium text-amber-700">
            <span>Requires administrative triage</span>
          </div>
        </div>

        {/* In Progress / Active */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-sky-800">
              In Progress
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-sky-950">{metrics.in_progress}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-medium text-sky-700">
            <span>{unresolvedCount} total unresolved</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-xs transition-shadow hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-800">
              Resolved
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-950">{metrics.resolved}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-medium text-emerald-700">
            <span>Replies delivered</span>
          </div>
        </div>
      </div>

      {/* 2. SEGREGATED VIEWS & SEARCH FILTERS (Visitor Queries vs Member Complaints) */}
      <div className="rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col gap-4 border-b border-neutral-200/80 p-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Segregated Category Tabs */}
          <div className="flex rounded-xl bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('visitors')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'visitors'
                  ? 'bg-white text-brand-green-dark shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span>Visitor Queries</span>
              <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] ${
                activeTab === 'visitors' ? 'bg-brand-green-tint text-brand-green-dark font-extrabold' : 'bg-neutral-200 text-neutral-600'
              }`}>
                {visitorTickets.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'members'
                  ? 'bg-white text-brand-green-dark shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span>Member Complaints</span>
              <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] ${
                activeTab === 'members' ? 'bg-brand-green-tint text-brand-green-dark font-extrabold' : 'bg-neutral-200 text-neutral-600'
              }`}>
                {memberComplaints.length}
              </span>
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1 sm:w-64">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeTab === 'visitors' ? 'Search by name, phone, code...' : 'Search by name, TNV ID, district...'}
                className="w-full rounded-xl border border-neutral-300 bg-neutral-50/60 py-2 pl-9 pr-3 text-xs text-neutral-900 focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
              <svg className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-neutral-100 p-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'new', label: 'Pending' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'resolved', label: 'Resolved' }
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    statusFilter === f.id
                      ? 'bg-white text-brand-green-dark shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. TICKET TABLE (Segregated) */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-7 w-7 text-brand-green" />
          </div>
        ) : displayedTickets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-neutral-600">
              No {activeTab === 'visitors' ? 'visitor queries' : 'member complaints'} found.
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {search || statusFilter !== 'all' ? 'Try adjusting your search filters.' : 'All incoming submissions will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50/70 text-[0.6875rem] font-bold uppercase tracking-wider text-neutral-500">
                <tr>
                  <th className="px-5 py-3.5">Reference / Date</th>
                  <th className="px-5 py-3.5">
                    {activeTab === 'visitors' ? 'Visitor Contact' : 'Volunteer Identity'}
                  </th>
                  {activeTab === 'members' && <th className="px-5 py-3.5">Category</th>}
                  <th className="px-5 py-3.5">Subject & Message</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {displayedTickets.map((t) => {
                  const isResolved = t.status === 'resolved';
                  const isInProgress = t.status === 'in_progress';
                  const dateStr = t.created_at
                    ? new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '';

                  return (
                    <tr key={t.id || t.ticket_number} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Ticket Code & Date */}
                      <td className="px-5 py-4 align-top">
                        <span className="font-mono font-bold text-brand-green-dark">
                          {t.ticket_number}
                        </span>
                        <div className="mt-0.5 text-[0.6875rem] text-neutral-400">{dateStr}</div>
                      </td>

                      {/* Contact / Identity */}
                      <td className="px-5 py-4 align-top">
                        <div className="font-bold text-neutral-900">{t.name}</div>
                        <div className="text-[0.6875rem] text-neutral-500">{t.mobile}</div>
                        {activeTab === 'visitors' ? (
                          <div className="text-[0.6875rem] text-neutral-400">{t.email}</div>
                        ) : (
                          <div className="mt-1 flex flex-wrap gap-1 text-[0.6875rem]">
                            <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono font-semibold text-neutral-700">
                              {t.member_reg_id || 'ID Pending'}
                            </span>
                            {t.member_district && (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">
                                {t.member_district}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Category (Member Tab) */}
                      {activeTab === 'members' && (
                        <td className="px-5 py-4 align-top">
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wider ${
                            t.category === 'technical'
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}>
                            {t.category === 'technical' ? 'Technical Issue' : 'Work Grievance'}
                          </span>
                        </td>
                      )}

                      {/* Subject & Snippet */}
                      <td className="px-5 py-4 align-top max-w-xs sm:max-w-md">
                        <div className="font-bold text-neutral-900">{t.subject}</div>
                        <p className="mt-0.5 line-clamp-2 text-neutral-600">
                          {t.message}
                        </p>
                        {t.admin_reply && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[0.6875rem] text-emerald-700 font-medium">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Replied: {t.admin_reply.slice(0, 45)}...</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 align-top">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-bold ${
                          isResolved
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : isInProgress
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {isResolved ? 'Resolved' : isInProgress ? 'In Progress' : 'Pending'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => openReviewModal(t)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 font-bold text-neutral-700 shadow-xs hover:border-brand-green hover:bg-brand-green-tint/30 hover:text-brand-green-dark"
                        >
                          <span>{t.admin_reply ? 'Edit Reply' : 'Review & Reply'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. REVIEW & REPLY MODAL / DRAWER */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-2xl ring-1 ring-black/5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <span className="font-mono text-xs font-bold text-brand-green-dark">
                  {activeTicket.ticket_number}
                </span>
                <h3 className="font-display text-lg font-bold text-neutral-900">
                  {activeTicket.type === 'visitor_query' ? 'Visitor Enquiry Details' : 'Member Complaint Details'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {replySuccessMsg && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900">
                {replySuccessMsg}
              </div>
            )}
            {replyErrorMsg && (
              <div className="mt-4 rounded-xl bg-rose-50 p-4 text-xs font-bold text-rose-800 ring-1 ring-rose-200">
                {replyErrorMsg}
              </div>
            )}

            {/* Submitter Overview */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4 text-xs sm:grid-cols-3">
              <div>
                <span className="text-neutral-400 block text-[0.6875rem] font-bold uppercase">Submitter</span>
                <span className="font-bold text-neutral-900">{activeTicket.name}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[0.6875rem] font-bold uppercase">Mobile Number</span>
                <span className="font-bold text-neutral-900">{activeTicket.mobile}</span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[0.6875rem] font-bold uppercase">Email Address</span>
                <span className="font-medium text-neutral-900 break-all">{activeTicket.email || '—'}</span>
              </div>
              {activeTicket.type === 'member_complaint' && (
                <>
                  <div>
                    <span className="text-neutral-400 block text-[0.6875rem] font-bold uppercase">Member ID</span>
                    <span className="font-mono font-bold text-brand-green-dark">{activeTicket.member_reg_id || 'Applicant'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[0.6875rem] font-bold uppercase">District</span>
                    <span className="font-bold text-neutral-900">{activeTicket.member_district || '—'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[0.6875rem] font-bold uppercase">Category</span>
                    <span className="font-bold text-indigo-700 capitalize">{activeTicket.category?.replace('_', ' ')}</span>
                  </div>
                </>
              )}
            </div>

            {/* If Member Complaint: Button to View Member Portfolio */}
            {activeTicket.type === 'member_complaint' && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-green-tint bg-brand-green-tint/30 p-3">
                <div className="flex items-center gap-2 text-xs text-brand-green-dark">
                  <svg className="h-4 w-4 shrink-0 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <span>
                    Volunteer Profile: <strong>{activeTicket.name}</strong> ({activeTicket.member_reg_id || 'Applicant'})
                  </span>
                </div>
                {activeTicket.member_reg_id ? (
                  <a
                    href={portfolioPath(activeTicket.name, activeTicket.member_reg_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green-dark px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-green transition-colors"
                  >
                    <span>View Volunteer Portfolio</span>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : activeTicket.member_id ? (
                  <a
                    href={`/admin/applicants/${activeTicket.member_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-green-dark px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-green transition-colors"
                  >
                    <span>View Applicant Review File</span>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ) : null}
              </div>
            )}

            {/* Original Query Message */}
            <div className="mt-5 rounded-xl border border-neutral-200 p-4">
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-neutral-400">Subject</span>
              <h4 className="font-display text-base font-bold text-neutral-900">{activeTicket.subject}</h4>
              <span className="mt-3 block text-[0.6875rem] font-bold uppercase tracking-wider text-neutral-400">Message</span>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
                {activeTicket.message}
              </p>
            </div>

            {/* Status Selector & Admin Reply Composition */}
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Update Status
                </label>
                <div className="flex gap-2">
                  {['new', 'in_progress', 'resolved'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setModalStatus(st)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-xs font-bold capitalize transition-all ${
                        modalStatus === st
                          ? st === 'resolved'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                            : st === 'in_progress'
                            ? 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-500'
                            : 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                          : 'border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      {st === 'in_progress' ? 'In Progress' : st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="admin-reply-box" className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Official Admin Reply / Resolution
                </label>
                <textarea
                  id="admin-reply-box"
                  rows={4}
                  value={adminReplyText}
                  onChange={(e) => setAdminReplyText(e.target.value)}
                  placeholder="Type your official answer or resolution here. This will be published to the submitter..."
                  className="w-full rounded-xl border border-neutral-300 p-3.5 text-sm text-neutral-900 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
              </div>

              {/* Visitor Email Checkbox if applicable */}
              {activeTicket.type === 'visitor_query' && (
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-700">
                  <input
                    type="checkbox"
                    checked={sendEmailCheckbox}
                    onChange={(e) => setSendEmailCheckbox(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-brand-green focus:ring-brand-green"
                  />
                  <span>Dispatch official notification email to {activeTicket.email}</span>
                </label>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-neutral-100 pt-4">
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded-full px-5 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleSaveReply(false)}
                disabled={savingReply}
                className="rounded-full border border-neutral-300 bg-white px-5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
              >
                Save Status / Notes Only
              </button>

              <button
                type="button"
                onClick={() => handleSaveReply(activeTicket.type === 'visitor_query' && sendEmailCheckbox)}
                disabled={savingReply}
                className="inline-flex min-h-tap items-center gap-2 rounded-full bg-brand-green-dark px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-green disabled:opacity-50"
              >
                {savingReply ? (
                  <>
                    <Spinner className="h-3.5 w-3.5 text-white" />
                    <span>Saving...</span>
                  </>
                ) : activeTicket.type === 'visitor_query' && sendEmailCheckbox ? (
                  <span>Send Reply Email & Resolve</span>
                ) : (
                  <span>Publish Resolution</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
