<script>
  import { CONTAMINANTS, PERIOD_LABELS, PERIODS } from '../lib/config.js';
  import { MODE_SHORT, MODES } from '../lib/coloring.js';
  import { searchSites } from '../lib/search.js';
  import { app, update } from '../lib/state.svelte.js';
  import InstallButton from './InstallButton.svelte';
  import SpeciesPicker from './SpeciesPicker.svelte';

  let { onPick, onLocate } = $props();
  let query = $state('');
  let results = $derived(searchSites(app.sites, query));

  // Fade the right edge only while pills are actually hidden past it.
  let pillsEl = $state();
  let fade = $state(false);
  function updateFade() {
    if (pillsEl) fade = pillsEl.scrollLeft + pillsEl.clientWidth < pillsEl.scrollWidth - 1;
  }
  $effect(() => {
    if (!pillsEl) return;
    updateFade();
    if (typeof ResizeObserver === 'undefined') {
      addEventListener('resize', updateFade);
      return () => removeEventListener('resize', updateFade);
    }
    const ro = new ResizeObserver(updateFade);
    ro.observe(pillsEl);
    return () => ro.disconnect();
  });

  function pick(site) {
    query = '';
    onPick(site);
  }
</script>

<div class="topbar" class:with-sheet={!!app.site}>
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
    <InstallButton />
  </div>
  <div class="row pills" class:fade bind:this={pillsEl} onscroll={updateFade}>
    <select aria-label="Contaminant" disabled={CONTAMINANTS.length === 1}>
      {#each CONTAMINANTS as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
    </select>
    <SpeciesPicker />
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
  @media (min-width: 768px) {
    /* Search stays a comfortable width; the pill row runs up to the drawer (or the window edge). */
    .topbar.with-sheet { right: calc(min(560px, 50vw) + 8px); }
    .row:not(.pills) { max-width: 560px; }
  }
  .pills {
    overflow-x: auto; scrollbar-width: none;
  }
  .pills.fade { mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); /* hints that the row scrolls */ }
  .search { position: relative; flex: 1; }
  input, select, .locate {
    min-height: 44px; border-radius: 22px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text); font: inherit; box-shadow: var(--shadow);
  }
  input { width: 100%; padding: 0 16px; }
  /* Pills keep their full text; the row scrolls sideways on narrow phones. */
  select { padding: 0 10px; flex: 0 0 auto; font-size: 14px; }
  select:disabled { opacity: 1; color: var(--text); }
  .locate { width: 44px; flex-shrink: 0; cursor: pointer; }
  ul {
    position: absolute; top: 48px; left: 0; right: 0; margin: 0; padding: 4px 0; list-style: none;
    background: var(--surface); border-radius: 12px; box-shadow: var(--shadow); max-height: 50dvh; overflow: auto;
  }
  li { padding: 10px 14px; cursor: pointer; display: flex; flex-direction: column; min-height: 44px; justify-content: center; }
  li:hover, li:focus { background: var(--hover); outline: none; }
  small { color: var(--muted); }
</style>
