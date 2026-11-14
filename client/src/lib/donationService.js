import { api } from './api.js';
import { getToken } from './session.js';

// Every write goes out with the signed-in admin's token. Reads that only admins may
// make do too. Mutations return the raw { ok, status, data } so screens can show the
// server's message; use errorText() for that.

const authed = (path, opts = {}) => api(path, { ...opts, token: getToken() || undefined });
const enc = encodeURIComponent;

export function errorText(res, fallback = 'Something went wrong. Please try again.') {
  if (!res) return fallback;
  if (res.status === 0) return 'Could not reach the server. Check your connection and try again.';
  if (res.status === 403) return res.data?.error || 'Your admin session has ended. Sign in again.';
  return res.data?.error || fallback;
}

// --- Campaigns ---
// Public list: active and completed campaigns only.
export async function getCampaigns(category = '') {
  const query = category && category !== 'All' ? `?category=${enc(category)}` : '';
  const res = await api(`/api/campaigns${query}`);
  return res.ok ? res.data?.campaigns || [] : [];
}

// Admin list: every status, with offline totals and pending counts.
export async function getAdminCampaigns() {
  const res = await authed('/api/campaigns');
  return res.ok ? { ok: true, campaigns: res.data?.campaigns || [] } : { ok: false, campaigns: [], error: errorText(res) };
}

export async function getCampaignById(id) {
  if (!id) return null;
  const res = await api(`/api/campaigns/${enc(id)}`);
  return res.ok ? res.data?.campaign : null;
}

export const createCampaign = payload => authed('/api/campaigns', { method: 'POST', body: payload });
export const updateCampaign = (id, payload) => authed(`/api/campaigns/${enc(id)}`, { method: 'PUT', body: payload });
export const deleteCampaign = id => authed(`/api/campaigns/${enc(id)}`, { method: 'DELETE' });

// --- Beneficiaries ---
export async function getBeneficiaries() {
  const res = await authed('/api/beneficiaries');
  return res.ok ? { ok: true, beneficiaries: res.data?.beneficiaries || [] } : { ok: false, beneficiaries: [], error: errorText(res) };
}
export const createBeneficiary = payload => authed('/api/beneficiaries', { method: 'POST', body: payload });
export const updateBeneficiary = (id, payload) => authed(`/api/beneficiaries/${enc(id)}`, { method: 'PUT', body: payload });
export const deleteBeneficiary = id => authed(`/api/beneficiaries/${enc(id)}`, { method: 'DELETE' });

// --- Coordinator field collections ---
const EMPTY_COLLECTIONS = { coordinators: [], total_collected: 0, total_target: 0, pending_reconciliation: 0 };
export async function getCoordinatorDonations() {
  const res = await authed('/api/coordinator-donations');
  return res.ok ? { ok: true, ...EMPTY_COLLECTIONS, ...res.data } : { ok: false, ...EMPTY_COLLECTIONS, error: errorText(res) };
}
export const createCoordinator = payload => authed('/api/coordinator-donations', { method: 'POST', body: payload });
export const updateCoordinator = (id, payload) => authed(`/api/coordinator-donations/${enc(id)}`, { method: 'PUT', body: payload });
export const recordCoordinatorCollection = (id, payload) => authed(`/api/coordinator-donations/${enc(id)}/collections`, { method: 'POST', body: payload });
export const remitCoordinatorCollection = payload => authed('/api/coordinator-donations/remit', { method: 'POST', body: payload });

// --- In-kind gifts ---
export async function getInKindDonations() {
  const res = await authed('/api/in-kind-donations');
  return res.ok
    ? { ok: true, items: res.data?.in_kind_donations || [], total_valuation: res.data?.total_valuation || 0 }
    : { ok: false, items: [], total_valuation: 0, error: errorText(res) };
}
export const createInKindDonation = payload => authed('/api/in-kind-donations', { method: 'POST', body: payload });
export const updateInKindDonation = (id, payload) => authed(`/api/in-kind-donations/${enc(id)}`, { method: 'PUT', body: payload });

// --- Recurring pledges ---
const EMPTY_STATS = { mrr: 0, active_count: 0, total_pledges: 0, total_raised: 0, overdue_count: 0 };
export async function getRecurringPledges() {
  const res = await authed('/api/recurring-pledges');
  return res.ok
    ? { ok: true, pledges: res.data?.pledges || [], stats: { ...EMPTY_STATS, ...res.data?.stats } }
    : { ok: false, pledges: [], stats: EMPTY_STATS, error: errorText(res) };
}
export const createRecurringPledge = payload => authed('/api/recurring-pledges', { method: 'POST', body: payload });
export const recordPledgePayment = (id, payload) => authed(`/api/recurring-pledges/${enc(id)}/payments`, { method: 'POST', body: payload });
export const setPledgeStatus = (id, status) => authed(`/api/recurring-pledges/${enc(id)}/status`, { method: 'POST', body: { status } });
export const toggleRecurringPledge = id => authed(`/api/recurring-pledges/${enc(id)}/toggle`, { method: 'POST' });

// --- Public receipt check ---
export async function verifyDonationReceipt(receiptNo) {
  if (!receiptNo) return { ok: false, status: 400, data: { error: 'Enter a receipt number.' } };
  return api(`/api/verify-receipt/${enc(receiptNo)}`);
}

// --- A member's own donations ---
export async function getMyDonations() {
  const res = await authed('/api/my-donations');
  return res.ok ? res.data : { ok: false, donations: [], patron_status: null };
}

// --- Donations (public form and admin desk) ---
export const createDonation = payload => authed('/api/donations', { method: 'POST', body: payload, timeoutMs: 30000 });

export async function getDonationsList() {
  const res = await authed('/api/donations');
  return res.ok ? { ok: true, donations: res.data?.donations || [] } : { ok: false, donations: [], error: errorText(res) };
}

export async function getDonationProof(id) {
  const res = await authed(`/api/admin/donations/${enc(id)}/proof`);
  return res.ok ? { ok: true, screenshot: res.data?.screenshot } : { ok: false, error: errorText(res) };
}

export const verifyDonationCredit = ({ donation_id, receipt_no, action = 'verify', reason }) =>
  authed('/api/admin/verify-donation', { method: 'POST', body: { donation_id, receipt_no, action, reason } });

// Receipt PDFs open in a new tab, so the admin token travels in the link.
export function adminReceiptUrl(receiptNo) {
  const t = getToken();
  return `/api/receipts/${enc(receiptNo)}.pdf${t ? `?t=${enc(t)}` : ''}`;
}
