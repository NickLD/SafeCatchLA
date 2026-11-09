<script>
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { onMount } from 'svelte';
  import { colorSite } from '../lib/coloring.js';
  import { loadLakeOutlines } from '../lib/data.js';
  import { LAKES } from '../lib/lakes.js';
  import { app, selectedSite } from '../lib/state.svelte.js';

  let { onSelect, onMapTap, onLakeTap } = $props();
  const OUTLINE = 'rgba(0, 0, 0, 0.5)'; // dark so pale mid-scale dots still stand out on the light map
  let el;
  let map;
  let markers = new Map();
  let shapes = new Map();
  let shapeLayer;
  let labelLayer;
  // Shapes would be specks with colliding names statewide; they appear once there's room for them.
  const SHAPES_FROM_ZOOM = 9;
  const LABELS_FROM_ZOOM = 10;
  const SHAPE_COLOR = '#37596e'; // one neutral color: dot colors already mean mercury levels
  let ready = $state(false);
  let shapesLoaded = $state(false);
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
    // Below the dots' pane, so a tap on a dot always wins over the lake around it.
    map.createPane('lakes').style.zIndex = 350;
    shapeLayer = L.layerGroup();
    labelLayer = L.layerGroup();
    map.on('zoomend', () => (zoom = map.getZoom()));
    map.on('click', () => onMapTap()); // markers set bubblingMouseEvents: false so their taps don't land here
    ready = true;
    return () => map.remove();
  });

  // Lake shapes are an extra: if they fail to load the map and the drawer's button still work.
  $effect(() => {
    if (!ready) return;
    const renderer = L.svg({ pane: 'lakes', padding: 0.5 });
    loadLakeOutlines().then((outlines) => {
      for (const { id, name } of LAKES) {
        const outline = outlines[id];
        if (!outline) continue;
        const shape = L.polygon(outline.rings, { renderer, pane: 'lakes', className: 'lake-shape', color: SHAPE_COLOR, weight: 1.5, dashArray: '4 5', fillColor: SHAPE_COLOR, fillOpacity: 0.16, bubblingMouseEvents: false })
          .on('click', () => onLakeTap(id));
        shape.addTo(shapeLayer);
        shapes.set(id, shape);
        L.tooltip({ permanent: true, direction: 'center', className: 'lake-label' }).setLatLng(outline.label).setContent(name).addTo(labelLayer);
      }
      shapesLoaded = true;
    }).catch(() => {});
  });

  $effect(() => {
    if (!ready || !shapesLoaded) return;
    const toggle = (layer, on) => (on ? layer.addTo(map) : layer.remove());
    toggle(shapeLayer, zoom >= SHAPES_FROM_ZOOM);
    toggle(labelLayer, zoom >= LABELS_FROM_ZOOM);
    for (const [id, shape] of shapes) shape.setStyle({ fillOpacity: id === app.lake ? 0.32 : 0.16, weight: id === app.lake ? 2.5 : 1.5 });
  });

  // Create markers once the sites arrive.
  $effect(() => {
    if (!ready || markers.size || !app.sites.length) return;
    const renderer = L.svg({ padding: 0.5 });
    for (const site of app.sites) {
      if (site.lat == null || site.lon == null) continue;
      const m = L.circleMarker([site.lat, site.lon], { renderer, radius: radiusFor(zoom), weight: 1, color: OUTLINE, fillOpacity: 0.95, bubblingMouseEvents: false })
        .on('click', () => onSelect(site))
        .bindTooltip(site.name, { direction: 'top' })
        .addTo(map);
      markers.set(site.id, m);
    }
  });

  // Restyle when anything that affects color or selection changes.
  $effect(() => {
    const ctx = { mode: app.color, species: app.filter, period: app.period, latestYear: app.latestYear, today: new Date(), range: app.range };
    const open = selectedSite();
    const selected = new Set(open?.members?.map((s) => s.id) ?? (open ? [open.id] : []));
    const radius = radiusFor(zoom);
    if (!ready || !app.sites.length) return;
    for (const site of app.sites) {
      const m = markers.get(site.id);
      if (!m) continue;
      const isSel = selected.has(site.id);
      const c = colorSite(site, ctx);
      // No data is a hollow ring so it can't be mistaken for a grey "no change" on the trend scale.
      const none = c.key === 'nodata';
      m.setStyle({
        fillColor: none ? '#ffffff' : c.color, fillOpacity: none ? 0.35 : 0.95,
        color: isSel ? '#000' : none ? '#757575' : OUTLINE, weight: isSel ? 3 : none ? 1.5 : 1,
      });
      m.setRadius(isSel ? radius + 3 : radius);
      if (isSel) m.bringToFront();
    }
  });
</script>

<div class="map" bind:this={el}></div>

<style>
  .map { position: absolute; inset: 0; }
  .map :global(.lake-label) {
    padding: 0; border: 0; background: none; box-shadow: none; color: #1f3a4a; font-size: 12px; font-weight: 600;
    text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff;
  }
</style>
