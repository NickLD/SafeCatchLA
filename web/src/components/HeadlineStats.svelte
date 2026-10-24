<script>
  import { formatPpm } from '../lib/format.js';
  import { changeSinceEarliest, periodMean } from '../lib/stats.js';

  let { entry, period, latestYear } = $props();
  let avg = $derived(periodMean(entry.years, period, latestYear));
  let change = $derived(changeSinceEarliest(entry.years));
  let periodText = $derived(period === 'all' ? 'all years' : `last ${period} yrs`);
</script>

<section class="tiles" aria-label="Summary">
  <div class="tile">
    {#if avg}
      <b>{formatPpm(avg.mean)}</b>
      <span>avg ppm</span>
      <small>{avg.n} {avg.n === 1 ? 'sample' : 'samples'} · {periodText}</small>
    {:else}
      <b>—</b>
      <span>avg ppm</span>
      <small>No samples in period</small>
    {/if}
  </div>
  <div class="tile">
    <b>{formatPpm(entry.latest[1])}</b>
    <span>latest ppm</span>
    <small>{entry.latest[2] ?? 1} {(entry.latest[2] ?? 1) === 1 ? 'sample' : 'samples'} · {entry.latest[0].slice(0, 4)}</small>
  </div>
  <div class="tile">
    {#if change}
      <b class:down={change.pct < 0} class:up={change.pct > 0}>{change.pct < 0 ? '↓' : change.pct > 0 ? '↑' : ''}{Math.abs(change.pct)}%</b>
      <span>change</span>
      <small>since {change.early[0]}–{String(change.early[1] % 100).padStart(2, '0')}</small>
    {:else}
      <b>—</b>
      <span>change</span>
      <small>Not enough years</small>
    {/if}
  </div>
</section>

<style>
  .tiles { display: flex; gap: 6px; margin: 6px 0; }
  .tile {
    flex: 1; border: 1px solid var(--border); border-radius: 8px; padding: 6px 4px;
    display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 0;
  }
  b { font-size: 20px; }
  span { font-size: 12px; }
  small { font-size: 11px; color: var(--muted); }
  .down { color: #2c7bb6; }
  .up { color: #d7191c; }
</style>
