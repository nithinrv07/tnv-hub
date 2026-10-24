import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ORG, CREDENTIALS, MANAGEMENT, IMPACT, PROGRAMS, GOALS, VALUES, ZONES,
  JOIN_STEPS, SOCIAL_LINKS, CONTACT
} from '../data/site.js';
import { usePrefersReducedMotion, useInViewOnce, useScrollFrame } from '../lib/motion.js';
import Gallery from '../components/Gallery.jsx';
import SocialIcon from '../components/SocialIcon.jsx';
import { RevealHeading, RevealText } from '../components/Reveal.jsx';
import { formatPhone } from '../lib/format.js';

const sectionTitle = 'font-display text-2xl font-bold leading-tight text-brand-green-dark sm:text-3xl lg:text-4xl pb-1';

function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-green-dark text-white">
      {/* On large screens the hero fills the first screen below the header (~11rem) */}
      <div className="container-page grid gap-10 py-12 sm:py-16 lg:min-h-[calc(100svh-11rem)] lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">

        <div>
          <p lang="ta" translate="no" className="notranslate font-display text-base font-bold leading-snug text-brand-yellow sm:text-xl">
            {ORG.motto}
          </p>
          <p className="mt-1 text-xs sm:text-sm text-brand-green-tint">{ORG.tagline}</p>
          <h1
            className="mt-4 max-w-xl font-display text-2xl sm:text-4xl lg:text-5xl xl:max-w-2xl font-extrabold leading-tight"
            style={{ fontStretch: '88%' }}
          >
            Volunteers in every district of Tamil Nadu
          </h1>
          <p className="mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-brand-green-tint">{ORG.intro}</p>
          
          {/* Dual Action Options: Individual Volunteer or Institutional Collaboration */}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/register?type=individual" className="btn-register px-6 py-2.5 text-sm sm:text-base font-bold">
              Register as Volunteer
            </Link>
            <Link
              to="/register?type=institution"
              className="btn border-2 border-brand-yellow/80 bg-brand-yellow/10 px-6 py-2.5 text-sm sm:text-base font-bold text-brand-yellow hover:bg-brand-yellow hover:text-neutral-900 transition-colors"
            >
              Collaborate as Institution
            </Link>
            <Link
              to="/donate"
              className="btn border border-white/60 px-5 py-2.5 text-sm sm:text-base text-white hover:bg-white/10"
            >
              Donate
            </Link>
          </div>
          <p className="mt-3 text-xs text-brand-green-tint">
            Free to register. Active network across all 38 districts of Tamil Nadu.
          </p>
        </div>

        <ZoneWall />
      </div>
    </section>
  );
}

