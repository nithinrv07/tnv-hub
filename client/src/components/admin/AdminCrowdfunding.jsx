import React, { useState, useEffect } from 'react';
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign
} from '../../lib/donationService.js';

const CATEGORIES = ['All', 'Education', 'Environment', 'Disaster Relief', 'Healthcare', 'Civic Action'];
const STATUSES = ['All', 'ACTIVE', 'PAUSED', 'COMPLETED'];

export default function AdminCrowdfunding() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [activeDonorsCampaign, setActiveDonorsCampaign] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'Education',
    target_amount: '',
    end_date: '',
    story: '',
    cover_image: '',
    status: 'ACTIVE',
    featured: false
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCampaigns(categoryFilter);
      setCampaigns(data);
    } catch (err) {
      setError('Failed to load campaigns: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const filteredCampaigns = campaigns.filter(c => {
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesSearch = !searchTerm ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.story && c.story.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Aggregated KPIs
  const totalRaised = campaigns.reduce((sum, c) => sum + (c.raised_amount || 0), 0);
  const totalGoal = campaigns.reduce((sum, c) => sum + (c.target_amount || 0), 0);
  const activeCount = campaigns.filter(c => c.status === 'ACTIVE').length;
  const totalDonors = campaigns.reduce((sum, c) => sum + (c.donor_count || 0), 0);

  const openCreateModal = () => {
    setFormData({
      title: '',
      category: 'Education',
      target_amount: '',
      end_date: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      story: '',
      cover_image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
      status: 'ACTIVE',
      featured: false
    });
    setEditingCampaign(null);
    setShowCreateModal(true);
  };

  const openEditModal = (camp) => {
    setFormData({
      title: camp.title,
      category: camp.category,
      target_amount: camp.target_amount,
      end_date: camp.end_date ? camp.end_date.split('T')[0] : '',
      story: camp.story || '',
      cover_image: camp.cover_image || '',
      status: camp.status || 'ACTIVE',
      featured: Boolean(camp.featured)
    });
    setEditingCampaign(camp);
    setShowCreateModal(true);
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.target_amount) {
      alert('Please provide a campaign title and target amount.');
      return;
    }
    setSaving(true);
    try {
      if (editingCampaign) {
        const res = await updateCampaign(editingCampaign.id, formData);
        if (res.ok) {
          setShowCreateModal(false);
          loadData();
        } else {
          alert(res.data?.error || 'Failed to update campaign');
        }
      } else {
        const res = await createCampaign(formData);
        if (res.ok) {
          setShowCreateModal(false);
          loadData();
        } else {
          alert(res.data?.error || 'Failed to create campaign');
        }
      }
    } catch (err) {
      alert('Error saving campaign: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (camp) => {
    const nextStatus = camp.status === 'ACTIVE' ? 'PAUSED' : camp.status === 'PAUSED' ? 'COMPLETED' : 'ACTIVE';
    try {
      const res = await updateCampaign(camp.id, { status: nextStatus });
      if (res.ok) {
        setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, status: nextStatus } : c));
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
    try {
      const res = await deleteCampaign(id);
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      alert('Failed to delete campaign: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-green-tint shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-green text-white font-bold text-xs shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            <h2 className="text-xl font-black text-brand-green-dark font-display">
              Crowdfunding & Causes Management
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Launch public fundraising drives, set targets, track real-time contributions, and monitor donor impact.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/campaigns"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand-green/30 text-brand-green hover:bg-brand-green-tint text-xs font-bold transition-colors"
          >
            <span>Preview Public View</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Create New Campaign</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Raised</p>
          <p className="text-2xl font-black text-brand-green-dark mt-1 font-display">
            ₹{totalRaised.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Across all civic causes</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Target Goal Pool</p>
          <p className="text-2xl font-black text-neutral-800 mt-1 font-display">
            ₹{totalGoal.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0}% aggregate progress
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Campaigns</p>
          <p className="text-2xl font-black text-amber-600 mt-1 font-display">
            {activeCount}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Live for public giving</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Donors</p>
          <p className="text-2xl font-black text-brand-green mt-1 font-display">
            {totalDonors}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Direct contributions recorded</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-neutral-400 uppercase mr-1">Category:</span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                categoryFilter === cat
                  ? 'bg-brand-green text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs font-bold bg-neutral-100 text-neutral-700 rounded-xl px-3 py-1.5 border-none focus:ring-1 focus:ring-brand-green"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="text-xs bg-neutral-100 text-neutral-800 rounded-xl px-3 py-1.5 border-none focus:ring-1 focus:ring-brand-green w-44"
          />
        </div>
      </div>

      {/* Campaign Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-semibold">Loading campaigns registry...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs font-semibold border border-rose-200">
          {error}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <p className="text-sm font-bold text-neutral-600">No campaigns found matching criteria.</p>
          <button
            onClick={openCreateModal}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-green text-white text-xs font-bold"
          >
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredCampaigns.map(camp => {
            const pct = Math.min(100, Math.round(((camp.raised_amount || 0) / (camp.target_amount || 1)) * 100));
            const isCompleted = camp.status === 'COMPLETED' || pct >= 100;
            const daysLeft = camp.end_date
              ? Math.max(0, Math.ceil((new Date(camp.end_date).getTime() - Date.now()) / 86400000))
              : 30;

            return (
              <div
                key={camp.id}
                className="bg-white rounded-2xl border border-brand-green-tint shadow-xs overflow-hidden flex flex-col justify-between hover:border-brand-green/40 transition-all"
              >
                <div>
                  {/* Photo & Badge */}
                  <div className="relative h-44 w-full bg-neutral-100 overflow-hidden">
                    <img
                      src={camp.cover_image || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80'}
                      alt={camp.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                        {camp.category}
                      </span>
                      {camp.featured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-yellow text-neutral-900 shadow-xs">
                          ★ Featured
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-xs ${
                          camp.status === 'ACTIVE'
                            ? 'bg-emerald-500 text-white'
                            : camp.status === 'PAUSED'
                            ? 'bg-amber-500 text-white'
                            : 'bg-neutral-600 text-white'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-base text-neutral-900 font-display leading-snug line-clamp-2">
                      {camp.title}
                    </h3>
                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {camp.story || 'Direct civic assistance initiative powered by Tamil Nadu Volunteers.'}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-brand-green-dark">
                          ₹{(camp.raised_amount || 0).toLocaleString('en-IN')}
                          <span className="text-neutral-400 font-normal ml-1">
                            raised of ₹{(camp.target_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </span>
                        <span className="text-brand-green font-extrabold">{pct}%</span>
                      </div>
                      <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-green to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5">
                        <span>{camp.donor_count || (camp.donors?.length || 0)} Donors</span>
                        <span>{daysLeft} days remaining</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleStatus(camp)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition-colors"
                      title="Toggle Campaign Status"
                    >
                      {camp.status === 'ACTIVE' ? 'Pause' : camp.status === 'PAUSED' ? 'Mark Done' : 'Resume'}
                    </button>
                    <button
                      onClick={() => setActiveDonorsCampaign(camp)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      Donors ({camp.donors?.length || camp.donor_count || 0})
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(camp)}
                      className="p-1.5 text-neutral-500 hover:text-brand-green hover:bg-white rounded-lg transition-colors"
                      title="Edit Campaign"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(camp.id)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                      title="Delete Campaign"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <a
                      href={`/donate?campaign=${camp.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark transition-colors"
                    >
                      Donate &rarr;
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-brand-green-tint my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="text-lg font-black text-brand-green-dark font-display">
                {editingCampaign ? 'Edit Crowdfunding Campaign' : 'Create New Crowdfunding Campaign'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rural Tamil Nadu Digital Classrooms Drive 2026"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Target Amount (₹) *</label>
                  <input
                    type="number"
                    min="1000"
                    required
                    placeholder="500000"
                    value={formData.target_amount}
                    onChange={e => setFormData({ ...formData, target_amount: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Cause Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  >
                    <option value="Education">Education</option>
                    <option value="Environment">Environment</option>
                    <option value="Disaster Relief">Disaster Relief</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Civic Action">Civic Action</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Campaign End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Initial Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  >
                    <option value="ACTIVE">ACTIVE (Open for Donations)</option>
                    <option value="PAUSED">PAUSED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Cover Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.cover_image}
                  onChange={e => setFormData({ ...formData, cover_image: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Mission Story & Beneficiaries Description</label>
                <textarea
                  rows="3"
                  placeholder="Detail the problem, target beneficiaries, districts affected, and how funds will be transparently deployed..."
                  value={formData.story}
                  onChange={e => setFormData({ ...formData, story: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="featuredCheck"
                  checked={formData.featured}
                  onChange={e => setFormData({ ...formData, featured: e.target.checked })}
                  className="rounded text-brand-green focus:ring-brand-green"
                />
                <label htmlFor="featuredCheck" className="text-xs font-bold text-neutral-700">
                  Feature this campaign prominently on landing page and discovery feeds
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Publish Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DONORS LIST MODAL */}
      {activeDonorsCampaign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-brand-green-tint animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-black text-brand-green-dark font-display">
                  Donors & Contributions
                </h3>
                <p className="text-xs text-neutral-500 font-medium truncate max-w-sm">
                  {activeDonorsCampaign.title}
                </p>
              </div>
              <button
                onClick={() => setActiveDonorsCampaign(null)}
                className="text-neutral-400 hover:text-neutral-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto divide-y divide-neutral-100">
              {(!activeDonorsCampaign.donors || activeDonorsCampaign.donors.length === 0) ? (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No public donations recorded yet for this campaign.
                </div>
              ) : (
                activeDonorsCampaign.donors.map((don, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-neutral-800">{don.donor_name || 'Anonymous Civic Donor'}</p>
                      <p className="text-[10px] text-neutral-400">
                        {don.created_at ? new Date(don.created_at).toLocaleDateString('en-IN') : 'Recent'} · Ref: {don.receipt_no || don.utr || 'UPI Verified'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-brand-green">
                        ₹{(don.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-end">
              <button
                onClick={() => setActiveDonorsCampaign(null)}
                className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
