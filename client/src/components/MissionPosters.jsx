import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RevealHeading } from './Reveal.jsx';

const POSTERS = [
  {
    id: 'drug-free-tn',
    src: '/gallery/images/6152070404600696494.jpg',
    category: 'safety',
    partner: 'Tamil Nadu Police',
    partnerBadge: 'TN Police Joint Initiative',
    title: 'Drug-Free Tamil Nadu & Road Safety Campaign',
    titleTa: 'போதைப்பொருள் இல்லாத தமிழ்நாடு விழிப்புணர்வு',
    desc: 'Joint awareness initiative with Tamil Nadu Police (@tnpoliceofficial) at Adyar LB Road Bridge. Promoting zero drunk-driving, youth pledges, and road safety awareness across 38 districts.',
    helpline: '10581 Helpline / 9087293339',
    date: 'Year-Round Statewide Drive',
    location: 'Chennai & All 38 Districts'
  },
  {
    id: 'palm-plantation',
    src: '/gallery/images/6152070404600696418.jpg',
    category: 'environment',
    partner: 'Govt Dept of Environment & Forest',
    partnerBadge: 'Govt Collaboration',
    title: '1 Crore Palm Seeds Plantation Mission',
    titleTa: 'ஒரு கோடி பனை விதை நடும் பேரியக்கம்',
    desc: 'Statewide eco-restoration planting 11.25 lakh palm seeds in Erode and over 45 lakh palm seeds across 38 districts with 63,500+ volunteers, geo-tagged via the Udhavi App.',
    helpline: '63,562 Volunteers Geo-tagging',
    date: 'World Ozone Day to Dr. Kalam Day',
    location: 'Erode, Cauvery Basin & Coastal TN'
  },
  {
    id: 'wayanad-relief',
    src: '/gallery/images/6152070404600696397.jpg',
    category: 'disaster',
    partner: 'Disaster Relief Wing',
    partnerBadge: 'Emergency Rapid Action',
    title: 'Wayanad Landslide Rapid Field Assistance',
    titleTa: 'வயநாடு நிலச்சரிவு உடனடி நிவாரண உதவி',
    desc: 'Rapid ground relief supporting infants under 1 year, elderly citizens over 70, differently-abled persons, and medical patients with food, emergency kits, and shelter assistance.',
    helpline: 'TNV Disaster Desk: 9087293339',
    date: 'Disaster Emergency Response',
    location: 'Wayanad & Western Ghats'
  },
  {
    id: 'alert-first-aid',
    src: '/gallery/images/6152070404600696489.jpg',
    category: 'safety',
    partner: 'ALERT Community Network',
    partnerBadge: 'Dr. Kalam Vision Project',
    title: 'ALERT VOICE Community First Responder Training',
    titleTa: 'அவசர கால முதலுதவி & களப்பணியாளர் பயிற்சி',
    desc: 'India’s 1st community-driven first responder program with a vision set by Dr. APJ Abdul Kalam: "Train one person in every family in emergency care". Intensive 3-day certified training.',
    helpline: 'Coordinator: 9360453037 / 8270955404',
    date: 'Certified 3-Day Batches',
    location: 'Chennai & District Centres'
  },
  {
    id: 'blood-donation',
    src: '/gallery/images/6152070404600696486.jpg',
    category: 'health',
    partner: 'Exnora International',
    partnerBadge: 'Statewide Health Drive',
    title: 'Exnora & TNV Voluntary Blood Donation Camp',
    titleTa: 'மாபெரும் மக்கள் இரத்ததான முகாம்',
    desc: 'Large-scale voluntary blood donation drive supporting government hospitals, regional trauma units, and pregnant mothers requiring critical emergency transfusions.',
    helpline: 'Emergency Blood Wing: 9840705480',
    date: 'Monthly & Emergency Drives',
    location: 'Saidapet, Chennai & Statewide'
  },
  {
    id: 'scholarship-guide',
    src: '/gallery/images/6152070404600696459.jpg',
    category: 'education',
    partner: 'Agaram, Maatram & IIT Madras',
    partnerBadge: 'Education Directory',
    title: 'Higher Education Free Scholarship Guide',
    titleTa: 'உயர்கல்வி வழிகாட்டல் & இலவச உதவித்தொகை',
    desc: 'Comprehensive statewide directory connecting underprivileged students scoring 90%+ with partner foundations (Agaram, Maatram, Mugavari, Kalvikaram, and IIT Madras BS Program).',
    helpline: 'TNV Education Wing: 9087293339',
    date: 'Annual Admissions Drive',
    location: 'Statewide Coverage'
  },
  {
    id: 'gcc-monsoon',
    src: '/gallery/images/6152070404600696421.jpg',
    category: 'disaster',
    partner: 'Greater Chennai Corporation (GCC)',
    partnerBadge: 'Civic Monsoon Response',
    title: 'Monsoon Volunteering with GCC',
    titleTa: 'மழைக்கால மாநகராட்சி தன்னார்வப் பணி',
    desc: 'Mobilizing hundreds of civic volunteers in partnership with Greater Chennai Corporation for flood mitigation, citizen helpline response, food delivery, and waterlogging support.',
    helpline: 'GCC Volunteer Helpline',
    date: 'Northeast Monsoon Season',
    location: 'All 15 Zones of Chennai'
  },
  {
    id: 'youth-day',
    src: '/gallery/images/6152070404600696402.jpg',
    category: 'education',
    partner: 'Youth Leadership Wing',
    partnerBadge: 'Youth Leadership',
    title: 'National Youth Day & Swami Vivekananda Rally',
    titleTa: 'தேசிய இளைஞர் தினம் & விவேகானந்தர் விழா',
    desc: 'Honouring Swami Vivekananda’s birth anniversary with youth leadership seminars, student civic awareness pledge, and district-level social work awards.',
    helpline: 'TNV Youth Wing',
    date: 'January 12 Annual Celebration',
    location: 'Tamil Nadu Universities & Colleges'
  }
];

