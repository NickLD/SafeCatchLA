<script>
  import { EPA_GUIDELINE_PPM } from '../lib/config.js';
  import { formatPpm } from '../lib/format.js';
  import { classLabel, describeSample, describeYear, SIZE_CLASSES, SIZE_COLORS, sizeClass, yearsFromSamples } from '../lib/size.js';
  import { periodStartYear, yearlyMeans } from '../lib/stats.js';

  // years: full history for one species at this site (used until samples load);
  // samples: individual results from the site detail file; cuts: [smallMax, mediumMax] lengths in cm, or undefined;
  // stateAvg: Louisiana mean for the selected period, or null. period/latestYear mark where the stats start.
  let { years, samples = [], stateAvg = null, cuts, period = 'all', latestYear = null } = $props();

  const W = 340, H = 220, L = 34, R = 8, T = 14, B = 22;
  let hidden = $state(new Set());
  let selected = $state(null); // { kind: 'year', p } | { kind: 'sample', s, x, y }

  let classed = $derived(samples.map((s) => ({ ...s, cls: sizeClass(s.lengthCm, cuts) })));
  let visible = $derived(classed.filter((s) => !s.cls || !hidden.has(s.cls)));
  let pts = $derived(yearlyMeans(samples.length ? yearsFromSamples(visible) : years));
  let allPts = $derived(yearlyMeans(years));
  let x0 = $derived(allPts.length ? allPts[0].year : 2000);
  let x1 = $derived(allPts.length ? allPts.at(-1).year : x0);
  // Samples are spread across their year (±half a year), so pad the axis by half a year on each side.
  let lo = $derived(x0 - 0.5);
  let hi = $derived(x1 + 0.5);
  let maxData = $derived(Math.max(0, ...allPts.map((p) => p.mean), ...samples.map((s) => s.value ?? 0)));
  let yMax = $derived(Math.max(maxData * 1.1, EPA_GUIDELINE_PPM + 0.05, stateAvg ? stateAvg * 1.2 : 0));
  let present = $derived(SIZE_CLASSES.filter((c) => classed.some((s) => s.cls === c)));

  // Vertical marker where the selected averaging period begins (samples sit within ±half a year of their year).
  let startYear = $derived(period === 'all' || latestYear === null ? null : periodStartYear(period, latestYear));
  let markX = $derived(startYear !== null && startYear > x0 ? Math.min(sx(startYear - 0.5), W - R) : null);

  const sx = (year) => L + ((year - lo) / (hi - lo)) * (W - L - R);
  const sy = (v) => T + (1 - v / yMax) * (H - T - B);
  const ticks = (max) => [0, max / 2, max].map((v) => Math.round(v * 100) / 100);
  // Spread same-year samples across the year so they don't stack on one vertical line.
  const sampleX = (s) => sx(Number(s.date.slice(0, 4)) + (Number(s.date.slice(5, 7)) - 6.5) / 12);
  const SAME_DAY_GAP = 7; // px between samples taken on the same day, so each can be tapped
  let xs = $derived.by(() => {
    const byDate = new Map();
    visible.forEach((s, i) => byDate.set(s.date, [...(byDate.get(s.date) ?? []), i]));
    const out = [];
    for (const idx of byDate.values()) {
      idx.forEach((i, k) => {
        const x = sampleX(visible[i]) + (k - (idx.length - 1) / 2) * SAME_DAY_GAP;
        out[i] = Math.min(W - R, Math.max(L, x));
      });
    }
    return out;
  });

  function toggle(cls) {
    const next = new Set(hidden);
    if (next.has(cls)) next.delete(cls);
    else next.add(cls);
    hidden = next;
    if (selected?.kind === 'sample' && next.has(selected.s.cls)) selected = null;
  }

  let showAvg = $state(true);

  function pick(item) {
    selected = item;
  }

  // A year with one sample: its average point sits on that sample, so show the sample itself.
  function pickYear(p) {
    const only = p.n === 1 && visible.filter((s) => s.date.startsWith(String(p.year)));
    if (only && only.length === 1) {
      const s = only[0];
      pick({ kind: 'sample', s, x: xs[visible.indexOf(s)], y: sy(s.value ?? 0), soleInYear: true });
    } else {
      pick({ kind: 'year', p, x: sx(p.year), y: sy(p.mean) });
    }
  }
</script>

