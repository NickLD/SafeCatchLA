<script>
  import { BASINS } from '../lib/config.js';
  import { loadSiteDetail } from '../lib/data.js';
  import { displaySpecies } from '../lib/format.js';
  import { app, defaultSpecies, update } from '../lib/state.svelte.js';
  import { groupMean } from '../lib/stats.js';
  import AllSpeciesList from './AllSpeciesList.svelte';
  import CompareBars from './CompareBars.svelte';
  import Disclaimer from './Disclaimer.svelte';
  import HeadlineStats from './HeadlineStats.svelte';
  import SpeciesChips from './SpeciesChips.svelte';
  import TrendChart from './TrendChart.svelte';

  let { site, national, latestYear, period } = $props();

  let sheetState = $state('peek'); // 'peek' | 'expanded' (mobile only; desktop always shows everything)
  let detail = $state(null);
  let toast = $state('');
  let dragStart = null;

  let species = $derived(site.species[app.species] ? app.species : defaultSpecies(site));
  let entry = $derived(site.species[species]);
  let stateAvg = $derived(groupMean(app.sites, species, period, latestYear)?.mean ?? null);
  let samples = $derived((detail?.id === site.id && detail.species[species]) || []);

  $effect(() => {
    const id = site.id;
    loadSiteDetail(id).then((d) => { if (d.id === site.id) detail = d; }).catch(() => {});
  });

  function close() {
    update({ site: null, species: null, compare: null });
  }

  function onPointerDown(e) {
    dragStart = e.clientY;
  }

  function onPointerUp(e) {
    if (dragStart === null) return;
    const dy = e.clientY - dragStart;
    dragStart = null;
    if (dy < -40) sheetState = 'expanded';
    else if (dy > 40) {
      if (sheetState === 'expanded') sheetState = 'peek';
      else close();
    }
  }

  function toggle() {
    sheetState = sheetState === 'peek' ? 'expanded' : 'peek';
  }

  async function share() {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: `SafeCatchLA: ${site.name}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast = 'Link copied';
        setTimeout(() => (toast = ''), 2000);
      }
    } catch {
      // user cancelled the share sheet
    }
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<aside class="sheet {sheetState}" aria-label="Site details">
  <button class="handle" aria-label={sheetState === 'peek' ? 'Expand details' : 'Collapse details'}
          onclick={toggle} onpointerdown={onPointerDown} onpointerup={onPointerUp}>
    <span></span>
  </button>
  <div class="body">
    <header>
      <div>
        <h2>{site.name}</h2>
        <p class="meta">
          {#if site.address}{site.address}<br />{/if}
          {[site.basin && `${BASINS[site.basin]} basin`, `${site.n} samples`, `last ${site.last.slice(0, 4)}`].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div class="actions">
        <button onclick={share} aria-label="Share this site">↗</button>
        <button onclick={close} aria-label="Close">✕</button>
      </div>
    </header>
    {#if toast}<p class="toast">{toast}</p>{/if}

    <SpeciesChips {site} selected={species} onSelect={(name) => update({ species: name })} />
    <HeadlineStats {entry} {period} {latestYear} />
    <Disclaimer />

    <h3>{displaySpecies(species)} over time</h3>
    <TrendChart years={entry.years} {samples} {stateAvg} />

    <CompareBars {site} {national} {period} {latestYear} />
    <AllSpeciesList {site} {period} {latestYear} />
  </div>
</aside>

<style>
  .sheet {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 1200;
    background: var(--surface); color: var(--text);
    border-radius: 16px 16px 0 0; box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.25);
    display: flex; flex-direction: column; transition: height 0.2s ease;
  }
  .sheet.peek { height: 45dvh; }
  .sheet.expanded { height: 92dvh; }
  .handle {
    border: 0; background: none; width: 100%; padding: 8px 0 4px; cursor: grab; touch-action: none; flex-shrink: 0;
  }
  .handle span { display: block; width: 40px; height: 5px; border-radius: 3px; background: var(--border); margin: 0 auto; }
  .body { overflow-y: auto; padding: 0 14px calc(16px + env(safe-area-inset-bottom)); flex: 1; overscroll-behavior: contain; }
  header { display: flex; justify-content: space-between; gap: 8px; }
  h2 { margin: 0; font-size: 17px; }
  h3 { margin: 12px 0 4px; font-size: 15px; }
  .meta { margin: 2px 0 0; color: var(--muted); font-size: 12px; }
  .actions { display: flex; gap: 4px; flex-shrink: 0; }
  .actions button {
    width: 40px; height: 40px; border-radius: 20px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text); cursor: pointer; font-size: 16px;
  }
  .toast { margin: 4px 0; font-size: 12px; color: var(--accent); }

  @media (min-width: 768px) {
    .sheet, .sheet.peek, .sheet.expanded {
      left: auto; top: 0; width: 400px; height: 100dvh; border-radius: 0; box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
    }
    .handle { display: none; }
    .body { padding-top: 14px; }
  }
</style>
