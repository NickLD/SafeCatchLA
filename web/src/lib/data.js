const base = () => `${import.meta.env.BASE_URL}data/`;
const details = new Map();

async function getJson(path) {
  const res = await fetch(base() + path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

export const loadSites = () => getJson('sites.json');
export const loadMeta = () => getJson('meta.json');
export const loadNational = () => getJson('national.json');

export function loadSiteDetail(id) {
  if (!details.has(id)) {
    const p = getJson(`sites/${encodeURIComponent(id)}.json`);
    p.catch(() => details.delete(id));
    details.set(id, p);
  }
  return details.get(id);
}
