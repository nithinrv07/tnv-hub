import { Link } from 'react-router-dom';

// Text mark until the official TNV logo file is supplied
export default function Logo({ inverted = false }) {
  return (
    <Link to="/" className="flex min-h-tap items-center gap-2.5" aria-label="TNV Hub home">
      <span
        className={`grid h-10 w-10 place-items-center rounded-md text-sm font-black tracking-tight ${
          inverted ? 'bg-brand-yellow text-brand-green-dark' : 'bg-brand-green text-white'
        }`}
        aria-hidden="true"
      >
        TNV
      </span>
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
