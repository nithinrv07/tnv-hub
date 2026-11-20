/**
 * DataTable Component - Hybrid Desktop Table & Mobile Stacked Cards.
 * Desktop (md and up): High-density <table> with sticky header and horizontal scroll wrapper.
 * Mobile (< md): Responsive stacked cards with primary header, key-value rows, and action area.
 * Zero horizontal scrolling or clipping on 360px viewports.
 *
 * @prop {Array<{
 *   key: string,
 *   header: string,
 *   render?: (value: any, row: any) => React.ReactNode,
 *   primary?: boolean,
 *   mobileLabel?: string,
 *   align?: 'left' | 'center' | 'right'
 * }>} columns - Column definitions
 * @prop {Array<Object>} rows - Data rows
 * @prop {string|Function} [rowKey='id'] - Key extractor property name or function
 * @prop {Function} [onRowClick] - Click handler for rows/cards
 * @prop {boolean} [loading=false] - Whether table is in loading state
 * @prop {React.ReactNode} [emptyState] - Custom empty state component
 * @prop {string} [caption] - Screen reader table caption
 * @prop {string} [className] - Additional styling wrapper class
 */

import Spinner from '../Spinner.jsx';
import EmptyState from './EmptyState.jsx';

export default function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  onRowClick,
  loading = false,
  emptyState,
  caption,
  className = ''
}) {
  const getRowKey = (row, index) => {
    if (typeof rowKey === 'function') return rowKey(row, index);
    return row[rowKey] !== undefined ? row[rowKey] : index;
  };

  const primaryCol = columns.find(col => col.primary) || columns[0];
  const actionCols = columns.filter(col => col.key === 'action' || col.key === 'actions');
  const detailCols = columns.filter(
    col => col !== primaryCol && col.key !== 'action' && col.key !== 'actions'
  );

  const getAlignClass = (align = 'left') => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  // Loading View
  if (loading) {
    return (
      <div className={`card-padded flex min-h-[220px] flex-col items-center justify-center gap-3 text-neutral-muted ${className}`} aria-busy="true">
        <Spinner className="h-8 w-8 text-brand-green" />
        <p className="text-sm font-semibold text-neutral-ink">Loading data...</p>
      </div>
    );
  }

  // Empty View
  if (!rows || rows.length === 0) {
    return (
      <div className={className}>
        {emptyState || <EmptyState title="No records found" message="There are currently no rows to display in this table." />}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* =========================================================================
          Desktop View (md and up): Semantic <table> with sticky header
          ========================================================================= */}
      <div className="hidden md:block overflow-x-auto rounded-card border border-brand-green-tint bg-white shadow-card">
        <table className="w-full border-collapse text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="sticky top-0 z-10 border-b border-brand-green-tint bg-neutral-bg">
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  scope="col"
                  className={`table-header ${getAlignClass(col.align)}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-green-tint/50 text-neutral-ink">
            {rows.map((row, index) => {
              const key = getRowKey(row, index);
              const isClickable = Boolean(onRowClick);

              return (
                <tr
                  key={key}
                  tabIndex={isClickable ? 0 : undefined}
                  role={isClickable ? 'button' : undefined}
                  onClick={isClickable ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    isClickable
                      ? e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={`transition-colors duration-150 ${
                    isClickable
                      ? 'cursor-pointer hover:bg-neutral-bg/70 focus-visible:bg-neutral-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow'
                      : 'hover:bg-neutral-bg/40'
                  }`}
                >
                  {columns.map(col => {
                    const value = row[col.key];
                    const content = col.render ? col.render(value, row) : value;

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3.5 align-middle ${getAlignClass(col.align)} ${
                          col.primary ? 'font-semibold text-brand-green-dark' : ''
                        }`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* =========================================================================
          Mobile View (below md): Stacked responsive cards (Zero horizontal scroll)
          ========================================================================= */}
      <div className="grid gap-3.5 md:hidden">
        {rows.map((row, index) => {
          const key = getRowKey(row, index);
          const isClickable = Boolean(onRowClick);
          const primaryValue = primaryCol ? row[primaryCol.key] : null;
          const primaryContent = primaryCol?.render
            ? primaryCol.render(primaryValue, row)
            : primaryValue;

          return (
            <div
              key={key}
              tabIndex={isClickable ? 0 : undefined}
              role={isClickable ? 'button' : undefined}
              onClick={isClickable ? () => onRowClick(row) : undefined}
              onKeyDown={
                isClickable
                  ? e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              className={`card-padded transition-shadow duration-150 ${
                isClickable
                  ? 'cursor-pointer hover:shadow-card-hover active:bg-neutral-bg/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow'
                  : ''
              }`}
            >
              {/* Card Primary Header */}
              {primaryCol && (
                <div className="border-b border-brand-green-tint/60 pb-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-muted">
                    {primaryCol.mobileLabel || primaryCol.header}
                  </p>
                  <div className="mt-1 font-display text-base font-bold text-brand-green-dark leading-tight break-words">
                    {primaryContent}
                  </div>
                </div>
              )}

              {/* Card Key-Value Rows */}
              <dl className="mt-2.5 space-y-2 text-sm">
                {detailCols.map(col => {
                  const val = row[col.key];
                  const renderedVal = col.render ? col.render(val, row) : val;

                  return (
                    <div
                      key={col.key}
                      className="flex items-start justify-between gap-3 border-b border-brand-green-tint/30 pb-2 last:border-b-0 last:pb-0"
                    >
                      <dt className="shrink-0 text-xs font-semibold text-neutral-muted pt-0.5">
                        {col.mobileLabel || col.header}
                      </dt>
                      <dd className="min-w-0 text-right font-medium text-neutral-ink break-words">
                        {renderedVal}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              {/* Action Area at Card Bottom */}
              {actionCols.length > 0 && (
                <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2 border-t border-brand-green-tint/60 pt-3">
                  {actionCols.map(col => (
                    <div key={col.key} onClick={e => e.stopPropagation()}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
