import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../lib/authService.js';
import FormField, { inputClass } from '../components/form/FormField.jsx';
import PasswordInput from '../components/form/PasswordInput.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both your username and password.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(username.trim(), password);
    setLoading(false);

    if (res.ok) {
      const role = res.data?.role || res.data?.profile?.role;
      const isAdmin = role === 'admin' || role === 'master_admin' || role === 'dept_admin';
      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(res.error || 'Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="bg-neutral-bg py-16 sm:py-24">
      <div className="container-page max-w-md">
        <div className="rounded-xl border border-neutral-muted/20 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <span className="inline-block rounded-full bg-brand-green-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-green-dark">
              Tamil Nadu Volunteers Hub
            </span>
            <h1 className="mt-2 font-display text-2xl font-bold text-neutral-ink sm:text-3xl">
              Sign In to Your Account
            </h1>
            <p className="mt-1 text-sm text-neutral-muted">
              Access your volunteer dashboard or administrator queue.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-status-no-answer/30 bg-red-50 p-3 text-sm font-medium text-status-no-answer" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField id="username" label="Username or Registered Email">
              {props => (
                <input
                  {...props}
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. nithin_volunteer"
                  autoComplete="username"
                  className={inputClass(false)}
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              )}
            </FormField>

            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-muted">Forgot password?</span>
              <Link to="/forgot-password" className="font-semibold text-brand-green hover:underline">
                Reset your password
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary min-h-tap mt-2 w-full text-base font-semibold shadow-sm"
            >
              {loading ? <Spinner className="mr-2 h-5 w-5" /> : null}
              Sign In
            </button>
          </form>

          {/* Quick Access Info */}
          <div className="mt-6 rounded-lg bg-neutral-bg p-3 text-xs text-neutral-muted">
            <p className="font-semibold text-neutral-ink">Quick Testing Hint:</p>
            <p className="mt-0.5">Admin: <span className="font-mono font-medium">admin</span> / <span className="font-mono font-medium">admin123</span></p>
          </div>

          <div className="mt-6 border-t border-brand-green-tint pt-4 text-center text-sm text-neutral-muted">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-semibold text-brand-green hover:underline">
              Register as Volunteer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
