<script>
  // Flags a number that rests on a single sample (one fish, or one composite), which can be far from typical.
  let { where = '' } = $props();
</script>

<span class="one" title="Based on a single sample. One fish (or one composite) can be far from typical.">⚠ 1 sample{where ? ` ${where}` : ''}</span>

<style>
  .one {
    display: inline-block; margin-top: 2px; padding: 0 6px; border-radius: 8px; font-size: 11px; font-weight: 600;
    background: var(--warn-bg); border: 1px solid var(--warn-border); color: var(--text); white-space: nowrap;
  }
</style>
