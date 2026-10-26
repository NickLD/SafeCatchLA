<script>
  import { scaleColor, SCALES } from '../lib/coloring.js';
  import { app } from '../lib/state.svelte.js';
  import { EPA_GUIDELINE_PPM } from '../lib/config.js';
  import { displaySpecies, formatPpm } from '../lib/format.js';
  import { periodMean } from '../lib/stats.js';
  import OneFish from './OneFish.svelte';

  let { site, period, latestYear } = $props();

  let entries = $derived(Object.entries(site.species).map(([name, sp]) => ({ name, m: periodMean(sp.years, period, latestYear) })));
  let withData = $derived(entries.filter((e) => e.m).sort((a, b) => b.m.mean - a.m.mean));
  // Same colors as the map's mercury thermometer, including a custom range if one is set.
  let colorRange = $derived((app.color === 'avg' && app.range) || SCALES.avg.range);
  let max = $derived(Math.max(EPA_GUIDELINE_PPM * 1.2, ...withData.map((e) => e.m.mean)));
</script>

<h3>All species here</h3>
<ul aria-label="All species here">
  {#each withData as e (e.name)}
    <li>
      <span class="name">{displaySpecies(e.name)}</span>
      <span class="bar" style:width="{(e.m.mean / max) * 100}%" style:background={scaleColor('avg', e.m.mean, colorRange)}></span>
      <span class="val">{formatPpm(e.m.mean)}</span>
      <span class="detail">
        <!-- A lone fish gets the warning style on the line itself rather than a second tag. -->
        {#if e.m.fish === 1}<OneFish text="1 sample made up of 1 fish" />{:else}{e.m.n} {e.m.n === 1 ? 'sample' : 'samples'} made up of {e.m.fish} fish{/if}
      </span>
    </li>
  {/each}
</ul>

<style>
  h3 { margin: 12px 0 4px; font-size: 15px; }
  ul { list-style: none; margin: 0; padding: 0; font-size: 13px; }
  li { display: grid; grid-template-columns: 9em 1fr 3em; align-items: center; gap: 6px; line-height: 1.9; }
  .bar { height: 10px; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2); }
  .val { text-align: right; }
  .detail { grid-column: 1 / -1; margin-top: -6px; font-size: 11px; line-height: 1.5; color: var(--muted); }
</style>