// The page's one load animation: all 38 districts, grouped by TNV zone,
// switch on one by one after load.
function ZoneWall() {
  const reduced = usePrefersReducedMotion();
  const [lit, setLit] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setLit(true);
      return;
    }
    const t = setTimeout(() => setLit(true), 250);
    return () => clearTimeout(t);
  }, [reduced]);

  const step = 40;
  let n = 0;
  return (
    <div>
      <h2 className="sr-only">Our 9 zones and 38 districts</h2>
      <dl className="grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2">
        {ZONES.map(z => (
          <div key={z.name} className="border-l-2 border-brand-yellow/60 pl-3">
            <dt className="text-xs font-bold text-brand-yellow">{z.name} zone</dt>
            <dd className="flex flex-wrap gap-x-2 font-display text-xs sm:text-sm font-medium leading-snug">
              {z.districts.map(d => {
                const i = n++;
                return (
                  <span
                    key={d}
                    className={`transition-[color,opacity] duration-500 ${lit ? 'text-white/75 opacity-100' : 'text-brand-yellow opacity-0'}`}
                    style={{ transitionDelay: lit && !reduced ? `${i * step}ms` : '0ms' }}
                  >
                    {d}
                  </span>
                );
              })}
            </dd>
          </div>
        ))}
      </dl>
      <p
        className={`mt-4 text-xs sm:text-sm font-semibold text-brand-yellow transition-opacity duration-700 ${lit ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDelay: lit && !reduced ? `${38 * step + 200}ms` : '0ms' }}
      >
        9 zones, 38 districts. Your district decides which local group you join.
      </p>
    </div>
  );
}

// Option for Individuals and Institutions to Register or Collaborate
function CollaborateSection() {
  return (
    <section id="collaborate" className="scroll-mt-32 bg-white py-12 sm:py-16 border-b border-brand-green/10">
      <div className="container-page">
        <div className="max-w-2xl">
          <RevealHeading className={sectionTitle}>Choose how you want to make an impact</RevealHeading>
          <p className="mt-2.5 text-sm sm:text-base text-neutral-muted">
            Whether you are an individual citizen wanting to serve your community or an institution looking to multiply social impact, TNV welcomes you.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Card 1: Individual Volunteers */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-brand-green/20 bg-brand-green-tint/30 p-6 sm:p-7 hover:border-brand-green transition-all shadow-sm">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green text-white shadow-sm mb-4">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="inline-block rounded-full bg-brand-green-tint px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-green-dark font-display mb-2 border border-brand-green/20">
                For Individuals
              </span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-brand-green-dark">
                Join as an Individual Volunteer
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-muted">
                Join our 10,000+ volunteer network across all 38 districts of Tamil Nadu. Participate in grassroots disaster relief, environmental campaigns, student mentoring, and civic outreach.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs sm:text-sm font-medium text-neutral-ink">
                <li className="flex items-center gap-2">
                  <span className="text-brand-green font-bold">✓</span> Assigned to your local district & assembly constituency
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand-green font-bold">✓</span> Official Tamil Nadu Volunteers ID Card & appointment letter
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand-green font-bold">✓</span> Flexible modes of work (Field, Remote, or Hybrid)
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <Link
                to="/register?type=individual"
                className="btn-register inline-flex w-full sm:w-auto items-center justify-center px-6 py-2.5 text-xs sm:text-sm font-bold shadow-sm"
              >
                Register as Individual Volunteer &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2: Institutions & Organisations */}
          <div className="flex flex-col justify-between rounded-2xl border-2 border-brand-yellow/50 bg-brand-yellow-tint/40 p-6 sm:p-7 hover:border-brand-yellow transition-all shadow-sm">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-yellow text-neutral-900 shadow-sm mb-4 font-black">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="inline-block rounded-full bg-brand-yellow-tint px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-900 font-display mb-2 border border-amber-300">
                For Institutions & Corporates
              </span>
              <h3 className="font-display text-lg sm:text-xl font-bold text-neutral-ink">
                Collaborate as an Institution / NGO
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-neutral-muted">
                Colleges, Universities (NSS/NCC cells), Corporate CSR teams, Schools, Clubs, and Registered NGOs can partner with TNV for statewide social impact programmes.
              </p>
              <ul className="mt-4 space-y-1.5 text-xs sm:text-sm font-medium text-neutral-ink">
                <li className="flex items-center gap-2">
                  <span className="text-brand-green font-bold">✓</span> Campus Volunteer Chapters & accredited social service hours
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand-green font-bold">✓</span> CSR-compliant environmental & disaster relief partnerships
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-brand-green font-bold">✓</span> Joint MoUs, volunteer mobilization & recognition certificates
                </li>
              </ul>
            </div>
            <div className="mt-6">
              <Link
                to="/register?type=institution"
                className="btn inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-brand-green-dark px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-brand-green shadow-sm"
              >
                Collaborate as Institution &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="scroll-mt-32 bg-white py-12 sm:py-16">
      <div className="container-page">
        <RevealHeading className={sectionTitle}>Who we are</RevealHeading>
        <RevealText
          text={ORG.about}
          className="mt-6 max-w-4xl font-display text-lg font-semibold leading-relaxed text-brand-green-dark sm:text-xl"
        />
        <p className="mt-4 max-w-prose text-sm sm:text-base text-neutral-ink">{ORG.aboutLead}</p>

        <ul className="mt-8 grid gap-4 border-y border-brand-green/20 py-6 sm:grid-cols-3">
          {CREDENTIALS.map(c => (
            <li key={c.label} className="border-l-4 border-brand-yellow pl-4">
              <p className="text-sm font-bold text-neutral-ink">{c.label}</p>
              <p className="mt-1 text-xs text-neutral-muted">{c.detail}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-brand-green-dark">Mission</h3>
            <p className="mt-2 max-w-prose text-sm sm:text-base leading-relaxed text-neutral-muted">{ORG.mission}</p>
          </div>
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-brand-green-dark">Vision</h3>
            <p className="mt-2 max-w-prose text-sm sm:text-base leading-relaxed text-neutral-muted">{ORG.vision}</p>
          </div>
        </div>

        <div className="mt-10">
          <h3 className="font-display text-lg sm:text-xl font-bold text-brand-green-dark">Management body</h3>
          <ul className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-10">
            {MANAGEMENT.map(m => (
              <li key={m.name}>
                <p className="text-sm sm:text-base font-bold text-neutral-ink">{m.name}</p>
                <p className="text-xs text-neutral-muted">{m.role}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function CountUp({ value, run }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!run) return;
    if (reduced) {
      setShown(value);
      return;
    }
    const duration = 1600;
    const start = performance.now();
    let raf = 0;
    const tick = now => {
      const t = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, value, reduced]);

  return <>{shown.toLocaleString('en-IN')}+</>;
}

function Impact() {
  const ref = useRef(null);
  const seen = useInViewOnce(ref);
  return (
    <section ref={ref} className="bg-brand-green-tint py-12 sm:py-16" aria-labelledby="impact-title">
      <div className="container-page">
        <RevealHeading id="impact-title" className={sectionTitle}>Our impact</RevealHeading>
        {/* Number first visually (order-1), label second; every cell top-aligned so the
            numbers sit on one line even when a label wraps */}
        <dl className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-0">
          {IMPACT.map(s => (
            <div
              key={s.label}
              className="flex min-w-0 flex-col border-l-4 border-brand-yellow pl-4 lg:pr-4"
            >
              <dt className="order-2 mt-1.5 text-xs leading-snug text-neutral-muted sm:text-sm">{s.label}</dt>
              <dd
                className="order-1 whitespace-nowrap font-display text-2xl font-extrabold leading-none tabular-nums text-brand-green-dark sm:text-3xl xl:text-4xl"
                style={{ fontStretch: '85%' }}
              >
                <span className="sr-only">{s.value.toLocaleString('en-IN')}+</span>
                <span aria-hidden="true" translate="no" className="notranslate">
                  <CountUp value={s.value} run={seen} />
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Programs() {
  return (
    <section id="programs" className="scroll-mt-32 bg-neutral-bg py-12 sm:py-16">
      <div className="container-page">
        <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <RevealHeading className={sectionTitle}>Our services</RevealHeading>
          <p className="max-w-prose text-sm sm:text-base text-neutral-muted">
            What TNV volunteers do across Tamil Nadu, with the numbers so far.
          </p>
        </div>
        <ul className="mt-8 border-b border-brand-green/20">
          {PROGRAMS.map(p => (
            <li
              key={p.name}
              className="grid gap-1 border-t border-brand-green/20 py-5 transition-colors hover:bg-brand-green-tint/60 sm:grid-cols-[1fr_1.4fr] sm:gap-6 sm:px-3"
            >
              <h3
                className="font-display text-lg sm:text-xl font-bold leading-tight text-brand-green-dark"
                style={{ fontStretch: '92%' }}
              >
                {p.name}
              </h3>
              <p className="max-w-prose text-xs sm:text-sm leading-relaxed text-neutral-muted sm:pt-1">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GoalsValues() {
  return (
    <section id="goals" className="scroll-mt-32 bg-white py-12 sm:py-16">
      <div className="container-page grid gap-10 lg:grid-cols-2">
        <div>
          <RevealHeading className={sectionTitle}>Our goals</RevealHeading>
          <ul className="mt-6 space-y-4">
            {GOALS.map(g => (
              <li key={g.title} className="border-l-4 border-brand-green pl-4">
                <h3 className="text-base font-bold text-neutral-ink">{g.title}</h3>
                <p className="mt-1 text-xs sm:text-sm leading-relaxed text-neutral-muted">{g.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <RevealHeading className={sectionTitle}>Values that lead us</RevealHeading>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {VALUES.map(v => (
              <li key={v.title} className="rounded-xl bg-brand-yellow-tint p-4">
                <h3 className="font-display text-base sm:text-lg font-bold text-brand-green-dark">{v.title}</h3>
                <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-neutral-muted">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// Scroll-linked: a yellow rail fills as the reader moves down the list and each
// step switches on when it reaches the reading line.
function HowJoining() {
  const listRef = useRef(null);
  const fillRef = useRef(null);
  const stepRefs = useRef([]);
  const [active, setActive] = useState(0);

  useScrollFrame(() => {
    const list = listRef.current;
    if (!list) return;
    const line = window.innerHeight * 0.55;
    const rect = list.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (line - rect.top) / rect.height));
    if (fillRef.current) fillRef.current.style.transform = `scaleY(${progress})`;
    const reached = stepRefs.current.filter(el => el && el.getBoundingClientRect().top < line).length;
    setActive(reached);
  });

  return (
    <section id="join" className="scroll-mt-32 bg-neutral-bg py-12 sm:py-16">
      <div className="container-page grid gap-8 md:grid-cols-[1fr_1.3fr] md:gap-14">
        <div className="md:sticky md:top-24 md:self-start lg:top-36">
          <RevealHeading className={sectionTitle}>How joining works</RevealHeading>
          <p className="mt-3 max-w-sm text-sm sm:text-base text-neutral-muted">
            Three simple steps from registration to joining your district volunteer unit.
          </p>
          <p translate="no" className="notranslate mt-6 hidden font-display text-brand-green md:block" aria-hidden="true">
            <span className="text-5xl sm:text-6xl font-extrabold leading-none tabular-nums">{Math.max(1, active)}</span>
            <span className="ml-2 text-xl font-semibold text-neutral-muted">of {JOIN_STEPS.length}</span>
          </p>
          <Link to="/register" className="btn-primary mt-6 hidden px-6 py-2.5 text-sm sm:text-base md:inline-flex">
            Start your registration
          </Link>
        </div>

        <ol ref={listRef} className="relative">
          <span className="absolute bottom-6 left-[21px] top-6 w-1 rounded bg-brand-green-tint" aria-hidden="true" />
          <span
            ref={fillRef}
            className="absolute bottom-6 left-[21px] top-6 w-1 origin-top rounded bg-brand-yellow"
            style={{ transform: 'scaleY(0)' }}
            aria-hidden="true"
          />
          {JOIN_STEPS.map((s, i) => {
            const on = i < active;
            return (
              <li
                key={s.title}
                ref={el => (stepRefs.current[i] = el)}
                className="relative grid grid-cols-[44px_1fr] gap-4 py-5 md:min-h-[30vh]"
              >
                <span
                  className={`relative z-10 grid h-10 w-10 place-items-center rounded-full text-base font-extrabold transition-colors duration-300 ${
                    on ? 'bg-brand-yellow text-neutral-ink' : 'border-2 border-brand-green-tint bg-white text-neutral-muted'
                  }`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className={`transition-opacity duration-300 ${on ? 'opacity-100' : 'opacity-50'}`}>
                  <h3 className="font-display text-lg sm:text-xl font-bold leading-tight">{s.title}</h3>
                  <p className="mt-1.5 max-w-md text-xs sm:text-sm leading-relaxed text-neutral-muted">{s.text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <Link to="/register" className="btn-primary px-6 py-2.5 text-sm md:hidden">
          Start your registration
        </Link>
      </div>
    </section>
  );
}

function Contact() {
  const rows = [
    { label: 'Call us', value: formatPhone(CONTACT.phone), href: `tel:+${CONTACT.phone}` },
    { label: 'WhatsApp', value: formatPhone(CONTACT.whatsapp), href: `https://wa.me/${CONTACT.whatsapp}` },
    { label: 'Email', value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    { label: 'Office', value: CONTACT.address },
    { label: 'Hours', value: CONTACT.hours }
  ];
  return (
    <section id="contact" className="scroll-mt-32 bg-brand-yellow-tint py-12 sm:py-16">
      <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <RevealHeading className={sectionTitle}>Contact us</RevealHeading>
          <p className="mt-2.5 max-w-prose text-xs sm:text-sm text-neutral-muted">
            Call, message or visit our office in Chennai. District and wing WhatsApp groups open to you
            after your application is approved.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2.5" aria-label="TNV on social media">
            {SOCIAL_LINKS.map(s => (
              <li key={s.icon}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="grid h-10 w-10 place-items-center rounded-full bg-brand-green-dark text-white hover:bg-brand-green"
                >
                  <SocialIcon name={s.icon} className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <dl className="divide-y divide-brand-green/15 rounded-xl bg-white px-5 ring-1 ring-brand-green/10 text-xs sm:text-sm">
          {rows.map(r => (
            <div key={r.label} className="grid gap-1 py-3.5 sm:grid-cols-[120px_1fr] sm:gap-4">
              <dt className="font-semibold text-neutral-muted">{r.label}</dt>
              <dd className="font-medium text-neutral-ink">
                {r.href ? (
                  <a
                    href={r.href}
                    className="text-brand-green-dark underline-offset-2 hover:underline"
                    {...(r.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  >
                    {r.value}
                  </a>
                ) : (
                  r.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <>
      <Hero />
      <CollaborateSection />
      <About />
      <Impact />
      <Programs />
      <Gallery />
      <GoalsValues />
      <HowJoining />
      <Contact />
    </>
  );
}
