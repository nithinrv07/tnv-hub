/**
 * EmptyState Primitive.
 * Used for empty tables, unassigned queues, search zeroes, and blank workbenches.
 *
 * @prop {React.ReactNode} [icon] - Custom icon (defaults to folder icon)
 * @prop {string} title - Main explanatory heading
 * @prop {string} [message] - Helpful subtext instructing user what to do next
 * @prop {React.ReactNode} [action] - Call to action button or link
 * @prop {string} [className] - Additional styling classes
 */

import Icon from './icons.jsx';

export default function EmptyState({
  icon,
  title = 'No items found',
  message = 'There is nothing to display here right now.',
  action,
  className = ''
}) {
  return (
    <div
      className={`card-padded flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}
      role="region"
      aria-label={title}
    >
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-brand-green-tint/60 text-brand-green">
        {icon || <Icon name="folder" className="h-7 w-7" aria-hidden="true" />}
      </div>

      <h3 className="section-title text-lg sm:text-xl text-brand-green-dark">
        {title}
      </h3>

      {message && (
        <p className="mt-1.5 max-w-md text-sm text-neutral-muted leading-relaxed">
          {message}
        </p>
      )}

      {action && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {action}
        </div>
      )}
    </div>
  );
}
