<script>
  import { EPA_GUIDELINE_PPM } from '../lib/config.js';
  import { formatPpm } from '../lib/format.js';
  import { classLabel, describeSample, describeYear, SIZE_CLASSES, SIZE_COLORS, sizeClass, yearsFromSamples } from '../lib/size.js';
  import { periodStartYear, yearlyMeans } from '../lib/stats.js';

  // years: full history for one species at this site (used until samples load);
  // samples: individual results from the site detail file; cuts: [smallMax, mediumMax] lengths in cm, or undefined;
  // stateAvg: Louisiana mean for the selected period, or null. period/latestYear mark where the stats start.
  // title names the chart in its full-screen view.
  let { years, samples = [], stateAvg = null, cuts, period = 'all', latestYear = null, title = '' } = $props();

  const BASE_W = 340, BASE_H = 220, L = 34, R = 8, T = 14, B = 22;
  const FULL_SCALE = 1.35; // full screen draws text and marks this much larger
  let full = $state(false);
  let boxW = $state(0);
  let boxH = $state(0);
  // Full screen redraws at the screen's size (rather than scaling up) so crowded samples spread apart.
  // Scale up text and marks only as far as the width allows, so the chart always fills the screen exactly.
  let k = $derived(full && boxW ? Math.max(1, Math.min(FULL_SCALE, boxW / BASE_W)) : 1);
  let W = $derived(full && boxW ? boxW / k : BASE_W);
  let H = $derived(full && boxH ? Math.max(160, boxH / k) : BASE_H);
  let hidden = $state(new Set());
  // Raw (not deeply reactive) so selected.s stays the very sample object the chart drew, for finding it again.
  let selected = $state.raw(null); // { kind: 'year', p } | { kind: 'sample', s, soleInYear }

  let classed = $derived(samples.map((s) => ({ ...s, cls: sizeClass(s.lengthCm, cuts) })));
  let visible = $derived(classed.filter((s) => !s.cls || !hidden.has(s.cls)));
  let pts = $derived(yearlyMeans(samples.length ? yearsFromSamples(visible) : years));
  let allPts = $derived(yearlyMeans(years));
  let x0 = $derived(allPts.length ? allPts[0].year : 2000);
  let x1 = $derived(allPts.length ? allPts.at(-1).year : x0);
  // Samples are spread across their year (±half a year), so pad the axis by half a year on each side.
  let lo = $derived(x0 - 0.5);
  let hi = $derived(x1 + 0.5);
  // Time zoom (full screen only): the visible span of years, or null for the whole history.
  let view = $state(null);
  let vlo = $derived(view ? view[0] : lo);
  let vhi = $derived(view ? view[1] : hi);
  let maxData = $derived(Math.max(0, ...allPts.map((p) => p.mean), ...samples.map((s) => s.value ?? 0)));
  let yMax = $derived(Math.max(maxData * 1.1, EPA_GUIDELINE_PPM + 0.05, stateAvg ? stateAvg * 1.2 : 0));
  let present = $derived(SIZE_CLASSES.filter((c) => classed.some((s) => s.cls === c)));

  // Vertical marker where the selected averaging period begins (samples sit within ±half a year of their year).
  let startYear = $derived(period === 'all' || latestYear === null ? null : periodStartYear(period, latestYear));
  let markX = $derived(startYear !== null && startYear > x0 ? Math.min(sx(startYear - 0.5), W - R) : null);

  const sx = (year) => L + ((year - vlo) / (vhi - vlo)) * (W - L - R);
  const sy = (v) => T + (1 - v / yMax) * (H - T - B);
  // The yearly average is a short bar across its year (samples are dots), so the two never look alike.
  let barW = $derived(Math.min(24, Math.max(10, ((W - L - R) / (vhi - vlo)) * 0.9)));
  // With samples loaded, a one-sample year's average is that sample: skip the bar and let the dot speak.
  let bars = $derived(samples.length ? pts.filter((p) => p.n > 1) : pts);
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
        // Keep edge samples inside the axes; when zoomed, off-screen ones are clipped instead.
        out[i] = view ? x : Math.min(W - R, Math.max(L, x));
      });
    }
    return out;
  });
  // Year labels: the first and last year normally; evenly stepped years in full screen.
  let yearTicks = $derived.by(() => {
    if (!full) return x1 === x0 ? [x0] : [x0, x1];
    const span = vhi - vlo;
    const step = span <= 8 ? 1 : span <= 16 ? 2 : span <= 40 ? 5 : 10;
    const out = [];
    for (let y = Math.ceil(vlo / step) * step; y <= vhi; y += step) out.push(y);
    return out;
  });
  // Where the selection marker goes, from the data, so it follows zooming and resizing.
  let selPos = $derived.by(() => {
    if (selected?.kind === 'sample') {
      const i = visible.indexOf(selected.s);
      return i < 0 ? null : { x: xs[i], y: sy(selected.s.value ?? 0) };
    }
    return selected ? { x: sx(selected.p.year), y: sy(selected.p.mean) } : null;
  });
  const clipId = `plot-${Math.random().toString(36).slice(2)}`;

  function toggle(cls) {
    const next = new Set(hidden);
    if (next.has(cls)) next.delete(cls);
    else next.add(cls);
    hidden = next;
    if (selected?.kind === 'sample' && next.has(selected.s.cls)) selected = null;
  }

  let showAvg = $state(true);

  // Tapping the point that's already selected clears it.
  function pick(item) {
    const same = item.kind === selected?.kind && (item.kind === 'sample' ? item.s === selected.s : item.p.year === selected.p.year);
    selected = same ? null : item;
  }

  // Tapping empty chart space (anything but a point) clears the selection.
  function onChartClick(e) {
    if (!e.target.closest('[role="button"]')) selected = null;
  }

  function pickSample(s) {
    const year = s.date.slice(0, 4);
    pick({ kind: 'sample', s, soleInYear: visible.filter((v) => v.date.startsWith(year)).length === 1 });
  }

  // A year with one sample: its average point sits on that sample, so show the sample itself.
  function pickYear(p) {
    const only = p.n === 1 && visible.filter((s) => s.date.startsWith(String(p.year)));
    if (only && only.length === 1) pick({ kind: 'sample', s: only[0], soleInYear: true });
    else pick({ kind: 'year', p });
  }

  // Moves the chart into <body> while full screen so the drawer can't clip or stack over it.
  function portal(node, on) {
    const home = node.parentNode;
    const next = node.nextSibling;
    const apply = (v) => {
      if (v) document.body.appendChild(node);
      else if (node.parentNode !== home) home.insertBefore(node, next);
    };
    apply(on);
    return { update: apply, destroy: () => node.parentNode !== home && node.remove() };
  }

  function closeFull() {
    full = false;
    view = null;
  }

  const MIN_SPAN = 2; // years
  function setView(from, to) {
    const span = Math.max(MIN_SPAN, to - from);
    if (span >= hi - lo) {
      view = null;
      return;
    }
    const start = Math.min(Math.max(from, lo), hi - span);
    view = [start, start + span];
  }
  // Zoom by factor (>1 is in) keeping `year` at the same spot on screen.
  function zoomAt(year, factor) {
    const span = (vhi - vlo) / factor;
    const start = year - ((year - vlo) / (vhi - vlo)) * span;
    setView(start, start + span);
  }

  // Full-screen gestures: drag to pan through time, pinch (or mouse wheel) to zoom. Vertical scale stays fixed.
  let svgEl = $state();
  const pointers = new Map();
  let gesture = null;
  let dragged = false;
  function toYear(clientX) {
    const r = svgEl.getBoundingClientRect();
    const x = ((clientX - r.left) / (r.width || 1)) * W;
    return vlo + ((x - L) / (W - L - R)) * (vhi - vlo);
  }
  function startGesture() {
    const ps = [...pointers.values()];
    const from = [vlo, vhi];
    if (ps.length === 1) gesture = { kind: 'pan', x: ps[0].x, from };
    else if (ps.length === 2) {
      gesture = { kind: 'pinch', d: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1, mid: toYear((ps[0].x + ps[1].x) / 2), from };
    }
  }
  function onDown(e) {
    if (!full) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) dragged = false;
    startGesture();
  }
  function onMove(e) {
    if (!full || !gesture || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const ps = [...pointers.values()];
    const [a, b] = gesture.from;
    if (gesture.kind === 'pan') {
      const dx = ps[0].x - gesture.x;
      if (Math.abs(dx) > 4) dragged = true;
      if (!dragged) return;
      const r = svgEl.getBoundingClientRect();
      const yearsPerPx = ((b - a) / (W - L - R)) * (W / (r.width || 1));
      setView(a - dx * yearsPerPx, b - dx * yearsPerPx);
    } else if (ps.length === 2) {
      dragged = true;
      const span = ((b - a) * gesture.d) / (Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1);
      const start = gesture.mid - ((gesture.mid - a) / (b - a)) * span;
      setView(start, start + span);
    }
  }
  function onUp(e) {
    pointers.delete(e.pointerId);
    gesture = null;
    if (pointers.size) startGesture();
  }
  // A drag or pinch shouldn't also count as tapping the point it started on.
  function onClickCapture(e) {
    if (dragged) {
      e.stopPropagation();
      dragged = false;
    }
  }
  // Measure the plot area only while full screen; the inline chart keeps its fixed size.
  let wrapEl = $state();
  $effect(() => {
    if (!full || !wrapEl || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      boxW = entry.contentRect.width;
      boxH = entry.contentRect.height;
    });
    ro.observe(wrapEl);
    return () => ro.disconnect();
  });

  // Wheel and touchmove listeners must be non-passive so they can stop the browser's own scrolling.
  $effect(() => {
    if (!svgEl) return;
    const onWheel = (e) => {
      if (!full) return;
      e.preventDefault();
      zoomAt(toYear(e.clientX), e.deltaY < 0 ? 1.25 : 0.8);
    };
    // Touch drags on the chart are ours: without this the browser still treats them as page scrolls
    // (iOS ignores touch-action on SVG, and Chrome swallows the next tap to stop the "scroll").
    const onTouchMove = (e) => full && e.preventDefault();
    svgEl.addEventListener('wheel', onWheel, { passive: false });
    svgEl.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      svgEl.removeEventListener('wheel', onWheel);
      svgEl.removeEventListener('touchmove', onTouchMove);
    };
  });
