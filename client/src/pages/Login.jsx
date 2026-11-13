import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../lib/authService.js';
import Spinner from '../components/Spinner.jsx';

// Sign in: one card split in two. The form sits on the left; on the right, TNV-green
// waves frame a short welcome. On phones the welcome becomes a short band on top.

function MailIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
      <path d="M12 14.5v2.5" />
    </svg>
  );
}

function EyeIcon({ open, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 20 20 4" />}
    </svg>
  );
}

// Green waves with a yellow edge, top and bottom; the middle stays white for the text
function WelcomeArt() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="tnv-wave" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1B6B3A" />
          <stop offset="1" stopColor="#0E3D20" />
        </linearGradient>
      </defs>
      {/* top */}
      <path d="M40 0 H400 V150 C 370 175, 340 140, 310 160 C 280 180, 250 150, 220 165 C 190 180, 170 120, 140 110 C 110 100, 100 60, 70 50 C 50 42, 40 20, 40 0 Z" fill="#F2B705" />
      <path d="M60 0 H400 V135 C 372 158, 342 124, 312 144 C 282 164, 252 134, 222 148 C 192 162, 172 104, 144 94 C 116 84, 104 46, 78 36 C 62 30, 60 14, 60 0 Z" fill="url(#tnv-wave)" />
      {/* bottom */}
      <path d="M0 470 C 40 490, 70 455, 110 470 C 150 485, 170 440, 210 448 C 250 456, 270 410, 310 420 C 350 430, 370 395, 400 400 V600 H0 Z" fill="#F2B705" />
      <path d="M0 490 C 40 508, 72 474, 112 488 C 152 502, 172 460, 212 467 C 252 474, 272 432, 312 441 C 352 450, 372 418, 400 422 V600 H0 Z" fill="url(#tnv-wave)" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const redirectNotice = location.state?.message;

  const handleSubmit = async e => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }

    setLoading(true);
    setError('');

    // Members and organisations sign in with their email. Older accounts and the
    // admin accounts can still type their username here.
    const res = await login(email.trim(), password);
    setLoading(false);

    if (res.ok) {
      const role = res.data?.role || res.data?.profile?.role;
      const fromPath = location.state?.from;
      if (role === 'admin' || role === 'master_admin' || role === 'dept_admin') {
        navigate(fromPath && fromPath.startsWith('/admin') ? fromPath : '/admin');
      } else if (role === 'ngo') {
        navigate('/ngo');
      } else {
        navigate(fromPath || '/dashboard');
      }
    } else {
      setError(res.error || 'Invalid email or password. Please try again.');
    }
  };

  const field = 'group flex min-h-[56px] items-center gap-3 rounded-full border border-neutral-200 bg-neutral-bg pl-5 pr-2 transition-[border-color,box-shadow] duration-150 focus-within:border-brand-green focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-green/15';
  const input = 'h-12 min-w-0 flex-1 bg-transparent text-base text-neutral-ink placeholder:text-neutral-400 focus:outline-none';

  return (
    <div className="bg-neutral-bg px-4 py-8 sm:py-14 lg:py-16">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_-28px_rgba(18,77,41,0.35)] lg:grid-cols-[1.05fr_1fr]">
        {/* Form */}
        <section className="order-2 px-6 py-10 sm:px-12 sm:py-14 lg:order-1 lg:px-16" aria-labelledby="signin-title">
          <div className="mx-auto w-full max-w-sm">
            <h1 id="signin-title" className="text-center font-display text-4xl font-bold text-neutral-ink">Hello!</h1>
            <p className="mt-1 text-center text-base text-neutral-muted">Sign in to your account</p>

            {redirectNotice && !error && (
              <p className="mt-6 rounded-2xl bg-brand-green-tint px-4 py-3 text-sm font-semibold text-brand-green-dark">{redirectNotice}</p>
            )}
            {error && (
              <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-status-no-answer" role="alert">{error}</p>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <div className={field}>
                  <MailIcon className="h-5 w-5 shrink-0 text-brand-green" />
                  <input
                    id="email"
                    type="text"
                    inputMode="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="Email address"
                    className={input}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <div className={field}>
                  <LockIcon className="h-5 w-5 shrink-0 text-brand-green" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Password"
                    className={input}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors duration-150 hover:bg-brand-green-tint hover:text-brand-green-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                  >
                    <EyeIcon open={showPassword} className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <Link to="/forgot-password" className="rounded px-1 text-sm font-medium text-neutral-muted hover:text-brand-green-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="mx-auto flex min-h-[52px] w-full max-w-[240px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-green to-brand-green-dark px-8 text-base font-bold text-white shadow-[0_10px_24px_-10px_rgba(27,107,58,0.8)] transition-[transform,box-shadow] duration-150 hover:shadow-[0_14px_28px_-10px_rgba(27,107,58,0.9)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow disabled:pointer-events-none disabled:opacity-60"
              >
                {loading && <Spinner className="h-5 w-5" />}
                Sign in
              </button>
            </form>

            <p className="mt-10 text-center text-sm text-neutral-muted">
              Don’t have an account?{' '}
              <Link to="/register" className="font-semibold text-brand-green hover:underline">Join as a volunteer</Link>
              {' '}or{' '}
              <Link to="/register?type=institution" className="font-semibold text-brand-green hover:underline">register an organisation</Link>
            </p>
          </div>
        </section>

        {/* Welcome */}
        <aside className="relative order-1 flex min-h-[150px] items-center justify-center overflow-hidden px-8 py-8 text-center lg:order-2 lg:min-h-[560px] lg:px-14">
          <WelcomeArt />
          <div className="relative max-w-xs">
            <img src="/tnv-logo.png" alt="Tamil Nadu Volunteers" width="64" height="64" className="mx-auto h-16 w-16 rounded-full bg-white shadow-md" />
            <h2 className="mt-5 hidden font-display text-4xl font-bold text-neutral-ink lg:block">Welcome back!</h2>
            <p className="mt-3 hidden text-base leading-relaxed text-neutral-muted lg:block">
              Your events, tasks, certificates and ID card are waiting. Sign in to pick up where your district team left off.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
