import { api } from './api.js';
import { getToken } from './session.js';

export const TASK_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'COMPLETED', 'REWORK_REQUIRED', 'CANCELLED', 'OVERDUE', 'TODO'];
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const STATUS_CONFIG = {
  TODO: {
    label: 'To Do',
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    border: 'border-neutral-300',
    dot: 'bg-neutral-400'
  },
  NOT_STARTED: {
    label: 'Not Started',
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
  SUBMITTED_FOR_REVIEW: {
    label: 'In Review',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    dot: 'bg-purple-500'
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    dot: 'bg-emerald-600'
  },
  REWORK_REQUIRED: {
    label: 'Rework Required',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    dot: 'bg-amber-500'
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    dot: 'bg-red-500'
  },
  OVERDUE: {
    label: 'Overdue',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    dot: 'bg-rose-500'
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
  },
  URGENT: {
    label: 'Urgent',
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300'
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

// Get subtasks for a task
export async function getSubtasks(taskId) {
  const token = getToken();
  return await api(`/api/tasks/${encodeURIComponent(taskId)}/subtasks`, {
    token
  });
}

// Create a subtask
export async function createSubtask(taskId, titleOrPayload) {
  const token = getToken();
  const body = typeof titleOrPayload === 'string' ? { title: titleOrPayload } : titleOrPayload;
  return await api(`/api/tasks/${encodeURIComponent(taskId)}/subtasks`, {
    method: 'POST',
    token,
    body
  });
}

// Update subtask completion or status
export async function updateSubtaskStatus(arg1, arg2, arg3) {
  const token = getToken();
  let taskId, subtaskId, payload;
  if (arg3 !== undefined) {
    taskId = arg1;
    subtaskId = arg2;
    payload = typeof arg3 === 'boolean' ? { completed: arg3 } : (typeof arg3 === 'string' ? { status: arg3 } : arg3);
  } else if (typeof arg2 === 'boolean' || (typeof arg2 === 'object' && arg2 !== null)) {
    subtaskId = arg1;
    payload = typeof arg2 === 'boolean' ? { completed: arg2 } : arg2;
  } else {
    taskId = arg1;
    subtaskId = arg2;
    payload = {};
  }

  if (taskId) {
    return await api(`/api/tasks/${encodeURIComponent(taskId)}/subtasks/${encodeURIComponent(subtaskId)}`, {
      method: 'PATCH',
      token,
      body: payload
    });
  }
  return await api(`/api/subtasks/${encodeURIComponent(subtaskId)}`, {
    method: 'PATCH',
    token,
    body: payload
  });
}

// Delete a subtask
export async function deleteSubtask(arg1, arg2) {
  const token = getToken();
  if (arg2) {
    return await api(`/api/tasks/${encodeURIComponent(arg1)}/subtasks/${encodeURIComponent(arg2)}`, {
      method: 'DELETE',
      token
    });
  }
  return await api(`/api/subtasks/${encodeURIComponent(arg1)}`, {
    method: 'DELETE',
    token
  });
}

// Task Lifecycle Extras
export async function updateTaskApproval(taskId, approval_status) {
  const token = getToken();
  return await api(`/api/tasks/${encodeURIComponent(taskId)}/approval`, {
    method: 'PATCH',
    token,
    body: { approval_status }
  });
}

export async function markTaskSeen(taskId) {
  const token = getToken();
  return await api(`/api/tasks/${encodeURIComponent(taskId)}/seen`, {
    method: 'POST',
    token
  });
}

export async function addTaskRemarks(taskId, remarks) {
  const token = getToken();
  return await api(`/api/tasks/${encodeURIComponent(taskId)}/remarks`, {
    method: 'POST',
    token,
    body: { remarks }
  });
}

export async function getTaskDocuments(taskId) {
  const token = getToken();
  return await api(`/api/tasks/${encodeURIComponent(taskId)}/documents`, {
    token
  });
}

export async function uploadTaskDocument(taskId, docPayload) {
  const token = getToken();
  return await api(`/api/tasks/${encodeURIComponent(taskId)}/documents`, {
    method: 'POST',
    token,
    body: docPayload
  });
}

export async function markDocumentOpened(taskId, docId) {
  const token = getToken();
  return await api(`/api/tasks/${encodeURIComponent(taskId)}/documents/${encodeURIComponent(docId)}/open`, {
    method: 'POST',
    token
  });
}
