import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../lib/authService.js';
import FormField, { inputClass } from '../components/form/FormField.jsx';
import PasswordInput from '../components/form/PasswordInput.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
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

  return (
    <div className="bg-neutral-bg px-4 py-8 sm:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-2xl border border-neutral-muted/20 bg-white p-6 shadow-md sm:p-10">
          <div className="mb-8 text-center">
            <img src="/tnv-logo.png" alt="" className="mx-auto mb-4 h-16 w-16 rounded-full object-contain sm:h-20 sm:w-20" />
            <span className="inline-block rounded-full bg-brand-green-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-green-dark sm:text-sm">
              Tamil Nadu Volunteers Hub
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold text-neutral-ink sm:text-4xl">
              Sign in
            </h1>
            <p className="mt-2 text-base text-neutral-muted sm:text-lg">
              Open your volunteer dashboard, organisation portal or admin queue.
            </p>
          </div>

          {redirectNotice && !error && (
            <div className="mb-6 rounded-xl border border-brand-green/30 bg-brand-green-tint p-4 text-sm font-semibold text-brand-green-dark sm:text-base">
              {redirectNotice}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-status-no-answer/30 bg-red-50 p-4 text-sm font-medium text-status-no-answer sm:text-base" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-base sm:text-lg">
            <FormField id="email" label="Email address">
              {props => (
                <input
                  {...props}
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.com"
                  className={`${inputClass(false)} min-h-[52px] text-lg`}
                />
              )}
            </FormField>

            <FormField id="password" label="Password">
              {props => (
                <PasswordInput
                  {...props}
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="min-h-[52px] text-lg"
                />
              )}
            </FormField>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="inline-flex min-h-tap items-center text-sm font-semibold text-brand-green hover:underline sm:text-base">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary min-h-[52px] w-full text-lg font-semibold shadow-sm"
            >
              {loading ? <Spinner className="mr-2 h-5 w-5" /> : null}
              Sign In
            </button>
          </form>

          <div className="mt-8 border-t border-brand-green-tint pt-5 text-center text-sm text-neutral-muted sm:text-base">
            Don't have an account yet?
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Link to="/register" className="inline-flex min-h-tap items-center justify-center rounded-xl border border-brand-green/40 px-4 font-semibold text-brand-green hover:bg-brand-green-tint">
                Register as Volunteer
              </Link>
              <Link to="/register?type=institution" className="inline-flex min-h-tap items-center justify-center rounded-xl border border-brand-green/40 px-4 font-semibold text-brand-green hover:bg-brand-green-tint">
                Register an Organisation
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
