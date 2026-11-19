import { api } from './api.js';
import { getToken } from './session.js';

const authed = (path, opts = {}) => api(path, { ...opts, token: getToken() || undefined });
const enc = encodeURIComponent;

export function errorText(res, fallback = 'Something went wrong. Please try again.') {
  if (!res) return fallback;
  if (res.status === 0) return 'Could not reach server. Please check your network connection.';
  if (res.status === 401) return 'Session expired. Please sign in again.';
  if (res.status === 403) return 'Admin access required.';
  return res.data?.error || fallback;
}

// 1. Submit Visitor Query
export async function submitVisitorQuery(payload) {
  const res = await api('/api/support/visitor-query', {
    method: 'POST',
    body: payload
  });
  if (!res.ok) {
    return { ok: false, error: errorText(res) };
  }
  return { ok: true, ticket_number: res.data?.ticket_number, item: res.data?.item, message: res.data?.message };
}

// 2. Lookup Visitor Query by Name + Mobile or Ticket Reference
export async function lookupVisitorQuery({ name = '', mobile = '', ticket = '' } = {}) {
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  if (mobile) params.set('mobile', mobile);
  if (ticket) params.set('ticket', ticket);

  const res = await api(`/api/support/visitor-lookup?${params.toString()}`);
  if (!res.ok) {
    return { ok: false, items: [], error: errorText(res) };
  }
  return { ok: true, items: res.data?.items || [] };
}

// 3. Submit Member Complaint
export async function submitMemberComplaint(payload) {
  const res = await authed('/api/support/member-complaint', {
    method: 'POST',
    body: payload
  });
  if (!res.ok) {
    return { ok: false, error: errorText(res) };
  }
  return { ok: true, ticket_number: res.data?.ticket_number, item: res.data?.item, message: res.data?.message };
}

// 4. Get My Support Tickets (Member Desk)
export async function getMySupportTickets() {
  const res = await authed('/api/support/my-tickets');
  if (!res.ok) {
    return { ok: false, items: [], error: errorText(res) };
  }
  return { ok: true, items: res.data?.items || [] };
}

// 5. Admin: Get all tickets & KPI metrics
export async function getAdminSupportTickets() {
  const res = await authed('/api/support/admin/tickets');
  if (!res.ok) {
    return { ok: false, items: [], metrics: { total: 0, new: 0, in_progress: 0, resolved: 0 }, error: errorText(res) };
  }
  return {
    ok: true,
    items: res.data?.items || [],
    metrics: res.data?.metrics || { total: 0, new: 0, in_progress: 0, resolved: 0 }
  };
}

// 6. Admin: Reply or update status
export async function replyAdminSupportTicket(payload) {
  const res = await authed('/api/support/admin/reply', {
    method: 'POST',
    body: payload
  });
  if (!res.ok) {
    return { ok: false, error: errorText(res) };
  }
  return { ok: true, item: res.data?.item, message: res.data?.message };
}
