import { Link } from 'react-router-dom';

export default function Logo({ inverted = false }) {
  return (
    <Link to="/" className="flex min-h-tap items-center gap-2.5" aria-label="Tamil Nadu Volunteers home">
      <img
        src="/tnv-logo.png"
        alt=""
        width="44"
        height="44"
        className="h-11 w-11 rounded-full bg-white"
      />
      <span className="leading-tight">
        <span className={`block font-bold ${inverted ? 'text-white' : 'text-brand-green-dark'}`}>
          Tamil Nadu Volunteers
        </span>
        <span className={`block text-xs ${inverted ? 'text-brand-green-tint' : 'text-neutral-muted'}`}>
          TNV Hub
        </span>
      </span>
    </Link>
  );
}
