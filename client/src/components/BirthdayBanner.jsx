import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { getToken } from '../lib/session.js';
import BirthdayCard from './BirthdayCard.jsx';
import { BIRTHDAY_CARDS } from '../data/birthdayCards.js';

// Member dashboard: on the member's birthday, show this year's birthday card.
// They can fold it away; it stays folded for the rest of the day.

const foldKey = year => `tnv_birthday_folded_${year}`;

function readFolded(year) {
  try { return window.localStorage.getItem(foldKey(year)) === '1'; } catch (_e) { return false; }
}

function writeFolded(year, folded) {
  try {
    if (folded) window.localStorage.setItem(foldKey(year), '1');
    else window.localStorage.removeItem(foldKey(year));
  } catch (_e) { /* storage unavailable: folding lasts for this visit only */ }
}

export default function BirthdayBanner() {
  const [wish, setWish] = useState(null);
  const [folded, setFolded] = useState(false);

  useEffect(() => {
    let alive = true;
    api('/api/my-birthday', { token: getToken() }).then(res => {
      if (!alive || !res.ok || !res.data.is_birthday) return;
      const design = BIRTHDAY_CARDS.find(c => c.id === res.data.card.id) || {};
      setWish({ ...res.data, card: { ...design, ...res.data.card } });
      setFolded(readFolded(res.data.year));
    });
    return () => { alive = false; };
  }, []);

  if (!wish) return null;

  const toggle = () => {
    const next = !folded;
    setFolded(next);
    writeFolded(wish.year, next);
  };

  if (folded) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="mb-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-brand-yellow bg-brand-yellow-tint px-4 py-3 text-left text-sm font-bold text-amber-900 hover:bg-amber-100"
      >
        <span>{wish.card.emoji} Happy Birthday! Your birthday card from TNV is here.</span>
        <span className="shrink-0 text-xs underline">Open card</span>
      </button>
    );
  }

  return (
    <section className="mb-6" aria-label="Your birthday card">
      <BirthdayCard card={wish.card} turning={wish.turning} footer={`With love from ${wish.district_name || 'Tamil Nadu'}`} />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-neutral-500">{wish.emailed ? 'We’ve also sent this card to your email.' : 'From all of us at Tamil Nadu Volunteers.'}</p>
        <button type="button" onClick={toggle} className="text-xs font-bold text-neutral-600 hover:text-neutral-900 underline">
          Fold away
        </button>
      </div>
    </section>
  );
}
