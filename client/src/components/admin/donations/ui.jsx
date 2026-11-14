import { useEffect, useId, useRef } from 'react';
import Spinner from '../../Spinner.jsx';

// Shared building blocks for the donation admin pages, so all seven look and
// behave the same: the dashboard's stat cards, status badges, a modal with
// focus handling, labelled fields and inline notices instead of alert().

export const inr = n => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const formatDate = iso => {
  if (!iso) return '—';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00+05:30`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

export const formatDateTime = iso => (iso
  ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  : '—');

export const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export const btn = {
  primary: 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-brand-green px-3.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  secondary: 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3.5 text-[13px] font-semibold text-neutral-800 transition-colors duration-150 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green disabled:pointer-events-none disabled:opacity-50',
  danger: 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 text-[13px] font-semibold text-rose-700 transition-colors duration-150 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:pointer-events-none disabled:opacity-50',
  dangerSolid: 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-rose-600 px-3.5 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  small: 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 text-xs font-semibold text-neutral-800 transition-colors duration-150 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green disabled:pointer-events-none disabled:opacity-50',
  smallPrimary: 'inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md bg-brand-green px-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50',
  link: 'text-xs font-semibold text-brand-green underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded'
};

export const inputCls = 'block w-full min-h-10 rounded-lg border border-neutral-300 bg-neutral-50/60 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 focus:border-brand-green focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-green/20 disabled:opacity-60';

// Page header used by every donation page
export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold text-neutral-ink">{title}</h2>
        {description && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-neutral-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Same look as the dashboard's key figures
export function StatGrid({ items, cols = 4 }) {
  const grid = cols === 3 ? 'md:grid-cols-3' : cols === 5 ? 'md:grid-cols-3 xl:grid-cols-5' : 'md:grid-cols-4';
  return (
    <dl className={`grid grid-cols-2 gap-3 sm:gap-4 ${grid}`}>
      {items.map(card => (
        <div key={card.label} className="flex min-w-0 flex-col rounded-xl border border-neutral-200 bg-white p-4">
          <dt className="text-[13px] font-semibold leading-snug text-neutral-600">{card.label}</dt>
          <dd className="mt-3 truncate font-display text-[26px] font-bold leading-none tabular-nums text-neutral-ink">{card.value}</dd>
          {card.note && (
            <dd className="mt-auto flex min-w-0 items-start gap-1.5 pt-2.5 text-xs leading-snug text-neutral-muted">
              {card.attention && <span aria-hidden="true" className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${card.attention === 'rose' ? 'bg-rose-500' : 'bg-amber-500'}`} />}
              <span className="line-clamp-2">{card.note}</span>
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

const TONES = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  blue: 'border-sky-200 bg-sky-50 text-sky-800',
  grey: 'border-neutral-200 bg-neutral-100 text-neutral-700'
};

export function Badge({ tone = 'grey', children }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TONES[tone] || TONES.grey}`}>{children}</span>;
}

export function Notice({ notice, onClose }) {
  if (!notice) return null;
  const tone = notice.tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : notice.tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900';
  return (
    <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${tone}`}>
      <span className="min-w-0">{notice.text}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss message" className="shrink-0 rounded px-1 text-current opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current">×</button>
      )}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-neutral-200 bg-white ${className}`}>{children}</div>;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-muted" aria-busy="true">
      <Spinner className="h-4 w-4" /> {label}
    </div>
  );
}

export function Empty({ title, children, action }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-semibold text-neutral-800">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-neutral-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Segmented filter tabs
export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={`min-h-8 rounded-md px-3 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green ${value === t.id ? 'bg-white text-neutral-ink shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
        >
          {t.label}{t.count !== undefined && <span className="ml-1.5 tabular-nums text-neutral-400">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder, label = 'Search' }) {
  const id = useId();
  return (
    <div className="relative w-full sm:max-w-xs">
      <label htmlFor={id} className="sr-only">{label}</label>
      <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" /></svg>
      <input id={id} type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls} pl-9`} />
    </div>
  );
}

export function Field({ label, hint, error, children, className = '' }) {
  const id = useId();
  const child = typeof children === 'function' ? children(id) : children;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[13px] font-semibold text-neutral-700">{label}</label>
      {child}
      {error ? <p className="mt-1 text-xs text-rose-700">{error}</p> : hint ? <p className="mt-1 text-xs text-neutral-muted">{hint}</p> : null}
    </div>
  );
}

// Accessible modal: Escape closes, focus moves in and back out.
export function Modal({ title, description, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement;
    const node = ref.current;
    const first = node && node.querySelector('input, select, textarea, button:not([data-close])');
    (first || node)?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev && prev.focus && prev.focus(); };
  }, [onClose]);
  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-md' : 'max-w-lg';
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-neutral-950/50 p-0 sm:items-center sm:p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`flex max-h-[92vh] w-full ${width} flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl focus:outline-none sm:rounded-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="font-display text-base font-bold text-neutral-ink">{title}</h3>
            {description && <p className="mt-0.5 text-[13px] text-neutral-muted">{description}</p>}
          </div>
          <button type="button" data-close onClick={onClose} aria-label="Close" className="-mr-1 rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// A confirm step in place of window.confirm()
export function ConfirmDialog({ title, children, confirmLabel = 'Confirm', tone = 'primary', busy, onConfirm, onClose }) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <button type="button" className={tone === 'danger' ? btn.dangerSolid : btn.primary} onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>
            {busy && <Spinner className="h-3.5 w-3.5" />}{confirmLabel}
          </button>
        </>
      )}
    >
      <div className="text-sm leading-relaxed text-neutral-700">{children}</div>
    </Modal>
  );
}

export function SubmitButton({ busy, children, form, className = btn.primary }) {
  return (
    <button type="submit" form={form} className={className} disabled={busy} aria-busy={busy || undefined}>
      {busy && <Spinner className="h-3.5 w-3.5" />}{children}
    </button>
  );
}

// Simple CSV download
export function downloadCsv(filename, header, rows) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const TABLE = {
  wrap: 'overflow-x-auto',
  table: 'min-w-full text-left text-sm',
  head: 'border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-600',
  th: 'whitespace-nowrap px-4 py-2.5 font-semibold',
  row: 'border-b border-neutral-100 last:border-0 align-top hover:bg-neutral-50/70',
  td: 'px-4 py-3'
};
