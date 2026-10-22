import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Portal ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-6 antialiased">
          <div className="bg-white max-w-lg w-full p-8 rounded-2xl shadow-lg border border-neutral-200 text-center space-y-4">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 font-display">
              Page Render Notice
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed">
              An unexpected display issue occurred while rendering this view:
            </p>
            <div className="p-3 bg-neutral-100 rounded-xl text-left text-xs font-mono text-rose-700 overflow-x-auto">
              {this.state.error?.message || 'Unknown render error'}
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all"
              >
                Reload Page
              </button>
              <a
                href="/login"
                className="px-6 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-bold text-xs transition-all"
              >
                Return to Login
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
