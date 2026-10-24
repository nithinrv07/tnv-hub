import { useState, useRef, useEffect, useId } from 'react';

/**
 * PastFieldWorkSelect
 * Multi-select dropdown for past field work with grouped department checklist,
 * search filtering, smart Fresher handling, and removable pill tags.
 * Design aligned with TNV Civic Design System (DESIGN.md).
 */
export default function PastFieldWorkSelect({
  departments = [],
  value = [],
  onChange,
  error = null,
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef(null);
  const searchInputRef = useRef(null);
  const id = useId();

  // Close on outside pointer click or Escape key
  useEffect(() => {
    if (!open) return;
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }

    function handlePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  // Smart Fresher selection logic
  const handleToggle = (item) => {
    if (item === 'Fresher') {
      onChange(value.includes('Fresher') ? [] : ['Fresher']);
    } else {
      const next = value.includes(item)
        ? value.filter(v => v !== item)
        : [...value.filter(v => v !== 'Fresher'), item];
      onChange(next);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const term = search.trim().toLowerCase();

  // Filter groups and items
  const filteredGroups = (departments || [])
    .map(group => {
      const groupDept = group.department || group.name || 'General';
      const items = group.items || group.options || [];
      const matchingItems = items.filter(
        item => !term || item.toLowerCase().includes(term) || groupDept.toLowerCase().includes(term)
      );
      return {
        department: groupDept,
        items: matchingItems
      };
    })
    .filter(group => group.items.length > 0);

  return (
    <div ref={rootRef} className="relative w-full">
      {/* Dropdown Trigger Button */}
      <button
        id={`${id}-btn`}
        type="button"
        onClick={() => !disabled && setOpen(prev => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left text-sm transition-all shadow-2xs ${
          error
            ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-2 focus:ring-rose-400'
            : open
            ? 'border-brand-green ring-2 ring-brand-green/20 bg-white'
            : 'border-neutral-300 bg-white hover:border-brand-green/60'
        } ${disabled ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-brand-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className={`truncate ${value.length ? 'font-bold text-brand-green-dark' : 'text-neutral-500'}`}>
            {value.length === 0
              ? '— Select past field work (select all that apply) —'
              : value.includes('Fresher')
              ? 'Fresher (No prior field experience)'
              : `${value.length} field work focus area${value.length > 1 ? 's' : ''} selected`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {value.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-brand-green-tint text-brand-green-dark border border-brand-green/30">
              {value.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${open ? 'rotate-180 text-brand-green' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Floating Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1.5 rounded-2xl border border-brand-green-tint/80 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-3 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2">
            <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search field work"
              aria-label="Search past field work"
              className="w-full bg-transparent text-xs text-neutral-800 placeholder-neutral-400 border-none focus:outline-none focus:ring-0"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-neutral-400 hover:text-neutral-600 p-1 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Grouped Department Checklist */}
          <div
            role="listbox"
            aria-multiselectable="true"
            className="max-h-72 overflow-y-auto p-3 space-y-4 divide-y divide-neutral-100"
          >
            {filteredGroups.map((group, gIdx) => (
              <div key={group.department || gIdx} className={gIdx > 0 ? 'pt-3' : ''}>
                <div className="px-1 pb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-brand-green font-display flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
                  <span>{group.department}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                  {group.items.map((item) => {
                    const checked = value.includes(item);
                    return (
                      <label
                        key={item}
                        className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'bg-brand-green-tint text-brand-green-dark font-bold border border-brand-green/30 shadow-2xs'
                            : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggle(item)}
                          className="mt-0.5 rounded text-brand-green focus:ring-brand-green"
                        />
                        <span className="leading-snug">{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredGroups.length === 0 && (
              <div className="py-8 text-center text-xs text-neutral-400">
                No field work focus areas match &ldquo;{search}&rdquo;.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-neutral-50 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleClearAll}
              disabled={!value.length}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-extrabold text-xs shadow-xs transition-colors"
            >
              Done ({value.length})
            </button>
          </div>
        </div>
      )}

      {/* Selected Removable Tag Chips */}
      {value.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/30 bg-brand-green-tint px-3 py-1 text-xs font-bold text-brand-green-dark shadow-2xs animate-in fade-in duration-100"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => handleToggle(item)}
                aria-label={`Remove ${item}`}
                className="rounded-full p-0.5 hover:bg-brand-green/20 text-brand-green-dark transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-rose-600 mt-1.5 font-medium">{error}</p>}
    </div>
  );
}
