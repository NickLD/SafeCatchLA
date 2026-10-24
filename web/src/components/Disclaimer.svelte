<script>
  import { LDH_ADVISORIES_URL } from '../lib/config.js';
</script>

<p class="disclaimer" role="note">
  ⚠ Mercury averages here may be above advisory levels. This is not health advice. Check the Louisiana Department of
  Health's current <a href={LDH_ADVISORIES_URL} target="_blank" rel="noopener">fish consumption advisories</a> before
  eating fish from this area.
</p>

<style>
  .disclaimer {
    margin: 8px 0; padding: 8px 10px; font-size: 13px; line-height: 1.4;
    background: var(--warn-bg); border: 1px solid var(--warn-border); border-radius: 8px;
  }
  a { color: inherit; font-weight: 600; }
</style>
