import { useState, useEffect, useRef, useCallback } from 'react';
import { usePrefersReducedMotion } from '../lib/motion.js';

const SLIDES = [
  {
    src: '/gallery/images/6152070404600696392.jpg',
    title: 'Statewide Volunteer Rallies & Foundation Day'
  },
  {
    src: '/gallery/images/6152070404600696394.jpg',
    title: 'Rapid Disaster Relief & Field Operations'
  },
  {
    src: '/gallery/images/6152070404600696400.jpg',
    title: 'Empowering Changemakers in Every District'
  },
  {
    src: '/gallery/images/6152070404600696407.jpg',
    title: 'District Administration Partnerships'
  },
  {
    src: '/gallery/images/6152070404600696488.jpg',
    title: 'ALERT Community First Responder Network'
  }
];

const SLIDE_DURATION = 5000;

export default function HeroSlideshow() {
  const reduced = usePrefersReducedMotion();
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const touchStartX = useRef(null);
  const progressIntervalRef = useRef(null);

  const total = SLIDES.length;

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % total);
    setProgress(0);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent(prev => (prev - 1 + total) % total);
    setProgress(0);
  }, [total]);

  const goTo = idx => {
    setCurrent(idx);
    setProgress(0);
  };

  useEffect(() => {
    if (reduced) return;

    const stepMs = 50;
    const increment = (stepMs / SLIDE_DURATION) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + increment;
      });
    }, stepMs);

    return () => clearInterval(progressIntervalRef.current);
  }, [reduced, next, current]);

  return (
    <div
      className="relative w-full rounded-2xl sm:rounded-3xl p-1 sm:p-1.5 bg-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] select-none"
      onTouchStart={e => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={e => {
        if (touchStartX.current === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(diff) > 40) {
          if (diff < 0) next();
          else prev();
        }
        touchStartX.current = null;
      }}
      role="region"
      aria-label="TNV Field Action Slideshow"
    >
      <div className="relative w-full h-[320px] sm:h-[380px] md:h-[420px] lg:h-[440px] xl:h-[470px] max-h-[calc(100vh-210px)] overflow-hidden rounded-xl sm:rounded-2xl bg-neutral-950 border border-white/20">
        {SLIDES.map((slide, idx) => {
          const isActive = idx === current;
          return (
            <div
              key={slide.src}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Pure, clean image - no cards, no text blocking */}
              <img
                src={slide.src}
                alt={slide.title}
                loading={idx === 0 ? 'eager' : 'lazy'}
                className={`h-full w-full object-cover object-center transition-transform duration-[6000ms] ease-out will-change-transform ${
                  isActive && !reduced ? 'scale-106' : 'scale-100'
                }`}
              />
            </div>
          );
        })}

        {/* Minimal progress bar at top edge */}
        {!reduced && (
          <div className="absolute top-0 inset-x-0 z-20 h-1 bg-white/20">
            <div
              className="h-full bg-brand-yellow transition-all duration-75 ease-linear shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Clean, minimal dots directly at bottom center (no floating card) */}
        <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 drop-shadow ${
                i === current ? 'w-6 bg-brand-yellow' : 'w-1.5 bg-white/60 hover:bg-white'
              }`}
            />
          ))}
        </div>

        {/* Subtle navigation arrows */}
        <button
          type="button"
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full bg-black/35 text-white/95 backdrop-blur-sm transition-all hover:bg-brand-yellow hover:text-neutral-950 active:scale-95 shadow-md border border-white/20"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={next}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-full bg-black/35 text-white/95 backdrop-blur-sm transition-all hover:bg-brand-yellow hover:text-neutral-950 active:scale-95 shadow-md border border-white/20"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
