import { forwardRef, useState } from 'react';
import { inputClass } from './FormField.jsx';

// Masked input with a show / hide toggle. Also used for Aadhaar.
const PasswordInput = forwardRef(function PasswordInput({ invalid, showLabel = 'Show', ...props }, ref) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={`${inputClass(invalid)} pr-20`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute inset-y-0 right-0 min-w-tap px-3 text-sm font-semibold text-brand-green hover:text-brand-green-dark"
        aria-pressed={visible}
        aria-controls={props.id}
      >
        {visible ? 'Hide' : showLabel}
      </button>
    </div>
  );
});

export default PasswordInput;
