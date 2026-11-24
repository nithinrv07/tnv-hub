/**
 * Accessible Button Primitive built on TNV Civic .btn classes.
 *
 * @prop {'primary' | 'outline' | 'ghost' | 'danger'} [variant='primary'] - Visual styling variant
 * @prop {'md' | 'lg'} [size='md'] - Button size (both guarantee min-h-tap 44px)
 * @prop {boolean} [loading=false] - Whether button is in loading state (shows Spinner)
 * @prop {boolean} [disabled=false] - Disabled state
 * @prop {React.ReactNode} [icon] - Leading icon
 * @prop {React.ReactNode} children - Button text or content
 * @prop {string} [type='button'] - Button HTML type
 * @prop {string} [className] - Additional classes
 */

import Spinner from '../Spinner.jsx';

const VARIANTS = {
  primary: 'bg-brand-green text-white hover:bg-brand-green-dark focus:ring-2 focus:ring-brand-green/30',
  outline: 'border-2 border-brand-green text-brand-green hover:bg-brand-green-tint focus:ring-2 focus:ring-brand-green/30',
  ghost: 'bg-transparent text-neutral-ink hover:bg-neutral-bg hover:text-brand-green-dark focus:ring-2 focus:ring-brand-yellow',
  danger: 'bg-task-overdue text-white hover:bg-[#991b1b] focus:ring-2 focus:ring-task-overdue/40'
};

const SIZES = {
  md: 'min-h-tap px-4 py-2 text-sm sm:text-base',
  lg: 'min-h-tap px-6 py-3 text-base sm:text-lg'
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  children,
  type = 'button',
  className = '',
  onClick,
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled ? 'true' : undefined}
      onClick={isDisabled ? undefined : onClick}
      className={`btn ${variantClass} ${sizeClass} ${
        isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-[0.99]'
      } ${className}`}
      {...props}
    >
      {loading ? (
        <Spinner className="mr-2 h-4 w-4 shrink-0 text-current" />
      ) : icon ? (
        <span className="mr-2 inline-flex shrink-0 items-center justify-center" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className="inline-block truncate">{children}</span>
    </button>
  );
}
