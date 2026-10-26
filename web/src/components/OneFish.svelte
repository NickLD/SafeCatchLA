<script>
  // Flags a number that rests on a single fish. One composite of several fish is fine; one fish can be far from typical.
  let { where = '', text = '' } = $props();
</script>

<span class="one" title="Based on a single fish, which can be far from typical for this species and place.">⚠ {text || `1 fish${where ? ` ${where}` : ''}`}</span>

<style>
  .one {
    display: inline-block; margin-top: 2px; padding: 0 6px; border-radius: 8px; font-size: 11px; font-weight: 600;
    background: var(--warn-bg); border: 1px solid var(--warn-border); color: var(--text); white-space: nowrap;
  }
</style>
