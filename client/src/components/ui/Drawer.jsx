/**
 * Accessible Drawer Primitive.
 * Desktop (md and up): Slide-in right panel.
 * Mobile (< md): Responsive bottom sheet (max-h-[90vh], full width).
 * Features: focus trap, Esc key dismiss, backdrop click, focus restore, scroll lock.
 *
 * @prop {boolean} open - Whether drawer is open
 * @prop {Function} onClose - Handler to close drawer
 * @prop {string} title - Header title
 * @prop {React.ReactNode} children - Main drawer content
 * @prop {React.ReactNode} [footer] - Optional sticky footer slot
 */

import { useEffect, useRef } from 'react';
import Icon from './icons.jsx';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Drawer({
  open,
  onClose,
  title,
  children,
  footer
}) {
  const drawerRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus restoration & body scroll lock
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Focus first focusable element inside drawer
      const timer = setTimeout(() => {
        if (drawerRef.current) {
          const focusables = drawerRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
          if (focusables.length > 0) {
            focusables[0].focus();
          } else {
            drawerRef.current.focus();
          }
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
        if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [open]);

  // Keyboard navigation: Escape key to dismiss & Tab focus trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        if (!drawerRef.current) return;
        const focusables = drawerRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="presentation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-ink/50 backdrop-blur-sm transition-opacity duration-200"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-0 pointer-events-none flex items-end md:items-stretch md:justify-end">
        <section
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="drawer-title"
          tabIndex={-1}
          className="pointer-events-auto flex flex-col bg-white shadow-2xl transition-transform duration-200 ease-out focus:outline-none w-full max-h-[90vh] rounded-t-2xl md:max-h-full md:h-full md:w-[480px] md:max-w-full md:rounded-l-2xl md:rounded-tr-none"
        >
          {/* Header */}
          <div className="flex min-h-tap items-center justify-between border-b border-brand-green-tint px-5 py-3">
            <h2 id="drawer-title" className="font-display text-lg font-bold text-brand-green-dark sm:text-xl truncate">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="grid min-h-tap min-w-tap place-items-center rounded-lg text-neutral-muted hover:bg-neutral-bg hover:text-neutral-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow"
              aria-label="Close drawer"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 text-neutral-ink">
            {children}
          </div>

          {/* Optional Footer */}
          {footer && (
            <div className="border-t border-brand-green-tint bg-neutral-bg/60 px-5 py-3.5">
              {footer}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