</script>

<!-- Escape closes the full-screen chart first (captured so the drawer doesn't close too). -->
<svelte:window onkeydowncapture={(e) => {
  if (full && e.key === 'Escape') {
    e.stopPropagation();
    closeFull();
  }
}} />

<figure>
  <div class="box" class:full use:portal={full} role={full ? 'dialog' : undefined} aria-modal={full || undefined}
       aria-label={full ? `${title || 'Chart'}, enlarged` : undefined}>
  {#if full}
    <div class="fullbar">
      <b>{title}</b>
      <div class="zoom">
        <button onclick={() => zoomAt((vlo + vhi) / 2, 1 / 1.6)} disabled={!view} aria-label="Zoom out on years">−</button>
        <button onclick={() => zoomAt((vlo + vhi) / 2, 1.6)} disabled={vhi - vlo <= MIN_SPAN} aria-label="Zoom in on years">+</button>
        {#if view}<button class="reset" onclick={() => (view = null)}>Reset</button>{/if}
        <button onclick={closeFull} aria-label="Close enlarged chart">✕</button>
      </div>
    </div>
    <p class="howto">Pinch or use + / − to zoom in on years; drag to move through time.</p>
  {/if}
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
    {#if !full}<button class="expand" onclick={() => (full = true)} aria-label="Enlarge chart">⤢</button>{/if}
  </div>
  <div class="wrap" bind:this={wrapEl}>
    <svg viewBox="0 0 {W} {H}" role="img" aria-label="Mercury over time, by sample" bind:this={svgEl}
         onpointerdown={onDown} onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp} onpointerleave={onUp}
         onclickcapture={onClickCapture} onclick={onChartClick}>
      <defs><clipPath id={clipId}><rect x={L - 6} y="0" width={W - L - R + 12} height={H - B + 6} /></clipPath></defs>
      {#each ticks(yMax) as t (t)}
        <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} class="grid" />
        <text x={L - 4} y={sy(t) + 3} text-anchor="end" class="tick">{t}</text>
      {/each}
      {#each yearTicks as y (y)}
        {@const anchor = full ? 'middle' : x0 === x1 ? 'middle' : y === x0 ? 'start' : 'end'}
        <text x={full ? sx(y) : y === x0 ? sx(lo + 0.5) : sx(hi - 0.5)} y={H - 6} text-anchor={anchor} class="tick">{y}</text>
      {/each}

      <g clip-path="url(#{clipId})">
      {#if markX !== null}
        <rect x={L} y={T} width={Math.max(0, markX - L)} height={H - T - B} class="before" />
        <line x1={markX} x2={markX} y1={T - 4} y2={H - B} class="period" />
        <text x={markX > W * 0.7 ? markX - 3 : markX + 3} y={T + 6} text-anchor={markX > W * 0.7 ? 'end' : 'start'} class="period-t">Last {period} yrs →</text>
      {/if}
      <line x1={L} x2={W - R} y1={sy(EPA_GUIDELINE_PPM)} y2={sy(EPA_GUIDELINE_PPM)} class="epa" />
      {#if stateAvg !== null}
        <line x1={L} x2={W - R} y1={sy(stateAvg)} y2={sy(stateAvg)} class="state" />
      {/if}

      {#if selPos}
        <line x1={selPos.x} x2={selPos.x} y1={T - 6} y2={selPos.y} class="pointer" />
        <circle cx={selPos.x} cy={selPos.y} r="8" class="ring" />
      {/if}

      {#if showAvg}
        <polyline points={pts.map((p) => `${sx(p.year)},${sy(p.mean)}`).join(' ')} class="line" />
        {#each bars as p (p.year)}
          <rect x={sx(p.year) - barW / 2} y={sy(p.mean) - 2} width={barW} height="4" rx="2" class="pt" />
          <rect x={sx(p.year) - barW / 2} y={sy(p.mean) - 8} width={barW} height="16" class="hit"
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
                onclick={() => pickSample(s)}
                onkeydown={(e) => e.key === 'Enter' && pickSample(s)} />
      {/each}
      </g>
    </svg>
  </div>
  <div class="key">
    <span><i class="k-epa"></i>EPA guideline (0.3 ppm)<small class="note">· a general guideline, not a safety limit</small></span>
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
      Dots are individual samples, colored by fish size. Bars and the line show the yearly average. Tap any point for details.
    {/if}
  </figcaption>
  </div>
</figure>

<style>
  figure { margin: 0; }
  .box.full {
    position: fixed; inset: 0; z-index: 5000; display: flex; flex-direction: column;
    background: var(--surface); color: var(--text);
    padding: calc(10px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right))
      calc(10px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left));
  }
  .fullbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .fullbar b { font-size: 15px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .zoom { display: flex; gap: 6px; flex-shrink: 0; }
  .zoom button, .expand {
    min-width: 36px; min-height: 36px; border-radius: 18px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text); font-size: 18px; cursor: pointer;
  }
  .zoom button:disabled { opacity: 0.35; cursor: default; }
  .zoom .reset { font-size: 13px; padding: 0 12px; }
  .expand { margin-left: auto; min-width: 32px; min-height: 32px; font-size: 16px; }
  .howto { margin: 4px 0 0; font-size: 12px; color: var(--muted); }
  .full .wrap { flex: 1; min-height: 0; }
  .full svg { height: 100%; touch-action: none; }
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
  .note { font-size: 10px; font-style: italic; opacity: 0.85; }
  .k-state { border-top: 2px dotted var(--muted); }
  .key .k-dot { width: 8px; height: 8px; border-radius: 50%; background: #9e9e9e; }
  .state { stroke: var(--muted); stroke-dasharray: 2 2; }
  .sample { opacity: 0.75; stroke: var(--surface); stroke-width: 0.8; cursor: pointer; }
  .line { fill: none; stroke: var(--text); stroke-width: 1.25; opacity: 0.45; }
  .pt { fill: var(--text); stroke: var(--surface); stroke-width: 1; pointer-events: none; }
  .hit { fill: transparent; cursor: pointer; }
  .pointer { stroke: var(--text); stroke-width: 1; stroke-dasharray: 2 2; }
  .ring { fill: none; stroke: var(--text); stroke-width: 1.5; }
  figcaption { font-size: 12px; color: var(--muted); min-height: 2.6em; margin-top: 2px; }
  figcaption b { color: var(--text); font-weight: 600; }
  .cls { display: inline-block; margin-left: 6px; padding: 0 6px; border-radius: 8px; color: #fff; background: var(--c); font-size: 11px; }
</style>
