<script>
  import { ALL_SPECIES, BASINS } from '../lib/config.js';
  import { loadSiteDetail } from '../lib/data.js';
  import { addLatest, lakeForSite, mergeDetails } from '../lib/lakes.js';
  import { displaySpecies } from '../lib/format.js';
  import { app, defaultSpecies, update } from '../lib/state.svelte.js';
  import { groupMean, mixedYears, speciesWithData } from '../lib/stats.js';
  import AllSpeciesList from './AllSpeciesList.svelte';
  import CompareBars from './CompareBars.svelte';
  import DataSource from './DataSource.svelte';
  import Disclaimer from './Disclaimer.svelte';
  import HeadlineStats from './HeadlineStats.svelte';
  import SpeciesChips from './SpeciesChips.svelte';
  import TrendChart from './TrendChart.svelte';

  let { site, national, latestYear, period } = $props();

  let sheetState = $state('peek'); // 'peek' | 'expanded' (mobile only; desktop always shows everything)
  let detail = $state(null);
  let toast = $state('');
  let dragStart = null;
  let dragged = false; // a drag ends with a click event too; don't let that click undo the drag

  // "Swipe up" hint shows until this browser has expanded a drawer once.
  const HINT_KEY = 'safecatch.expandedOnce';
  let hintSeen = $state(readHintSeen());
  function readHintSeen() {
    try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; }
  }
  function setState(next) {
    sheetState = next;
    if (next === 'expanded' && !hintSeen) {
      hintSeen = true;
      try { localStorage.setItem(HINT_KEY, '1'); } catch { /* private mode: hint just shows again next time */ }
    }
  }

  // Species with samples in the period; if none, all of them so the history can still be explored.
  // A species filter on the map narrows the chips to the chosen species found here (all of them if none are).
  let shown = $derived.by(() => {
    const inFilter = (names) => (app.filter.length ? names.filter((n) => app.filter.includes(n)) : names);
    for (const names of [speciesWithData(site, period, latestYear), speciesWithData(site, 'all', latestYear)]) {
      if (inFilter(names).length) return inFilter(names);
    }
    const names = speciesWithData(site, period, latestYear);
    return names.length ? names : speciesWithData(site, 'all', latestYear);
  });
  // "All species" is a choice alongside the species, never the default: a mixed average depends on what was caught.
  let hasSeveral = $derived(Object.keys(site.species).length > 1);
  let mixed = $derived(hasSeveral && app.species === ALL_SPECIES);
  let species = $derived(mixed ? ALL_SPECIES : shown.includes(app.species) ? app.species : (shown[0] ?? defaultSpecies(site, app.filter)));
  let entry = $derived(mixed ? { years: mixedYears(site), latest: Object.values(site.species).reduce((a, sp) => addLatest(a, sp.latest), null) } : site.species[species]);
  let stateAvg = $derived(groupMean(app.sites, species, period, latestYear)?.mean ?? null);
  // Size classes are per species, so a mixed chart shows only the yearly averages.
  let samples = $derived((!mixed && detail?.id === site.id && detail.species[species]) || []);

  $effect(() => {
    const id = site.id;
    const load = site.members
      ? Promise.all(site.members.map((m) => loadSiteDetail(m.id))).then((all) => mergeDetails(id, all))
      : loadSiteDetail(id);
    load.then((d) => { if (d.id === site.id) detail = d; }).catch(() => {});
  });

  function close() {
    update({ site: null, lake: null, species: null, compare: null });
  }

  let lake = $derived(site.members ? null : lakeForSite(site.id));
  const memberEntry = (m) => (mixed ? { n: m.n, years: mixedYears(m) } : m.species[species]);
  const years = (sp) => {
    const all = Object.keys(sp.years).sort();
    return all[0] === all.at(-1) ? all[0] : `${all[0]}–${all.at(-1)}`;
  };

  function onPointerDown(e) {
    if (e.target.closest('.actions')) return; // share/close buttons aren't drag starts
    dragStart = e.clientY;
    dragged = false;
  }

  function onPointerUp(e) {
    if (dragStart === null) return;
    const dy = e.clientY - dragStart;
    dragStart = null;
    if (Math.abs(dy) > 40) dragged = true;
    if (dy < -40) setState('expanded');
    else if (dy > 40) {
      if (sheetState === 'expanded') setState('peek');
      else close();
    }
  }

  function toggle() {
    if (dragged) {
      dragged = false;
      return;
    }
    setState(sheetState === 'peek' ? 'expanded' : 'peek');
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
  <!-- The handle and the site header are both drag areas on phones. -->
  <div class="grab" onpointerdown={onPointerDown} onpointerup={onPointerUp} role="presentation">
    <button class="handle" aria-label={sheetState === 'peek' ? 'Expand details' : 'Collapse details'} onclick={toggle}>
      <span></span>
    </button>
    <header>
      <div>
        <h2>{site.name}</h2>
        <p class="meta">
          {#if site.address}{site.address}<br />{/if}
          {[site.basin && `${BASINS[site.basin]} basin`, `${site.n} ${site.n === 1 ? 'sample' : 'samples'}`, `last ${site.last.slice(0, 4)}`].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div class="actions">
        <button onclick={share} aria-label={site.members ? 'Share this lake' : 'Share this site'}>↗</button>
        <button onclick={close} aria-label="Close">✕</button>
      </div>
    </header>
  </div>
  <div class="body">
    {#if toast}<p class="toast">{toast}</p>{/if}

    {#if lake}
      <button class="lake" onclick={() => update({ lake: lake.id, site: null })}>View all of {lake.name} ({lake.sites.length} sites)</button>
    {/if}
    {#if site.members}
      <p class="pooled">Combined from {site.members.length} sampling sites. They weren't always sampled in the same years, so changes over time can partly reflect which spot was sampled.</p>
    {/if}

    <SpeciesChips names={shown} selected={species} showAll={hasSeveral} onSelect={(name) => update({ species: name })} />
    <HeadlineStats {entry} {period} {latestYear} />
    <Disclaimer />

    <h3>{displaySpecies(species)} over time</h3>
    <TrendChart years={entry.years} {samples} {stateAvg} cuts={app.sizeClasses[species]} {period} {latestYear}
                title="{displaySpecies(species)} · {site.name}" />

    <CompareBars {site} {national} {period} {latestYear} options={shown} selected={species} />
    <AllSpeciesList {site} {period} {latestYear} />
    {#if site.members}
      <h3>Sites included</h3>
      <ul class="members" aria-label="Sites included">
        {#each site.members as m (m.id)}
          <li>
            <button onclick={() => update({ site: m.id, lake: null })}>{m.name}</button>
            <small>
              {#if memberEntry(m)}{memberEntry(m).n} {mixed ? '' : `${displaySpecies(species)} `}{memberEntry(m).n === 1 ? 'sample' : 'samples'}, {years(memberEntry(m))}{:else}No {displaySpecies(species)} samples{/if}
            </small>
          </li>
        {/each}
      </ul>
    {/if}
    <DataSource siteId={site.members ? null : site.id} updated={app.meta?.updated} checked={app.status?.checkedAt} meta={app.meta} />
  </div>
  {#if sheetState === 'peek' && !hintSeen}
    <button class="hint" onclick={() => setState('expanded')}>
      <span class="chevron" aria-hidden="true">︿</span> Swipe up for full history
    </button>
  {/if}
</aside>

<style>
  .sheet {
    position: absolute; left: 0; right: 0; bottom: 0; z-index: 1200;
    background: var(--surface); color: var(--text);
    border-radius: 16px 16px 0 0; box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.25);
    display: flex; flex-direction: column; transition: height 0.2s ease;
  }
  .sheet.peek { height: 55dvh; }
  .sheet.expanded { height: 92dvh; }
  .grab { flex-shrink: 0; touch-action: none; cursor: grab; padding: 0 14px 6px; }
  .handle { border: 0; background: none; width: 100%; min-height: 28px; padding: 10px 0; cursor: grab; }
  .handle span { display: block; width: 48px; height: 6px; border-radius: 3px; background: var(--muted); opacity: 0.6; margin: 0 auto; }
  .hint {
    position: absolute; left: 50%; bottom: calc(12px + env(safe-area-inset-bottom)); transform: translateX(-50%);
    display: flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 16px; border-radius: 20px;
    border: 0; background: var(--accent); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer;
    box-shadow: var(--shadow); white-space: nowrap;
  }
  .chevron { display: inline-block; font-size: 18px; line-height: 1; animation: nudge 1.4s ease-in-out infinite; }
  @keyframes nudge { 0%, 100% { transform: translateY(2px); } 50% { transform: translateY(-4px); } }
  @media (prefers-reduced-motion: reduce) { .chevron { animation: none; } }
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
  .lake {
    width: 100%; min-height: 40px; margin: 4px 0; border-radius: 20px; border: 1px solid var(--accent);
    background: none; color: var(--accent); font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .pooled { margin: 4px 0; padding: 6px 8px; border-radius: 6px; font-size: 12px; background: var(--warn-bg); border: 1px solid var(--warn-border); }
  .members { list-style: none; margin: 0; padding: 0; }
  .members li { display: flex; flex-direction: column; padding: 4px 0; }
  .members button { padding: 4px 0; border: 0; background: none; color: var(--accent); font-size: 13px; text-align: left; cursor: pointer; text-decoration: underline; }
  .members small { color: var(--muted); font-size: 11px; }

  @media (min-width: 768px) {
    .sheet, .sheet.peek, .sheet.expanded {
      left: auto; top: 0; width: min(560px, 50vw); height: 100dvh; border-radius: 0; box-shadow: -4px 0 16px rgba(0, 0, 0, 0.2);
    }
    .handle, .hint { display: none; }
    .grab { cursor: auto; padding-top: 14px; touch-action: auto; }
  }
</style>
