/**
 * FormSection Primitive.
 * Responsive fieldset container: 1 column on mobile screens (< md)
 * and 2 columns from md (>= 768px).
 * Designed to seamlessly group existing form/FormField.jsx components.
 *
 * @prop {string} title - Legend / Section heading
 * @prop {string} [description] - Optional section explanation
 * @prop {React.ReactNode} children - FormField components or input nodes
 * @prop {string} [className] - Additional styling classes
 */

export default function FormSection({
  title,
  description,
  children,
  className = ''
}) {
  return (
    <fieldset className={`card-padded border border-brand-green-tint space-y-4 ${className}`}>
      <legend className="sr-only">{title}</legend>
      <div className="border-b border-brand-green-tint/60 pb-3">
        <h2 className="font-display text-lg font-bold text-brand-green-dark sm:text-xl leading-snug">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-neutral-muted sm:text-sm">
            {description}
          </p>
        )}
      </div>

      {/* Responsive Form Grid: 1 col on mobile, 2 cols on md+ */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {children}
      </div>
    </fieldset>
  );
}
