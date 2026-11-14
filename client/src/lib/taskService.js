import { api } from './api.js';
import { getToken } from './session.js';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

export const STATUS_CONFIG = {
  TODO: {
    label: 'To Do',
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    border: 'border-neutral-300',
    dot: 'bg-neutral-400'
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    dot: 'bg-blue-500 animate-pulse'
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-600'
  }
};

export const PRIORITY_CONFIG = {
  LOW: {
    label: 'Low Priority',
    bg: 'bg-neutral-100',
    text: 'text-neutral-600',
    border: 'border-neutral-200'
  },
  MEDIUM: {
    label: 'Medium Priority',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200'
  },
  HIGH: {
    label: 'High Priority',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200'
  }
};

/**
 * Fetch tasks for current authenticated user
 * (Admin gets all or filtered; Volunteer gets their assigned tasks)
 */
export async function getTasks(params = {}) {
  const token = getToken();
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      query.set(k, v);
    }
  });
  const queryString = query.toString();
  return await api(`/api/tasks${queryString ? '?' + queryString : ''}`, { token });
}

/**
 * Fetch registered volunteers for the task assignee dropdown
 */
export async function getVolunteers() {
  const token = getToken();
  return await api('/api/tasks/volunteers', { token });
}

/**
 * Create and assign a task (Master Admin)
 */
export async function createTask(payload) {
  const token = getToken();
  return await api('/api/tasks', {
    method: 'POST',
    token,
    body: payload
  });
}

/**
 * Update task status (Volunteer or Admin)
 */
export async function updateTaskStatus(id, status) {
  const token = getToken();
  return await api(`/api/tasks/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    token,
    body: { status }
  });
}

/**
 * Delete a task (Admin)
 */
export async function deleteTask(id) {
  const token = getToken();
  return await api(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token
  });
}
