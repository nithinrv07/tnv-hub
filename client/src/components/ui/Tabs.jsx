/**
 * Accessible Tabs Primitive.
 * Features full keyboard arrow navigation (Left/Right/Home/End) and role="tablist".
 * Scrolls horizontally on mobile with zero scrollbar clutter via .no-scrollbar.
 *
 * @prop {Array<{ id: string, label: string, icon?: React.ReactNode, count?: number|string }>} tabs - Tab list
 * @prop {string} activeId - Currently active tab id
 * @prop {Function} onChange - Handler receiving tab id when selected
 * @prop {string} [className] - Additional styling classes
 */

import { useRef } from 'react';

export default function Tabs({
  tabs = [],
  activeId,
  onChange,
  className = ''
}) {
  const tabsRef = useRef([]);

  const handleKeyDown = (event, currentIndex) => {
    let nextIndex = null;
    const total = tabs.length;

    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % total;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + total) % total;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = total - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      const targetTab = tabs[nextIndex];
      onChange(targetTab.id);
      tabsRef.current[nextIndex]?.focus();
    }
  };

  return (
    <div className={`border-b border-brand-green-tint ${className}`}>
      <div
        role="tablist"
        aria-label="Content navigation tabs"
        className="no-scrollbar -mb-px flex gap-2 overflow-x-auto"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeId;

          return (
            <button
              key={tab.id}
              ref={el => (tabsRef.current[index] = el)}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={e => handleKeyDown(e, index)}
              className={`flex min-h-tap shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow ${
                isActive
                  ? 'border-brand-green text-brand-green-dark'
                  : 'border-transparent text-neutral-muted hover:border-brand-green-tint hover:text-neutral-ink'
              }`}
            >
              {tab.icon && (
                <span className="shrink-0" aria-hidden="true">
                  {tab.icon}
                </span>
              )}
              <span className="truncate">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                    isActive
                      ? 'bg-brand-green-tint text-brand-green-dark'
                      : 'bg-neutral-bg text-neutral-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
