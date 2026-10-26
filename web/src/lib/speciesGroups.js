// Angler-friendly species groups for the map's species filter. Every species in LDEQ's data belongs to
// exactly one group (a test checks this against the built data).
import { displaySpecies } from './format.js';

export const GROUPS = [
  { id: 'bass', label: 'Bass', members: ['LARGEMOUTH BASS', 'SPOTTED BASS', 'WHITE BASS', 'YELLOW BASS', 'STRIPED BASS', 'HYBRID BASS', 'ROCK BASS', 'FRESHWATER BASS'] },
  { id: 'crappie', label: 'Crappie', members: ['BLACK CRAPPIE', 'WHITE CRAPPIE'] },
  { id: 'catfish', label: 'Catfish', members: ['BLUE CATFISH', 'CHANNEL CATFISH', 'FLATHEAD CATFISH', 'YELLOW BULLHEAD', 'BLACK BULLHEAD', 'BROWN BULLHEAD', 'BULLHEADS', 'GAFFTOPSAIL CATFISH'] },
  { id: 'sunfish', label: 'Sunfish (bream)', members: ['BLUEGILL', 'REDEAR SUNFISH', 'WARMOUTH', 'LONGEAR SUNFISH', 'GREEN SUNFISH'] },
  { id: 'drum', label: 'Drum', members: ['FRESHWATER DRUM', 'RED DRUM', 'BLACK DRUM', 'FINEBARBEL CROAKERS'] },
  { id: 'gar-bowfin', label: 'Gar & bowfin', members: ['BOWFIN', 'SPOTTED GAR', 'ALLIGATOR GAR', 'LONGNOSE GAR', 'SHORTNOSE GAR'] },
  { id: 'buffalo-carp', label: 'Buffalo, carp & suckers', members: ['BIGMOUTH BUFFALO', 'SMALLMOUTH BUFFALO', 'BLACK BUFFALO', 'COMMON CARP', 'SILVER CARP', 'GRASS CARP', 'BLACKTAIL REDHORSE', 'BLUE SUCKER', 'SPOTTED SUCKER'] },
  { id: 'inshore', label: 'Inshore saltwater', members: ['SHEEPSHEAD', 'SPOTTED SEATROUT', 'SAND SEATROUT', 'SOUTHERN FLOUNDER', 'GULF FLOUNDER', 'STRIPED MULLET', 'ATLANTIC TRIPLETAIL'] },
  { id: 'offshore', label: 'Offshore saltwater', members: ['KING MACKEREL', 'SPANISH MACKEREL', 'RED SNAPPER', 'GRAY SNAPPER', 'LANE SNAPPER', 'COBIA', 'GREATER AMBERJACK', 'DOLPHINFISH', 'BLACKFIN TUNA', 'YELLOWFIN TUNA', 'LITTLE TUNNY', 'WARSAW GROUPER', 'YELLOWEDGE GROUPER', 'SCAMP', 'GAG', 'CREVALLE JACK', 'GRAY TRIGGERFISH', 'FLORIDA POMPANO', 'WAHOO', 'SWORDFISH'] },
  { id: 'other', label: 'Other', members: ['CHAIN PICKEREL', 'AMERICAN EEL'] },
];

// Groups holding the given species (in their given order); species no group knows land in "Other".
export function groupSpecies(available) {
  const known = new Set(GROUPS.flatMap((g) => g.members));
  return GROUPS.map((g) => ({
    ...g,
    species: available.filter((s) => g.members.includes(s) || (g.id === 'other' && !known.has(s))),
  })).filter((g) => g.species.length);
}

// Pill text for a selection: "All species", one name, a whole group "Bass (3)", or "N species".
export function filterLabel(selected, available) {
  if (!selected.length) return 'All species';
  if (selected.length === 1) return displaySpecies(selected[0]);
  const set = new Set(selected);
  const whole = groupSpecies(available).find((g) => g.species.length === set.size && g.species.every((s) => set.has(s)));
  return whole ? `${whole.label} (${set.size})` : `${set.size} species`;
}
