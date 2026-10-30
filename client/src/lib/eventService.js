import { api } from './api.js';
import { getToken } from './session.js';

export const EVENT_STATUSES = ['Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled'];

export const STATUS_BADGES = {
  Draft: {
    bg: 'bg-neutral-muted/15',
    text: 'text-neutral-ink',
    border: 'border-neutral-muted/30',
    dot: 'bg-neutral-muted'
  },
  Published: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500'
  },
  Ongoing: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500 animate-pulse'
  },
  Completed: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500'
  },
  Cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500'
  }
};

/**
 * Fetch all events with optional filters: status, district, wing, search, public
 */
export async function getEvents(params = {}) {
  const token = getToken();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      query.set(k, v);
    }
  });
  const queryString = query.toString();
  return await api(`/api/events${queryString ? '?' + queryString : ''}`, { token });
}

/**
 * Fetch single event by ID
 */
export async function getEventById(id) {
  const token = getToken();
  return await api(`/api/events/${encodeURIComponent(id)}`, { token });
}

/**
 * Create a new event (Admin / Coordinator)
 */
export async function createEvent(eventData) {
  const token = getToken();
  return await api('/api/events', {
    method: 'POST',
    token,
    body: eventData
  });
}

/**
 * Update an existing event
 */
export async function updateEvent(id, eventData) {
  const token = getToken();
  return await api(`/api/events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token,
    body: eventData
  });
}

/**
 * Update the lifecycle status of an event
 * (Draft, Published, Ongoing, Completed, Cancelled)
 */
export async function updateEventStatus(id, status) {
  const token = getToken();
  return await api(`/api/events/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    token,
    body: { status }
  });
}

/**
 * Delete an event
 */
export async function deleteEvent(id) {
  const token = getToken();
  return await api(`/api/events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token
  });
}

/**
 * Volunteer registers / expresses interest for an event
 */
export async function registerForEvent(id) {
  const token = getToken();
  return await api(`/api/events/${encodeURIComponent(id)}/register`, {
    method: 'POST',
    token
  });
}
