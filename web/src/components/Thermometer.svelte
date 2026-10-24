<script>
  import { gradientStops, SCALES } from '../lib/coloring.js';
  import { EPA_GUIDELINE_PPM } from '../lib/config.js';
  import { app, update } from '../lib/state.svelte.js';

  let scale = $derived(SCALES[app.color]);
  let range = $derived(app.range ?? scale.range);
  let gradient = $derived(
    `linear-gradient(to right, ${gradientStops(app.color, range).map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`).join(', ')})`,
  );
  let epaAt = $derived(scale.kind === 'diverging' ? (EPA_GUIDELINE_PPM - range[0]) / (range[1] - range[0]) : null);

  const num = (v) => (scale.unit === 'ppm' ? v.toFixed(2).replace(/0$/, '') : String(v));
  let low = $derived(`${num(range[0])}${scale.unit === 'ppm' ? '' : ` ${scale.unit}`}`);
  let high = $derived(`${num(range[1])}+${scale.unit === 'ppm' ? '' : ` ${scale.unit}`}`);

  function setEnd(i, raw) {
    const next = [...range];
    next[i] = Number(raw);
    if (next[0] < next[1]) update({ range: next });
  }
</script>

<div class="therm">
  <div class="bar" style:background={gradient}>
    {#if epaAt !== null && epaAt >= 0 && epaAt <= 1}
      <span class="epa" style:left="{epaAt * 100}%"><span>EPA 0.3</span></span>
    {/if}
  </div>
  <div class="ends"><span>{low}</span><span>{high}</span></div>
  <div class="handles">
    <label>
      <span>{scale.handles[0]} <b>{num(range[0])}</b></span>
      <input type="range" aria-label={scale.handles[0]} min={scale.minBounds[0]} max={scale.minBounds[1]} step={scale.step}
             value={range[0]} oninput={(e) => setEnd(0, e.currentTarget.value)} />
    </label>
    <label>
      <span>{scale.handles[1]} <b>{num(range[1])}</b></span>
      <input type="range" aria-label={scale.handles[1]} min={scale.maxBounds[0]} max={scale.maxBounds[1]} step={scale.step}
             value={range[1]} oninput={(e) => setEnd(1, e.currentTarget.value)} />
    </label>
  </div>
  {#if app.range}
    <button class="reset" onclick={() => update({ range: null })}>Reset range</button>
  {/if}
</div>

<style>
  .therm { margin-top: 6px; }
  .bar { position: relative; height: 14px; border-radius: 7px; margin-top: 14px; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2); }
  .epa { position: absolute; top: -4px; bottom: -4px; border-left: 2px dashed #b00; }
  .epa span { position: absolute; bottom: 100%; transform: translateX(-50%); font-size: 10px; color: #b00; white-space: nowrap; }
  .ends { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 2px; }
  .handles { display: flex; gap: 10px; margin-top: 4px; }
  label { flex: 1; display: flex; flex-direction: column; font-size: 10px; color: var(--muted); min-width: 0; }
  input { width: 100%; margin: 0; min-height: 28px; accent-color: var(--accent); }
  .reset { margin-top: 2px; border: 0; background: none; color: var(--accent); font-size: 11px; padding: 4px 0; cursor: pointer; }
</style>
