import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-neutral-light flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block">
          <img src="/tnv-logo.png" alt="TNV Logo" className="h-16 w-16 mx-auto rounded-full bg-white shadow-sm p-1" />
        </Link>
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-neutral-ink font-display">
          Set New Password
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Create a strong password for your Tamil Nadu Volunteers account.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-neutral-200 rounded-2xl sm:px-10">
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-neutral-ink">Password Reset Successfully!</h2>
              <p className="mt-2 text-xs text-neutral-600">
                Redirecting you to the sign in portal...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn bg-brand-green text-white hover:bg-brand-green-dark rounded-xl py-2.5 text-sm font-bold shadow-sm transition-all"
              >
                {loading ? 'Updating Password...' : 'Save New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
