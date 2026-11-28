import { Link, useLocation } from 'react-router-dom';

// Floating Feedback / Enquiry button on every public page. On phones it is an
// icon only; on larger screens the label shows beside it.
export default function FeedbackFab() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/feedback')) return null;

  return (
    <Link
      to="/feedback"
      aria-label="Feedback and enquiries"
      title="Feedback / Enquiry"
      className="group fixed bottom-4 right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full bg-brand-green px-4 text-white shadow-lg ring-2 ring-white transition-colors hover:bg-brand-green-dark focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-yellow sm:bottom-6 sm:right-6 print:hidden"
    >
      <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M21 12a8.5 8.5 0 01-12.3 7.6L3 21l1.4-5.1A8.5 8.5 0 1121 12z" />
      </svg>
      <span className="hidden text-sm font-bold sm:inline">Feedback / Enquiry</span>
    </Link>
  );
}
