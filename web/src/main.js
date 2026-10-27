import { mount } from 'svelte'
import { registerSW } from 'virtual:pwa-register'
import './app.css'
import App from './App.svelte'
import { appUpdate } from './lib/appUpdate.svelte.js'

// A reload alone doesn't swap in a waiting service worker (that needs every tab closed), so an
// update that was already waiting when this page opened is applied straight away; there's nothing
// to interrupt yet. Workbox reports such an update before onRegisteredSW runs.
let starting = true
const updateSW = registerSW({
  onNeedRefresh() {
    if (starting) updateSW(true)
    else appUpdate.ready = true
  },
  onRegisteredSW(_url, reg) {
    starting = false
    if (!reg) return
    // Look for a new deploy hourly, and whenever the app comes back to the foreground.
    setInterval(() => reg.update(), 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update()
    })
  },
})
appUpdate.apply = () => updateSW(true)

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
