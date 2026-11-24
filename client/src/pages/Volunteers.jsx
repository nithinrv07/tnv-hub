import { Link } from 'react-router-dom';
import { TESTIMONIALS } from '../data/testimonials.js';
import { JOIN_STEPS } from '../data/site.js';
import { TestimonialGrid } from '../components/Testimonials.jsx';

// The Volunteers page: what volunteering with TNV is like, told by volunteers.
export default function Volunteers() {
  const districts = new Set(TESTIMONIALS.map(t => t.district).filter(Boolean)).size;

  return (
    <>
      <section className="bg-brand-green-dark py-12 text-white sm:py-16">
        <div className="container-page">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-yellow">Volunteer with us</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
            Stories from our volunteers
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
            Volunteers from across Tamil Nadu share what they took part in, what they learned and what it is like
            to work with the Tamil Nadu Volunteers team.
          </p>
          {TESTIMONIALS.length > 0 && (
            <p className="mt-4 text-sm text-white/70">
              {TESTIMONIALS.length} {TESTIMONIALS.length === 1 ? 'story' : 'stories'}
              {districts > 0 && ` from ${districts} ${districts === 1 ? 'district' : 'districts'}`}
            </p>
          )}
        </div>
      </section>

      <section className="bg-neutral-bg py-12 sm:py-16" aria-label="Volunteer testimonials">
        <div className="container-page">
          {TESTIMONIALS.length > 0 ? (
            <TestimonialGrid items={TESTIMONIALS} />
          ) : (
            <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-brand-green-tint bg-white p-8 text-center">
              <h2 className="font-display text-xl font-bold text-brand-green-dark">Volunteer stories are coming soon</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-muted">
                We are collecting feedback from our volunteers. Check back soon to read about their experiences.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="container-page grid gap-8 md:grid-cols-[1fr_1.3fr] md:gap-14">
          <div>
            <h2 className="font-display text-2xl font-bold leading-tight text-brand-green-dark sm:text-3xl">
              Ready to write your own story?
            </h2>
            <p className="mt-3 max-w-sm text-sm text-neutral-muted sm:text-base">
              Joining takes three steps, and registration is open in all 38 districts.
            </p>
            <Link to="/register" className="btn-primary mt-6 inline-flex px-6 py-2.5 text-sm sm:text-base">
              Register as a volunteer
            </Link>
          </div>
          <ol className="space-y-5">
            {JOIN_STEPS.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[40px_1fr] gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-yellow text-base font-extrabold text-neutral-ink" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold leading-tight">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
