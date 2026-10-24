import { forwardRef } from 'react';
import { inputClass } from './FormField.jsx';
import REGISTRATION from '../../data/registrationOptions.json';

// District dropdown. The list (with the server's district ids) is bundled from
// server data by scripts/sync-registration-options.js, so it is ready immediately
// and never waits on, or fails with, the API.
const DISTRICTS = [...REGISTRATION.districts].sort((a, b) => a.name.localeCompare(b.name));

const DistrictSelect = forwardRef(function DistrictSelect({ invalid, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={`${inputClass(invalid)} appearance-none pr-10`} {...props}>
        <option value="">Select your district</option>
        {DISTRICTS.map(d => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-neutral-muted">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
});

export default DistrictSelect;
