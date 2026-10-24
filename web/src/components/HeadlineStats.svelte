<script>
  import { formatPpm } from '../lib/format.js';
  import { changeOver, periodMean } from '../lib/stats.js';

  let { entry, period, latestYear } = $props();
  let avg = $derived(periodMean(entry.years, period, latestYear));
  let basis = $state('period');
  let change = $derived(changeOver(entry.years, period, latestYear, basis));
  const span = ([a, b]) => (a === b ? String(a) : `${a}–${String(b % 100).padStart(2, '0')}`);
  let changeText = $derived(change && (basis === 'previous' ? `${change.late[0]} vs ${change.early[0]}` : `since ${span(change.early)}`));
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
      <small>{changeText}</small>
    {:else}
      <b>—</b>
      <small>{basis === 'previous' ? 'Only one sampled year' : 'Not enough years in period'}</small>
    {/if}
    <select aria-label="Compare change" bind:value={basis}>
      <option value="period">change over period</option>
      <option value="previous">vs previous sample</option>
    </select>
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
  select {
    margin-top: 2px; max-width: 100%; font-size: 11px; border: 0; background: none; color: var(--accent);
    text-decoration: underline; text-align: center; cursor: pointer;
  }
  .down { color: #2c7bb6; }
  .up { color: #d7191c; }
</style>
