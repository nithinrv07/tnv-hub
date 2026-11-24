
import { Link } from 'react-router-dom';

const opportunities = [
  {
    title: 'Education Support',
    description:
      'Support children through teaching, mentoring, tuition centres and educational activities.',
    icon: '📚',
  },
  {
    title: 'Environment & Climate',
    description:
      'Take part in tree plantation drives, environmental awareness campaigns and green initiatives.',
    icon: '🌱',
  },
  {
    title: 'Disaster Relief',
    description:
      'Support relief activities, help affected communities and participate in emergency response initiatives.',
    icon: '🤝',
  },
  {
    title: 'Health & Community Welfare',
    description:
      'Contribute to medical camps, blood donation initiatives, food distribution and community welfare activities.',
    icon: '❤️',
  },
  {
    title: 'Youth Empowerment',
    description:
      'Help young people develop leadership skills and participate in community development programmes.',
    icon: '🎓',
  },
  {
    title: 'Social Awareness',
    description:
      'Participate in awareness campaigns and initiatives that encourage positive social change.',
    icon: '📢',
  },
];

const responsibilities = [
  'Participate in volunteering activities based on your interests and availability.',
  'Work together with fellow volunteers and local coordinators.',
  'Support community programmes and awareness campaigns.',
  'Follow the organisation’s guidelines and responsibilities.',
  'Contribute your time and skills towards meaningful social initiatives.',
];

const joiningSteps = [
  {
    number: '01',
    title: 'Register',
    description:
      'Complete the volunteer registration form with your details, district and preferred areas of volunteering.',
  },
  {
    number: '02',
    title: 'Verification',
    description:
      'The district administration team contacts you to verify your details and understand your interests.',
  },
  {
    number: '03',
    title: 'Get Connected',
    description:
      'After approval, receive your volunteer ID card and connect with your district volunteer group.',
  },
];

export default function JoinVolunteer() {
  return (
    <div className="bg-white">

      {/* Hero Section */}
      <section className="bg-brand-green-dark py-16 text-white sm:py-20">
        <div className="container-page">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-yellow">
            Become a Volunteer
          </p>

          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            Be the Reason Someone's Life Gets Better
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-brand-green-tint sm:text-base">
            Make a difference in your community by joining Tamil Nadu
            Volunteers. Share your time, skills and ideas to support people,
            strengthen communities and create positive social change.
          </p>

          <Link
            to="/register?type=individual"
            className="btn-register mt-8 inline-flex px-7 py-3 text-sm font-bold"
          >
            Join as a Volunteer →
          </Link>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 sm:py-16">
        <div className="container-page max-w-4xl">
          <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
            What Does It Mean to Be a TNV Volunteer?
          </h2>

          <p className="mt-5 text-sm leading-7 text-neutral-muted sm:text-base">
            Being a Tamil Nadu Volunteers member means becoming part of a
            community that works together to improve society. Volunteers
            contribute their time, knowledge and abilities to support people
            in need and take part in activities that benefit their local
            communities.
          </p>

          <p className="mt-4 text-sm leading-7 text-neutral-muted sm:text-base">
            You do not need to have special skills to get started. Your
            willingness to help, learn and work with others can make a
            meaningful difference.
          </p>
        </div>
      </section>

      {/* Opportunities */}
      <section className="bg-brand-green-tint/30 py-12 sm:py-16">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
              Explore Volunteering Opportunities
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-neutral-muted sm:text-base">
              TNV offers opportunities to contribute to different areas of
              social development. Choose activities that match your interests
              and abilities.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((item) => (
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

      {/* Responsibilities */}
      <section className="py-12 sm:py-16">
        <div className="container-page grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
              How Can You Contribute?
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-neutral-muted sm:text-base">
              Every volunteer plays a part in building a better society.
              You can contribute in different ways depending on your
              interests, skills and availability.
            </p>
          </div>

          <ul className="space-y-4">
            {responsibilities.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-neutral-ink">
                <span className="font-bold text-brand-green">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* What to Expect */}
      <section className="bg-brand-green-tint/30 py-12 sm:py-16">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
            Your Journey with TNV
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-muted sm:text-base">
            Here is what you can expect when you register to become a
            Tamil Nadu Volunteers member.
          </p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {joiningSteps.map((step) => (
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

      {/* Volunteer Testimonials */}
      <section className="py-12 sm:py-16">
        <div className="container-page text-center">
          <h2 className="font-display text-2xl font-bold text-brand-green-dark sm:text-3xl">
            Stories from Our Volunteers
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-neutral-muted sm:text-base">
            Hear from people who are contributing to positive change
            through Tamil Nadu Volunteers.
          </p>

          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-dashed border-brand-green/30 bg-brand-green-tint/20 p-8">
            <p className="text-sm leading-relaxed text-neutral-muted">
              Volunteer experiences and testimonials will be shared here.
              We look forward to featuring stories from our volunteer community.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-green-dark py-12 text-center text-white sm:py-16">
        <div className="container-page">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            Your Contribution Can Make a Difference
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-brand-green-tint sm:text-base">
            Take the first step towards making a positive impact.
            Join the TNV volunteer community today.
          </p>

          <Link
            to="/register?type=individual"
            className="btn-register mt-7 inline-flex px-7 py-3 text-sm font-bold"
          >
            Register Now →
          </Link>
        </div>
      </section>

    </div>
  );
}
