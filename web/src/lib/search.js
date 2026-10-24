export function searchSites(sites, query, limit = 8) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const byName = [];
  const byAddress = [];
  for (const s of sites) {
    if (s.name.toLowerCase().includes(q)) byName.push(s);
    else if (s.address?.toLowerCase().includes(q)) byAddress.push(s);
  }
  return [...byName, ...byAddress].slice(0, limit);
}
