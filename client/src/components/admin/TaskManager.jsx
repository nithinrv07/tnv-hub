import { useState, useEffect, useMemo } from 'react';
import {
  getTasks,
  getVolunteers,
  createTask,
  updateTaskStatus,
  deleteTask,
  TASK_STATUSES,
  TASK_PRIORITIES,
  STATUS_CONFIG,
  PRIORITY_CONFIG
} from '../../lib/taskService.js';
import Spinner from '../Spinner.jsx';

export default function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskDeadline, setTaskDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete State
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Status updating indicator
  const [updatingId, setUpdatingId] = useState(null);

  const showToast = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    const [tasksRes, volRes] = await Promise.all([
      getTasks(),
      getVolunteers()
    ]);
    setLoading(false);

    if (tasksRes.ok && Array.isArray(tasksRes.data?.tasks)) {
      setTasks(tasksRes.data.tasks);
    } else {
      setError(tasksRes.data?.error || 'Unable to load tasks.');
    }

    if (volRes.ok && Array.isArray(volRes.data?.volunteers)) {
      setVolunteers(volRes.data.volunteers);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'TODO').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const highPriority = tasks.filter(t => t.priority === 'HIGH' && t.status !== 'COMPLETED').length;
    return { total, todo, inProgress, completed, highPriority };
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = (t.title || '').toLowerCase().includes(q);
        const inDesc = (t.description || '').toLowerCase().includes(q);
        const inAssignee = (t.assignee_name || '').toLowerCase().includes(q);
        const inDist = (t.assignee_district || '').toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inAssignee && !inDist) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  // Handle Create Task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDesc.trim() || !taskDeadline || !taskAssignee) {
      setModalError('Please fill in title, description, volunteer assignee, and deadline.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    const res = await createTask({
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      assignee_id: taskAssignee,
      priority: taskPriority,
      deadline: taskDeadline
    });

    setSubmitting(false);

    if (res.ok && res.data?.task) {
      setIsModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setTaskAssignee('');
      setTaskPriority('MEDIUM');
      setTaskDeadline('');
      showToast('Task successfully assigned to volunteer.');
      loadData();
    } else {
      setModalError(res.data?.error || 'Failed to create task.');
    }
  };

  // Quick Status Update
  const handleStatusChange = async (taskId, newStatus) => {
    setUpdatingId(taskId);
    const res = await updateTaskStatus(taskId, newStatus);
    setUpdatingId(null);
    if (res.ok) {
      showToast(`Task status updated to "${STATUS_CONFIG[newStatus]?.label || newStatus}".`);
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } else {
      setError(res.data?.error || 'Failed to update task status.');
    }
  };

  // Confirm Delete Task
  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteTask(deleteId);
    setDeleting(false);
    if (res.ok) {
      showToast('Task removed successfully.');
      setTasks(prev => prev.filter(t => t.id !== deleteId));
      setDeleteId(null);
    } else {
      setError(res.data?.error || 'Failed to delete task.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {successMsg}
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900 text-xs">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-900 shadow-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900 text-xs">Dismiss</button>
        </div>
      )}

      {/* Top Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-green-tint shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-full bg-brand-green-tint px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-green-dark">
              Operations & Field Coordination
            </span>
            <span className="text-xs text-neutral-muted">• Master Admin Roster</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-neutral-ink mt-1">
            Task Coordination Roster
          </h2>
          <p className="text-xs sm:text-sm text-neutral-muted mt-0.5">
            Assign field tasks to registered volunteers and track their real-time execution from To Do to Completed.
          </p>
        </div>
        <button
          onClick={() => {
            setModalError('');
            setIsModalOpen(true);
          }}
          className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold shadow-sm shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Assign New Task
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'All Tasks', count: metrics.total, key: 'ALL', color: 'border-brand-green-tint bg-white text-neutral-ink' },
          { label: 'To Do', count: metrics.todo, key: 'TODO', color: 'border-neutral-200 bg-neutral-50 text-neutral-800' },
          { label: 'In Progress', count: metrics.inProgress, key: 'IN_PROGRESS', color: 'border-blue-200 bg-blue-50 text-blue-900', pulse: true },
          { label: 'Completed', count: metrics.completed, key: 'COMPLETED', color: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
          { label: 'High Priority', count: metrics.highPriority, key: 'HIGH', color: 'border-red-200 bg-red-50 text-red-900' }
        ].map(m => (
          <button
            key={m.key}
            onClick={() => {
              if (m.key === 'HIGH') {
                setPriorityFilter('HIGH');
                setStatusFilter('ALL');
              } else {
                setStatusFilter(m.key);
                setPriorityFilter('ALL');
              }
            }}
            className={`p-3.5 rounded-xl border text-left transition-all ${m.color} ${
              (statusFilter === m.key || (m.key === 'HIGH' && priorityFilter === 'HIGH')) ? 'ring-2 ring-brand-green shadow-sm' : 'hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-muted">{m.label}</span>
              {m.pulse && metrics.inProgress > 0 && <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping" />}
            </div>
            <p className="text-2xl font-bold font-display mt-1">{m.count}</p>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-brand-green-tint shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search tasks by title, instructions, volunteer, or district..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-neutral-muted/30 pl-9 pr-4 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
          />
          <svg className="w-4 h-4 text-neutral-muted absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Status Dropdown */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm text-neutral-ink focus:border-brand-green focus:outline-none"
        >
          <option value="ALL">All Statuses ({metrics.total})</option>
          <option value="TODO">To Do ({metrics.todo})</option>
          <option value="IN_PROGRESS">In Progress ({metrics.inProgress})</option>
          <option value="COMPLETED">Completed ({metrics.completed})</option>
        </select>

        {/* Priority Dropdown */}
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm text-neutral-ink focus:border-brand-green focus:outline-none"
        >
          <option value="ALL">All Priorities</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>

        {(statusFilter !== 'ALL' || priorityFilter !== 'ALL' || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setPriorityFilter('ALL');
              setSearchQuery('');
            }}
            className="px-3 py-2 text-xs font-semibold text-brand-green hover:underline shrink-0"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Task List / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-brand-green-tint p-12 text-center">
          <Spinner className="mx-auto h-8 w-8 text-brand-green" />
          <p className="mt-3 text-sm text-neutral-muted">Loading coordination tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-green-tint p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-brand-green-tint text-brand-green mx-auto flex items-center justify-center mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="font-bold text-neutral-ink text-base font-display">No Tasks Found</h3>
          <p className="text-xs text-neutral-muted mt-1 max-w-sm mx-auto">
            {tasks.length === 0
              ? 'No tasks have been assigned yet. Click "Assign New Task" to delegate operational work to volunteers.'
              : 'No tasks match your current filter settings. Adjust filters or search terms.'}
          </p>
          <button
            onClick={() => {
              setModalError('');
              setIsModalOpen(true);
            }}
            className="btn-primary mt-4 px-4 py-2 text-xs font-semibold"
          >
            Assign Task
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-neutral-muted px-1 flex items-center justify-between">
            <span>Showing {filteredTasks.length} of {tasks.length} tasks</span>
            <span className="text-[11px] text-brand-green-dark">Volunteer status updates reflect here live</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTasks.map(t => {
              const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.TODO;
              const priorityCfg = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.MEDIUM;
              const formattedDeadline = t.deadline
                ? new Date(t.deadline).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'No deadline';

              const isOverdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== 'COMPLETED';

              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between ${
                    t.status === 'COMPLETED' ? 'border-emerald-200/80 bg-emerald-50/20' : 'border-brand-green-tint'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${priorityCfg.bg} ${priorityCfg.text} ${priorityCfg.border}`}>
                        {priorityCfg.label}
                      </span>

                      {/* Status Dropdown (live reflection) */}
                      <div className="flex items-center gap-1.5">
                        <select
                          disabled={updatingId === t.id}
                          value={t.status}
                          onChange={e => handleStatusChange(t.id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border cursor-pointer outline-none transition-all ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className={`text-base font-bold font-display text-neutral-ink leading-snug ${
                      t.status === 'COMPLETED' ? 'line-through text-neutral-500' : ''
                    }`}>
                      {t.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-neutral-muted leading-relaxed line-clamp-3">
                      {t.description}
                    </p>

                    {/* Assignee Information Strip */}
                    <div className="pt-2 border-t border-neutral-100 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-brand-green-tint text-brand-green-dark font-bold flex items-center justify-center text-[10px] shrink-0">
                          {t.assignee_name ? t.assignee_name.charAt(0).toUpperCase() : 'V'}
                        </span>
                        <div className="min-w-0 flex-1 truncate">
                          <span className="font-semibold text-neutral-ink">{t.assignee_name}</span>
                          <span className="text-[11px] text-neutral-muted ml-1.5">({t.assignee_district} • {t.assignee_wing})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-neutral-muted pt-1">
                        <svg className="w-3.5 h-3.5 text-brand-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className={isOverdue ? 'text-red-600 font-bold' : ''}>
                          Deadline: {formattedDeadline} {isOverdue && '(Overdue)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                    <span className="text-neutral-400 font-mono text-[10px]">
                      {t.id}
                    </span>

                    <button
                      onClick={() => setDeleteId(t.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
                    >
                      Remove Task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ASSIGN TASK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 md:p-6 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-brand-green-tint my-auto max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header (Fixed at top) */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 shrink-0 bg-white">
              <div>
                <h3 className="text-lg font-bold font-display text-neutral-ink">
                  Assign Task to Volunteer
                </h3>
                <p className="text-xs text-neutral-muted mt-0.5">
                  Set operational instructions, target volunteer, urgency level, and deadline.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 text-2xl font-bold leading-none p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {/* Modal Form (Body scrolls, Footer stays fixed at bottom) */}
            <form onSubmit={handleCreateTask} className="flex flex-col flex-1 overflow-hidden">
              <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1">
                {modalError && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
                    {modalError}
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distribute Emergency Ration Kits in Cuddalore Buffer"
                    value={taskTitle}
                    onChange={e => setTaskTitle(e.target.value)}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>

                {/* Assignee Volunteer Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Assign to Volunteer <span className="text-red-500">*</span>
                  </label>
                  {volunteers.length === 0 ? (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                      No approved volunteers currently registered in the database.
                    </div>
                  ) : (
                    <select
                      required
                      value={taskAssignee}
                      onChange={e => setTaskAssignee(e.target.value)}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    >
                      <option value="">-- Select Volunteer --</option>
                      {volunteers.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.district} • {v.wing})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-neutral-ink mb-1">
                    Detailed Instructions & Guidelines <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Detail the operational tasks, reporting protocols, supply collection point, and guidelines..."
                    value={taskDesc}
                    onChange={e => setTaskDesc(e.target.value)}
                    className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>

                {/* Priority & Deadline Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Priority Level
                    </label>
                    <select
                      value={taskPriority}
                      onChange={e => setTaskPriority(e.target.value)}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-ink mb-1">
                      Target Deadline <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={taskDeadline}
                      onChange={e => setTaskDeadline(e.target.value)}
                      className="w-full rounded-lg border border-neutral-muted/30 px-3 py-2 text-sm focus:border-brand-green focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer (Fixed at bottom) */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 shrink-0 bg-neutral-50/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-200/70 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || volunteers.length === 0}
                  className="btn-primary px-5 py-2 text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
                >
                  {submitting && <Spinner className="w-3.5 h-3.5" />}
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-red-200 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h4 className="font-bold text-neutral-ink text-base font-display">Delete Task?</h4>
            <p className="text-xs text-neutral-muted mt-1">
              Are you sure you want to remove this task from the coordination roster?
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-1.5"
              >
                {deleting && <Spinner className="w-3.5 h-3.5" />}
                Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
