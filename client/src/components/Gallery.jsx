import { useCallback, useEffect, useRef, useState } from 'react';
import { GALLERY } from '../data/site.js';
import { usePrefersReducedMotion } from '../lib/motion.js';

const INTERVAL_MS = 5000;

// Slideshow: one large photo with caption, arrows, thumbnails, swipe on touch screens,
// and autoplay that pauses on hover, on keyboard focus, or with the pause button.
// Autoplay starts paused for people who prefer reduced motion.
export default function Gallery() {
  const reduced = usePrefersReducedMotion();
  const count = GALLERY.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchX = useRef(null);
  const thumbsRef = useRef(null);

  const go = useCallback(i => setIndex((i + count) % count), [count]);
  const next = useCallback(() => setIndex(i => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex(i => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (reduced) setPlaying(false);
  }, [reduced]);

  useEffect(() => {
    if (!playing || hovering || focused) return;
    const t = setTimeout(next, INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, playing, hovering, focused, next]);

  // Keep the active thumbnail visible in the thumbnail row
  useEffect(() => {
    const row = thumbsRef.current;
    const thumb = row?.children[index];
    if (!row || !thumb) return;
    const left = thumb.offsetLeft - (row.clientWidth - thumb.clientWidth) / 2;
    row.scrollTo({ left, behavior: reduced ? 'auto' : 'smooth' });
  }, [index, reduced]);

  const onKeyDown = e => {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  };

  const item = GALLERY[index];
  const near = i => i === index || i === (index + 1) % count || i === (index - 1 + count) % count;

  return (
    <section id="gallery" className="scroll-mt-32 bg-brand-green-dark py-16 sm:py-20">
      <div className="container-page">
        <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">Gallery</h2>
          <p className="max-w-prose text-lg text-brand-green-tint">
            The people and causes TNV volunteers work for across Tamil Nadu.
          </p>
        </div>

        <div
          className="mt-8"
          role="region"
          aria-roledescription="carousel"
          aria-label="TNV gallery"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setFocused(true)}
          onBlur={e => !e.currentTarget.contains(e.relatedTarget) && setFocused(false)}
          onKeyDown={onKeyDown}
        >
          <div
            className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-green sm:aspect-[16/9]"
            onTouchStart={e => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={e => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
              touchX.current = null;
            }}
          >
            {/* Only the current photo and its neighbours are mounted, so the browser
                loads three images at a time instead of all eleven */}
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
                  {g.src ? (
                    <img
                      src={g.full || g.src}
                      alt={g.alt}
                      className="h-full w-full bg-cover bg-center object-cover"
                      style={{ backgroundImage: `url("${g.src}")` }}
                    />
                  ) : (
                    <div className="h-full w-full bg-brand-green" />
                  )}
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pb-5 pt-16 sm:px-8 sm:pb-7">
                    <span className="block font-display text-2xl font-bold text-white sm:text-3xl">{g.caption}</span>
                    {g.place && <span className="mt-1 block text-white/85">{g.place}</span>}
                  </figcaption>
                </figure>
              ) : null
            )}

            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand-green-dark shadow hover:bg-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-brand-green-dark shadow hover:bg-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPlaying(p => !p)}
              className="btn shrink-0 gap-2 border-2 border-white/40 px-4 text-sm text-white hover:bg-white/10"
            >
              {playing ? (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play
                </>
              )}
            </button>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-brand-green-tint" aria-live="polite">
              {index + 1} / {count}
              <span className="sr-only">: {item.caption}</span>
            </p>
          </div>

          <ul ref={thumbsRef} className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Choose a photo">
            {GALLERY.map((g, i) => (
              <li key={i} className="shrink-0">
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Show photo ${i + 1}: ${g.caption}`}
                  aria-current={i === index ? 'true' : undefined}
                  className={`block h-16 w-24 overflow-hidden rounded-lg ring-2 transition sm:h-20 sm:w-28 ${
                    i === index ? 'opacity-100 ring-brand-yellow' : 'opacity-60 ring-transparent hover:opacity-90'
                  }`}
                >
                  {g.src ? (
                    <img src={g.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="block h-full w-full bg-brand-green" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
