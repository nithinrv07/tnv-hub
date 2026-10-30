import { api } from './api.js';
import { getToken } from './session.js';

export async function getQueue(params = {}) {
  const token = getToken();
  const query = new URLSearchParams(params).toString();
  return await api(`/api/admin/queue${query ? '?' + query : ''}`, { token });
}

export async function getFollowups() {
  const token = getToken();
  return await api('/api/admin/followups', { token });
}

export async function revealAadhaar(profile_id, master_key) {
  const token = getToken();
  return await api('/api/admin/reveal-aadhaar', {
    method: 'POST',
    token,
    body: { profile_id, master_key }
  });
}

export async function logCall({ profile_id, status, outcome, notes, note, callback_at }) {
  const token = getToken();
  return await api('/api/admin/log-call', {
    method: 'POST',
    token,
    body: {
      profile_id,
      status: status || outcome,
      notes: notes !== undefined ? notes : note,
      callback_at
    }
  });
}

export async function getCallLogs(profile_id) {
  const token = getToken();
  return await api(`/api/admin/call-logs?profile_id=${encodeURIComponent(profile_id)}`, { token });
}

export async function getQuestions(active_only = false) {
  const query = active_only ? '?active_only=true' : '';
  return await api(`/api/admin/questions${query}`);
}

export async function saveQuestion(question) {
  const token = getToken();
  const method = question.id ? 'PUT' : 'POST';
  return await api('/api/admin/questions', {
    method,
    token,
    body: question
  });
}

export async function setActiveQuestions(question_ids) {
  const token = getToken();
  return await api('/api/admin/questions/set-active', {
    method: 'POST',
    token,
    body: { active_ids: question_ids, question_ids }
  });
}

export async function toggleQuestionActive(id, active) {
  const token = getToken();
  return await api('/api/admin/questions/toggle-active', {
    method: 'PATCH',
    token,
    body: { id, active }
  });
}

export async function deleteQuestion(id) {
  const token = getToken();
  return await api(`/api/admin/questions?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token
  });
}

export async function getScores(profile_id) {
  const token = getToken();
  return await api(`/api/admin/scores?profile_id=${encodeURIComponent(profile_id)}`, { token });
}

export async function saveScores({ profile_id, scores, notes = {}, total_score, suggested_role }) {
  const token = getToken();
  let formattedScores = scores;
  if (!Array.isArray(scores) && typeof scores === 'object' && scores !== null) {
    formattedScores = Object.entries(scores).map(([qId, val]) => ({
      question_id: Number(qId),
      score: Number(val),
      note: (notes[qId] || '').trim()
    }));
  }
  return await api('/api/admin/save-scores', {
    method: 'POST',
    token,
    body: { profile_id, scores: formattedScores, total_score, suggested_role }
  });
}

export async function approveApplicant({ profile_id, role, assigned_role, wing_id, assigned_wing, decision, notes }) {
  const token = getToken();
  return await api('/api/admin/approve', {
    method: 'POST',
    token,
    body: {
      profile_id,
      role: role || assigned_role || 'volunteer',
      wing_id: wing_id || null,
      decision,
      notes
    }
  });
}

export async function setMemberBlocked(profile_id, blocked, reason) {
  const token = getToken();
  return await api('/api/admin/members/block', {
    method: 'POST',
    token,
    body: { profile_id, blocked, reason }
  });
}

// Collaboration & partnership applications (separate workflow from volunteers)
export async function getCollabApplications() {
  const token = getToken();
  return await api('/api/admin/collab', { token });
}

// Event Management Functions
export {
  EVENT_STATUSES,
  STATUS_BADGES,
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
  deleteEvent,
  registerForEvent
} from './eventService.js';

export async function decideCollabApplication({ id, decision, remarks }) {
  const token = getToken();
  return await api('/api/admin/collab/decision', {
    method: 'POST',
    token,
    body: { id, decision, remarks }
  });
}
