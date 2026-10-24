<script>
  import { LDH_ADVISORIES_URL } from '../lib/config.js';

  let open = $state(false);
</script>

<div class="disclaimer" role="note">
  <span class="line">
    ⚠ This is not health advice. Check
    <a href={LDH_ADVISORIES_URL} target="_blank" rel="noopener">fish consumption advisories</a>.
  </span>
  <button onclick={() => (open = !open)} aria-expanded={open} aria-label="More about this warning">
    {open ? 'Less' : 'More'}
  </button>
  {#if open}
    <p>
      Mercury averages here may be above advisory levels. Check the Louisiana Department of Health's current fish
      consumption advisories before eating fish from this area. The EPA guideline (0.3 ppm) is shown for comparison
      only; it is not Louisiana's advisory threshold.
    </p>
  {/if}
</div>

<style>
  .disclaimer {
    margin: 6px 0; padding: 4px 8px; font-size: 12px; line-height: 1.35;
    background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 6px;
    display: flex; flex-wrap: wrap; align-items: center; gap: 0 6px;
  }
  .line { flex: 1; min-width: 0; }
  a { color: inherit; font-weight: 600; }
  button {
    border: 0; background: none; color: inherit; font-size: 12px; text-decoration: underline;
    padding: 4px 2px; min-height: 28px; cursor: pointer;
  }
  p { flex-basis: 100%; margin: 2px 0 4px; }
</style>
