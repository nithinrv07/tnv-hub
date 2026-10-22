import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getQueue, getFollowups } from '../lib/adminService.js';
import { getCurrentUser } from '../lib/authService.js';
import Spinner from '../components/Spinner.jsx';

export default function AdminQueue() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'followups'
  const [districtFilter, setDistrictFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/login');
      return;
    }
    setUser(currentUser);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [qRes, fRes] = await Promise.all([getQueue(), getFollowups()]);
    if (qRes.ok && qRes.data) {
      const raw = Array.isArray(qRes.data.queue)
        ? qRes.data.queue
        : Array.isArray(qRes.data.applicants)
        ? qRes.data.applicants
        : Array.isArray(qRes.data.profiles)
        ? qRes.data.profiles
        : Array.isArray(qRes.data)
        ? qRes.data
        : [];
      setApplicants(raw);
    } else {
      setApplicants([]);
    }
    if (fRes.ok && fRes.data) {
      const rawFollow = Array.isArray(fRes.data.followups)
        ? fRes.data.followups
        : Array.isArray(fRes.data)
        ? fRes.data
        : [];
      setFollowups(rawFollow);
    } else {
      setFollowups([]);
    }
    setLoading(false);
  };

  const appList = Array.isArray(applicants) ? applicants : [];
  const filteredApplicants = appList.filter(a => {
    if (!a) return false;
    if (districtFilter && String(a.district_id) !== districtFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        (a.full_name && a.full_name.toLowerCase().includes(q)) ||
        (a.username && a.username.toLowerCase().includes(q)) ||
        (a.phone && a.phone.includes(q));
      if (!match) return false;
    }
    return true;
  });

  const pendingCount = appList.filter(a => a && (a.status === 'under_review' || !a.status)).length;
  const approvedCount = appList.filter(a => a && a.status === 'approved').length;

  return (
    <div className="bg-neutral-bg py-10 sm:py-14">
      <div className="container-page max-w-6xl space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-brand-green-tint bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-brand-green-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-green-dark">
                Admin Verification Queue
              </span>
              <span className="text-xs text-neutral-muted">State Coordinator Portal</span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold text-neutral-ink sm:text-3xl">
              Volunteer Verification Center
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/admin/questions"
              className="btn-outline min-h-tap inline-flex items-center px-4 text-sm font-semibold"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Manage Questions (10 Active)
            </Link>
            <button
              type="button"
              onClick={loadData}
              className="btn-primary min-h-tap inline-flex items-center px-4 text-sm font-semibold"
            >
              &#8635; Refresh
            </button>
          </div>
        </div>

        {/* 4-Stat Metric Summary Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-neutral-muted/20 bg-white p-4 shadow-sm text-center">
            <div className="text-xs font-semibold uppercase text-neutral-muted">Total Applicants</div>
            <div className="font-display text-2xl font-extrabold text-neutral-ink sm:text-3xl">{applicants.length}</div>
          </div>
          <div className="rounded-xl border border-brand-yellow/40 bg-brand-yellow-tint/40 p-4 shadow-sm text-center">
            <div className="text-xs font-semibold uppercase text-neutral-ink">Pending Review</div>
            <div className="font-display text-2xl font-extrabold text-brand-green-dark sm:text-3xl">{pendingCount}</div>
          </div>
          <div className="rounded-xl border border-brand-green/30 bg-brand-green-tint/40 p-4 shadow-sm text-center">
            <div className="text-xs font-semibold uppercase text-brand-green-dark">Approved</div>
            <div className="font-display text-2xl font-extrabold text-brand-green sm:text-3xl">{approvedCount}</div>
          </div>
          <div className="rounded-xl border border-neutral-muted/20 bg-white p-4 shadow-sm text-center">
            <div className="text-xs font-semibold uppercase text-neutral-muted">Follow-ups</div>
            <div className="font-display text-2xl font-extrabold text-neutral-ink sm:text-3xl">{followups.length}</div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-brand-green-tint">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`min-h-tap px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'queue'
                ? 'border-brand-green text-brand-green'
                : 'border-transparent text-neutral-muted hover:text-neutral-ink'
            }`}
          >
            Applicant Queue ({filteredApplicants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('followups')}
            className={`min-h-tap px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'followups'
                ? 'border-brand-green text-brand-green'
                : 'border-transparent text-neutral-muted hover:text-neutral-ink'
            }`}
          >
            Scheduled Follow-ups ({followups.length})
          </button>
        </div>

        {/* Filters and Search Bar (Queue Tab) */}
        {activeTab === 'queue' && (
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-muted/20 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search name, phone, or username..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="min-h-tap flex-1 rounded-lg border border-neutral-muted/40 px-3 py-2 text-sm text-neutral-ink focus:border-brand-green focus:outline-none"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="min-h-tap rounded-lg border border-neutral-muted/40 px-3 py-2 text-sm text-neutral-ink focus:border-brand-green focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="under_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <span className="text-xs text-neutral-muted self-center">
              Showing {filteredApplicants.length} applicants
            </span>
          </div>
        )}

        {/* Queue Table */}
        <div className="overflow-hidden rounded-xl border border-neutral-muted/20 bg-white shadow-sm">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center p-8">
              <Spinner className="h-8 w-8 text-brand-green" />
            </div>
          ) : activeTab === 'queue' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-neutral-ink">
                <thead className="bg-brand-green-tint/40 text-xs uppercase font-bold text-brand-green-dark border-b border-brand-green-tint">
                  <tr>
                    <th className="px-4 py-3">Applicant Name</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Wing</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-muted/10">
                  {filteredApplicants.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-sm text-neutral-muted">
                        No applicants match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredApplicants.map(app => (
                      <tr key={app.id} className="hover:bg-neutral-bg/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-neutral-ink">{app.full_name}</div>
                          <div className="text-xs text-neutral-muted font-mono">@{app.username}</div>
                        </td>
                        <td className="px-4 py-3.5">{app.district_name || 'Tamil Nadu'}</td>
                        <td className="px-4 py-3.5 font-mono text-xs">+91 {app.phone || '-'}</td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-brand-green-dark">{app.wing || 'Youth Wing'}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                              app.status === 'approved'
                                ? 'bg-brand-green-tint text-brand-green'
                                : app.status === 'rejected'
                                ? 'bg-red-50 text-status-no-answer'
                                : 'bg-brand-yellow-tint text-brand-green-dark'
                            }`}
                          >
                            {app.status === 'approved' ? 'Approved' : app.status === 'rejected' ? 'Rejected' : 'Under Review'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link
                            to={`/admin/applicants/${app.id}`}
                            className="btn-outline min-h-tap inline-flex items-center px-3 py-1.5 text-xs font-semibold"
                          >
                            Review & Interview &rarr;
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Follow-ups List */
            <div className="p-6">
              {followups.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-muted">
                  No scheduled callbacks pending.
                </div>
              ) : (
                <div className="space-y-4">
                  {followups.map(f => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border border-brand-yellow/40 bg-brand-yellow-tint/30 p-4">
                      <div>
                        <div className="font-bold text-neutral-ink">{f.full_name} (@{f.username})</div>
                        <div className="text-xs text-neutral-muted">
                          Callback scheduled for: <strong className="text-brand-green-dark font-mono">{f.callback_time || 'Pending'}</strong>
                        </div>
                        {f.last_call_notes && (
                          <div className="mt-1 text-xs italic text-neutral-muted">"{f.last_call_notes}"</div>
                        )}
                      </div>
                      <Link
                        to={`/admin/applicants/${f.id}`}
                        className="btn-primary min-h-tap inline-flex items-center px-4 text-xs font-semibold"
                      >
                        Call Now &rarr;
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