export default function MissionPosters() {
  const [activePoster, setActivePoster] = useState(null);
  const [isPausedManual, setIsPausedManual] = useState(false);
  const trackRef = useRef(null);

  // Duplicated list for infinite seamless marquee loop
  const flowItems = [...POSTERS, ...POSTERS];

  // Keyboard navigation for Lightbox
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setActivePoster(null);
      if (e.key === 'ArrowRight' && activePoster) {
        const idx = POSTERS.findIndex(p => p.id === activePoster.id);
        setActivePoster(POSTERS[(idx + 1) % POSTERS.length]);
      }
      if (e.key === 'ArrowLeft' && activePoster) {
        const idx = POSTERS.findIndex(p => p.id === activePoster.id);
        setActivePoster(POSTERS[(idx - 1 + POSTERS.length) % POSTERS.length]);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePoster]);

  return (
    <section id="campaigns" className="scroll-mt-32 bg-white py-14 sm:py-20 border-b border-brand-green/10 overflow-hidden">
      <div className="container-page">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-green-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-green-dark border border-brand-green/20 mb-3">
              <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
              Statewide Field Campaigns & Awareness
            </div>
            <RevealHeading className="font-display text-2xl font-bold leading-tight text-brand-green-dark sm:text-3xl lg:text-4xl">
              Our Mission in Action: Campaign Posters
            </RevealHeading>
            <p className="mt-2 text-sm sm:text-base text-neutral-muted leading-relaxed">
              Official mission posters from joint drives with Tamil Nadu Police, Greater Chennai Corporation, Forest Department, and leading social institutions.
            </p>
          </div>

          {/* Interactive Flow Hint & Pause Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPausedManual(p => !p)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-bg px-3.5 py-1.5 text-xs font-bold text-neutral-ink hover:bg-brand-green-tint hover:text-brand-green-dark transition-colors shadow-sm"
            >
              {isPausedManual ? (
                <>
                  <svg className="h-3.5 w-3.5 text-brand-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Resume Flow
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause Flow
                </>
              )}
            </button>
            <span className="text-xs text-neutral-muted font-medium hidden sm:inline">
              ✨ Hover to pause &amp; zoom poster
            </span>
          </div>
        </div>
      </div>

      {/* Infinite Continuous Flow Carousel */}
      <div className="relative mt-10 w-full overflow-hidden select-none">
        {/* Subtle Edge Gradients for smooth entrance/exit */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12 sm:w-24 bg-gradient-to-r from-white via-white/80 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12 sm:w-24 bg-gradient-to-l from-white via-white/80 to-transparent" />

        {/* Continuous Flow Marquee Track */}
        <div
          ref={trackRef}
          className={`animate-marquee-flow flex gap-5 sm:gap-6 py-6 px-4 ${
            isPausedManual ? '[animation-play-state:paused!important]' : ''
          }`}
        >
          {flowItems.map((poster, index) => (
            <div
              key={`${poster.id}-${index}`}
              onClick={() => setActivePoster(poster)}
              className="group relative flex-shrink-0 w-[260px] sm:w-[300px] md:w-[320px] rounded-2xl sm:rounded-3xl border border-neutral-200 bg-white shadow-md hover:shadow-2xl transition-all duration-300 ease-out transform hover:scale-106 hover:z-30 hover:border-brand-green cursor-pointer overflow-hidden flex flex-col justify-between"
            >
              {/* Poster Image Container */}
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                <img
                  src={poster.src}
                  alt={poster.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />

                {/* Top Partner Badge */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span className="rounded-full bg-neutral-900/85 backdrop-blur-md px-2.5 py-1 text-[11px] font-extrabold text-white border border-white/20 shadow">
                    {poster.partnerBadge}
                  </span>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-yellow text-neutral-950 font-bold opacity-0 group-hover:opacity-100 transition-opacity shadow">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </span>
                </div>

                {/* Hover Reveal Label */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/40 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-brand-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Click to view full poster
                  </p>
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-brand-green">
                    {poster.partner}
                  </p>
                  <h3 className="mt-1 font-display text-sm sm:text-base font-bold text-neutral-ink group-hover:text-brand-green-dark transition-colors line-clamp-2">
                    {poster.title}
                  </h3>
                  <p className="mt-1 text-xs text-brand-green-dark font-display font-medium line-clamp-1">
                    {poster.titleTa}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] font-semibold text-neutral-muted">
                  <span className="truncate max-w-[160px]">📍 {poster.location}</span>
                  <span className="text-brand-green-dark font-bold group-hover:text-brand-yellow transition-colors">
                    Inspect &rarr;
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activePoster && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6"
          onClick={() => setActivePoster(null)}
        >
          <div
            className="relative flex flex-col lg:flex-row max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl sm:rounded-3xl bg-neutral-900 border border-white/20 text-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActivePoster(null)}
              aria-label="Close poster view"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white hover:bg-brand-yellow hover:text-neutral-950 transition-colors shadow-lg border border-white/20"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Poster Image View */}
            <div className="relative flex-1 bg-black/90 flex items-center justify-center p-3 sm:p-5 overflow-auto max-h-[50vh] lg:max-h-[92vh]">
              <img
                src={activePoster.src}
                alt={activePoster.title}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Poster Details Sidebar */}
            <div className="w-full lg:w-[380px] p-5 sm:p-7 flex flex-col justify-between bg-neutral-950 border-t lg:border-t-0 lg:border-l border-white/10 overflow-y-auto">
              <div>
                <span className="inline-block rounded-full bg-brand-yellow px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-neutral-950">
                  {activePoster.partnerBadge}
                </span>

                <h2 className="mt-3 font-display text-lg sm:text-xl font-bold leading-snug text-white">
                  {activePoster.title}
                </h2>
                <p className="mt-1 font-display text-sm font-semibold text-brand-yellow">
                  {activePoster.titleTa}
                </p>

                <div className="mt-4 space-y-2.5 text-xs sm:text-sm text-neutral-300">
                  <div className="rounded-xl bg-white/5 p-3 border border-white/10">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-yellow">Key Mission</p>
                    <p className="mt-1 leading-relaxed text-neutral-200">{activePoster.desc}</p>
                  </div>

                  <div className="rounded-xl bg-white/5 p-3 border border-white/10 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Campaign Details</p>
                    <p className="flex items-center gap-2">
                      <span className="text-brand-yellow font-bold">🏛️ Partner:</span> {activePoster.partner}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-brand-yellow font-bold">📍 Location:</span> {activePoster.location}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-brand-yellow font-bold">📅 Schedule:</span> {activePoster.date}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-brand-yellow font-bold">📞 Contact/Desk:</span> {activePoster.helpline}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2.5">
                <Link
                  to="/register?type=individual"
                  onClick={() => setActivePoster(null)}
                  className="btn-register flex-1 py-2.5 text-xs sm:text-sm font-bold text-center justify-center"
                >
                  Join as Volunteer &rarr;
                </Link>
                <a
                  href={activePoster.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn border border-white/30 py-2.5 text-xs sm:text-sm text-white hover:bg-white/10 text-center justify-center"
                >
                  Open Original
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
