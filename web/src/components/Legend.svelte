<script>
  import { ALL_SPECIES, EPA_GUIDELINE_PPM } from '../lib/config.js';
  import { legendFor, MODE_LABELS } from '../lib/coloring.js';
  import { displaySpecies } from '../lib/format.js';
  import { app } from '../lib/state.svelte.js';

  let open = $state(false);
  let items = $derived(legendFor(app.color));
  let mixed = $derived(app.filter === ALL_SPECIES && ['avg', 'latest', 'trend'].includes(app.color));
</script>

<div class="legend">
  <div class="head">
    <b>{MODE_LABELS[app.color]}</b>
    <button onclick={() => (open = !open)} aria-expanded={open} aria-label="About these colors">ⓘ</button>
  </div>
  <div class="sub">{mixed ? 'All species (mixed)' : app.filter === ALL_SPECIES ? 'All species' : displaySpecies(app.filter)}</div>
  <ul>
    {#each items as item (item.key)}
      <li><span class="dot" style:background={item.color}></span>{item.label}</li>
    {/each}
  </ul>
  {#if open}
    <p>
      Colors compare the average to the EPA guideline ({EPA_GUIDELINE_PPM} ppm) for the selected period.
      Averages are per species; "All species (mixed)" pools every species and can hide high-mercury fish.
    </p>
  {/if}
  {#if app.meta}
    <p class="src">Data: Louisiana DEQ, updated {app.meta.updated} · National: EPA 2022</p>
  {/if}
</div>

<style>
  .legend {
    position: absolute; left: 8px; bottom: 20px; z-index: 900; max-width: min(260px, calc(100vw - 80px));
    background: var(--surface); color: var(--text); border-radius: 12px; box-shadow: var(--shadow);
    padding: 6px 8px; font-size: 11px;
  }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .head button { border: 0; background: none; font-size: 18px; min-width: 32px; min-height: 32px; cursor: pointer; color: var(--text); }
  .sub { color: var(--muted); }
  ul { list-style: none; margin: 4px 0 0; padding: 0; }
  li { display: flex; align-items: center; gap: 6px; line-height: 1.5; }
  .dot { width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(0, 0, 0, 0.25); flex-shrink: 0; }
  p { margin: 6px 0 0; }
  .src { color: var(--muted); font-size: 11px; }
</style>
