import React, { useState, useEffect } from 'react';
import {
  getBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary
} from '../../lib/donationService.js';

const BENEFICIARY_TYPES = ['Individual', 'Family', 'School / Institution', 'Village / Community'];
const CATEGORIES = ['All', 'Education', 'Healthcare', 'Disaster Relief', 'Nutrition'];
const STATUSES = ['All', 'APPLIED', 'VERIFIED', 'AID_DISBURSED'];

export default function AdminBeneficiaries() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBen, setEditingBen] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Individual',
    district: 'Chennai',
    category: 'Education',
    support_type: 'Scholarship & Educational Aid',
    amount_valuation: '',
    status: 'APPLIED',
    linked_campaign_id: 'General Civic Pool',
    verified_by: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await getBeneficiaries();
      setBeneficiaries(list);
    } catch (err) {
      setError('Failed to load beneficiaries register: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredList = beneficiaries.filter(b => {
    const matchesCategory = categoryFilter === 'All' || b.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    const matchesSearch = !searchTerm ||
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.support_type && b.support_type.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const totalValuation = beneficiaries.reduce((sum, b) => sum + (b.amount_valuation || 0), 0);
  const disbursedCount = beneficiaries.filter(b => b.status === 'AID_DISBURSED').length;
  const verifiedCount = beneficiaries.filter(b => b.status === 'VERIFIED').length;
  const appliedCount = beneficiaries.filter(b => b.status === 'APPLIED').length;

  const openAddModal = () => {
    setFormData({
      name: '',
      type: 'Individual',
      district: 'Chennai',
      category: 'Education',
      support_type: 'Scholarship & Educational Aid',
      amount_valuation: '',
      status: 'APPLIED',
      linked_campaign_id: 'General Civic Pool',
      verified_by: 'State Secretariat Review',
      notes: ''
    });
    setEditingBen(null);
    setShowAddModal(true);
  };

  const openEditModal = (ben) => {
    setFormData({
      name: ben.name,
      type: ben.type,
      district: ben.district,
      category: ben.category,
      support_type: ben.support_type,
      amount_valuation: ben.amount_valuation,
      status: ben.status,
      linked_campaign_id: ben.linked_campaign_id || 'General Civic Pool',
      verified_by: ben.verified_by || '',
      notes: ben.notes || ''
    });
    setEditingBen(ben);
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.district.trim()) {
      alert('Please fill in beneficiary name and district.');
      return;
    }
    setSaving(true);
    try {
      if (editingBen) {
        const res = await updateBeneficiary(editingBen.id, formData);
        if (res.ok) {
          setShowAddModal(false);
          loadData();
        } else {
          alert(res.data?.error || 'Failed to update record');
        }
      } else {
        const res = await createBeneficiary(formData);
        if (res.ok) {
          setShowAddModal(false);
          loadData();
        } else {
          alert(res.data?.error || 'Failed to create record');
        }
      }
    } catch (err) {
      alert('Error saving beneficiary: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async (ben) => {
    const nextStatus = ben.status === 'APPLIED' ? 'VERIFIED' : ben.status === 'VERIFIED' ? 'AID_DISBURSED' : 'APPLIED';
    try {
      const res = await updateBeneficiary(ben.id, {
        status: nextStatus,
        disbursed_at: nextStatus === 'AID_DISBURSED' ? new Date().toISOString() : ben.disbursed_at
      });
      if (res.ok) {
        setBeneficiaries(prev => prev.map(b => b.id === ben.id ? { ...b, status: nextStatus } : b));
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this beneficiary registry entry?')) return;
    try {
      const res = await deleteBeneficiary(id);
      if (res.ok) {
        setBeneficiaries(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-green-tint shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-green text-white font-bold text-xs shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <h2 className="text-xl font-black text-brand-green-dark font-display">
              Beneficiaries & Aid Distribution Register
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Track grassroots beneficiaries across all 38 districts, verify need criteria, and document disbursement proof.
          </p>
        </div>
        <div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Register New Beneficiary</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Beneficiaries</p>
          <p className="text-2xl font-black text-brand-green-dark mt-1 font-display">
            {beneficiaries.length}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Institutions, families & scholars</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Disbursed Aid Value</p>
          <p className="text-2xl font-black text-neutral-900 mt-1 font-display">
            ₹{totalValuation.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {disbursedCount} disbursements completed
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Verified for Aid</p>
          <p className="text-2xl font-black text-amber-600 mt-1 font-display">
            {verifiedCount}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Approved in dispatch queue</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Under Field Review</p>
          <p className="text-2xl font-black text-neutral-600 mt-1 font-display">
            {appliedCount}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">New grassroots applications</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.replace('_', ' ')}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search name, district..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="text-xs bg-neutral-100 text-neutral-800 rounded-xl px-3 py-1.5 border-none focus:ring-1 focus:ring-brand-green w-48"
          />
        </div>
      </div>

      {/* Beneficiaries Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-semibold">Loading beneficiaries register...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs font-semibold border border-rose-200">
          {error}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <p className="text-sm font-bold text-neutral-600">No beneficiaries found matching current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-green-tint shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-100">
                <tr>
                  <th className="py-3 px-4">Beneficiary</th>
                  <th className="py-3 px-4">District & Category</th>
                  <th className="py-3 px-4">Support Package</th>
                  <th className="py-3 px-4">Valuation ₹</th>
                  <th className="py-3 px-4">Status & Disbursal</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredList.map(ben => (
                  <tr key={ben.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 text-sm">{ben.name}</div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded-sm bg-neutral-100 text-neutral-600 font-semibold">
                          {ben.type}
                        </span>
                        {ben.linked_campaign_id && (
                          <span className="text-brand-green font-medium truncate max-w-xs">
                            Pool: {ben.linked_campaign_id}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-800">{ben.district}</div>
                      <div className="text-[11px] text-neutral-500">{ben.category}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-800">{ben.support_type}</div>
                      {ben.notes && (
                        <div className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5 max-w-xs">
                          {ben.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      ₹{(ben.amount_valuation || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-xs ${
                          ben.status === 'AID_DISBURSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ben.status === 'VERIFIED'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-neutral-100 text-neutral-700'
                        }`}
                      >
                        {ben.status === 'AID_DISBURSED' && '✓ '}
                        {ben.status.replace('_', ' ')}
                      </span>
                      {ben.disbursed_at && (
                        <div className="text-[10px] text-neutral-400 mt-1">
                          {new Date(ben.disbursed_at).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleAdvanceStatus(ben)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand-green-tint text-brand-green hover:bg-brand-green hover:text-white transition-colors"
                        title="Advance Status"
                      >
                        {ben.status === 'APPLIED' ? 'Verify' : ben.status === 'VERIFIED' ? 'Mark Disbursed' : 'Re-open'}
                      </button>
                      <button
                        onClick={() => openEditModal(ben)}
                        className="p-1 text-neutral-400 hover:text-brand-green rounded transition-colors"
                        title="Edit Details"
                      >
                        <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(ben.id)}
                        className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                        title="Delete Record"
                      >
                        <svg className="w-4 h-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT BENEFICIARY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-brand-green-tint my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="text-lg font-black text-brand-green-dark font-display">
                {editingBen ? 'Edit Beneficiary Registry Entry' : 'Register New Beneficiary'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Beneficiary Name / Entity *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arumugam & Family or Govt Middle School"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Beneficiary Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  >
                    {BENEFICIARY_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">District *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nagapattinam"
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  >
                    <option value="Education">Education</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Disaster Relief">Disaster Relief</option>
                    <option value="Nutrition">Nutrition</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Support Type</label>
                  <input
                    type="text"
                    placeholder="e.g. Ration Kit & Emergency Grant"
                    value={formData.support_type}
                    onChange={e => setFormData({ ...formData, support_type: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Amount / Valuation (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="25000"
                    value={formData.amount_valuation}
                    onChange={e => setFormData({ ...formData, amount_valuation: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  >
                    <option value="APPLIED">APPLIED</option>
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="AID_DISBURSED">AID_DISBURSED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Linked Campaign / Funding Pool</label>
                <input
                  type="text"
                  placeholder="e.g. camp_1 or General Civic Relief Pool"
                  value={formData.linked_campaign_id}
                  onChange={e => setFormData({ ...formData, linked_campaign_id: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Field Verification Notes & Details</label>
                <textarea
                  rows="2"
                  placeholder="Notes on ground verification, proof of need, specific assistance provided..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-bold hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingBen ? 'Update Beneficiary' : 'Record Beneficiary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
