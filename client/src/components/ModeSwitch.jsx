import { useNavigate } from 'react-router-dom';

// For members who have admin access: one switch at the top of the side panel
// that slides between their member dashboard and the admin sections they were
// given. The thumb slides first, then the page changes.

export default function ModeSwitch({ mode }) {
  const navigate = useNavigate();
  const admin = mode === 'admin';
  const go = next => {
    if (next === mode) return;
    window.setTimeout(() => navigate(next === 'admin' ? '/admin' : '/dashboard'), 160);
  };
  const option = (value, label, hint) => (
    <button
      type="button"
      role="radio"
      aria-checked={mode === value}
      onClick={() => go(value)}
      className={`relative z-10 flex-1 rounded-lg px-2 py-1.5 text-center transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow ${mode === value ? 'text-neutral-900' : 'text-emerald-100 hover:text-white'}`}
    >
      <span className="block text-xs font-bold">{label}</span>
      <span className={`block text-[0.625rem] ${mode === value ? 'text-neutral-700' : 'text-emerald-300/80'}`}>{hint}</span>
    </button>
  );
  return (
    <div className="border-b border-emerald-950/60 px-4 py-3">
      <div role="radiogroup" aria-label="Dashboard mode" className="relative flex rounded-xl bg-black/25 p-1">
        <span
          aria-hidden="true"
          className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-brand-yellow shadow transition-transform duration-200 ease-out motion-reduce:transition-none ${admin ? 'translate-x-full' : 'translate-x-0'}`}
        />
        {option('member', 'Member', 'My dashboard')}
        {option('admin', 'Admin', 'My admin access')}
      </div>
    </div>
  );
}
