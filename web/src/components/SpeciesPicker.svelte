<script>
  // Multi-select species filter for the map, grouped (Bass, Catfish, ...). An empty selection means all species.
  import { displaySpecies } from '../lib/format.js';
  import { filterLabel, groupSpecies } from '../lib/speciesGroups.js';
  import { app, speciesBySampleCount, update } from '../lib/state.svelte.js';

  let open = $state(false);
  let root;
  let panel = $state();

  // The pill row has a fade mask, which would also hide anything drawn outside it, so the panel
  // is moved to <body>.
  function portal(node) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  // Species with samples in the period (plus anything already selected, so a choice never silently vanishes).
  let available = $derived.by(() => {
    const names = speciesBySampleCount(app.sites, app.period, app.latestYear);
    return [...app.filter.filter((s) => !names.includes(s)), ...names];
  });
  let groups = $derived(groupSpecies(available));
  let selected = $derived(new Set(app.filter));
  let label = $derived(filterLabel(app.filter, available));

  function setSelection(names) {
    // Keep the dataset's most-sampled-first order so the URL and labels are stable.
    update({ filter: available.filter((s) => names.has(s)) });
  }

  function toggleSpecies(name) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelection(next);
  }

  function groupState(g) {
    const n = g.species.filter((s) => selected.has(s)).length;
    return n === 0 ? 'false' : n === g.species.length ? 'true' : 'mixed';
  }

  function toggleGroup(g) {
    const next = new Set(selected);
    if (groupState(g) === 'true') g.species.forEach((s) => next.delete(s));
    else g.species.forEach((s) => next.add(s));
    setSelection(next);
  }

  function onWindowPointer(e) {
    if (open && root && !root.contains(e.target) && !panel?.contains(e.target)) open = false;
  }
</script>

<svelte:window onpointerdown={onWindowPointer} onkeydown={(e) => open && e.key === 'Escape' && (open = false)} />

<div class="picker" bind:this={root}>
  <button class="pill" aria-haspopup="dialog" aria-expanded={open} aria-label="Species: {label}" onclick={() => (open = !open)}>
    {label} <span aria-hidden="true">▾</span>
  </button>
  {#if open}
    <div class="panel" role="dialog" aria-label="Choose species" use:portal bind:this={panel}>
      <label class="row all">
        <input type="checkbox" role="checkbox" aria-label="All species" aria-checked={app.filter.length === 0}
               checked={app.filter.length === 0} onchange={() => update({ filter: [] })} />
        All species
      </label>
      {#each groups as g (g.id)}
        {@const st = groupState(g)}
        <div class="group">
          <label class="row head">
            <input type="checkbox" aria-label={g.label} aria-checked={st} checked={st === 'true'} indeterminate={st === 'mixed'}
                   onchange={() => toggleGroup(g)} />
            <b>{g.label}</b>
          </label>
          {#each g.species as name (name)}
            <label class="row member">
              <input type="checkbox" aria-label={displaySpecies(name)} aria-checked={selected.has(name)}
                     checked={selected.has(name)} onchange={() => toggleSpecies(name)} />
              {displaySpecies(name)}
            </label>
          {/each}
        </div>
      {/each}
      <button class="done" onclick={() => (open = false)}>Done</button>
    </div>
  {/if}
</div>

<style>
  .picker { position: relative; flex: 0 0 auto; }
  .pill {
    min-height: 44px; border-radius: 22px; border: 1px solid var(--border); padding: 0 12px;
    background: var(--surface); color: var(--text); font: inherit; font-size: 14px; box-shadow: var(--shadow);
    cursor: pointer; max-width: 46vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .panel {
    position: fixed; z-index: 1400; top: 112px; left: 8px; width: min(340px, calc(100vw - 16px));
    max-height: calc(100dvh - 130px); overflow-y: auto; overscroll-behavior: contain;
    background: var(--surface); color: var(--text); border-radius: 12px; box-shadow: var(--shadow); padding: 6px 0;
  }
  .row { display: flex; align-items: center; gap: 10px; min-height: 40px; padding: 0 14px; cursor: pointer; font-size: 14px; }
  .row:hover { background: var(--hover); }
  .member { padding-left: 38px; color: var(--text); }
  .all { border-bottom: 1px solid var(--border); font-weight: 600; }
  .group { border-bottom: 1px solid var(--border); padding: 2px 0; }
  input { width: 18px; height: 18px; accent-color: var(--accent); margin: 0; }
  .done {
    position: sticky; bottom: 0; display: block; width: calc(100% - 16px); margin: 6px 8px 2px; min-height: 40px;
    border: 0; border-radius: 20px; background: var(--accent); color: #fff; font-weight: 600; cursor: pointer;
  }
</style>
