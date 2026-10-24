<script>
  import { ALL_SPECIES, EPA_GUIDELINE_PPM } from '../lib/config.js';
  import { MODE_LABELS } from '../lib/coloring.js';
  import { displaySpecies } from '../lib/format.js';
  import { app } from '../lib/state.svelte.js';
  import Thermometer from './Thermometer.svelte';

  let open = $state(false);
  let mixed = $derived(app.filter === ALL_SPECIES && ['avg', 'latest', 'trend'].includes(app.color));
</script>

<div class="legend">
  <div class="head">
    <b>{MODE_LABELS[app.color]}</b>
    <button onclick={() => (open = !open)} aria-expanded={open} aria-label="About these colors">ⓘ</button>
  </div>
  <div class="sub">
    Fish-tissue mercury · {mixed ? 'All species (mixed)' : app.filter === ALL_SPECIES ? 'All species' : displaySpecies(app.filter)}
  </div>
  <Thermometer />
  <div class="nodata"><span class="dot hollow"></span>{app.color === 'trend' ? 'Too few years to tell' : 'No recent data'}</div>
  {#if open}
    <p>
      {#if app.color === 'avg' || app.color === 'latest'}
        Blue is below the EPA guideline ({EPA_GUIDELINE_PPM} ppm) and red is above it; the deeper the color, the
        further away. Drag the handles to set where the deepest colors are reached.
      {:else if app.color === 'trend'}
        How fast mercury has changed at each site, as percent per decade. Grey is no change, blue is falling
        (improving) and red is rising (worsening). Needs at least 3 sampled years spanning 5+ years.
        Drag the handles to set how much change gets the deepest colors.
      {:else}
        Drag the handles to set the range the colors span.
      {/if}
      Averages are per species; "All species (mixed)" pools every species and can hide high-mercury fish.
    </p>
  {/if}
  {#if app.meta}
    <p class="src">Data: Louisiana DEQ, updated {app.meta.updated} · National: EPA 2022</p>
  {/if}
</div>

<style>
  .legend {
    position: absolute; left: 8px; bottom: 20px; z-index: 900; width: min(280px, calc(100vw - 80px));
    background: var(--surface); color: var(--text); border-radius: 12px; box-shadow: var(--shadow);
    padding: 6px 8px; font-size: 11px;
  }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .head button { border: 0; background: none; font-size: 18px; min-width: 32px; min-height: 32px; cursor: pointer; color: var(--text); }
  .sub { color: var(--muted); }
  ul { list-style: none; margin: 4px 0 0; padding: 0; }
  li { display: flex; align-items: center; gap: 6px; line-height: 1.5; }
  .dot { display: inline-block; width: 12px; min-width: 12px; height: 12px; border-radius: 50%; border: 1px solid rgba(0, 0, 0, 0.25); flex-shrink: 0; }
  p { margin: 6px 0 0; }
  .nodata { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
  .hollow { background: transparent; border: 1.5px solid #757575; }
  .src { color: var(--muted); font-size: 11px; }
</style>
