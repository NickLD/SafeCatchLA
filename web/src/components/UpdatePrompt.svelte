<script>
  // Shown when a new version has been deployed; Reload swaps in the new service worker and refreshes.
  import { appUpdate } from '../lib/appUpdate.svelte.js';
</script>

{#if appUpdate.ready}
  <div class="update" role="status">
    New version available
    <button class="reload" onclick={() => appUpdate.apply()}>Reload</button>
    <button class="dismiss" onclick={() => (appUpdate.ready = false)} aria-label="Dismiss">✕</button>
  </div>
{/if}

<style>
  .update {
    position: absolute; left: 50%; top: 120px; transform: translateX(-50%); z-index: 1150;
    display: flex; align-items: center; gap: 8px; white-space: nowrap;
    background: var(--surface); color: var(--text); padding: 4px 4px 4px 16px; border-radius: 22px; box-shadow: var(--shadow);
  }
  .reload {
    min-height: 36px; padding: 0 14px; border: 0; border-radius: 18px; cursor: pointer;
    background: var(--accent); color: #fff; font-weight: 600;
  }
  .dismiss { min-width: 36px; min-height: 36px; border: 0; background: none; color: var(--muted); cursor: pointer; }
</style>
