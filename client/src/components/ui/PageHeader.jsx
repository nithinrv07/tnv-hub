/**
 * PageHeader Primitive for internal dashboards and workbenches.
 * Responsive: actions stack below header on mobile and align inline on desktop.
 * Includes breadcrumb hierarchy and bilingual typography styling.
 *
 * @prop {string} title - Main page heading
 * @prop {string} [subtitle] - Explanatory caption or department meta
 * @prop {Array<{ label: string, to?: string, href?: string }>} [breadcrumbs] - Breadcrumb path
 * @prop {React.ReactNode} [actions] - Action buttons slot
 * @prop {string} [className] - Additional styling classes
 */

import { Link } from 'react-router-dom';
import Icon from './icons.jsx';

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  className = ''
}) {
  return (
    <header className={`space-y-3 pb-4 ${className}`}>
      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-neutral-muted">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;

              return (
                <li key={crumb.label} className="inline-flex items-center gap-1.5">
                  {idx > 0 && (
                    <Icon name="chevron-right" className="h-3.5 w-3.5 text-neutral-muted/60" aria-hidden="true" />
                  )}
                  {isLast ? (
                    <span className="font-semibold text-neutral-ink truncate" aria-current="page">
                      {crumb.label}
                    </span>
                  ) : crumb.to ? (
                    <Link
                      to={crumb.to}
                      className="hover:text-brand-green-dark hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow rounded-sm"
                    >
                      {crumb.label}
                    </Link>
                  ) : crumb.href ? (
                    <a
                      href={crumb.href}
                      className="hover:text-brand-green-dark hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow rounded-sm"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span>{crumb.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Title & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title leading-tight break-words">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-neutral-muted sm:text-base leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