<figure>
  <div class="chips" role="group" aria-label="Chart layers">
    <button class="chip" aria-pressed={showAvg} onclick={() => (showAvg = !showAvg)} style:--c="var(--text)">
      <span class="swatch line-swatch"></span>Yearly average
    </button>
    {#if present.length}
      {#each present as cls (cls)}
        <button class="chip" aria-pressed={!hidden.has(cls)} onclick={() => toggle(cls)} style:--c={SIZE_COLORS[cls]}>
          <span class="swatch"></span>{classLabel(cls, cuts)}
        </button>
      {/each}
    {/if}
  </div>
  <div class="wrap">
    <svg viewBox="0 0 {W} {H}" role="img" aria-label="Mercury over time, by sample">
      {#each ticks(yMax) as t (t)}
        <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} class="grid" />
        <text x={L - 4} y={sy(t) + 3} text-anchor="end" class="tick">{t}</text>
      {/each}
      <text x={sx(x0)} y={H - 6} text-anchor={x0 === x1 ? 'middle' : 'start'} class="tick">{x0}</text>
      {#if x1 !== x0}<text x={sx(x1)} y={H - 6} text-anchor="end" class="tick">{x1}</text>{/if}

      {#if markX !== null}
        <rect x={L} y={T} width={markX - L} height={H - T - B} class="before" />
        <line x1={markX} x2={markX} y1={T - 4} y2={H - B} class="period" />
        <text x={markX > W * 0.7 ? markX - 3 : markX + 3} y={T + 6} text-anchor={markX > W * 0.7 ? 'end' : 'start'} class="period-t">Last {period} yrs →</text>
      {/if}
      <line x1={L} x2={W - R} y1={sy(EPA_GUIDELINE_PPM)} y2={sy(EPA_GUIDELINE_PPM)} class="epa" />
      {#if stateAvg !== null}
        <line x1={L} x2={W - R} y1={sy(stateAvg)} y2={sy(stateAvg)} class="state" />
      {/if}

      {#if selected}
        <line x1={selected.x} x2={selected.x} y1={T - 6} y2={selected.y} class="pointer" />
        <circle cx={selected.x} cy={selected.y} r="8" class="ring" />
      {/if}

      {#if showAvg}
        <polyline points={pts.map((p) => `${sx(p.year)},${sy(p.mean)}`).join(' ')} class="line" />
        {#each pts as p (p.year)}
          <circle cx={sx(p.year)} cy={sy(p.mean)} r="4.5" class="pt"
                  role="button" tabindex="0" aria-label="{p.year}: {formatPpm(p.mean)} ppm"
                  onclick={() => pickYear(p)}
                  onkeydown={(e) => e.key === 'Enter' && pickYear(p)} />
        {/each}
      {/if}
      <!-- Samples on top of the average points so a lone sample can always be tapped. -->
      {#each visible as s, i (i)}
        {@const x = xs[i]}
        {@const y = sy(s.value ?? 0)}
        <circle cx={x} cy={y} r="4" class="sample" style:fill={s.cls ? SIZE_COLORS[s.cls] : '#9e9e9e'}
                role="button" tabindex="0" aria-label={describeSample(s)}
                onclick={() => pick({ kind: 'sample', s, x, y })}
                onkeydown={(e) => e.key === 'Enter' && pick({ kind: 'sample', s, x, y })} />
      {/each}
    </svg>
  </div>
  <div class="key">
    <span><i class="k-epa"></i>EPA guideline (0.3 ppm)</span>
    {#if stateAvg !== null}<span><i class="k-state"></i>Louisiana avg {formatPpm(stateAvg)}</span>{/if}
    {#if classed.some((s) => !s.cls)}<span><i class="k-dot"></i>Size not recorded</span>{/if}
  </div>
  <figcaption role="status">
    {#if selected?.kind === 'sample'}
      <b>{describeSample(selected.s)}</b>{#if selected.soleInYear} · the only sample that year (1 sample){/if}{#if selected.s.cls}<span class="cls" style:--c={SIZE_COLORS[selected.s.cls]}>{classLabel(selected.s.cls, cuts)}</span>{/if}
    {:else if selected?.kind === 'year'}
      {@const inYear = visible.filter((s) => s.date.startsWith(String(selected.p.year)))}
      <b>{selected.p.year}: {formatPpm(selected.p.mean)} ppm average</b> ·
      {inYear.length ? describeYear(inYear) : `${selected.p.n} ${selected.p.n === 1 ? 'sample' : 'samples'}`}
    {:else}
      Dots are individual samples, colored by fish size. The line is the yearly average. Tap any point for details.
    {/if}
  </figcaption>
</figure>

<style>
  figure { margin: 0; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 6px; }
  .chip {
    display: inline-flex; align-items: center; gap: 5px; min-height: 32px; padding: 0 10px; border-radius: 16px;
    border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 12px; cursor: pointer;
  }
  .chip[aria-pressed='false'] { opacity: 0.45; text-decoration: line-through; }
  .swatch { width: 10px; height: 10px; border-radius: 50%; background: var(--c); }
  .line-swatch { width: 14px; height: 3px; border-radius: 2px; }
  svg { width: 100%; height: auto; display: block; }
  .grid { stroke: var(--border); stroke-width: 0.5; }
  .tick { font-size: 9px; fill: var(--muted); }
  .epa { stroke: #d7191c; stroke-dasharray: 4 3; }
  .before { fill: var(--text); opacity: 0.05; }
  .period { stroke: var(--accent); stroke-width: 1.5; }
  .period-t { font-size: 9px; fill: var(--accent); font-weight: 600; }
  .key { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 11px; color: var(--muted); margin-top: 2px; }
  .key span { display: inline-flex; align-items: center; gap: 4px; }
  .key i { display: inline-block; width: 16px; height: 0; }
  .k-epa { border-top: 2px dashed #d7191c; }
  .k-state { border-top: 2px dotted var(--muted); }
  .key .k-dot { width: 8px; height: 8px; border-radius: 50%; background: #9e9e9e; }
  .state { stroke: var(--muted); stroke-dasharray: 2 2; }
  .sample { opacity: 0.75; stroke: var(--surface); stroke-width: 0.8; cursor: pointer; }
  .line { fill: none; stroke: var(--text); stroke-width: 1.5; opacity: 0.7; }
  .pt { fill: var(--text); stroke: var(--surface); stroke-width: 1.5; cursor: pointer; }
  .pointer { stroke: var(--text); stroke-width: 1; stroke-dasharray: 2 2; }
  .ring { fill: none; stroke: var(--text); stroke-width: 1.5; }
  figcaption { font-size: 12px; color: var(--muted); min-height: 2.6em; margin-top: 2px; }
  figcaption b { color: var(--text); font-weight: 600; }
  .cls { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 8px; color: #fff; background: var(--c); font-size: 11px; }
</style>
