import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="bg-brand-green-dark text-brand-green-tint">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            A volunteer network working with communities in all 38 districts of Tamil Nadu.
          </p>
        </div>
        <nav aria-label="Footer">
          <h2 className="font-semibold text-white">Get involved</h2>
          <ul className="mt-2 text-sm">
            <li><Link className="flex min-h-tap items-center hover:text-white" to="/register">Register as Volunteer</Link></li>
            <li><Link className="flex min-h-tap items-center hover:text-white" to="/donate">Donate</Link></li>
            <li><Link className="flex min-h-tap items-center hover:text-white" to="/login">Log in</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="font-semibold text-white">Learn more</h2>
          <ul className="mt-2 text-sm">
            <li><a className="flex min-h-tap items-center hover:text-white" href="/#about">About TNV</a></li>
            <li><a className="flex min-h-tap items-center hover:text-white" href="/#programs">Programs</a></li>
            <li><a className="flex min-h-tap items-center hover:text-white" href="/#join">How joining works</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-4 text-xs">© {new Date().getFullYear()} Tamil Nadu Volunteers</p>
      </div>
    </footer>
  );
}
