import { api } from './api.js';
import { getToken } from './session.js';

export async function getDistricts() {
  const res = await api('/api/districts');
  return res.ok ? res.data.districts || [] : [];
}

export async function getOptions() {
  const res = await api('/api/options');
  return res.ok ? res.data : null;
}

export async function getConstituencies(districtId) {
  if (!districtId) return [];
  const res = await api(`/api/constituencies?district_id=${encodeURIComponent(districtId)}`);
  return res.ok ? res.data.constituencies || [] : [];
}

export async function registerVolunteer(payload) {
  return await api('/api/register', {
    method: 'POST',
    body: payload
  });
}

export async function getMyProfile() {
  const token = getToken();
  return await api('/api/my-profile', { token });
}

export async function getMyLinks() {
  const token = getToken();
  return await api('/api/my-links', { token });
}

export async function getMemberDocuments() {
  const token = getToken();
  return await api('/api/member-documents', { token });
}

export async function recordPayment({ profile_id, utr, payment_mode = 'UPI_QR' }) {
  const token = getToken();
  return await api('/api/record-payment', {
    method: 'POST',
    token,
    body: { profile_id, utr, payment_mode }
  });
}

export async function updatePhoto(profile_id, photo_base64) {
  const token = getToken();
  return await api('/api/update-photo', {
    method: 'POST',
    token,
    body: { profile_id, photo_base64 }
  });
}
