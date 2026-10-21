import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';
import Footer from './Footer.jsx';

// On every navigation: scroll to the #section in the URL once it has rendered,
// otherwise start the new page at the top. Keyed on location.key so clicking the
// same section link twice still scrolls.
function useScrollOnNavigate() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }
    const id = decodeURIComponent(hash.slice(1));
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        return;
      }
      if (tries++ < 20) timer = setTimeout(attempt, 50);
    };
    attempt();
    return () => clearTimeout(timer);
  }, [pathname, hash, key]);
}

export default function AppShell() {
  useScrollOnNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
