import { createContext, useId, useState } from 'react';

// "About this question" text for form fields, keyed by field id. A form wraps
// its fields in <FieldAboutContext.Provider value={{ full_name: '…' }}> and every
// FormField with a matching id shows an (i) button next to its label.
export const FieldAboutContext = createContext({});

// The (i) button and the explanation it reveals. Place it inside a
// `flex flex-wrap items-center` row after the label: the explanation takes the
// full width and drops onto its own line below.
export default function AboutTip({ text, label = 'this question' }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (!text) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`About ${label}`}
        title={`About ${label}`}
        className={`inline-grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] font-bold italic leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green ${
          open
            ? 'border-brand-green bg-brand-green text-white'
            : 'border-brand-green/50 bg-white text-brand-green hover:bg-brand-green-tint'
        }`}
      >
        i
      </button>
      {open && (
        <span
          id={panelId}
          role="note"
          className="mb-1 mt-1.5 block w-full rounded-lg bg-brand-green-tint/60 px-3 py-2 text-sm font-normal leading-relaxed text-brand-green-dark"
        >
          {text}
        </span>
      )}
    </>
  );
}
