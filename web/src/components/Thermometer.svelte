<script>
  import { colorSite, gradientStops, latestReading, SCALES } from '../lib/coloring.js';
  import { formatDate, formatPpm } from '../lib/format.js';
  import { periodMean, speciesYears } from '../lib/stats.js';
  import { app, selectedSite, update } from '../lib/state.svelte.js';

  let scale = $derived(SCALES[app.color]);
  let range = $derived(app.range ?? scale.range);
  let gradient = $derived(
    `linear-gradient(to right, ${gradientStops(app.color, range).map((s) => `${s.color} ${(s.offset * 100).toFixed(1)}%`).join(', ')})`,
  );
  let centerAt = $derived(scale.kind === 'diverging' ? (scale.center - range[0]) / (range[1] - range[0]) : null);

  const num = (v) => (scale.unit === 'ppm' ? v.toFixed(2).replace(/0$/, '') : String(v));
  let low = $derived(
    scale.unit === '%' ? `−${Math.abs(range[0])}% improving` : `${num(range[0])}${scale.unit === 'ppm' ? '' : ` ${scale.unit}`}`,
  );
  let high = $derived(
    scale.unit === '%' ? `+${range[1]}% worsening` : `${num(range[1])}+${scale.unit === 'ppm' ? '' : ` ${scale.unit}`}`,
  );

  const posOf = (v) => Math.min(1, Math.max(0, (v - range[0]) / (range[1] - range[0])));

  // The selected site's value, computed exactly as its map dot is colored, plus (for mercury) its latest sample.
  // Filled marker = the colored value, hollow marker = latest reading.
  let pins = $derived.by(() => {
    const site = selectedSite();
    if (!site) return [];
    const out = [];
    const c = colorSite(site, { mode: app.color, species: app.filter, period: app.period, latestYear: app.latestYear, today: new Date(), range: app.range });
    if (c.key === 'value') {
      // Name the years actually sampled within the period, since the average only covers those.
      const m = scale.unit === 'ppm' ? periodMean(speciesYears(site, app.filter), app.period, app.latestYear) : null;
      const years = m ? ` · ${m.first === m.last ? m.first : `${m.first}–${m.last}`}` : '';
      const label = scale.unit === 'ppm' ? `Avg ${formatPpm(c.value)} ppm${years}`
        : scale.unit === '%' ? `${c.value > 0 ? '+' : c.value < 0 ? '−' : ''}${Math.abs(Math.round(c.value))}%`
        : `${Math.round(c.value)} ${scale.unit}`;
      out.push({ kind: 'avg', at: posOf(c.value), label });
    }
    const latest = scale.unit === 'ppm' ? latestReading(site, app.filter) : null;
    if (latest) {
      out.push({ kind: 'latest', at: posOf(latest[1]), label: `Latest ${formatPpm(latest[1])} ppm · ${formatDate(latest[0])}` });
    }
    return out;
  });

  function setEnd(i, raw) {
    const next = [...range];
    next[i] = Number(raw);
    if (next[0] < next[1]) update({ range: next });
  }
</script>

<div class="therm">
  <div class="bar" style:background={gradient}>
    {#each pins as p (p.kind)}<span class="dot {p.kind}" style:left="{p.at * 100}%"></span>{/each}
    {#if centerAt !== null && centerAt >= 0 && centerAt <= 1}
      <span class="mark" class:epa={scale.unit === 'ppm'} style:left="{centerAt * 100}%"><span>{scale.centerLabel}</span></span>
    {/if}
  </div>
  {#each pins as p (p.kind)}
    <div class="pin"><span class="bubble {p.kind}"><i class="dot {p.kind}"></i>{p.label}</span></div>
  {/each}
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
  .mark { position: absolute; top: -4px; bottom: -4px; border-left: 2px dashed var(--text); }
  .mark span { position: absolute; bottom: 100%; transform: translateX(-50%); font-size: 10px; color: var(--text); white-space: nowrap; }
  .mark.epa { border-color: #b00; }
  .mark.epa span { color: #b00; }
  /* Labels stay lined up at the left; the matching dot on the bar shows where each value falls. */
  .pin { margin-top: 3px; }
  .bubble {
    display: inline-flex; align-items: center; gap: 4px; padding: 1px 6px; border-radius: 8px; white-space: nowrap;
    font-size: 10px; font-weight: 600; border: 1px solid var(--text);
  }
  .bubble.avg { background: var(--text); color: var(--surface); }
  .bubble.latest { background: var(--surface); color: var(--text); }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; box-sizing: border-box; }
  .bar .dot { position: absolute; top: 50%; width: 10px; height: 10px; transform: translate(-50%, -50%); z-index: 1; }
  .dot.avg { background: var(--text); border: 1.5px solid var(--surface); }
  .dot.latest { background: var(--surface); border: 2px solid var(--text); }
  .bubble.avg .dot { border-color: var(--surface); background: var(--surface); }
  .ends { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 2px; }
  .handles { display: flex; gap: 10px; margin-top: 4px; }
  label { flex: 1; display: flex; flex-direction: column; font-size: 10px; color: var(--muted); min-width: 0; }
  input { width: 100%; margin: 0; min-height: 28px; accent-color: var(--accent); }
  .reset { margin-top: 2px; border: 0; background: none; color: var(--accent); font-size: 11px; padding: 4px 0; cursor: pointer; }
</style>
