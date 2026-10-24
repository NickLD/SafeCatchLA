<script>
  // Offers "install as app": the browser's own prompt where supported (Chrome/Edge), or
  // Add to Home Screen instructions on iPhone/iPad Safari, which has no prompt. Hidden once installed.
  let deferred = $state(null);
  let showTip = $state(false);

  const standalone =
    typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);

  $effect(() => {
    const onPrompt = (e) => {
      e.preventDefault?.();
      deferred = e;
    };
    const onInstalled = () => (deferred = null);
    addEventListener('beforeinstallprompt', onPrompt);
    addEventListener('appinstalled', onInstalled);
    return () => {
      removeEventListener('beforeinstallprompt', onPrompt);
      removeEventListener('appinstalled', onInstalled);
    };
  });

  async function install() {
    if (deferred) {
      const e = deferred;
      deferred = null;
      await e.prompt();
      await e.userChoice;
    } else {
      showTip = !showTip;
    }
  }
</script>

{#if !standalone && (deferred || ios)}
  <button class="install" onclick={install} aria-label="Install app" title="Install app">⬇</button>
  {#if showTip}
    <div class="tip" role="dialog" aria-label="Install on iPhone">
      To install: tap <b>Share</b> <span aria-hidden="true">⎋</span> in Safari, then <b>Add to Home Screen</b>.
      <button onclick={() => (showTip = false)} aria-label="Close tip">✕</button>
    </div>
  {/if}
{/if}

<style>
  .install {
    width: 44px; min-height: 44px; flex-shrink: 0; cursor: pointer; font-size: 18px;
    border-radius: 22px; border: 1px solid var(--border); background: var(--surface); color: var(--text); box-shadow: var(--shadow);
  }
  .tip {
    position: absolute; top: 52px; right: 8px; left: 8px; max-width: 360px; margin-left: auto; z-index: 1300;
    background: var(--surface); color: var(--text); border-radius: 12px; box-shadow: var(--shadow);
    padding: 10px 36px 10px 12px; font-size: 13px; line-height: 1.4;
  }
  .tip button { position: absolute; top: 4px; right: 4px; border: 0; background: none; color: var(--muted); min-width: 32px; min-height: 32px; cursor: pointer; }
</style>
