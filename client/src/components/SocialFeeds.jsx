import { useEffect, useState } from 'react';
import { SOCIAL_LINKS } from '../data/site.js';
import { usePrefersReducedMotion } from '../lib/motion.js';
import SocialIcon from './SocialIcon.jsx';
import { RevealHeading } from './Reveal.jsx';

const sectionTitle = 'font-display text-2xl font-bold leading-tight text-brand-green-dark sm:text-3xl lg:text-4xl pb-1';
const youtubeUrl = SOCIAL_LINKS.find(s => s.name === 'YouTube')?.url || 'https://www.youtube.com/channel/UCipkDG8Ltx0sfX_H7K7ApOA';

const TNV_VIDEOS = [
  { id: 'WmW8ekM9XvQ', title: 'Palmyra Seed Planting Drive 2026 — Green Tamil Nadu' },
  { id: 'fORHIkAhwDA', title: 'Wayanad Landslide Rescue by Tamil Nadu Volunteers Team' },
  { id: 'GGG2cLdAYXY', title: 'How To Use Udhavi App — Green Tamil Nadu Mission' },
  { id: 'oLeyfqtS7Fo', title: 'Food For Tribal Kids — Tamil Nadu Volunteers' },
  { id: 'N59Ze7NEZ1c', title: 'Chief Coordinator Thiru. Hari Krishnan N — TNV Vision' },
  { id: '42p13gZJcdo', title: 'Nepal Flood Rehabilitation Highlights' }
];

// YouTube video slideshow of TNV initiatives; auto-slides when no video is playing.
export default function SocialFeeds() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  const current = TNV_VIDEOS[index];
  const prev = () => {
    setPlaying(false);
    setEmbedError(false);
    setIndex(i => (i - 1 + TNV_VIDEOS.length) % TNV_VIDEOS.length);
  };
  const next = () => {
    setPlaying(false);
    setEmbedError(false);
    setIndex(i => (i + 1) % TNV_VIDEOS.length);
  };

  useEffect(() => {
    if (playing || reduced) return undefined;
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % TNV_VIDEOS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [playing, reduced]);

  return (
    <section id="social" className="scroll-mt-32 bg-neutral-bg py-10 sm:py-14" aria-labelledby="social-title">
      <div className="container-page">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
          {/* Left: Compact YouTube Slideshow */}
          <div className="min-w-0 overflow-hidden rounded-2xl border border-brand-green-tint bg-white shadow-sm">
            <div className="relative aspect-video w-full bg-neutral-900">
              {playing && !embedError ? (
                <iframe
                  key={current.id}
                  src={`https://www.youtube-nocookie.com/embed/${current.id}?autoplay=1&rel=0`}
                  title={current.title}
                  onError={() => setEmbedError(true)}
                  className="h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEmbedError(false);
                    setPlaying(true);
                  }}
                  aria-label={`Play video: ${current.title}`}
                  className="group relative block h-full w-full text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow"
                >
                  <img
                    src={`https://i.ytimg.com/vi/${current.id}/hqdefault.jpg`}
                    alt={current.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-yellow text-neutral-ink shadow-xl transition-transform group-hover:scale-110 sm:h-14 sm:w-14">
                      <svg className="ml-0.5 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                    <span className="inline-block rounded-full bg-black/60 px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-yellow">
                      Video {index + 1} of {TNV_VIDEOS.length}
                    </span>
                    <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold text-white sm:text-base">
                      {current.title}
                    </h3>
                  </div>
                </button>
              )}
            </div>

            {/* Compact Slideshow Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 px-3 py-2.5 sm:px-4">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous video"
                  className="grid min-h-tap min-w-tap place-items-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                >
                  &larr;
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next video"
                  className="grid min-h-tap min-w-tap place-items-center rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                >
                  &rarr;
                </button>
                <div className="ml-1.5 flex items-center gap-1" role="tablist" aria-label="Select video slide">
                  {TNV_VIDEOS.map((v, i) => (
                    <button
                      key={v.id}
                      type="button"
                      aria-label={`Show video ${i + 1}: ${v.title}`}
                      aria-selected={i === index}
                      onClick={() => {
                        setPlaying(false);
                        setEmbedError(false);
                        setIndex(i);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        i === index ? 'w-5 bg-brand-green' : 'w-2 bg-neutral-300 hover:bg-neutral-400'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <a
                href={`https://www.youtube.com/watch?v=${current.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-brand-green hover:underline"
              >
                Watch on YouTube &rarr;
              </a>
            </div>
          </div>

          {/* Right: Editorial Copy & Highlights */}
          <div className="min-w-0 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-green">
              Field Stories &amp; Updates
            </p>
            <RevealHeading id="social-title" className={sectionTitle}>
              See our volunteers in action
            </RevealHeading>
            <p className="text-sm leading-relaxed text-neutral-muted sm:text-base">
              Every week, Tamil Nadu Volunteers teams are on the ground — planting palmyra seeds, responding to floods and landslides, serving meals to tribal children, and guiding youth across all 38 districts.
            </p>

            <ul className="space-y-2 border-l-2 border-brand-green/40 pl-4 text-xs sm:text-sm text-neutral-ink">
              <li>
                <strong>Green Tamil Nadu Mission:</strong> Geo-tagging 45 lakh+ palm trees with volunteers and the Udhavi app.
              </li>
              <li>
                <strong>Rapid Disaster Relief:</strong> From Wayanad landslides to Cyclone Michaung and flood rehabilitation.
              </li>
              <li>
                <strong>Community &amp; Youth Care:</strong> Free tuition centres, Drug-Free Tamil Nadu drives, and daily food support.
              </li>
            </ul>

            <div className="pt-2">
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-tap items-center gap-2 rounded-full bg-brand-green-dark px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-brand-green sm:text-sm"
              >
                <SocialIcon name="youtube" className="h-4 w-4 text-brand-yellow" />
                <span>Subscribe &amp; Watch All Videos &rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
