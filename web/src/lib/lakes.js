// Sites that share one lake, viewable together in the drawer. Each group was confirmed by matching its sites
// to the lake's real outline, so a shared name alone never joins two waters ("Cocodrie Lake" is two lakes).
export const LAKES = [
  { id: 'caddo-lake', name: 'Caddo Lake', sites: ['0474', '0475', '0476', '0479', '0480', '0481', '0560', '3091'] },
  { id: 'catahoula-lake', name: 'Catahoula Lake', sites: ['0810', '2877'] },
  { id: 'cocodrie-lake-west', name: 'Cocodrie Lake', sites: ['0378', '2619'] },
  { id: 'cocodrie-lake-east', name: 'Cocodrie Lake', sites: ['0370', '0701', '1229'] },
  { id: 'cross-lake', name: 'Cross Lake', sites: ['0432', '2842'] },
  { id: 'cypress-bayou-reservoir', name: 'Cypress Bayou Reservoir', sites: ['0586', '1172'] },
  { id: 'false-river', name: 'False River', sites: ['0335', '0536', '1145'] },
  { id: 'grand-lake', name: 'Grand Lake', sites: ['0441', '1150'] },
  { id: 'kepler-creek-lake', name: 'Kepler Creek Lake', sites: ['0590', '1188'] },
  { id: 'lac-des-allemands', name: 'Lac des Allemands', sites: ['0541', '1028'] },
  { id: 'lake-bistineau', name: 'Lake Bistineau', sites: ['0592', '0965', '2996'] },
  { id: 'lake-boeuf', name: 'Lake Boeuf', sites: ['0439', '2723'] },
  { id: 'lake-chicot', name: 'Lake Chicot', sites: ['0312', '0379'] },
  { id: 'lake-concordia', name: 'Lake Concordia', sites: ['0707', '1252'] },
  { id: 'lake-fields', name: 'Lake Fields', sites: ['0730', '2924'] },
  { id: 'lake-maurepas', name: 'Lake Maurepas', sites: ['0256', '0258'] },
  { id: 'lake-misere', name: 'Lake Misere', sites: ['0739', '1236'] },
  { id: 'lake-palourde', name: 'Lake Palourde', sites: ['0338', '1036'] },
  { id: 'lake-pontchartrain', name: 'Lake Pontchartrain', sites: ['0138', '0596', '0637', '0709', '0710', '0868'] },
  { id: 'lake-providence', name: 'Lake Providence', sites: ['0133', '0134'] },
  { id: 'lake-salvador', name: 'Lake Salvador', sites: ['0558', '0598', '0639'] },
  { id: 'lake-st-john', name: 'Lake St. John', sites: ['0367', '1230'] },
  { id: 'lake-verret', name: 'Lake Verret', sites: ['0144', '2981'] },
  { id: 'little-lake', name: 'Little Lake', sites: ['0729', '3448'] },
  { id: 'saline-lake', name: 'Saline Lake', sites: ['0716', '2852'] },
  { id: 'sixmile-lake', name: 'Sixmile Lake', sites: ['0758', '2686'] },
  { id: 'toledo-bend-reservoir', name: 'Toledo Bend Reservoir', sites: ['0374', '0433', '0529', '0530', '0531', '0532', '0534', '0535', '0537', '0603', '0604', '1006', '3764'] },
  { id: 'vernon-lake', name: 'Vernon Lake', sites: ['0522', '1164'] },
  { id: 'lake-darbonne', name: "Lake D'Arbonne", sites: ['0326', '0416'] },
  { id: 'cane-river-lake', name: "Cane River Lake", sites: ['0333', '0365', '0963'] },
  { id: 'lake-bartholomew', name: "Lake Bartholomew", sites: ['0355', '0754'] },
  { id: 'lake-st-joseph', name: "Lake St. Joseph", sites: ['0361', '0800'] },
  { id: 'cheniere-lake', name: "Cheniere Lake", sites: ['0473', '0788'] },
  { id: 'city-park-lake-new-orleans', name: "City Park Lake", sites: ['0511', '0533'] },
  { id: 'buhlow-lake', name: "Buhlow Lake", sites: ['0593', '1223'] },
];

const lakeBySite = new Map(LAKES.flatMap((lake) => lake.sites.map((id) => [id, lake])));

export const lakeForSite = (id) => lakeBySite.get(id) ?? null;

// Combines two [date, ppm, samples, fish] latest readings: the newer wins, the same day is pooled by sample.
export function addLatest(a, b) {
  if (!a || b[0] > a[0]) return [...b];
  if (b[0] < a[0]) return a;
  const [an, bn] = [a[2] ?? 1, b[2] ?? 1];
  return [a[0], (a[1] * an + b[1] * bn) / (an + bn), an + bn, (a[3] ?? an) + (b[3] ?? bn)];
}

function pooledSpecies(members) {
  const out = {};
  for (const site of members) {
    for (const [name, sp] of Object.entries(site.species)) {
      const t = (out[name] ??= { n: 0, latest: null, years: {} });
      t.n += sp.n;
      t.latest = addLatest(t.latest, sp.latest);
      for (const [y, [s, c, f = c]] of Object.entries(sp.years)) {
        const totals = (t.years[y] ??= [0, 0, 0]);
        totals[0] += s;
        totals[1] += c;
        totals[2] += f;
      }
    }
  }
  return out;
}

// A lake shaped like a site, with its samples pooled, so the drawer and legend can show it. Null if unknown.
export function lakeAsSite(id, sites) {
  const lake = LAKES.find((l) => l.id === id);
  if (!lake) return null;
  const members = sites.filter((s) => lake.sites.includes(s.id));
  if (members.length < 2) return null;
  const mean = (key) => members.reduce((a, s) => a + s[key], 0) / members.length;
  return {
    id: lake.id,
    name: lake.name,
    address: `All ${members.length} sampling sites on this lake`,
    basin: members[0].basin,
    lat: mean('lat'),
    lon: mean('lon'),
    n: members.reduce((a, s) => a + s.n, 0),
    last: members.reduce((a, s) => (s.last > a ? s.last : a), ''),
    species: pooledSpecies(members),
    members,
  };
}

// Combines per-site sample files into one, oldest sample first like a single site's file.
export function mergeDetails(id, details) {
  const species = {};
  for (const d of details) {
    for (const [name, samples] of Object.entries(d.species)) (species[name] ??= []).push(...samples);
  }
  for (const samples of Object.values(species)) samples.sort((a, b) => a.date.localeCompare(b.date));
  return { id, species };
}
