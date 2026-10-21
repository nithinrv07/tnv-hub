// Label, control, hint and error for one field. The control is passed as a
// render function so it can receive the ids it must reference for a11y.
export const inputClass = invalid =>
  `block w-full min-h-tap rounded-lg border bg-white px-3 py-2.5 text-base text-neutral-ink placeholder:text-neutral-muted/70 focus:outline-none focus:ring-2 ${
    invalid
      ? 'border-status-no-answer focus:ring-status-no-answer/40'
      : 'border-neutral-muted/40 focus:border-brand-green focus:ring-brand-green/30'
  }`;

export default function FormField({ id, label, hint, error, status, children, className = '' }) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-semibold text-neutral-ink">
        {label}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-neutral-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-status-no-answer" role="alert">
          {error}
        </p>
      )}
      {status && !error && (
        <p className="mt-1.5 text-sm font-medium text-brand-green" aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
