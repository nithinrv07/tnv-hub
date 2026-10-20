import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Logo from './Logo.jsx';

const NAV = [
  { label: 'About', href: '/#about' },
  { label: 'Programs', href: '/#programs' },
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
  return (
    <a href={item.href} onClick={onClick} className={className}>
      {item.label}
    </a>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const linkClass =
    'flex min-h-tap items-center rounded-md px-3 font-medium text-neutral-ink hover:bg-brand-green-tint hover:text-brand-green-dark';

  return (
    <header className="sticky top-0 z-40 border-b border-brand-green-tint bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map(item => (
            <NavItem key={item.label} item={item} className={linkClass} />
          ))}
          <Link to="/login" className={linkClass}>
            Log in
          </Link>
          <Link to="/register" className="btn-register ml-2">
            Register as Volunteer
          </Link>
        </nav>

        <button
          type="button"
          className="grid min-h-tap min-w-tap place-items-center rounded-md text-brand-green-dark md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(o => !o)}
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-brand-green-tint bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV.map(item => (
              <NavItem key={item.label} item={item} onClick={close} className={linkClass} />
            ))}
            <Link to="/login" onClick={close} className={linkClass}>
              Log in
            </Link>
            <Link to="/register" onClick={close} className="btn-register mt-2 w-full">
              Register as Volunteer
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
