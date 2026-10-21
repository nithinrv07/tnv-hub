import { useRef } from 'react';
import { usePrefersReducedMotion, useInViewOnce, useScrollFrame } from '../lib/motion.js';

// Scroll-linked text reveal: each word brightens from faint to full as the
// paragraph moves up through the viewport. Screen readers get the plain text.
export function RevealText({ text, as: Tag = 'p', className = '' }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const words = text.split(' ');

  useScrollFrame(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 when the top of the block is at 85% of the viewport, 1 when its bottom reaches 45%
    const start = vh * 0.85;
    const end = vh * 0.45;
    const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end + rect.height)));
    const lit = progress * words.length;
    el.querySelectorAll('[data-w]').forEach((w, i) => {
      w.style.opacity = String(Math.min(1, Math.max(0.18, lit - i + 0.18)));
    });
  }, [reduced, text]);

  return (
    <Tag ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span key={i} data-w className="transition-opacity duration-150" style={{ opacity: reduced ? 1 : 0.18 }}>
            {w}{' '}
          </span>
        ))}
      </span>
    </Tag>
  );
}

// Heading that slides up from behind a mask the first time it scrolls into view
export function RevealHeading({ as: Tag = 'h2', className = '', children, ...rest }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const seen = useInViewOnce(ref);
  const shown = reduced || seen;

  return (
    <Tag ref={ref} className={`overflow-hidden ${className}`} {...rest}>
      <span
        className="block transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(105%)' }}
      >
        {children}
      </span>
    </Tag>
  );
}
