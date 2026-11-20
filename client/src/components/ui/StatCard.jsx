/**
 * StatCard Primitive for metrics, KPIs, and operational counters.
 * Adheres to WCAG 2.1 AA: warns & dangers pair color with a mandatory icon.
 *
 * @prop {string} label - Title or description of the metric
 * @prop {string|number} value - Big quantitative number or display string
 * @prop {string} [hint] - Trend or secondary context (e.g. "+12% this month")
 * @prop {React.ReactNode} [icon] - Custom icon; auto-provided for warn/danger if omitted
 * @prop {'neutral' | 'good' | 'warn' | 'danger'} [tone='neutral'] - Semantic tone
 * @prop {Function} [onClick] - Optional click handler (makes card interactive button)
 * @prop {string} [href] - Optional link target (renders as React Router Link)
 * @prop {string} [className] - Additional styling
 */

import { Link } from 'react-router-dom';
import Icon from './icons.jsx';

const TONES = {
  neutral: {
    container: 'border-brand-green-tint bg-white text-neutral-ink',
    valueColor: 'text-neutral-ink',
    iconWrap: 'bg-neutral-bg text-neutral-muted'
  },
  good: {
    container: 'border-task-completed-border bg-task-completed-tint/40 text-neutral-ink',
    valueColor: 'text-task-completed',
    iconWrap: 'bg-task-completed-tint text-task-completed'
  },
  warn: {
    container: 'border-task-rework-border bg-task-rework-tint/40 text-neutral-ink',
    valueColor: 'text-task-rework',
    iconWrap: 'bg-task-rework-tint text-task-rework'
  },
  danger: {
    container: 'border-task-overdue-border bg-task-overdue-tint/40 text-neutral-ink',
    valueColor: 'text-task-overdue',
    iconWrap: 'bg-task-overdue-tint text-task-overdue'
  }
};

export default function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
  onClick,
  href,
  className = '',
  ...props
}) {
  const toneStyle = TONES[tone] || TONES.neutral;

  // Accessibility enforcement: When tone is danger or warn, never rely on color alone.
  const displayIcon =
    icon ||
    (tone === 'danger' ? (
      <Icon name="alert" label="Urgent attention required" className="h-5 w-5" />
    ) : tone === 'warn' ? (
      <Icon name="alert" label="Warning status" className="h-5 w-5" />
    ) : null);

  const content = (
    <div className="flex h-full flex-col justify-between">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-muted leading-snug">{label}</p>
        {displayIcon && (
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${toneStyle.iconWrap}`}>
            {displayIcon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className={`font-display text-3xl font-extrabold tracking-tight sm:text-4xl ${toneStyle.valueColor}`}>
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-xs font-medium text-neutral-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  );

  const baseClasses = `card-padded transition-shadow duration-200 ${toneStyle.container} ${className}`;

  if (href) {
    return (
      <Link
        to={href}
        className={`${baseClasses} block min-h-tap hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow`}
        {...props}
      >
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClasses} text-left w-full min-h-tap cursor-pointer hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow`}
        {...props}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={baseClasses} {...props}>
      {content}
    </div>
  );
}
