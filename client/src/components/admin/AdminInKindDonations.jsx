import React, { useState, useEffect } from 'react';
import {
  getInKindDonations,
  createInKindDonation,
  updateInKindDonation
} from '../../lib/donationService.js';

const CATEGORIES = ['All', 'Environment', 'Disaster Relief', 'Education', 'Healthcare', 'Nutrition', 'Civic Materials'];
const STATUSES = ['All', 'RECEIVED', 'DISTRIBUTED', 'IN_TRANSIT'];

export default function AdminInKindDonations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);

  const [formData, setFormData] = useState({
    item_name: '',
    category: 'Environment',
    quantity: '',
    unit: 'units',
    estimated_valuation: '',
    donor_name: '',
    donor_phone: '',
    recipient_unit: 'State Headquarters Depot',
    status: 'RECEIVED'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await getInKindDonations();
      setItems(list);
    } catch (err) {
      setError('Failed to load in-kind registry: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesSearch = !searchTerm ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.donor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.recipient_unit.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const totalValuation = items.reduce((sum, i) => sum + (i.estimated_valuation || 0), 0);
  const distributedCount = items.filter(i => i.status === 'DISTRIBUTED').length;
  const receivedStockCount = items.filter(i => i.status === 'RECEIVED').length;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.item_name.trim() || !formData.donor_name.trim()) {
      alert('Please fill in item description and donor name.');
      return;
    }
    setSaving(true);
    try {
      const res = await createInKindDonation(formData);
      if (res.ok) {
        setShowAddModal(false);
        loadData();
      } else {
        alert(res.data?.error || 'Failed to record in-kind contribution');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === 'RECEIVED' ? 'DISTRIBUTED' : item.status === 'DISTRIBUTED' ? 'IN_TRANSIT' : 'RECEIVED';
    try {
      const res = await updateInKindDonation(item.id, { status: nextStatus });
      if (res.ok) {
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i));
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </span>
            <h2 className="text-xl font-black text-brand-green-dark font-display">
              In-Kind & Material Donations Registry
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Track non-cash material contributions: saplings, disaster kits, wheelchairs, rations, and issue appreciation certificates.
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
            <span>Record Material Donation</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total In-Kind Valuation</p>
          <p className="text-2xl font-black text-brand-green-dark mt-1 font-display">
            ₹{totalValuation.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Estimated material value</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Consignments</p>
          <p className="text-2xl font-black text-neutral-800 mt-1 font-display">
            {items.length}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Physical goods recorded</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Distributed to Field</p>
          <p className="text-2xl font-black text-emerald-600 mt-1 font-display">
            {distributedCount}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Delivered to local units</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-brand-green-tint shadow-xs">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">In Stock / Depots</p>
          <p className="text-2xl font-black text-amber-600 mt-1 font-display">
            {receivedStockCount}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">Ready for ground dispatch</p>
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
            placeholder="Search item, donor, unit..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="text-xs bg-neutral-100 text-neutral-800 rounded-xl px-3 py-1.5 border-none focus:ring-1 focus:ring-brand-green w-48"
          />
        </div>
      </div>

      {/* Items Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <div className="w-8 h-8 border-3 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-semibold">Loading in-kind registry...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs font-semibold border border-rose-200">
          {error}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-brand-green-tint">
          <p className="text-sm font-bold text-neutral-600">No material donations match current filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-brand-green-tint shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-100">
                <tr>
                  <th className="py-3 px-4">Item & Quantity</th>
                  <th className="py-3 px-4">Donor / Contributor</th>
                  <th className="py-3 px-4">Est. Valuation</th>
                  <th className="py-3 px-4">Recipient Unit</th>
                  <th className="py-3 px-4">Status & Certificate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-neutral-900 text-sm">{item.item_name}</div>
                      <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-extrabold text-brand-green">{item.quantity} {item.unit}</span>
                        <span>·</span>
                        <span className="px-1.5 py-0.5 rounded-sm bg-neutral-100 text-neutral-600 font-semibold text-[10px]">
                          {item.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-800">{item.donor_name}</div>
                      {item.donor_phone && (
                        <div className="text-[10px] text-neutral-400">{item.donor_phone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-neutral-900">
                      ₹{(item.estimated_valuation || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-neutral-800">{item.recipient_unit}</div>
                      <div className="text-[10px] text-neutral-400">
                        {item.acknowledged_at ? new Date(item.acknowledged_at).toLocaleDateString('en-IN') : 'Logged'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase shadow-xs ${
                          item.status === 'DISTRIBUTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'RECEIVED'
                            ? 'bg-brand-green-tint text-brand-green-dark'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.certificate_no && (
                        <div className="mt-1">
                          <button
                            onClick={() => setSelectedCert(item)}
                            className="text-[10px] font-bold text-brand-green hover:underline flex items-center gap-1"
                          >
                            <span>📜 {item.certificate_no}</span>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
                      >
                        {item.status === 'RECEIVED' ? 'Mark Dispatched' : item.status === 'DISTRIBUTED' ? 'Mark In-Transit' : 'Mark In-Stock'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RECORD IN-KIND MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-brand-green-tint my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <h3 className="text-lg font-black text-brand-green-dark font-display">
                Record In-Kind Material Donation
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
                <label className="block text-xs font-bold text-neutral-700 mb-1">Item Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500 Native Tree Saplings or 100 Disaster Tarpaulins"
                  value={formData.item_name}
                  onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="100"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="kits / saplings / bags"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Est. Valuation (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="50000"
                    value={formData.estimated_valuation}
                    onChange={e => setFormData({ ...formData, estimated_valuation: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Donor Name / Organization *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cauvery Green Agro Foundation"
                    value={formData.donor_name}
                    onChange={e => setFormData({ ...formData, donor_name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Donor Phone Number</label>
                  <input
                    type="text"
                    placeholder="9840112233"
                    value={formData.donor_phone}
                    onChange={e => setFormData({ ...formData, donor_phone: e.target.value })}
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
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">Recipient Unit / Hub</label>
                  <input
                    type="text"
                    placeholder="e.g. Nagapattinam Coastal Wing"
                    value={formData.recipient_unit}
                    onChange={e => setFormData({ ...formData, recipient_unit: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-200 p-2.5 focus:border-brand-green focus:ring-1 focus:ring-brand-green"
                  />
                </div>
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
                  {saving ? 'Recording...' : 'Issue Certificate & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACKNOWLEDGMENT CERTIFICATE PREVIEW MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border-2 border-brand-green text-center animate-in fade-in zoom-in-95 duration-200 relative">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 text-lg font-bold"
            >
              ✕
            </button>
            <div className="w-14 h-14 rounded-full bg-brand-green-tint text-brand-green mx-auto flex items-center justify-center mb-3">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-yellow text-neutral-900">
              Official Material In-Kind Certificate
            </span>
            <h3 className="text-xl font-black text-brand-green-dark font-display mt-3">
              Certificate of Appreciation
            </h3>
            <p className="text-xs text-neutral-500 font-mono mt-1">Ref: {selectedCert.certificate_no}</p>

            <div className="mt-4 p-4 rounded-2xl bg-neutral-50 border border-neutral-100 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Generously Provided By:</span>
                <span className="font-bold text-neutral-900">{selectedCert.donor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Contribution Item:</span>
                <span className="font-bold text-neutral-900">{selectedCert.item_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Quantity & Valuation:</span>
                <span className="font-bold text-brand-green">{selectedCert.quantity} {selectedCert.unit} (₹{(selectedCert.estimated_valuation || 0).toLocaleString('en-IN')})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Deploying Unit:</span>
                <span className="font-bold text-neutral-900">{selectedCert.recipient_unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Acknowledged Date:</span>
                <span className="font-medium text-neutral-700">{selectedCert.acknowledged_at ? new Date(selectedCert.acknowledged_at).toLocaleDateString('en-IN') : 'Recent'}</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 mt-4 italic">
              "Tamil Nadu Volunteers expresses sincere civic gratitude for empowering ground relief and community welfare."
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark shadow-xs"
              >
                Print Certificate
              </button>
              <button
                onClick={() => setSelectedCert(null)}
                className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-xs font-bold hover:bg-neutral-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
