/**
 * PortalShell Component - Reusable Layout Shell for Phase 2 Portals & Workbenches.
 *
 * Provides:
 * - Desktop (lg and up): Fixed 260px civic left sidebar with Logo, NavLinks, and User Profile.
 * - Mobile (< lg): Sticky top bar with accessible hamburger toggle and slide-over drawer navigation.
 * - Role-based navigation filtering: items restricted by roles array are omitted entirely.
 * - Screen-reader skip-to-content anchor & accessible focus states.
 *
 * Integration note for future Phase 2 pages:
 * To connect real authentication from lib/authService.js & lib/session.js:
 * ```javascript
 * import { getCurrentUser, logout } from '../../lib/authService.js';
 * const user = getCurrentUser();
 * const role = user?.role || 'volunteer';
 * <PortalShell user={user} role={role} onLogout={logout} navItems={...}>
 *   <Outlet />
 * </PortalShell>
 * ```
 *
 * @prop {Array<{ label: string, to: string, icon?: React.ReactNode, roles?: string[] }>} navItems - Navigation links
 * @prop {string} [role='volunteer'] - Current user role ('master_admin' | 'dept_admin' | 'volunteer' | etc.)
 * @prop {Object} [user] - Current user profile object { full_name, username, email }
 * @prop {Function} [onLogout] - Logout callback handler
 * @prop {React.ReactNode} [children] - Child views (or defaults to <Outlet />)
 */

import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Logo from '../Logo.jsx';
import Icon from '../ui/icons.jsx';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function PortalShell({
  navItems = [],
  role = 'volunteer',
  user = { full_name: 'Guest User', username: 'guest', role: 'volunteer' },
  onLogout,
  children
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const drawerRef = useRef(null);
  const hamburgerRef = useRef(null);

  // Filter items: Omit entirely if current role is not in the item's roles array
  const visibleNav = navItems.filter(item => !item.roles || item.roles.includes(role));

  // Automatically close mobile drawer upon route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Handle focus trap, Escape dismissal, and body scroll lock for mobile drawer
  useEffect(() => {
    if (!drawerOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDrawerOpen(false);
        hamburgerRef.current?.focus();
        return;
      }

      if (event.key === 'Tab') {
        if (!drawerRef.current) return;
        const focusables = drawerRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusables.length === 0) return;

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on first element in drawer
    const timer = setTimeout(() => {
      if (drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusables.length > 0) focusables[0].focus();
      }
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen]);

  // Render navigation links list
  const renderNavContent = () => (
    <div className="flex h-full flex-col justify-between">
      {/* Brand & Navigation Links */}
      <div className="space-y-6">
        <div className="px-4 pt-4">
          <Logo />
        </div>

        <nav aria-label="Portal Navigation" className="px-3">
          <ul className="space-y-1">
            {visibleNav.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex min-h-tap items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow ${
                      isActive
                        ? 'bg-brand-green text-white shadow-sm'
                        : 'text-neutral-ink hover:bg-brand-green-tint/80 hover:text-brand-green-dark'
                    }`
                  }
                >
                  {item.icon && (
                    <span className="shrink-0" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* User Information & Logout Bar */}
      <div className="border-t border-brand-green-tint p-4 bg-neutral-bg/50">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-green text-white font-bold text-sm">
            {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-ink leading-tight">
              {user?.full_name || user?.username || 'Logged Volunteer'}
            </p>
            <p className="truncate text-xs font-medium text-neutral-muted">
              Role: <span className="text-brand-green-dark font-semibold">{role}</span>
            </p>
          </div>
        </div>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex min-h-tap w-full items-center justify-center gap-2 rounded-lg border border-brand-green-tint bg-white px-3 py-2 text-xs font-semibold text-neutral-ink hover:bg-task-overdue-tint/40 hover:text-task-overdue transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow"
          >
            <Icon name="close" className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-neutral-bg">
      {/* 1. Skip-to-content accessible anchor */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2.5 focus:shadow-lg focus:ring-2 focus:ring-brand-yellow font-semibold text-brand-green-dark"
      >
        Skip to content
      </a>

      {/* 2. Desktop Fixed Left Sidebar (lg and up) */}
      <aside
        className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[260px] lg:flex-col lg:border-r lg:border-brand-green-tint lg:bg-white"
        aria-label="Desktop Sidebar"
      >
        {renderNavContent()}
      </aside>

      {/* 3. Mobile / Tablet Sticky Top Bar (< lg) */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex min-h-tap items-center justify-between border-b border-brand-green-tint bg-white px-4 py-2 shadow-sm">
        <Logo />

        <button
          ref={hamburgerRef}
          type="button"
          onClick={() => setDrawerOpen(o => !o)}
          aria-expanded={drawerOpen}
          aria-controls="portal-mobile-drawer"
          aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="grid min-h-tap min-w-tap place-items-center rounded-lg text-brand-green-dark hover:bg-neutral-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow"
        >
          <Icon name={drawerOpen ? 'close' : 'menu'} className="h-6 w-6" />
        </button>
      </div>

      {/* 4. Mobile Drawer Navigation Overlay (< lg) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-neutral-ink/50 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Slide-in Navigation Drawer */}
          <div
            id="portal-mobile-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Drawer"
            className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col focus:outline-none"
            tabIndex={-1}
          >
            <div className="flex items-center justify-end px-3 pt-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid min-h-tap min-w-tap place-items-center rounded-lg text-neutral-muted hover:bg-neutral-bg hover:text-neutral-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow"
                aria-label="Close navigation"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderNavContent()}
            </div>
          </div>
        </div>
      )}

      {/* 5. Main Content Area */}
      <main
        id="main"
        tabIndex={-1}
        className="flex-1 min-w-0 pt-16 lg:pt-0 lg:pl-[260px] focus:outline-none"
      >
        <div className="container-page py-6 sm:py-8">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
