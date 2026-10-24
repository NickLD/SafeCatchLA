<script>
  import { DEQ_MERCURY_URL, deqSiteUrl } from '../lib/config.js';

  let { siteId, updated = null } = $props();
</script>

<footer class="source">
  <h3>Data source</h3>
  <p>
    Sample results come from the Louisiana Department of Environmental Quality (LDEQ) Mercury Initiative database
    (project WQ1994001){#if updated}, last changed {updated}{/if}. See
    <a href={deqSiteUrl(siteId)} target="_blank" rel="noopener">this site's records on LDEQ ↗</a> or the full
    <a href={DEQ_MERCURY_URL} target="_blank" rel="noopener">LDEQ mercury database ↗</a>.
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
  a { color: var(--accent); }
</style>
