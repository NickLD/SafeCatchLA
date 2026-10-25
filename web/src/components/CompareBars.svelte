<script>
  import { ALL_SPECIES, BASINS, EPA_GUIDELINE_PPM, NATIONAL_MIN_N } from '../lib/config.js';
  import { displaySpecies, formatPpm } from '../lib/format.js';
  import { app, update } from '../lib/state.svelte.js';
  import { groupMean, periodMean, speciesYears } from '../lib/stats.js';
  import OneSample from './OneSample.svelte';

  let { site, national, period, latestYear, options, selected } = $props();

  let species = $derived(app.compare && (app.compare === ALL_SPECIES || options.includes(app.compare)) ? app.compare : selected);

  let rows = $derived.by(() => {
    const own = periodMean(speciesYears(site, species), period, latestYear);
    const out = [{ label: 'This site', value: own?.mean ?? null, note: own ? `${own.n} ${own.n === 1 ? 'sample' : 'samples'}` : 'no samples in period', own: true, one: own?.n === 1 }];
    if (site.basin) {
      const b = groupMean(app.sites, species, period, latestYear, (s) => s.basin === site.basin);
      out.push({ label: `${BASINS[site.basin]} basin`, value: b?.mean ?? null, note: b ? `${b.nSites} sites` : 'no data' });
    }
    const st = groupMean(app.sites, species, period, latestYear);
    out.push({ label: 'Louisiana', value: st?.mean ?? null, note: st ? `${st.nSites} sites` : 'no data' });
    const nat = species === ALL_SPECIES ? national?.all : national?.species?.[species];
    out.push({
      label: 'U.S. lakes (EPA 2022)',
      value: nat && nat.n >= NATIONAL_MIN_N ? nat.mean : null,
      note: nat && nat.n >= NATIONAL_MIN_N ? `${nat.n} samples` : 'no national data',
    });
    return out;
  });
  let max = $derived(Math.max(EPA_GUIDELINE_PPM * 1.2, ...rows.map((r) => r.value ?? 0)) * 1.1);
</script>

<section aria-label="Compare">
  <div class="head">
    <h3>Compare</h3>
    <select aria-label="Compare species" value={species} onchange={(e) => update({ compare: e.currentTarget.value })}>
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
          {#if r.one}<OneSample />{/if}
        </span>
      </div>
    {/each}
  </div>
  <p class="foot">Dashed line: EPA guideline (0.3 ppm). U.S. figure is a simple average of EPA's 2022 lake samples.</p>
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
