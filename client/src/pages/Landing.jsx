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

const sectionTitle = 'font-display text-4xl font-bold leading-tight text-brand-green-dark sm:text-5xl pb-1';

function formatPhone(digits) {
  const local = digits.replace(/^91/, '');
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-green-dark text-white">
      <div className="container-page grid gap-12 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p lang="ta" className="font-display text-2xl font-bold leading-snug text-brand-yellow sm:text-3xl">
            {ORG.motto}
          </p>
          <p className="mt-1 text-sm text-brand-green-tint">{ORG.tagline}</p>
          <h1
            className="mt-6 max-w-xl font-display text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl"
            style={{ fontStretch: '88%' }}
          >
            Volunteers in every district of Tamil Nadu
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-brand-green-tint">{ORG.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className="btn-register px-7 text-lg">
              Register as Volunteer
            </Link>
            <Link
              to="/donate"
              className="btn border-2 border-white/70 px-7 text-lg text-white hover:bg-white/10"
            >
              Donate
            </Link>
          </div>
          <p className="mt-4 text-sm text-brand-green-tint">
            Free to apply. Membership is ₹365 a year, and you can pay later.
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
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {ZONES.map(z => (
          <div key={z.name} className="border-l-2 border-brand-yellow/60 pl-3">
            <dt className="text-xs font-bold text-brand-yellow">{z.name} zone</dt>
            <dd className="flex flex-wrap gap-x-2 font-display text-[15px] font-semibold leading-snug sm:text-base">
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
        className={`mt-5 text-sm font-semibold text-brand-yellow transition-opacity duration-700 ${lit ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDelay: lit && !reduced ? `${38 * step + 200}ms` : '0ms' }}
      >
        9 zones, 38 districts. Your district decides which local group you join.
      </p>
    </div>
  );
}

function About() {
  return (
    <section id="about" className="scroll-mt-32 bg-white py-16 sm:py-24">
      <div className="container-page">
        <RevealHeading className={sectionTitle}>Who we are</RevealHeading>
        <RevealText
          text={ORG.about}
          className="mt-8 max-w-5xl font-display text-2xl font-semibold leading-snug text-brand-green-dark sm:text-[2.1rem]"
        />
        <p className="mt-6 max-w-prose text-xl font-medium text-neutral-ink">{ORG.aboutLead}</p>

        <ul className="mt-12 grid gap-6 border-y border-brand-green/20 py-8 sm:grid-cols-3">
          {CREDENTIALS.map(c => (
            <li key={c.label} className="border-l-4 border-brand-yellow pl-4">
              <p className="font-bold text-neutral-ink">{c.label}</p>
              <p className="mt-1 text-sm text-neutral-muted">{c.detail}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="font-display text-2xl font-bold text-brand-green-dark">Mission</h3>
            <p className="mt-3 max-w-prose text-lg leading-relaxed text-neutral-muted">{ORG.mission}</p>
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold text-brand-green-dark">Vision</h3>
            <p className="mt-3 max-w-prose text-lg leading-relaxed text-neutral-muted">{ORG.vision}</p>
          </div>
        </div>

        <div className="mt-12">
          <h3 className="font-display text-2xl font-bold text-brand-green-dark">Management body</h3>
          <ul className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-12">
            {MANAGEMENT.map(m => (
              <li key={m.name}>
                <p className="text-lg font-bold text-neutral-ink">{m.name}</p>
                <p className="text-neutral-muted">{m.role}</p>
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
    <section ref={ref} className="bg-brand-green-tint py-14 sm:py-20" aria-labelledby="impact-title">
      <div className="container-page">
        <RevealHeading id="impact-title" className={sectionTitle}>Our impact</RevealHeading>
        {/* Number first visually (order-1), label second; every cell top-aligned so the
            numbers sit on one line even when a label wraps */}
        <dl className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-0">
          {IMPACT.map(s => (
            <div
              key={s.label}
              className="flex min-w-0 flex-col border-l-4 border-brand-yellow pl-4 lg:pr-4"
            >
              <dt className="order-2 mt-2 text-sm leading-snug text-neutral-muted sm:text-base">{s.label}</dt>
              <dd
                className="order-1 whitespace-nowrap font-display text-[1.75rem] font-extrabold leading-none tabular-nums text-brand-green-dark sm:text-4xl xl:text-[2.75rem]"
                style={{ fontStretch: '85%' }}
              >
                <span className="sr-only">{s.value.toLocaleString('en-IN')}+</span>
                <span aria-hidden="true">
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
    <section id="programs" className="scroll-mt-32 bg-neutral-bg py-16 sm:py-24">
      <div className="container-page">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <RevealHeading className={sectionTitle}>Our services</RevealHeading>
          <p className="max-w-prose text-lg text-neutral-muted">
            What TNV volunteers do across Tamil Nadu, with the numbers so far.
          </p>
        </div>
        <ul className="mt-10 border-b border-brand-green/20">
          {PROGRAMS.map(p => (
            <li
              key={p.name}
              className="grid gap-1 border-t border-brand-green/20 py-6 transition-colors hover:bg-brand-green-tint/60 sm:grid-cols-[1fr_1.4fr] sm:gap-8 sm:px-3"
            >
              <h3
                className="font-display text-2xl font-bold leading-tight text-brand-green-dark sm:text-3xl"
                style={{ fontStretch: '92%' }}
              >
                {p.name}
              </h3>
              <p className="max-w-prose leading-relaxed text-neutral-muted sm:pt-1.5">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function GoalsValues() {
  return (
    <section id="goals" className="scroll-mt-32 bg-white py-16 sm:py-24">
      <div className="container-page grid gap-14 lg:grid-cols-2">
        <div>
          <RevealHeading className={sectionTitle}>Our goals</RevealHeading>
          <ul className="mt-8 space-y-6">
            {GOALS.map(g => (
              <li key={g.title} className="border-l-4 border-brand-green pl-4">
                <h3 className="text-lg font-bold">{g.title}</h3>
                <p className="mt-1 leading-relaxed text-neutral-muted">{g.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <RevealHeading className={sectionTitle}>Values that lead us</RevealHeading>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {VALUES.map(v => (
              <li key={v.title} className="rounded-xl bg-brand-yellow-tint p-5">
                <h3 className="font-display text-2xl font-bold text-brand-green-dark">{v.title}</h3>
                <p className="mt-2 leading-relaxed text-neutral-muted">{v.text}</p>
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
    <section id="join" className="scroll-mt-32 bg-neutral-bg py-16 sm:py-24">
      <div className="container-page grid gap-10 md:grid-cols-[1fr_1.3fr] md:gap-16">
        <div className="md:sticky md:top-24 md:self-start lg:top-36">
          <RevealHeading className={sectionTitle}>How joining works</RevealHeading>
          <p className="mt-4 max-w-sm text-lg text-neutral-muted">
            Four steps from the form to your district group. Most people finish the first two today.
          </p>
          <p className="mt-8 hidden font-display text-brand-green md:block" aria-hidden="true">
            <span className="text-8xl font-extrabold leading-none tabular-nums">{Math.max(1, active)}</span>
            <span className="ml-2 text-2xl font-semibold text-neutral-muted">of {JOIN_STEPS.length}</span>
          </p>
          <Link to="/register" className="btn-primary mt-8 hidden px-7 md:inline-flex">
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
                className="relative grid grid-cols-[44px_1fr] gap-5 py-6 md:min-h-[38vh]"
              >
                <span
                  className={`relative z-10 grid h-11 w-11 place-items-center rounded-full text-lg font-extrabold transition-colors duration-300 ${
                    on ? 'bg-brand-yellow text-neutral-ink' : 'border-2 border-brand-green-tint bg-white text-neutral-muted'
                  }`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className={`transition-opacity duration-300 ${on ? 'opacity-100' : 'opacity-50'}`}>
                  <h3 className="font-display text-2xl font-bold leading-tight sm:text-3xl">{s.title}</h3>
                  <p className="mt-2 max-w-md text-lg leading-relaxed text-neutral-muted">{s.text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <Link to="/register" className="btn-primary px-7 md:hidden">
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
    <section id="contact" className="scroll-mt-32 bg-brand-yellow-tint py-16 sm:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <RevealHeading className={sectionTitle}>Contact us</RevealHeading>
          <p className="mt-3 max-w-prose text-lg text-neutral-muted">
            Call, message or visit our office in Chennai. District and wing WhatsApp groups open to you
            after your application is approved.
          </p>
          <ul className="mt-6 flex flex-wrap gap-3" aria-label="TNV on social media">
            {SOCIAL_LINKS.map(s => (
              <li key={s.icon}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="grid h-11 w-11 place-items-center rounded-full bg-brand-green-dark text-white hover:bg-brand-green"
                >
                  <SocialIcon name={s.icon} className="h-5 w-5" />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <dl className="divide-y divide-brand-green/15 rounded-xl bg-white px-5 ring-1 ring-brand-green/10">
          {rows.map(r => (
            <div key={r.label} className="grid gap-1 py-4 sm:grid-cols-[120px_1fr] sm:gap-4">
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
