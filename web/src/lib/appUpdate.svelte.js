// Set by main.js when a new deploy's service worker is waiting; `apply` swaps it in and reloads.
export const appUpdate = $state({ ready: false, apply: () => location.reload() });
