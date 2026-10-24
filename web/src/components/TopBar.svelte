<script>
  import { ALL_SPECIES, PERIOD_LABELS, PERIODS } from '../lib/config.js';
  import { MODE_SHORT, MODES } from '../lib/coloring.js';
  import { displaySpecies } from '../lib/format.js';
  import { searchSites } from '../lib/search.js';
  import { app, speciesBySampleCount, update } from '../lib/state.svelte.js';

  let { onPick, onLocate } = $props();
  let query = $state('');
  let results = $derived(searchSites(app.sites, query));
  let speciesOptions = $derived(speciesBySampleCount(app.sites));

  function pick(site) {
    query = '';
    onPick(site);
  }
</script>

<div class="topbar">
  <div class="row">
    <div class="search">
      <input type="search" bind:value={query} placeholder="Search a lake, river, or town" aria-label="Search sites" />
      {#if results.length}
        <ul role="listbox" aria-label="Matching sites">
          {#each results as site (site.id)}
            <li role="option" aria-selected="false" tabindex="0" onclick={() => pick(site)}
                onkeydown={(e) => e.key === 'Enter' && pick(site)}>
              <b>{site.name}</b>
              {#if site.address}<small>{site.address}</small>{/if}
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    <button class="locate" onclick={onLocate} aria-label="Show sites near me" title="Near me">📍</button>
  </div>
  <div class="row pills">
    <select aria-label="Species" value={app.filter} onchange={(e) => update({ filter: e.currentTarget.value })}>
      <option value={ALL_SPECIES}>All species</option>
      {#each speciesOptions as name (name)}
        <option value={name}>{displaySpecies(name)}</option>
      {/each}
    </select>
    <select aria-label="Color by" value={app.color} onchange={(e) => update({ color: e.currentTarget.value, range: null })}>
      {#each MODES as m (m)}<option value={m}>{MODE_SHORT[m]}</option>{/each}
    </select>
    <select aria-label="Period" value={String(app.period)}
            onchange={(e) => { const v = e.currentTarget.value; update({ period: v === 'all' ? 'all' : Number(v) }); }}>
      {#each PERIODS as p (p)}<option value={String(p)}>{PERIOD_LABELS[p]}</option>{/each}
    </select>
  </div>
</div>

<style>
  .topbar {
    position: absolute; top: 0; left: 0; right: 0; z-index: 1000;
    padding: 8px 8px 0; display: flex; flex-direction: column; gap: 6px; pointer-events: none;
  }
  .row { display: flex; gap: 6px; pointer-events: auto; }
  @media (min-width: 768px) { .topbar { right: auto; width: min(560px, calc(100vw - 416px)); } }
  .pills { overflow-x: auto; scrollbar-width: none; }
  .search { position: relative; flex: 1; }
  input, select, .locate {
    min-height: 44px; border-radius: 22px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text); font: inherit; box-shadow: var(--shadow);
  }
  input { width: 100%; padding: 0 16px; }
  select { padding: 0 8px; flex: 1 1 0; min-width: 0; font-size: 14px; }
  .locate { width: 44px; flex-shrink: 0; cursor: pointer; }
  ul {
    position: absolute; top: 48px; left: 0; right: 0; margin: 0; padding: 4px 0; list-style: none;
    background: var(--surface); border-radius: 12px; box-shadow: var(--shadow); max-height: 50dvh; overflow: auto;
  }
  li { padding: 10px 14px; cursor: pointer; display: flex; flex-direction: column; min-height: 44px; justify-content: center; }
  li:hover, li:focus { background: var(--hover); outline: none; }
  small { color: var(--muted); }
</style>
