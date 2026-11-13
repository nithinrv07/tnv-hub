import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { inputClass } from './FormField.jsx';

// Organisation name field for the volunteer form. As the volunteer types, registered
// institutions / NGOs / organisations are suggested; picking one links the volunteer
// to it (ngoId), so they show up under that organisation. Any other name can still
// be typed freely.
export default function OrganisationSearch({ id, name, ngoId, onChange, invalid, describedBy }) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    const q = (name || '').trim();
    if (!open || ngoId || q.length < 2) {
      setResults([]);
      return undefined;
    }
    const mine = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await api(`/api/collab/search?q=${encodeURIComponent(q)}`, { timeoutMs: 6000 });
      if (mine !== seq.current) return;
      setLoading(false);
      setResults(res.ok && Array.isArray(res.data?.results) ? res.data.results : []);
      setActive(-1);
    }, 250);
    return () => clearTimeout(timer);
  }, [name, open, ngoId]);

  useEffect(() => {
    const close = e => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = org => {
    onChange({ name: org.organisation_name, ngo_id: org.id });
    setOpen(false);
  };

  const onKeyDown = e => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const listId = `${id}-options`;
  const showList = open && !ngoId && (name || '').trim().length >= 2;

  return (
    <div ref={boxRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        value={name || ''}
        placeholder="Start typing to find a registered organisation"
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onChange={e => {
          // Editing the name unlinks a previously picked organisation
          onChange({ name: e.target.value, ngo_id: '' });
          setOpen(true);
        }}
        className={`${inputClass(invalid)} ${ngoId ? 'pr-24' : ''}`}
      />
      {ngoId && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-brand-green-tint px-2 py-0.5 text-[11px] font-bold text-brand-green-dark">
          Registered
        </span>
      )}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
        >
          {loading && <li className="px-3 py-2.5 text-sm text-neutral-muted">Searching…</li>}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-neutral-muted">
              No registered organisation matches. Keep typing to enter the name yourself.
            </li>
          )}
          {!loading && results.map((org, i) => (
            <li
              key={org.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => {
                e.preventDefault();
                pick(org);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2.5 ${i === active ? 'bg-brand-green-tint' : ''}`}
            >
              <span className="block text-sm font-semibold text-neutral-ink">{org.organisation_name}</span>
              <span className="block text-xs text-neutral-muted">
                {[org.category, org.district_name].filter(Boolean).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
