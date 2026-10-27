<script>
  import { onMount } from 'svelte';
  import Legend from './components/Legend.svelte';
  import MapView from './components/MapView.svelte';
  import SiteSheet from './components/SiteSheet.svelte';
  import TopBar from './components/TopBar.svelte';
  import { loadMeta, loadNational, loadSites, loadStatus } from './lib/data.js';
  import { sanitizeState } from './lib/urlState.js';
  import { app, defaultSpecies, initFromHash, selectedSite, update } from './lib/state.svelte.js';

  let mapView;
  let status = $state('loading');
  let toast = $state('');
  let current = $derived(status === 'ready' ? selectedSite() : null);

  function select(site) {
    const keep = app.site === site.id && app.species;
    update({ site: site.id, species: keep ? app.species : defaultSpecies(site, app.filter) });
  }

  function pick(site) {
    select(site);
    mapView.focusSite(site);
  }

  function closeSheet() {
    if (app.site) update({ site: null, species: null, compare: null });
  }

  async function locate() {
    try {
      await mapView.locate();
    } catch {
      toast = 'Location unavailable';
      setTimeout(() => (toast = ''), 3000);
    }
  }

  onMount(async () => {
    initFromHash();
    try {
      const [sites, meta, national, pullStatus] = await Promise.all([loadSites(), loadMeta(), loadNational(), loadStatus()]);
      Object.assign(app, { sites: sites.sites, latestYear: sites.latestYear, sizeClasses: sites.sizeClasses ?? {}, meta, status: pullStatus, national });
      status = 'ready';
      const fixes = sanitizeState(app, app.sites);
      if (Object.keys(fixes).length) update(fixes);
      const site = selectedSite();
      if (site) mapView.focusSite(site, 10);
    } catch {
      status = 'error';
    }
  });
</script>

<main>
  <MapView bind:this={mapView} onSelect={select} onMapTap={closeSheet} />
  <TopBar onPick={pick} onLocate={locate} />
  <Legend />
  {#if current}
    {#key current.id}
      <SiteSheet site={current} national={app.national} latestYear={app.latestYear} period={app.period} />
    {/key}
  {/if}
  {#if status === 'loading'}
    <div class="notice">Loading mercury data…</div>
  {:else if status === 'error'}
    <div class="notice">Couldn't load the data. Check your connection and reload.</div>
  {/if}
  {#if toast}<div class="notice">{toast}</div>{/if}
</main>

<style>
  main { position: fixed; inset: 0; height: 100dvh; overflow: hidden; }
  .notice {
    position: absolute; left: 50%; top: 120px; transform: translateX(-50%); z-index: 1100;
    background: var(--surface); color: var(--text); padding: 10px 16px; border-radius: 20px; box-shadow: var(--shadow);
  }
</style>
