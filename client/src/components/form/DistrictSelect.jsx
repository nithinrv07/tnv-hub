import { forwardRef, useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import Spinner from '../Spinner.jsx';
import { inputClass } from './FormField.jsx';

// District dropdown. Ids come from the backend, so the list is loaded from /api/districts.
const DistrictSelect = forwardRef(function DistrictSelect({ invalid, ...props }, ref) {
  const [districts, setDistricts] = useState([]);
  const [state, setState] = useState('loading');

  const load = useCallback(async () => {
    setState('loading');
    const res = await api('/api/districts');
    if (res.ok && Array.isArray(res.data.districts) && res.data.districts.length) {
      setDistricts([...res.data.districts].sort((a, b) => a.name.localeCompare(b.name)));
      setState('ready');
    } else {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state === 'error') {
    return (
      <div className="flex min-h-tap flex-wrap items-center gap-3 rounded-lg border border-status-no-answer/40 bg-white px-3 py-2">
        <span className="text-sm text-neutral-ink">The district list didn't load.</span>
        <button type="button" onClick={load} className="min-h-tap font-semibold text-brand-green underline">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        ref={ref}
        className={`${inputClass(invalid)} appearance-none pr-10`}
        disabled={state === 'loading'}
        defaultValue=""
        {...props}
      >
        <option value="" disabled>
          {state === 'loading' ? 'Loading districts…' : 'Select your district'}
        </option>
        {districts.map(d => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-muted">
        {state === 'loading' ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </span>
    </div>
  );
});

export default DistrictSelect;
