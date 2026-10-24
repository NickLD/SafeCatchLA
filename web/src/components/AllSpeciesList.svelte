<script>
  import { mercuryBand } from '../lib/coloring.js';
  import { EPA_GUIDELINE_PPM } from '../lib/config.js';
  import { displaySpecies, formatPpm } from '../lib/format.js';
  import { periodMean } from '../lib/stats.js';

  let { site, period, latestYear } = $props();
  const BAND_COLORS = { below: '#2c7bb6', near: '#fdae61', above: '#d7191c' };

  let entries = $derived(Object.entries(site.species).map(([name, sp]) => ({ name, m: periodMean(sp.years, period, latestYear) })));
  let withData = $derived(entries.filter((e) => e.m).sort((a, b) => b.m.mean - a.m.mean));
  let without = $derived(entries.filter((e) => !e.m));
  let max = $derived(Math.max(EPA_GUIDELINE_PPM * 1.2, ...withData.map((e) => e.m.mean)));
</script>

<h3>All species here</h3>
<ul aria-label="All species here">
  {#each withData as e (e.name)}
    <li>
      <span class="name">{displaySpecies(e.name)}</span>
      <span class="bar" style:width="{(e.m.mean / max) * 100}%" style:background={BAND_COLORS[mercuryBand(e.m.mean)]}></span>
      <span class="val">{formatPpm(e.m.mean)} ({e.m.n})</span>
    </li>
  {/each}
  {#each without as e (e.name)}
    <li class="none">{displaySpecies(e.name)}: no samples in period</li>
  {/each}
</ul>

<style>
  h3 { margin: 12px 0 4px; font-size: 15px; }
  ul { list-style: none; margin: 0; padding: 0; font-size: 13px; }
  li { display: grid; grid-template-columns: 9em 1fr 5.5em; align-items: center; gap: 6px; line-height: 1.9; }
  .bar { height: 10px; border-radius: 2px; }
  .val { text-align: right; }
  .none { display: block; color: var(--muted); }
</style>
