import { api } from './api.js';
import { getToken } from './session.js';

// Public portfolio address: /volunteer/<name>-<tnv id>, e.g. /volunteer/priya-kumar-tnv-che-0001
export function portfolioPath(fullName, tnvId) {
  if (!tnvId) return null;
  const name = String(fullName || 'volunteer')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'volunteer';
  return `/volunteer/${name}-${String(tnvId).toLowerCase()}`;
}

// The TNV ID at the end of a portfolio slug
export function tnvIdFromSlug(slug) {
  const m = String(slug || '').match(/(tnv-[a-z0-9]+-\d+)$/i);
  return m ? m[1].toUpperCase() : null;
}

export async function getPortfolio(tnvId) {
  return await api(`/api/portfolio/${encodeURIComponent(tnvId)}`);
}

export async function getMyPortfolio() {
  return await api('/api/my-portfolio', { token: getToken() });
}

export async function setMyPortfolioPublic(isPublic) {
  return await api('/api/my-portfolio', { method: 'POST', token: getToken(), body: { public: isPublic } });
}
