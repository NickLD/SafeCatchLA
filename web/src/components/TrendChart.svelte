<script>
  import { EPA_GUIDELINE_PPM } from '../lib/config.js';
  import { formatPpm } from '../lib/format.js';
  import { yearlyMeans } from '../lib/stats.js';

  // years: full history for one species at this site; samples: individual results (optional);
  // stateAvg: Louisiana mean for the selected period, or null.
  let { years, samples = [], stateAvg = null } = $props();

  const W = 340, H = 170, L = 34, R = 8, T = 10, B = 22;
  let pts = $derived(yearlyMeans(years));
  let x0 = $derived(pts.length ? pts[0].year : 2000);
  let x1 = $derived(pts.length && pts.at(-1).year > x0 ? pts.at(-1).year : x0 + 1);
  let maxData = $derived(Math.max(0, ...pts.map((p) => p.mean), ...samples.map((s) => s.value ?? 0)));
  let yMax = $derived(Math.max(maxData * 1.2, EPA_GUIDELINE_PPM + 0.05, stateAvg ? stateAvg * 1.2 : 0));
  let selected = $state(null);

  const sx = (year) => L + ((year - x0) / (x1 - x0)) * (W - L - R);
  const sy = (v) => T + (1 - v / yMax) * (H - T - B);
  const ticks = (max) => [0, max / 2, max].map((v) => Math.round(v * 100) / 100);
</script>

<figure>
  <svg viewBox="0 0 {W} {H}" role="img" aria-label="Yearly average mercury over time">
    {#each ticks(yMax) as t (t)}
      <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} class="grid" />
      <text x={L - 4} y={sy(t) + 3} text-anchor="end" class="tick">{t}</text>
    {/each}
    <text x={L} y={H - 6} class="tick">{x0}</text>
    <text x={W - R} y={H - 6} text-anchor="end" class="tick">{x1}</text>

    <line x1={L} x2={W - R} y1={sy(EPA_GUIDELINE_PPM)} y2={sy(EPA_GUIDELINE_PPM)} class="epa" />
    <text x={L + 4} y={sy(EPA_GUIDELINE_PPM) + 11} class="lbl epa-t">EPA guideline (0.3 ppm)</text>
    {#if stateAvg !== null}
      <line x1={L} x2={W - R} y1={sy(stateAvg)} y2={sy(stateAvg)} class="state" />
      <text x={W - R} y={sy(stateAvg) - 3} text-anchor="end" class="lbl">Louisiana avg {formatPpm(stateAvg)}</text>
    {/if}

    {#each samples as s, i (i)}
      <circle cx={sx(Number(s.date.slice(0, 4)) + 0.5 * ((i % 5) - 2) / 10)} cy={sy(s.value ?? 0)} r="1.8" class="sample" />
    {/each}
    <polyline points={pts.map((p) => `${sx(p.year)},${sy(p.mean)}`).join(' ')} class="line" />
    {#each pts as p (p.year)}
      <circle cx={sx(p.year)} cy={sy(p.mean)} r={selected?.year === p.year ? 6 : 4} class="pt"
              role="button" tabindex="0" aria-label="{p.year}: {formatPpm(p.mean)} ppm"
              onclick={() => (selected = p)} onkeydown={(e) => e.key === 'Enter' && (selected = p)} />
    {/each}
  </svg>
  <figcaption>
    {#if selected}
      {selected.year}: {formatPpm(selected.mean)} ppm ({selected.n} {selected.n === 1 ? 'sample' : 'samples'})
    {:else}
      Tap a point for that year's average. Faint dots are individual samples.
    {/if}
  </figcaption>
</figure>

<style>
  figure { margin: 0; }
  svg { width: 100%; height: auto; display: block; }
  .grid { stroke: var(--border); stroke-width: 0.5; }
  .tick { font-size: 9px; fill: var(--muted); }
  .lbl { font-size: 9px; fill: var(--muted); }
  .epa { stroke: #d7191c; stroke-dasharray: 4 3; }
  .epa-t { fill: #d7191c; }
  .state { stroke: var(--muted); stroke-dasharray: 2 2; }
  .sample { fill: var(--accent); opacity: 0.25; }
  .line { fill: none; stroke: var(--accent); stroke-width: 2; }
  .pt { fill: var(--accent); stroke: var(--surface); stroke-width: 1.5; cursor: pointer; }
  figcaption { font-size: 12px; color: var(--muted); min-height: 1.4em; }
</style>
