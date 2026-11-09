<script>
  import { ALL_SPECIES } from '../lib/config.js';
  import { displaySpecies } from '../lib/format.js';

  let { names, selected, onSelect, showAll = false } = $props();
</script>

<div class="chips" role="radiogroup" aria-label="Species">
  {#if showAll}
    <button role="radio" class="all" aria-checked={selected === ALL_SPECIES} class:on={selected === ALL_SPECIES} onclick={() => onSelect(ALL_SPECIES)}>
      {displaySpecies(ALL_SPECIES)}
    </button>
  {/if}
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
  .all { border-color: var(--all-species); color: var(--all-species); }
  .all.on { background: var(--all-species); color: var(--surface); }
</style>
