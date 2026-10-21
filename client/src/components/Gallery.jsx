import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { GALLERY } from '../data/site.js';
import { usePrefersReducedMotion, useInViewOnce, useScrollFrame } from '../lib/motion.js';

const WIDE = 'aspect-[3/2]';
const TALL = 'aspect-[4/5]';

function useMinWidth(px) {
  const query = `(min-width: ${px}px)`;
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return match;
}

function Tile({ item, index, onOpen, sizeClass, eager = false }) {
  const shape = index % 2 === 0 ? WIDE : TALL;
  const body = item.src ? (
    <>
      <img
        src={item.src}
        alt={item.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="h-full w-full object-cover"
      />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-10 text-left">
        <span className="block font-display text-lg font-bold text-white">{item.caption}</span>
        {item.place && <span className="block text-sm text-white/80">{item.place}</span>}
      </span>
    </>
  ) : (
    <span
      className="flex h-full w-full flex-col justify-end p-4 text-left"
      style={{
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 14px, transparent 14px 28px)'
      }}
    >
      <span className="block font-display text-xl font-bold text-white">{item.caption}</span>
      <span className="block text-sm text-brand-green-tint">{item.place}</span>
    </span>
  );

  const frame = `relative shrink-0 overflow-hidden rounded-xl bg-brand-green ${shape} ${sizeClass}`;

  if (!item.src) {
    return <li className={frame}>{body}</li>;
  }
  return (
    <li className={frame}>
      <button
        type="button"
        onClick={() => onOpen(index)}
        className="block h-full w-full focus-visible:outline-offset-[-4px]"
        aria-label={`Open photo: ${item.caption}`}
      >
        {body}
      </button>
    </li>
  );
}

function Lightbox({ index, onClose, onMove }) {
  const closeRef = useRef(null);
  const item = GALLERY[index];

  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onMove(1);
      if (e.key === 'ArrowLeft') onMove(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [onClose, onMove]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.caption}
      className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="flex justify-end">
        <button ref={closeRef} type="button" onClick={onClose} className="btn min-w-tap text-white hover:bg-white/10">
          Close
        </button>
      </div>
      <figure className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3">
        {/* The thumbnail is already cached, so it shows while the full-size image loads */}
        <img
          key={item.full || item.src}
          src={item.full || item.src}
          alt={item.alt}
          className="max-h-full min-h-0 max-w-full rounded-lg bg-contain bg-center bg-no-repeat object-contain"
          style={{ backgroundImage: `url("${item.src}")` }}
        />
        <figcaption className="text-center text-white">
          <span className="font-display text-xl font-bold">{item.caption}</span>
          {item.place && <span className="block text-sm text-white/75">{item.place}</span>}
        </figcaption>
      </figure>
      <div className="flex justify-between">
        <button type="button" onClick={() => onMove(-1)} className="btn text-white hover:bg-white/10">
          Previous
        </button>
        <button type="button" onClick={() => onMove(1)} className="btn text-white hover:bg-white/10">
          Next
        </button>
      </div>
    </div>
  );
}

// Desktop: the section pins while vertical scrolling slides the strip sideways.
// Phones and reduced motion: a plain swipeable row with scroll snapping.
export default function Gallery() {
  const reduced = usePrefersReducedMotion();
  const desktop = useMinWidth(768);
  const pinned = desktop && !reduced;

  const outerRef = useRef(null);
  const stripRef = useRef(null);
  const [distance, setDistance] = useState(0);
  const [openIndex, setOpenIndex] = useState(null);
  // In the pinned strip, off-screen tiles are clipped, so native lazy loading never
  // sees them. Load them all once the reader is within ~800px of the section instead.
  const sectionRef = useRef(null);
  const near = useInViewOnce(sectionRef, '800px 0px');

  const photoIndexes = GALLERY.map((g, i) => (g.src ? i : -1)).filter(i => i >= 0);
  const close = useCallback(() => setOpenIndex(null), []);
  const move = useCallback(
    step =>
      setOpenIndex(cur => {
        const pos = photoIndexes.indexOf(cur);
        return photoIndexes[(pos + step + photoIndexes.length) % photoIndexes.length];
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photoIndexes.join(',')]
  );

  useLayoutEffect(() => {
    if (!pinned) return;
    const measure = () => {
      const strip = stripRef.current;
      if (strip) setDistance(Math.max(0, strip.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pinned]);

  useScrollFrame(() => {
    if (!pinned || !outerRef.current || !stripRef.current) return;
    const rect = outerRef.current.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    const progress = travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
    stripRef.current.style.transform = `translate3d(${-progress * distance}px, 0, 0)`;
  }, [pinned, distance]);

  const heading = (
    <div className="container-page grid gap-3 lg:grid-cols-[1fr_1.4fr] lg:items-end">
      <h2 className="font-display text-4xl font-bold text-white sm:text-5xl">Gallery</h2>
      <p className="max-w-prose text-lg text-brand-green-tint">
        The people and causes TNV volunteers work for across Tamil Nadu.
        {pinned ? ' Keep scrolling to move through the photos.' : ' Swipe to see more.'}
      </p>
    </div>
  );

  return (
    <section ref={sectionRef} id="gallery" className="scroll-mt-32 bg-brand-green-dark">
      {pinned ? (
        <div ref={outerRef} style={{ height: `calc(100vh + ${distance}px)` }}>
          <div className="sticky top-0 flex h-screen flex-col justify-center gap-10 overflow-hidden py-16">
            {heading}
            <ul ref={stripRef} className="flex items-center gap-6 pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] pr-24 will-change-transform">
              {GALLERY.map((item, i) => (
                <Tile key={i} item={item} index={i} onOpen={setOpenIndex} sizeClass="h-[52vh]" eager={near} />
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="py-16">
          {heading}
          <ul className="mt-8 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:px-6">
            {GALLERY.map((item, i) => (
              <Tile key={i} item={item} index={i} onOpen={setOpenIndex} sizeClass="h-56 snap-start sm:h-72" />
            ))}
          </ul>
        </div>
      )}
      {openIndex !== null && <Lightbox index={openIndex} onClose={close} onMove={move} />}
    </section>
  );
}
