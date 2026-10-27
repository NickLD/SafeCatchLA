<script>
  import { ALL_SPECIES, BASINS, EPA_GUIDELINE_PPM, FILTER_SPECIES, NATIONAL_MIN_N } from '../lib/config.js';
  import { displaySpecies, formatPpm } from '../lib/format.js';
  import { app, update } from '../lib/state.svelte.js';
  import { groupMean, periodMean, speciesYears } from '../lib/stats.js';
  import OneFish from './OneFish.svelte';

  let { site, national, period, latestYear, options, selected } = $props();

  // With several species chosen on the map, they can be compared pooled, the way the map colors them.
  let combined = $derived(app.filter.length > 1);
  let choice = $derived(
    app.compare && (app.compare === ALL_SPECIES || (app.compare === FILTER_SPECIES && combined) || options.includes(app.compare)) ? app.compare : selected,
  );

  let rows = $derived.by(() => {
    const species = choice === FILTER_SPECIES ? app.filter : choice;
    const own = periodMean(speciesYears(site, species), period, latestYear);
    const out = [{ label: 'This site', value: own?.mean ?? null, note: own ? `${own.n} ${own.n === 1 ? 'sample' : 'samples'}` : 'no samples in period', own: true, one: own?.fish === 1 }];
    if (site.basin) {
      const b = groupMean(app.sites, species, period, latestYear, (s) => s.basin === site.basin);
      out.push({ label: `${BASINS[site.basin]} basin`, value: b?.mean ?? null, note: b ? `${b.nSites} sites` : 'no data' });
    }
    const st = groupMean(app.sites, species, period, latestYear);
    out.push({ label: 'Louisiana', value: st?.mean ?? null, note: st ? `${st.nSites} sites` : 'no data' });
    // EPA only sampled a handful of species nationally; leave the row out when it has nothing for this one
    // (or for a pooled selection, which EPA's per-species figures can't stand in for).
    const nat = species === ALL_SPECIES ? national?.all : Array.isArray(species) ? null : national?.species?.[species];
    if (nat && nat.n >= NATIONAL_MIN_N) out.push({ label: 'U.S. lakes (EPA 2022)', value: nat.mean, note: `${nat.n} samples` });
    return out;
  });
  let max = $derived(Math.max(EPA_GUIDELINE_PPM * 1.2, ...rows.map((r) => r.value ?? 0)) * 1.1);
</script>

<section aria-label="Compare">
  <div class="head">
    <h3>Compare</h3>
    <select aria-label="Compare species" value={choice} onchange={(e) => update({ compare: e.currentTarget.value })}>
      {#if combined}<option value={FILTER_SPECIES}>{displaySpecies(FILTER_SPECIES)}</option>{/if}
      {#each options as name (name)}<option value={name}>{displaySpecies(name)}</option>{/each}
      <option value={ALL_SPECIES}>{displaySpecies(ALL_SPECIES)}</option>
    </select>
  </div>
  <div class="rows">
    {#each rows as r (r.label)}
      <div class="row">
        <span class="label">{r.label}</span>
        <span class="track">
          {#if r.value !== null}
            <span class="bar" class:own={r.own} style:width="{(r.value / max) * 100}%"></span>
          {/if}
          <span class="guide" style:left="{(EPA_GUIDELINE_PPM / max) * 100}%"></span>
        </span>
        <span class="val">
          {#if r.value !== null}<b>{formatPpm(r.value)}</b>{/if}
          <small>{r.note}</small>
          {#if r.one}<OneFish />{/if}
        </span>
      </div>
    {/each}
  </div>
  <p class="foot">
    Dashed line: EPA guideline (0.3 ppm).{#if rows.some((r) => r.label.startsWith('U.S.'))} U.S. figure is a simple average of EPA's 2022 lake samples.{/if}
  </p>
</section>

<style>
  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  h3 { margin: 0; font-size: 15px; }
  select { min-height: 36px; border-radius: 18px; border: 1px solid var(--border); background: var(--surface); color: var(--text); padding: 0 8px; max-width: 60%; }
  .rows { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .row { display: grid; grid-template-columns: 7.5em 1fr 6.5em; align-items: center; gap: 6px; font-size: 13px; }
  .track { position: relative; height: 14px; background: var(--hover); border-radius: 3px; }
  .bar { position: absolute; left: 0; top: 0; bottom: 0; background: #90a4ae; border-radius: 3px; }
  .bar.own { background: var(--accent); }
  .guide { position: absolute; top: -3px; bottom: -3px; border-left: 2px dashed #d7191c; }
  .val { display: flex; flex-direction: column; line-height: 1.15; }
  small { color: var(--muted); font-size: 11px; }
  .foot { font-size: 11px; color: var(--muted); margin: 6px 0 0; }
</style>
