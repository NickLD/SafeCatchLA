// Fish size classes (per-species length thirds from the pipeline) and sample descriptions.
import { formatPpm } from './format.js';
export const SIZE_CLASSES = ['small', 'medium', 'large'];
export const SIZE_COLORS = { small: '#80cdc1', medium: '#2c7bb6', large: '#542788' };

const CM_PER_IN = 2.54;
const G_PER_LB = 453.592;
const inches = (cm) => (cm / CM_PER_IN).toFixed(1);

export function sizeClass(lengthCm, cuts) {
  if (lengthCm == null || !cuts) return null;
  if (lengthCm < cuts[0]) return 'small';
  if (lengthCm < cuts[1]) return 'medium';
  return 'large';
}

export function classLabel(cls, cuts) {
  const [a, b] = cuts.map(inches);
  if (cls === 'small') return `Small (under ${a}")`;
  if (cls === 'medium') return `Medium (${a}–${b}")`;
  return `Large (${b}"+)`;
}

export function describeSample(s) {
  const date = new Date(`${s.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const hg = s.nd ? 'not detected' : `${formatPpm(s.value)} ppm`;
  const parts = [];
  if (s.lengthCm != null) parts.push(`${(s.lengthCm / CM_PER_IN).toFixed(2)} in`);
  if (s.weightG != null) parts.push(`${(s.weightG / G_PER_LB).toFixed(2)} lb`);
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

const monthDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// For a yearly-average point: "2 samples (6 fish) · sampled Aug 12 and Sep 1".
// Fish counts every fish in a composite; long date lists collapse to a range.
export function describeYear(samples) {
  const fish = samples.reduce((a, s) => a + (s.nFish ?? 1), 0);
  const dates = [...new Set(samples.map((s) => s.date))].sort();
  let when;
  if (dates.length > 3) when = `${monthDay(dates[0])} – ${monthDay(dates.at(-1))} (${dates.length} dates)`;
  else if (dates.length > 1) when = `${dates.slice(0, -1).map(monthDay).join(', ')} and ${monthDay(dates.at(-1))}`;
  else when = monthDay(dates[0]);
  const n = samples.length;
  return `${n} ${n === 1 ? 'sample' : 'samples'} (${fish} fish) · sampled ${when}`;
}
