/**
 * StatusBadge Primitive for Phase 2 Task States.
 * Pairs high-contrast color tokens (>= 4.5:1 on tint) with iconography.
 *
 * @prop {'not-started' | 'in-progress' | 'submitted-review' | 'completed' | 'rework' | 'overdue'} status - Task state
 * @prop {string} [className] - Additional Tailwind classes
 */

import Icon from './icons.jsx';

const STATUS_CONFIG = {
  'not-started': {
    label: 'Not Started',
    icon: 'clock',
    classes: 'bg-task-not-started-tint text-task-not-started border-task-not-started-border'
  },
  'in-progress': {
    label: 'In Progress',
    icon: 'clock',
    classes: 'bg-task-in-progress-tint text-task-in-progress border-task-in-progress-border'
  },
  'submitted-review': {
    label: 'Submitted for Review',
    icon: 'file',
    classes: 'bg-task-submitted-review-tint text-task-submitted-review border-task-submitted-review-border'
  },
  completed: {
    label: 'Completed',
    icon: 'check',
    classes: 'bg-task-completed-tint text-task-completed border-task-completed-border'
  },
  rework: {
    label: 'Rejected / Rework Required',
    icon: 'alert',
    classes: 'bg-task-rework-tint text-task-rework border-task-rework-border'
  },
  overdue: {
    label: 'Overdue',
    icon: 'alert',
    classes: 'bg-task-overdue-tint text-task-overdue border-task-overdue-border'
  }
};

export default function StatusBadge({ status, className = '' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['not-started'];

  return (
    <span
      className={`badge border ${config.classes} ${className}`}
      role="status"
    >
      <Icon name={config.icon} className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate">{config.label}</span>
    </span>
  );
}
