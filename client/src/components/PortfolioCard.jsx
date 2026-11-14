import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyPortfolio, portfolioPath, setMyPortfolioPublic } from '../lib/portfolio.js';

// Volunteer dashboard: link to their public portfolio, with a switch to keep it private
export default function PortfolioCard() {
  const [info, setInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyPortfolio().then(res => {
      if (res.ok) setInfo(res.data);
    });
  }, []);

  if (!info) return null;

  if (!info.available) {
    return (
      <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-5 shadow-sm">
        <h3 className="font-display text-sm font-bold text-brand-green-dark">Your public portfolio</h3>
        <p className="mt-1 text-xs text-neutral-muted">Your portfolio page opens once your membership is approved and you receive your TNV ID.</p>
      </div>
    );
  }

  const path = portfolioPath(info.full_name, info.tnv_id);
  const url = `${window.location.origin}${path}`;

  const toggle = async () => {
    setSaving(true);
    setError('');
    const res = await setMyPortfolioPublic(!info.public);
    setSaving(false);
    if (res.ok) setInfo(res.data);
    else setError(res.data?.error || 'Could not change this. Please try again.');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_e) {
      window.prompt('Copy your portfolio link:', url);
    }
  };

  return (
    <div className="rounded-2xl border border-brand-green-tint/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold text-brand-green-dark">Your public portfolio</h3>
          <p className="mt-1 text-xs text-neutral-muted">
            {info.public
              ? 'Anyone with the link can see your role, district, events, certificates and tasks. Your phone, email and address are never shown.'
              : 'Your portfolio is private. Nobody else can open it.'}
          </p>
          {info.public && <p className="mt-1 truncate font-mono text-[11px] text-brand-green">{url}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {info.public && (
            <>
              <Link to={path} className="btn-primary min-h-tap px-4 text-xs font-bold">View portfolio</Link>
              <button type="button" onClick={copy} className="btn-outline min-h-tap px-4 text-xs font-bold">{copied ? 'Copied' : 'Copy link'}</button>
            </>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={info.public}
            onClick={toggle}
            disabled={saving}
            className="inline-flex min-h-tap items-center gap-2 rounded-xl border border-neutral-300 px-3 text-xs font-bold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <span className={`relative h-5 w-9 rounded-full transition-colors ${info.public ? 'bg-brand-green' : 'bg-neutral-300'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${info.public ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
            {info.public ? 'Public' : 'Private'}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-700">{error}</p>}
    </div>
  );
}
