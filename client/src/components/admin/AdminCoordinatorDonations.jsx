import React, { useState, useEffect } from 'react';
import {
  getCoordinatorDonations,
  remitCoordinatorCollection,
  updateCoordinator
} from '../../lib/donationService.js';

export default function AdminCoordinatorDonations() {
  const [data, setData] = useState({ coordinators: [], total_collected: 0, total_target: 0, pending_reconciliation: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Remittance Reconciliation Modal
  const [reconcilingCoord, setReconcilingCoord] = useState(null);
  const [remitForm, setRemitForm] = useState({
    amount: '',
    remittance_mode: 'UPI',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getCoordinatorDonations();
      setData(res);
    } catch (err) {
      setError('Failed to load coordinator collections: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const coordinators = data.coordinators || [];

  const filteredCoordinators = coordinators.filter(c => {
    const matchesStatus = filterStatus === 'All' || c.remittance_status === filterStatus;
    const matchesSearch = !searchTerm ||
      c.coordinator_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.wing && c.wing.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const handleOpenReconcile = (coord) => {
    setReconcilingCoord(coord);
    setRemitForm({
      amount: coord.collected_amount,
      remittance_mode: coord.remittance_mode || 'UPI',
      notes: `Settled into TNV Central Account on ${new Date().toLocaleDateString('en-IN')}`
    });
  };

  const handleConfirmReconcile = async (e) => {
    e.preventDefault();
    if (!reconcilingCoord) return;
    setSubmitting(true);
    try {
      const res = await remitCoordinatorCollection({
        id: reconcilingCoord.id,
        amount: remitForm.amount,
        remittance_mode: remitForm.remittance_mode,
        notes: remitForm.notes
      });
      if (res.ok) {
        setReconcilingCoord(null);
        loadData();
      } else {
        alert(res.data?.error || 'Failed to reconcile remittance');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Top performers leaderboard
  const leaderboard = [...coordinators].sort((a, b) => (b.collected_amount || 0) - (a.collected_amount || 0)).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-green-tint shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-green text-white font-bold text-xs shadow-xs">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h2 className="text-xl font-black text-brand-green-dark font-display">
              Coordinator Field Collections & Remittance
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Reconcile on-field civic contributions collected by district and wing coordinators across Tamil Nadu.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand-green/30 text-brand-green hover:bg-brand-green-tint text-xs font-bold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Field Collections</p>
          <p className="text-2xl font-black text-brand-green-dark mt-1 font-display">
            ₹{(data.total_collected || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">District drives combined</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Statewide Quota Target</p>
          <p className="text-2xl font-black text-neutral-800 mt-1 font-display">
            ₹{(data.total_target || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {data.total_target > 0 ? Math.round((data.total_collected / data.total_target) * 100) : 0}% achieved
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Pending Remittance</p>
          <p className="text-2xl font-black text-amber-600 mt-1 font-display">
            ₹{(data.pending_reconciliation || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">In transit from taluk leads</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Coordinators</p>
          <p className="text-2xl font-black text-brand-green mt-1 font-display">
            {coordinators.length}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Reporting field remittances</p>
        </div>
      </div>

      {/* Top Field Champions Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-900 via-brand-green-dark to-emerald-950 rounded-2xl p-5 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-brand-yellow font-black text-sm">★</span>
            <h3 className="font-bold text-sm font-display tracking-tight text-white">
              Field Collection Leaderboard (Top District Achievers)
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {leaderboard.map((coord, idx) => (
              <div key={coord.id} className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-brand-yellow">#{idx + 1} {coord.district}</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                    {Math.round(((coord.collected_amount || 0) / (coord.target_quota || 1)) * 100)}%
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-1 truncate">{coord.coordinator_name}</div>
                <div className="text-[11px] text-emerald-200 flex items-center justify-between mt-1">
                  <span>Collected: ₹{(coord.collected_amount || 0).toLocaleString('en-IN')}</span>
                  <span>{coord.donor_count || 0} Donors</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-neutral-400 uppercase mr-1">Status:</span>
          {['All', 'RECONCILED', 'PENDING_REMITTANCE'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                filterStatus === st
                  ? 'bg-brand-green text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {st === 'All' ? 'All Remittances' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search coordinator, district..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="text-xs bg-neutral-100 text-neutral-800 rounded-xl px-3 py-1.5 border-none focus:ring-1 focus:ring-brand-green w-56"
          />
        </div>
      </div>

      {/* Coordinators Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-semibold">Loading coordinator collections...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs font-semibold border border-rose-200">
          {error}
        </div>
      ) : filteredCoordinators.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <p className="text-sm font-bold text-neutral-600">No coordinator logs match criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-green-tint shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-100">
                <tr>
                  <th className="py-3 px-4">Coordinator & District</th>
                  <th className="py-3 px-4">Wing Assignment</th>
                  <th className="py-3 px-4">Quota Progress</th>
                  <th className="py-3 px-4">Remittance Mode</th>
                  <th className="py-3 px-4">Status & Last Date</th>
                  <th className="py-3 px-4 text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredCoordinators.map(coord => {
                  const pct = Math.min(100, Math.round(((coord.collected_amount || 0) / (coord.target_quota || 1)) * 100));
                  const isReconciled = coord.remittance_status === 'RECONCILED';

                  return (
                    <tr key={coord.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900 text-sm">{coord.coordinator_name}</div>
                        <div className="text-[11px] text-brand-green font-semibold mt-0.5">
                          {coord.district} District
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-neutral-800">{coord.wing}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{coord.donor_count || 0} Field Donors</div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span className="text-brand-green-dark">₹{(coord.collected_amount || 0).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-neutral-400">of ₹{(coord.target_quota || 0).toLocaleString('en-IN')} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-brand-green'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-semibold text-[11px]">
                          {coord.remittance_mode || 'UPI'}
                        </span>
                        {coord.notes && (
                          <div className="text-[10px] text-neutral-400 line-clamp-1 mt-1 max-w-xs">
                            {coord.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-xs ${
                            isReconciled
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {isReconciled ? '✓ RECONCILED' : '⏳ PENDING'}
                        </span>
                        {coord.last_remittance_date && (
                          <div className="text-[10px] text-neutral-400 mt-1">
                            {new Date(coord.last_remittance_date).toLocaleDateString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isReconciled ? (
                          <button
                            onClick={() => handleOpenReconcile(coord)}
                            className="px-3 py-1.5 rounded-lg bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            Reconcile Remittance
                          </button>
                        ) : (
                          <span className="text-emerald-700 font-bold text-xs">
                            Settled
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECONCILE MODAL */}
      {reconcilingCoord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-brand-green-tint animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-black text-brand-green-dark font-display">
                Reconcile Field Remittance
              </h3>
              <button
                onClick={() => setReconcilingCoord(null)}
                className="text-neutral-400 hover:text-neutral-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReconcile} className="mt-4 space-y-4">
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-xs">
                <p className="font-bold text-neutral-800">{reconcilingCoord.coordinator_name}</p>
                <p className="text-neutral-500">{reconcilingCoord.district} District · {reconcilingCoord.wing}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Settled Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={remitForm.amount}
                  onChange={e => setRemitForm({ ...remitForm, amount: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Remittance Mode</label>
                <select
                  value={remitForm.remittance_mode}
                  onChange={e => setRemitForm({ ...remitForm, remittance_mode: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                >
                  <option value="UPI">UPI Direct Remittance</option>
                  <option value="Bank NEFT">Bank NEFT / RTGS</option>
                  <option value="Cash Remittance">Cash Branch Deposit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">Audit Reconciliation Notes</label>
                <textarea
                  rows="2"
                  value={remitForm.notes}
                  onChange={e => setRemitForm({ ...remitForm, notes: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setReconcilingCoord(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Reconciling...' : 'Confirm Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
