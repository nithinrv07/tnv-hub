import { Link } from 'react-router-dom';
import { TN_DISTRICTS } from '../data/districts.js';
import { PROGRAMS, JOIN_STEPS, SOCIAL_LINKS } from '../data/site.js';

function Hero() {
  return (
    <section className="relative overflow-hidden bg-brand-green-dark text-white">
      <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Volunteers in every district of Tamil Nadu
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-brand-green-tint">
            TNV brings people together to serve their own communities: in schools, health camps,
            relief work and local projects. Join from your phone in a few minutes.
          </p>
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

        <DistrictWall />
      </div>
    </section>
  );
}

// The one bold element: every district TNV works in, set as a block of type
function DistrictWall() {
  return (
    <div>
      <h2 className="sr-only">Districts we work in</h2>
      <ul
        className="flex flex-wrap gap-x-3 gap-y-1 text-[15px] font-semibold leading-snug sm:text-lg"
        aria-label="All 38 districts of Tamil Nadu"
      >
        {TN_DISTRICTS.map(d => (
          <li key={d} className="text-white/60">
            {d}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-semibold text-brand-yellow">
        38 districts. Your district decides which local group you join.
      </p>
    </div>
  );
}

function About() {
  return (
    <section id="about" className="scroll-mt-16 bg-white py-16 sm:py-20">
      <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <h2 className="text-3xl font-bold leading-tight text-brand-green-dark sm:text-4xl">
          Our mission
        </h2>
        <div className="max-w-prose space-y-4 text-lg leading-relaxed text-neutral-muted">
          <p>
            Tamil Nadu Volunteers is a statewide network of people who give their time to the places
            they live. We organise volunteers by district so help reaches villages and towns, not just
            the big cities.
          </p>
          <p>
            Every volunteer is verified by phone before they are given a role, so communities and
            partner organisations know who they are working with.
          </p>
        </div>
      </div>
    </section>
  );
}

function Programs() {
  return (
    <section id="programs" className="scroll-mt-16 bg-neutral-bg py-16 sm:py-20">
      <div className="container-page">
        <h2 className="text-3xl font-bold text-brand-green-dark sm:text-4xl">Programs</h2>
        <p className="mt-3 max-w-prose text-lg text-neutral-muted">
          Volunteers choose the areas they want to work in when they register.
        </p>
        <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {PROGRAMS.map(p => (
            <li key={p.name} className="border-l-4 border-brand-green pl-4">
              <h3 className="text-lg font-bold text-neutral-ink">{p.name}</h3>
              <p className="mt-1 leading-relaxed text-neutral-muted">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function HowJoining() {
  return (
    <section id="join" className="scroll-mt-16 bg-white py-16 sm:py-20">
      <div className="container-page">
        <h2 className="text-3xl font-bold text-brand-green-dark sm:text-4xl">How joining works</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-4 md:gap-6">
          {JOIN_STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <span
                className="grid h-11 w-11 place-items-center rounded-full bg-brand-yellow text-lg font-extrabold text-neutral-ink"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1 leading-relaxed text-neutral-muted">{s.text}</p>
            </li>
          ))}
        </ol>
        <Link to="/register" className="btn-primary mt-10 px-7">
          Start your registration
        </Link>
      </div>
    </section>
  );
}

function StayConnected() {
  return (
    <section className="bg-brand-yellow-tint py-16 sm:py-20">
      <div className="container-page grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <div>
          <h2 className="text-3xl font-bold text-brand-green-dark sm:text-4xl">Stay connected</h2>
          <p className="mt-3 max-w-prose text-lg text-neutral-muted">
            Follow TNV for announcements and events. District and wing WhatsApp groups open to you
            after your application is approved.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_LINKS.map(l => (
            <li key={l.name}>
              {l.url ? (
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-tap items-center rounded-lg border border-brand-green/30 bg-white px-4 py-3 font-semibold text-brand-green-dark hover:border-brand-green"
                >
                  {l.name}
                </a>
              ) : (
                <span className="flex min-h-tap flex-col justify-center rounded-lg border border-dashed border-neutral-muted/40 bg-white/60 px-4 py-3">
                  <span className="font-semibold text-neutral-ink">{l.name}</span>
                  <span className="text-sm text-neutral-muted">Link coming soon</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <>
      <Hero />
      <About />
      <Programs />
      <HowJoining />
      <StayConnected />
    </>
  );
}
