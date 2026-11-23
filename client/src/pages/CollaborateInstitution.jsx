
import { Link } from 'react-router-dom';

const partners = [
  {
    icon: '🎓',
    title: 'Colleges & Universities',
    description:
      'Encourage students to participate in community service through NSS, NCC, campus volunteering and social awareness programmes.',
  },
  {
    icon: '🏢',
    title: 'Companies & Corporates',
    description:
      'Work together through CSR initiatives, employee volunteering, environmental activities and community development programmes.',
  },
  {
    icon: '🤝',
    title: 'NGOs & Trusts',
    description:
      'Connect with other organisations, share resources and work together to reach communities that need support.',
  },
  {
    icon: '🏫',
    title: 'Schools & Educational Institutions',
    description:
      'Organise student awareness programmes, educational activities and initiatives that encourage social responsibility.',
  },
];

const opportunities = [
  {
    icon: '🌱',
    title: 'Environmental Initiatives',
    description:
      'Collaborate on tree plantation drives, environmental awareness campaigns and sustainability activities.',
  },
  {
    icon: '📚',
    title: 'Education & Youth Development',
    description:
      'Support educational programmes, student mentoring, tuition initiatives and youth empowerment activities.',
  },
  {
    icon: '🚑',
    title: 'Disaster Relief & Community Support',
    description:
      'Coordinate volunteers and support relief activities during emergencies and other community needs.',
  },
  {
    icon: '❤️',
    title: 'Health & Social Welfare',
    description:
      'Work together on health awareness, community welfare programmes and initiatives supporting people in need.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Register Your Organisation',
    description:
      'Submit your organisation details through the TNV institution registration form.',
  },
  {
    number: '02',
    title: 'Connect with TNV',
    description:
      'The TNV team can review your details and understand your organisation’s interests and collaboration goals.',
  },
  {
    number: '03',
    title: 'Plan Together',
    description:
      'Discuss suitable activities, available resources, responsibilities and possible joint initiatives.',
  },
  {
    number: '04',
    title: 'Create Social Impact',
    description:
      'Work together to organise programmes and contribute towards community development.',
  },
];

const collaborations = [
  {
    title: 'Education Initiatives',
    partners: 'IIT Madras and TAHDCO',
    description:
      'The TNV website highlights educational initiatives involving 100 free tuition centres, 45+ students in IIT Madras programmes, laptops for girl students and smart classrooms in government schools.',
  },
  {
    title: 'Drug-Free Tamil Nadu Awareness',
    partners: 'Tamil Nadu Police',
    description:
      'The TNV website highlights awareness activities conducted across all 38 districts, including 89,000 students trained, 250+ awareness sessions and promotion of the 10581 helpline.',
  },
];

export default function CollaborateInstitution() {
  return (
    <div className="bg-white">

      {/* Hero Section */}
      <section className="bg-brand-green-dark py-16 text-white sm:py-20">
        <div className="container-page">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-yellow">
            Partner with TNV
          </p>

          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            Together, We Can Create a Greater Social Impact
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-brand-green-tint sm:text-base">
            Are you a college, company, NGO or institution looking to
            contribute to society? Partner with Tamil Nadu Volunteers
            to bring people, resources and ideas together for meaningful
            community development.
          </p>

          <Link
            to="/register?type=institution"
            className="btn-register mt-8 inline-flex px-7 py-3 text-sm font-bold"
          >
            Register Your Organisation →
          </Link>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 sm:py-16">
        <div className="container-page max-w-4xl">
          <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
            Why Collaborate with TNV?
          </h2>

          <p className="mt-5 text-sm leading-7 text-neutral-muted sm:text-base">
            Creating meaningful social change becomes easier when
            individuals and organisations work together. Tamil Nadu
            Volunteers brings together volunteers, institutions,
            NGOs and corporate teams to support communities across
            Tamil Nadu.
          </p>

          <p className="mt-4 text-sm leading-7 text-neutral-muted sm:text-base">
            Through collaboration, organisations can contribute their
            knowledge, resources, networks and people towards activities
            that address real community needs.
          </p>
        </div>
      </section>

      {/* Who Can Collaborate */}
      <section className="bg-brand-green-tint/30 py-12 sm:py-16">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
            Who Can Collaborate with Us?
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-muted sm:text-base">
            TNV welcomes organisations from different sectors that
            are interested in contributing to community development.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {partners.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-brand-green/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <span className="text-3xl">{item.icon}</span>

                <h3 className="mt-4 font-display text-lg font-bold text-brand-green-dark">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-neutral-muted">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partnership Opportunities */}
      <section className="py-12 sm:py-16">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
            Explore Partnership Opportunities
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-muted sm:text-base">
            Organisations can explore different ways to contribute
            based on their interests, expertise and available resources.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {opportunities.map((item) => (
              <div
                key={item.title}
                className="flex gap-4 rounded-2xl border border-brand-green/10 p-6"
              >
                <span className="text-3xl">{item.icon}</span>

                <div>
                  <h3 className="font-display text-lg font-bold text-brand-green-dark">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-neutral-muted">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration Process */}
      <section className="bg-brand-green-tint/30 py-12 sm:py-16">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
            How Can Your Organisation Collaborate?
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-muted sm:text-base">
            Start a collaboration with TNV through these simple steps.
          </p>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-brand-green/10 bg-white p-6"
              >
                <span className="font-display text-3xl font-extrabold text-brand-yellow">
                  {step.number}
                </span>

                <h3 className="mt-3 font-display text-lg font-bold text-brand-green-dark">
                  {step.title}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-neutral-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Existing Collaborations */}
      <section className="py-12 sm:py-16">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
            Our Collaboration Highlights
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-muted sm:text-base">
            Some of the initiatives highlighted on the TNV website
            demonstrate how working together can support communities.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {collaborations.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-brand-green/15 bg-white p-6 shadow-sm"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
                  {item.partners}
                </span>

                <h3 className="mt-3 font-display text-xl font-bold text-brand-green-dark">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-relaxed text-neutral-muted">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Institutional Testimonials */}
      <section className="bg-brand-green-tint/30 py-12 sm:py-16">
        <div className="container-page text-center">
          <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
            What Our Partner Organisations Say
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-muted sm:text-base">
            Learn about the experiences of institutions and organisations
            that have collaborated with TNV.
          </p>

          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-dashed border-brand-green/30 bg-white p-8">
            <p className="text-sm leading-relaxed text-neutral-muted">
              Institutional experiences and testimonials will be
              featured here after receiving verified feedback from
              our collaborating organisations.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-green-dark py-12 text-center text-white sm:py-16">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Let's Work Together for a Better Tamil Nadu
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-green-tint sm:text-base">
            Bring your organisation's ideas, people and resources
            together with TNV to support meaningful social initiatives.
          </p>

          <Link
            to="/register?type=institution"
            className="btn-register mt-7 inline-flex px-7 py-3 text-sm font-bold"
          >
            Register Your Organisation →
          </Link>
        </div>
      </section>

    </div>
  );
}
