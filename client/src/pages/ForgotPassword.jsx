import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    setLoading(true);
    setError('');

    // Simulate recovery lookup
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-neutral-light flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-block">
          <img src="/tnv-logo.png" alt="TNV Logo" className="h-16 w-16 mx-auto rounded-full bg-white shadow-sm p-1" />
        </Link>
        <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold text-neutral-ink font-display">
          Reset Your Account Password
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Enter your registered username or email to receive recovery instructions.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-neutral-200 rounded-2xl sm:px-10">
          {submitted ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-neutral-ink">Check Your Registered Inbox</h2>
              <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
                If an account matches <strong className="text-neutral-ink">{identifier}</strong>, we have dispatched a secure password reset link to your email address.
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="w-full btn bg-brand-green text-white hover:bg-brand-green-dark rounded-xl py-2.5 text-sm font-semibold inline-block"
                >
                  Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="identifier" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Username or Email Address
                </label>
                <input
                  id="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-brand-green focus:border-brand-green text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn bg-brand-green text-white hover:bg-brand-green-dark rounded-xl py-2.5 text-sm font-bold shadow-sm transition-all"
              >
                {loading ? 'Sending Instructions...' : 'Send Password Reset Link'}
              </button>

              <div className="text-center text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                Remember your password?{' '}
                <Link to="/login" className="font-semibold text-brand-green-dark hover:underline">
                  Sign in here
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
