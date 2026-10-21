import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="container-page py-20">
      <h1 className="text-3xl font-bold text-brand-green-dark">Page not found</h1>
      <p className="mt-3 max-w-prose text-neutral-muted">Check the address, or go back to the home page.</p>
      <Link to="/" className="btn-outline mt-6">Back to home</Link>
    </section>
  );
}
