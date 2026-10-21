import { useEffect, useRef, useState } from 'react';
import { LANGUAGES, currentLanguage, restoreLanguage, setLanguage } from '../lib/translate.js';

// Language picker in the top bar. Marked notranslate so Google never rewrites
// the language names themselves.
export default function LanguageMenu() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(currentLanguage);
  const [error, setError] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    restoreLanguage();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = e => rootRef.current && !rootRef.current.contains(e.target) && setOpen(false);
    const onKey = e => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function choose(code) {
    setOpen(false);
    setError(false);
    setLang(code);
    try {
      await setLanguage(code);
    } catch (_e) {
      setError(true);
      setLang('en');
    }
  }

  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  return (
    <div ref={rootRef} className="notranslate relative shrink-0" translate="no">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="language-menu"
        className="flex min-h-tap items-center gap-1.5 rounded-md px-2 text-sm font-bold text-brand-green-dark hover:bg-black/5"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
        <span className="hidden sm:inline">{current.label}</span>
        <span className="sr-only sm:hidden">Language: {current.label}</span>
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <ul
          id="language-menu"
          className="absolute right-0 top-full z-50 mt-1 max-h-80 w-52 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/10"
        >
          {LANGUAGES.map(l => (
            <li key={l.code}>
              <button
                type="button"
                lang={l.code}
                onClick={() => choose(l.code)}
                aria-current={l.code === lang ? 'true' : undefined}
                className={`flex min-h-tap w-full items-center justify-between px-4 text-left text-sm hover:bg-brand-green-tint ${
                  l.code === lang ? 'font-bold text-brand-green-dark' : 'text-neutral-ink'
                }`}
              >
                {l.label}
                {l.code === lang && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
          <li className="border-t border-black/10 px-4 py-2 text-xs text-neutral-muted">Automatic translation by Google</li>
        </ul>
      )}

      {error && (
        <p role="alert" className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg bg-white p-3 text-sm text-status-no-answer shadow-lg ring-1 ring-black/10">
          Translation couldn&rsquo;t load. Check your connection and try again.
        </p>
      )}
    </div>
  );
}
