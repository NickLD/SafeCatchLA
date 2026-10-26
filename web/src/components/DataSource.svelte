<script>
  import { DEQ_MERCURY_URL, deqSiteUrl } from '../lib/config.js';
  import { formatDate } from '../lib/format.js';

  let { siteId, updated = null, checked = null, meta = null } = $props();
  const count = (n) => (n ?? 0).toLocaleString('en-US');
</script>

<footer class="source">
  <h3>Data source</h3>
  <p>
    Sample results come from the Louisiana Department of Environmental Quality (LDEQ) Mercury Initiative database
    (project WQ1994001).
    {#if checked}They were last pulled from LDEQ on {formatDate(checked)}{#if updated} (data last changed {formatDate(updated)}){/if}.
    {:else if updated}The data last changed {formatDate(updated)}.{/if}
    See
    <a href={deqSiteUrl(siteId)} target="_blank" rel="noopener">this site's records on LDEQ ↗</a> or the full
    <a href={DEQ_MERCURY_URL} target="_blank" rel="noopener">LDEQ mercury database ↗</a>.
  </p>
  <p>
    <b>How we process it.</b> LDEQ sometimes analyzes the same fish (or composite) twice as a quality check.
    {#if meta?.mergedDuplicates}{count(meta.mergedDuplicates)} lab field duplicates{:else}These field duplicates{/if}
    are averaged into one sample with their original, so each fish counts once.
    {#if meta?.skipped?.rejected}We leave out {count(meta.skipped.rejected)} results LDEQ marked as rejected{:else}We leave out results LDEQ marked as rejected{/if}
    and shellfish and fish-roe samples, and treat "not detected" results as Louisiana's advisory protocol does (zero, or half the
    reporting limit when most samples at a site are detected).
  </p>
  <p>
    SafeCatchLA is an independent project, not affiliated with or endorsed by LDEQ, LDH or EPA. Averages here are
    calculated from LDEQ's public data and may differ from official summaries; the LDEQ database is the authoritative
    record.
  </p>
</footer>

<style>
  .source { margin-top: 16px; padding-top: 8px; border-top: 1px solid var(--border); font-size: 12px; color: var(--muted); }
  h3 { margin: 0 0 4px; font-size: 13px; color: var(--text); }
  p { margin: 0 0 6px; line-height: 1.4; }
  b { color: var(--text); font-weight: 600; }
  a { color: var(--accent); }
</style>
