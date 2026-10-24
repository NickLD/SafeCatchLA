// Fish size classes (per-species length thirds from the pipeline) and sample descriptions.
export const SIZE_CLASSES = ['small', 'medium', 'large'];
export const SIZE_COLORS = { small: '#80cdc1', medium: '#2c7bb6', large: '#542788' };

const CM_PER_IN = 2.54;
const G_PER_LB = 453.592;
const halfInch = (cm) => Math.round((cm / CM_PER_IN) * 2) / 2;

export function sizeClass(lengthCm, cuts) {
  if (lengthCm == null || !cuts) return null;
  if (lengthCm < cuts[0]) return 'small';
  if (lengthCm < cuts[1]) return 'medium';
  return 'large';
}

export function classLabel(cls, cuts) {
  const [a, b] = cuts.map(halfInch);
  if (cls === 'small') return `Small (under ${a}")`;
  if (cls === 'medium') return `Medium (${a}–${b}")`;
  return `Large (${b}"+)`;
}

export function describeSample(s) {
  const date = new Date(`${s.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const hg = s.nd ? 'not detected' : `${s.value.toFixed(2)} ppm`;
  const parts = [];
  if (s.lengthCm != null) parts.push(`${(s.lengthCm / CM_PER_IN).toFixed(1)} in`);
  if (s.weightG != null) parts.push(`${(s.weightG / G_PER_LB).toFixed(1)} lb`);
  const size = parts.length ? parts.join(', ') : 'size not recorded';
  const fish = s.composite && s.nFish > 1 ? `average of ${s.nFish} fish` : 'single fish';
  return `${date} · ${hg} · ${size} · ${fish}`;
}

export function yearsFromSamples(samples) {
  const years = {};
  for (const s of samples) {
    const t = (years[s.date.slice(0, 4)] ??= [0, 0]);
    t[0] += s.value;
    t[1] += 1;
  }
  return years;
}
