<script>
  import { displaySpecies } from '../lib/format.js';

  let { site, selected, onSelect } = $props();
  let names = $derived(Object.entries(site.species).sort((a, b) => b[1].n - a[1].n).map(([name]) => name));
</script>

<div class="chips" role="radiogroup" aria-label="Species">
  {#each names as name (name)}
    <button role="radio" aria-checked={name === selected} class:on={name === selected} onclick={() => onSelect(name)}>
      {displaySpecies(name)}
    </button>
  {/each}
</div>

<style>
  .chips { display: flex; gap: 6px; overflow-x: auto; padding: 4px 0; scrollbar-width: none; }
  button {
    flex-shrink: 0; min-height: 36px; padding: 0 12px; border-radius: 18px; cursor: pointer;
    border: 1px solid var(--accent); background: transparent; color: var(--accent); white-space: nowrap;
  }
  .on { background: var(--accent); color: #fff; }
</style>
