import React, { useState, useEffect } from 'react';
import {
  getRecurringPledges,
  createRecurringPledge,
  toggleRecurringPledge
} from '../../lib/donationService.js';

export default function AdminAutoPay() {
  const [data, setData] = useState({ pledges: [], stats: { mrr: 0, active_count: 0, total_raised: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Add Pledge Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    donor_name: '',
    donor_phone: '',
    donor_email: '',
    tier_name: 'Annual Daily Patron (₹365/mo)',
    frequency: 'MONTHLY',
    amount: 365,
    cycle_day: 1,
    payment_method: 'UPI Auto-Debit'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getRecurringPledges();
      setData(res);
    } catch (err) {
      setError('Failed to load auto-pay pledges: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pledges = data.pledges || [];
  const stats = data.stats || { mrr: 0, active_count: 0, total_raised: 0 };

  const filteredPledges = pledges.filter(p => {
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    const matchesSearch = !searchTerm ||
      p.donor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.donor_email && p.donor_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.donor_phone && p.donor_phone.includes(searchTerm));
    return matchesStatus && matchesSearch;
  });

  const handleToggle = async (id) => {
    try {
      const res = await toggleRecurringPledge(id);
      if (res.ok) {
        loadData();
      } else {
        alert(res.data?.error || 'Failed to toggle pledge');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleSavePledge = async (e) => {
    e.preventDefault();
    if (!formData.donor_name.trim() || !formData.amount) {
      alert('Please fill in donor name and amount.');
      return;
    }
    setSaving(true);
    try {
      const res = await createRecurringPledge(formData);
      if (res.ok) {
        setShowAddModal(false);
        loadData();
      } else {
        alert(res.data?.error || 'Failed to register pledge');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </span>
            <h2 className="text-xl font-black text-brand-green-dark font-display">
              Auto-Pay & Recurring Pledges Console
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Manage recurring monthly patrons, UPI auto-debits, recurring pledge cycles, and lifetime civic giving.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Register Recurring Donor</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Monthly Recurring Giving</p>
          <p className="text-2xl font-black text-brand-green-dark mt-1 font-display">
            ₹{(stats.mrr || 0).toLocaleString('en-IN')}<span className="text-xs text-neutral-400 font-normal">/mo</span>
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Automated debit velocity</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Pledges</p>
          <p className="text-2xl font-black text-neutral-800 mt-1 font-display">
            {stats.active_count || 0}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Recurring subscribers active</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Lifetime Raised from Pledges</p>
          <p className="text-2xl font-black text-brand-green mt-1 font-display">
            ₹{(stats.total_raised || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Over all debit cycles</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Debit Success Rate</p>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-display">
            98.4%
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">e-Mandate / UPI clearing</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-neutral-400 uppercase mr-1">Status:</span>
          {['All', 'ACTIVE', 'PAUSED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-brand-green text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search donor name, phone, email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="text-xs bg-neutral-100 text-neutral-800 rounded-xl px-3 py-1.5 border-none focus:ring-1 focus:ring-brand-green w-56"
          />
        </div>
      </div>

      {/* Pledges Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-semibold">Loading recurring pledges...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs font-semibold border border-rose-200">
          {error}
        </div>
      ) : filteredPledges.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <p className="text-sm font-bold text-neutral-600">No recurring pledges match current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-green-tint shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-100">
                <tr>
                  <th className="py-3 px-4">Recurring Patron</th>
                  <th className="py-3 px-4">Pledge Tier</th>
                  <th className="py-3 px-4">Monthly Amount</th>
                  <th className="py-3 px-4">Debit Cycle & Method</th>
                  <th className="py-3 px-4">Lifetime Contributed</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredPledges.map(p => {
                  const isActive = p.status === 'ACTIVE';

                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900 text-sm">{p.donor_name}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {p.donor_phone} {p.donor_email && `· ${p.donor_email}`}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-800">{p.tier_name}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          Started: {p.started_at ? new Date(p.started_at).toLocaleDateString('en-IN') : '2026'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-brand-green-dark text-sm">
                        ₹{(p.amount || 0).toLocaleString('en-IN')}
                        <span className="text-[10px] font-normal text-neutral-400 ml-1">/mo</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-neutral-800">Day {p.cycle_day} of month</div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {p.payment_method || 'UPI Auto-Debit'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900">₹{(p.total_contributed || 0).toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{p.successful_cycles || 1} cycles cleared</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-xs ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isActive ? '● ACTIVE' : '⏸ PAUSED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggle(p.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isActive
                              ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                              : 'bg-brand-green hover:bg-brand-green-dark text-white'
                          }`}
                        >
                          {isActive ? 'Pause Debit' : 'Resume'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD RECURRING DONOR MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-brand-green-tint animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-black text-brand-green-dark font-display">
                Register Recurring Donor
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePledge} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Donor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Murugesan"
                  value={formData.donor_name}
                  onChange={e => setFormData({ ...formData, donor_name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="9840112233"
                    value={formData.donor_phone}
                    onChange={e => setFormData({ ...formData, donor_phone: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="donor@example.com"
                    value={formData.donor_email}
                    onChange={e => setFormData({ ...formData, donor_email: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Pledge Tier</label>
                  <select
                    value={formData.tier_name}
                    onChange={e => setFormData({ ...formData, tier_name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  >
                    <option value="Grassroots Daily (₹30/mo)">Grassroots Daily (₹30/mo)</option>
                    <option value="Civic Pillar (₹100/mo)">Civic Pillar (₹100/mo)</option>
                    <option value="Annual Daily Patron (₹365/mo)">Annual Daily Patron (₹365/mo)</option>
                    <option value="Community Champion (₹1,000/mo)">Community Champion (₹1,000/mo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Monthly Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Cycle Day</label>
                  <select
                    value={formData.cycle_day}
                    onChange={e => setFormData({ ...formData, cycle_day: Number(e.target.value) })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  >
                    <option value={1}>1st of Month</option>
                    <option value={5}>5th of Month</option>
                    <option value={10}>10th of Month</option>
                    <option value={15}>15th of Month</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Method</label>
                  <select
                    value={formData.payment_method}
                    onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  >
                    <option value="UPI Auto-Debit">UPI Auto-Debit</option>
                    <option value="e-Mandate">e-Mandate (NetBanking)</option>
                    <option value="Standing Instruction">Standing Instruction</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Registering...' : 'Save Pledge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
