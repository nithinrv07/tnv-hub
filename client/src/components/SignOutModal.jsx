import { useEffect } from 'react';

export default function SignOutModal({
  isOpen,
  onConfirm,
  onCancel,
  title = 'Sign out of TNV Portal?',
  message = 'Are you sure you want to sign out? You will need to enter your credentials again to access the portal.'
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-modal-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all border border-neutral-200/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="signout-modal-title" className="text-base font-bold text-neutral-900 leading-snug">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            Stay Signed In
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
