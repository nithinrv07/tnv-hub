import { api } from './api.js';
import { getToken } from './session.js';

// --- Campaigns ---
export async function getCampaigns(category = '') {
  const query = category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : '';
  const res = await api(`/api/campaigns${query}`);
  return res.ok ? res.data?.campaigns || [] : [];
}

export async function getCampaignById(id) {
  if (!id) return null;
  const res = await api(`/api/campaigns/${encodeURIComponent(id)}`);
  return res.ok ? res.data?.campaign : null;
}

export async function createCampaign(payload) {
  const token = getToken();
  return await api('/api/campaigns', {
    method: 'POST',
    token: token || undefined,
    body: payload
  });
}

export async function updateCampaign(id, payload) {
  const token = getToken();
  return await api(`/api/campaigns/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token: token || undefined,
    body: payload
  });
}

export async function deleteCampaign(id) {
  const token = getToken();
  return await api(`/api/campaigns/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: token || undefined
  });
}

// --- Beneficiaries ---
export async function getBeneficiaries() {
  const res = await api('/api/beneficiaries');
  return res.ok ? res.data?.beneficiaries || [] : [];
}

export async function createBeneficiary(payload) {
  const token = getToken();
  return await api('/api/beneficiaries', {
    method: 'POST',
    token: token || undefined,
    body: payload
  });
}

export async function updateBeneficiary(id, payload) {
  const token = getToken();
  return await api(`/api/beneficiaries/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token: token || undefined,
    body: payload
  });
}

export async function deleteBeneficiary(id) {
  const token = getToken();
  return await api(`/api/beneficiaries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token: token || undefined
  });
}

// --- Coordinator Field Collections ---
export async function getCoordinatorDonations() {
  const res = await api('/api/coordinator-donations');
  return res.ok ? res.data : { coordinators: [], total_collected: 0, total_target: 0, pending_reconciliation: 0 };
}

export async function remitCoordinatorCollection(payload) {
  const token = getToken();
  return await api('/api/coordinator-donations/remit', {
    method: 'POST',
    token: token || undefined,
    body: payload
  });
}

export async function updateCoordinator(id, payload) {
  const token = getToken();
  return await api(`/api/coordinator-donations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token: token || undefined,
    body: payload
  });
}

// --- In-Kind & Material Donations ---
export async function getInKindDonations() {
  const res = await api('/api/in-kind-donations');
  return res.ok ? res.data?.in_kind_donations || [] : [];
}

export async function createInKindDonation(payload) {
  const token = getToken();
  return await api('/api/in-kind-donations', {
    method: 'POST',
    token: token || undefined,
    body: payload
  });
}

export async function updateInKindDonation(id, payload) {
  const token = getToken();
  return await api(`/api/in-kind-donations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token: token || undefined,
    body: payload
  });
}

// --- Recurring Pledges & Auto-Pay ---
export async function getRecurringPledges() {
  const res = await api('/api/recurring-pledges');
  return res.ok ? res.data : { pledges: [], stats: { mrr: 0, active_count: 0, total_raised: 0 } };
}

export async function createRecurringPledge(payload) {
  const token = getToken();
  return await api('/api/recurring-pledges', {
    method: 'POST',
    token: token || undefined,
    body: payload
  });
}

export async function toggleRecurringPledge(id) {
  const token = getToken();
  return await api(`/api/recurring-pledges/${encodeURIComponent(id)}/toggle`, {
    method: 'POST',
    token: token || undefined
  });
}

// --- Receipt Verification ---
export async function verifyDonationReceipt(receiptNo) {
  if (!receiptNo) return { ok: false, error: 'Receipt number is required' };
  return await api(`/api/verify-receipt/${encodeURIComponent(receiptNo)}`);
}

// --- Member Donations & Patron Status ---
export async function getMyDonations() {
  const token = getToken();
  const res = await api('/api/my-donations', { token: token || undefined });
  return res.ok ? res.data : { ok: false, donations: [], patron_status: null };
}

// --- Admin Donations Listing & Verification ---
export async function getDonationsList() {
  const token = getToken();
  const res = await api('/api/donations', { token: token || undefined });
  return res.ok ? res.data?.donations || [] : [];
}

export async function verifyDonationCredit({ donation_id, receipt_no, action = 'verify' }) {
  const token = getToken();
  return await api('/api/admin/verify-donation', {
    method: 'POST',
    token: token || undefined,
    body: { donation_id, receipt_no, action }
  });
}
