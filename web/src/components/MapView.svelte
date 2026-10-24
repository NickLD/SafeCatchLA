<script>
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { onMount } from 'svelte';
  import { colorSite } from '../lib/coloring.js';
  import { app } from '../lib/state.svelte.js';

  let { onSelect, onMapTap } = $props();
  let el;
  let map;
  let markers = new Map();
  let ready = $state(false);
  let zoom = $state(7);
  // Small dots when zoomed out so the state view isn't a solid blob; bigger tap targets up close.
  const radiusFor = (z) => (z <= 7 ? 5 : z <= 9 ? 7 : 10);

  export function focusSite(site, zoom = 11) {
    map?.setView([site.lat, site.lon], Math.max(map.getZoom(), zoom));
  }

  export function locate() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('unavailable'));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 11);
          resolve();
        },
        reject,
        { timeout: 10000 },
      );
    });
  }

  onMount(() => {
    map = L.map(el, { zoomControl: false, preferCanvas: false }).setView([31.0, -91.9], 7);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.on('zoomend', () => (zoom = map.getZoom()));
    map.on('click', () => onMapTap()); // markers set bubblingMouseEvents: false so their taps don't land here
    ready = true;
    return () => map.remove();
  });

  // Create markers once the sites arrive.
  $effect(() => {
    if (!ready || markers.size || !app.sites.length) return;
    const renderer = L.svg({ padding: 0.5 });
    for (const site of app.sites) {
      if (site.lat == null || site.lon == null) continue;
      const m = L.circleMarker([site.lat, site.lon], { renderer, radius: radiusFor(zoom), weight: 1.5, color: '#fff', fillOpacity: 0.95, bubblingMouseEvents: false })
        .on('click', () => onSelect(site))
        .bindTooltip(site.name, { direction: 'top' })
        .addTo(map);
      markers.set(site.id, m);
    }
  });

  // Restyle when anything that affects color or selection changes.
  $effect(() => {
    const ctx = { mode: app.color, species: app.filter, period: app.period, latestYear: app.latestYear, today: new Date() };
    const selected = app.site;
    const radius = radiusFor(zoom);
    if (!ready || !app.sites.length) return;
    for (const site of app.sites) {
      const m = markers.get(site.id);
      if (!m) continue;
      const isSel = site.id === selected;
      m.setStyle({ fillColor: colorSite(site, ctx).color, color: isSel ? '#000' : '#fff', weight: isSel ? 3 : 1.5 });
      m.setRadius(isSel ? radius + 3 : radius);
      if (isSel) m.bringToFront();
    }
  });
</script>

<div class="map" bind:this={el}></div>

<style>
  .map { position: absolute; inset: 0; }
</style>
