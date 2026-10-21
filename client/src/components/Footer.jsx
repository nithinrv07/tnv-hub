import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import { CONTACT, POLICY_LINKS } from '../data/site.js';

const linkClass = 'flex min-h-tap items-center hover:text-white';

function formatPhone(digits) {
  const local = digits.replace(/^91/, '');
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

export default function Footer() {
  return (
    <footer className="bg-brand-green-dark text-brand-green-tint">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            A government-recognised, registered social welfare organisation with 10,000+ volunteers
            across all 38 districts of Tamil Nadu. 80G and CSR approved (CSR00064088).
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="font-semibold text-white">Get involved</h2>
          <ul className="mt-2 text-sm">
            <li><Link className={linkClass} to="/register">Register as Volunteer</Link></li>
            <li><Link className={linkClass} to="/donate">Donate</Link></li>
            <li><Link className={linkClass} to="/login">Log in</Link></li>
            <li><a className={linkClass} href="/#join">How joining works</a></li>
          </ul>
        </nav>
        <div>
          <h2 className="font-semibold text-white">About</h2>
          <ul className="mt-2 text-sm">
            <li><a className={linkClass} href="/#about">About TNV</a></li>
            <li><a className={linkClass} href="/#programs">Our services</a></li>
            <li><a className={linkClass} href="/#gallery">Gallery</a></li>
            {POLICY_LINKS.map(p => (
              <li key={p.name}>
                <a className={linkClass} href={p.url} target="_blank" rel="noopener noreferrer">{p.name}</a>
              </li>
            ))}
          </ul>
        </div>
        <address className="not-italic">
          <h2 className="font-semibold text-white">Contact</h2>
          <ul className="mt-2 text-sm">
            <li><a className={linkClass} href={`tel:+${CONTACT.phone}`}>{formatPhone(CONTACT.phone)}</a></li>
            <li><a className={`${linkClass} break-all`} href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></li>
            <li className="mt-2 leading-relaxed">{CONTACT.address}</li>
            <li className="mt-2">{CONTACT.hours}</li>
          </ul>
        </address>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-4 text-xs">© {new Date().getFullYear()} Tamil Nadu Volunteers. All rights reserved.</p>
      </div>
    </footer>
  );
}
