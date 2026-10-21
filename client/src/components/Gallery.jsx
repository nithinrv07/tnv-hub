import { useCallback, useEffect, useRef, useState } from 'react';
import { GALLERY } from '../data/site.js';
import { usePrefersReducedMotion } from '../lib/motion.js';

const INTERVAL_MS = 5000;

function Arrow({ dir, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Previous photo' : 'Next photo'}
      className={`absolute top-1/2 z-10 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand-green-dark shadow-lg hover:bg-white ${
        dir === 'prev' ? 'left-3 sm:left-6' : 'right-3 sm:right-6'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// Full-width slideshow: one photo fills the band, caption and arrows sit on top.
// Autoplay pauses on hover and on keyboard focus, and is off for people who prefer
// reduced motion (they use the arrows). Swipe on touch screens.
export default function Gallery() {
  const reduced = usePrefersReducedMotion();
  const count = GALLERY.length;
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchX = useRef(null);
  const playing = !reduced;

  const next = useCallback(() => setIndex(i => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex(i => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (!playing || hovering || focused) return;
    const t = setTimeout(next, INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, playing, hovering, focused, next]);

  const item = GALLERY[index];
  // Only the current photo and its neighbours are mounted, so about three load at a time
  const near = i => i === index || i === (index + 1) % count || i === (index - 1 + count) % count;

  return (
    <section id="gallery" className="scroll-mt-32 bg-brand-green-dark pt-8 sm:pt-10">
      <div className="container-page flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-display text-3xl font-bold text-white">Gallery</h2>
        <p className="text-brand-green-tint">The people and causes TNV volunteers work for across Tamil Nadu.</p>
      </div>

      <div
        className="relative mt-5 h-[70vh] max-h-[860px] min-h-[340px] w-full overflow-hidden bg-brand-green sm:h-[80vh]"
        role="region"
        aria-roledescription="carousel"
        aria-label="TNV gallery"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onFocus={() => setFocused(true)}
        onBlur={e => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
        onKeyDown={e => {
          if (e.key === 'ArrowRight') next();
          if (e.key === 'ArrowLeft') prev();
        }}
        onTouchStart={e => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={e => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
          touchX.current = null;
        }}
      >
        {GALLERY.map((g, i) =>
          near(i) ? (
            <figure
              key={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${g.caption}`}
              aria-hidden={i !== index}
              className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}
            >
              {g.src && (
                <img
                  src={g.src}
                  srcSet={g.full ? `${g.src} 800w, ${g.full} 1600w` : undefined}
                  sizes="100vw"
                  alt={g.alt}
                  decoding="async"
                  fetchPriority={i === index ? 'high' : 'low'}
                  className="h-full w-full object-cover"
                />
              )}
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pb-10 pt-24 sm:pb-14">
                <span className="container-page block">
                  <span className="block font-display text-3xl font-bold text-white sm:text-5xl">{g.caption}</span>
                  {g.place && <span className="mt-2 block text-lg text-white/85">{g.place}</span>}
                </span>
              </figcaption>
            </figure>
          ) : null
        )}

        <Arrow dir="prev" onClick={prev} />
        <Arrow dir="next" onClick={next} />

        <p className="sr-only">
          Photo {index + 1} of {count}: {item.caption}
        </p>
      </div>
    </section>
  );
}
