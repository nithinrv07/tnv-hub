import { Link } from 'react-router-dom';

// Placeholder for routes in the spec that are not built yet
export default function ComingSoon({ title }) {
  return (
    <section className="container-page py-20">
      <h1 className="text-3xl font-bold text-brand-green-dark">{title}</h1>
      <p className="mt-3 max-w-prose text-neutral-muted">This page is being built for the Phase 1 demo.</p>
      <Link to="/" className="btn-outline mt-6">Back to home</Link>
    </section>
  );
}
