import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import TopBar from './TopBar.jsx';
import { useScrollFrame } from '../lib/motion.js';

const NAV = [
  { label: 'About', href: '/#about' },
  { label: 'Our services', href: '/#programs' },
  { label: 'Gallery', href: '/#gallery' },
  { label: 'How joining works', href: '/#join' },
  { label: 'Contact', href: '/#contact' },
  { label: 'Donate', to: '/donate' }
];

function NavItem({ item, onClick, className }) {
  if (item.to) {
    return (
      <NavLink to={item.to} onClick={onClick} className={className}>
        {item.label}
      </NavLink>
    );
  }
  // Section links stay in the app; AppShell scrolls to the section after navigating
  return (
    <Link to={item.href} onClick={onClick} className={className}>
      {item.label}
    </Link>
  );
}

function Brand({ compact }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Tamil Nadu Volunteers home">
      <img
        src="/tnv-logo.png"
        alt=""
        width="80"
        height="80"
        className={`shrink-0 rounded-full bg-white transition-[width,height] duration-300 ${
          compact ? 'h-11 w-11 sm:h-12 sm:w-12' : 'h-12 w-12 sm:h-[72px] sm:w-[72px]'
        }`}
      />
      <span className="min-w-0 leading-tight">
        <span
          className="block truncate font-display text-lg font-extrabold text-brand-green-dark sm:text-[1.7rem]"
          style={{ fontStretch: '92%' }}
        >
          Tamil Nadu Volunteers
        </span>
        <span lang="ta" translate="no" className="notranslate block truncate font-display text-sm font-semibold text-brand-green sm:text-base">
          தமிழ்நாடு தன்னார்வலர்கள்
        </span>
      </span>
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [elevated, setElevated] = useState(false);
  const [compact, setCompact] = useState(false);
  const close = () => setOpen(false);

  // Shrinking the header shortens the page, which can pull scrollY back under the
  // threshold and grow it again (a visible shake on short pages). So only shrink
  // when the page has plenty of room, and use separate thresholds to shrink and grow.
  useScrollFrame(() => {
    const y = window.scrollY;
    const room = document.documentElement.scrollHeight - window.innerHeight;
    setElevated(y > 0);
    setCompact(was => (room < 300 ? false : was ? y > 40 : y > 120));
  });

  const mobileLink =
    'flex min-h-tap items-center rounded-md px-3 font-medium text-neutral-ink hover:bg-brand-green-tint hover:text-brand-green-dark';

  return (
    <>
      <TopBar />
      <header
        className={`sticky top-0 z-40 bg-white transition-shadow duration-300 ${
          elevated ? 'shadow-[0_2px_14px_rgba(18,77,41,0.15)]' : ''
        }`}
      >
        <div
          className={`container-page flex items-center justify-between gap-3 transition-[padding] duration-300 ${
            compact ? 'py-2' : 'py-2 sm:py-3'
          }`}
        >
          <Brand compact={compact} />

          <div className="hidden shrink-0 items-center gap-3 md:flex">
            <Link
              to="/register"
              className="btn rounded-full bg-brand-yellow px-6 text-neutral-ink hover:bg-[#dba604]"
            >
              Register as Volunteer
            </Link>
            <Link
              to="/login"
              className="btn rounded-full bg-brand-green-dark px-6 text-white hover:bg-brand-green"
            >
              Log in
            </Link>
          </div>

          <button
            type="button"
            className="grid min-h-tap min-w-tap shrink-0 place-items-center rounded-md text-brand-green-dark lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen(o => !o)}
          >
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Section links on a green bar below the brand row (large screens) */}
        <nav aria-label="Main" className="hidden bg-brand-green-dark lg:block">
          <div className="container-page flex items-center gap-1">
            {NAV.map(item => (
              <NavItem
                key={item.label}
                item={item}
                className="flex min-h-tap items-center px-4 font-semibold text-white/90 hover:bg-white/10 hover:text-white [&.active]:text-brand-yellow"
              />
            ))}
          </div>
        </nav>

        {open && (
          <nav id="mobile-nav" aria-label="Main" className="border-t border-brand-green-tint bg-white lg:hidden">
            <div className="container-page flex flex-col gap-1 py-3">
              {NAV.map(item => (
                <NavItem key={item.label} item={item} onClick={close} className={mobileLink} />
              ))}
              <div className="mt-2 grid gap-2 md:hidden">
                <Link to="/register" onClick={close} className="btn-register w-full rounded-full">
                  Register as Volunteer
                </Link>
                <Link
                  to="/login"
                  onClick={close}
                  className="btn w-full rounded-full bg-brand-green-dark text-white hover:bg-brand-green"
                >
                  Log in
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
