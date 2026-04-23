/**
 * /test/{level} — Interactive SVG map viewer for level data.
 *
 * Renders: main path, other paths, building outlines, fences, water.
 * Supports drag-to-pan and scroll-to-zoom.
 */
import { loadLevel, levels } from './levels';
import type { LevelData } from './levels/types';

// ── Coordinate helpers ──────────────────────────────────────────────────

function gpsToLocal(
  lon: number,
  lat: number,
  origin: [number, number], // [lon, lat]
): [number, number] {
  const toRad = Math.PI / 180;
  const R = 6_371_000;
  const cosLat = Math.cos(origin[1] * toRad);
  const x = (lon - origin[0]) * toRad * R * cosLat;
  const z = (lat - origin[1]) * toRad * R;
  return [x, z];
}

// ── SVG namespace helper ────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// ── Colours ─────────────────────────────────────────────────────────────

const COLORS = {
  mainPath: '#e8a030',
  footway: '#c89060',
  cycleway: '#70b860',
  path: '#b0a070',
  track: '#a09060',
  steps: '#d08888',
  bridleway: '#90a040',
  buildingGrey: '#8899aa',
  buildingRed: '#c06050',
  water: '#4488cc',
  river: '#3377bb',
  fence: '#806040',
  background: '#2a3a2a',
};

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const infoEl = document.getElementById('info')!;
  const appEl = document.getElementById('app')!;
  const legendEl = document.getElementById('legend')!;

  // Parse level id from search param: ?event=haga
  const params = new URLSearchParams(window.location.search);
  const levelId = params.get('event') ?? undefined;

  if (!levelId || !levels[levelId]) {
    const available = Object.keys(levels).join(', ');
    infoEl.innerHTML = `<strong>Usage:</strong> test.html?event={level}<br>Available: ${available}`;
    return;
  }

  infoEl.innerHTML = `Loading <strong>${levelId}</strong>…`;

  const level = await loadLevel(levelId);
  const origin: [number, number] = [
    level.course.coordinates[0][0], // lon
    level.course.coordinates[0][1], // lat
  ];

  // ── Convert all features to local coordinates ───────────────────────

  // Main course path: [lon, lat, alt] → [x, z]
  const mainPath = level.course.coordinates.map(([lon, lat]) =>
    gpsToLocal(lon, lat, origin),
  );

  // Other paths: [lat, lon] → [x, z]
  const otherPaths = (level.paths ?? []).map((p) => ({
    type: p.type,
    points: p.points.map(([lat, lon]) => gpsToLocal(lon, lat, origin)),
  }));

  // Buildings: [lat, lon] → [x, z]
  const buildings = (level.buildings ?? []).map((b) => ({
    type: b.type,
    points: b.points.map(([lat, lon]) => gpsToLocal(lon, lat, origin)),
  }));

  // Water: coords are [lon, lat]
  const waterFeatures = (level.water ?? []).map((w) => ({
    type: w.type,
    points: w.coords.map(([lon, lat]) => gpsToLocal(lon, lat, origin)),
  }));

  // Custom fences: [lat, lon] → [x, z]
  const fences = (level.customFences ?? []).map((f) => ({
    points: f.points.map(([lat, lon]) => gpsToLocal(lon, lat, origin)),
  }));

  // ── Compute bounding box ────────────────────────────────────────────

  const allPoints = [
    ...mainPath,
    ...otherPaths.flatMap((p) => p.points),
    ...buildings.flatMap((b) => b.points),
    ...waterFeatures.flatMap((w) => w.points),
    ...fences.flatMap((f) => f.points),
  ];

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of allPoints) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }

  const pad = Math.max(maxX - minX, maxZ - minZ) * 0.08;
  minX -= pad; maxX += pad; minZ -= pad; maxZ += pad;
  const width = maxX - minX;
  const height = maxZ - minZ;

  // ── Build SVG ───────────────────────────────────────────────────────

  // Note: SVG Y axis goes down, but our Z axis also goes "up" (north).
  // We flip Z so north is at the top: svgY = -(z - minZ) mapped to [0, height].
  // We use transform="scale(1,-1)" on a group and flip the viewBox.

  const svg = svgEl('svg', { viewBox: `${minX} ${-maxZ} ${width} ${height}` });
  const g = svgEl('g'); // main group — everything drawn here so viewBox panning works
  svg.appendChild(g);

  // Helper to convert [x, z] to SVG point string (z is flipped)
  const pt = (x: number, z: number) => `${x},${-z}`;
  const polyPoints = (pts: [number, number][]) =>
    pts.map(([x, z]) => pt(x, z)).join(' ');
  const pathD = (pts: [number, number][]) =>
    pts.map(([x, z], i) => `${i === 0 ? 'M' : 'L'}${x},${-z}`).join(' ');

  // --- Water ---
  const waterLabels: SVGTextElement[] = [];
  for (let i = 0; i < waterFeatures.length; i++) {
    const w = waterFeatures[i];
    if (w.points.length < 3) continue;
    const poly = svgEl('polygon', {
      points: polyPoints(w.points),
      fill: w.type === 'river' ? COLORS.river : COLORS.water,
      'fill-opacity': 0.6,
      stroke: w.type === 'river' ? COLORS.river : COLORS.water,
      'stroke-width': 0.5,
      'stroke-opacity': 0.8,
    });
    g.appendChild(poly);

    // Label water body with its array index
    const cx = w.points.reduce((s, p) => s + p[0], 0) / w.points.length;
    const cz = w.points.reduce((s, p) => s + p[1], 0) / w.points.length;
    const label = svgEl('text', {
      x: cx,
      y: -cz,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': Math.max(width, height) * 0.006,
      'font-family': 'sans-serif',
      'font-weight': 'bold',
      fill: '#88ccff',
      stroke: '#003366',
      'stroke-width': Math.max(width, height) * 0.001,
      'paint-order': 'stroke',
    });
    label.textContent = String(i);
    g.appendChild(label);
    waterLabels.push(label);
  }

  // --- Buildings ---
  const buildingLabels: SVGTextElement[] = [];
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (b.points.length < 3) continue;
    const fill = b.type === 'red' ? COLORS.buildingRed : COLORS.buildingGrey;
    const poly = svgEl('polygon', {
      points: polyPoints(b.points),
      fill,
      'fill-opacity': 0.7,
      stroke: fill,
      'stroke-width': 0.3,
      'stroke-opacity': 1,
    });
    g.appendChild(poly);

    // Label building with its array index
    const cx = b.points.reduce((s, p) => s + p[0], 0) / b.points.length;
    const cz = b.points.reduce((s, p) => s + p[1], 0) / b.points.length;
    const label = svgEl('text', {
      x: cx,
      y: -cz,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': Math.max(width, height) * 0.006,
      'font-family': 'sans-serif',
      'font-weight': 'bold',
      fill: '#fff',
      stroke: '#000',
      'stroke-width': Math.max(width, height) * 0.001,
      'paint-order': 'stroke',
    });
    label.textContent = String(i);
    g.appendChild(label);
    buildingLabels.push(label);
  }

  // --- Other paths ---
  for (const p of otherPaths) {
    if (p.points.length < 2) continue;
    const color =
      COLORS[p.type as keyof typeof COLORS] ?? COLORS.path;
    const path = svgEl('path', {
      d: pathD(p.points),
      fill: 'none',
      stroke: color,
      'stroke-width': 1.2,
      'stroke-opacity': 0.7,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    g.appendChild(path);
  }

  // --- Fences ---
  for (const f of fences) {
    if (f.points.length < 2) continue;
    // Close the polygon
    const closedD = pathD(f.points) + ' Z';
    const fencePath = svgEl('path', {
      d: closedD,
      fill: 'none',
      stroke: COLORS.fence,
      'stroke-width': 1.5,
      'stroke-dasharray': '4,2',
      'stroke-opacity': 0.9,
      'stroke-linecap': 'round',
    });
    g.appendChild(fencePath);

    // Fence posts as small circles at each vertex
    for (const [x, z] of f.points) {
      const circle = svgEl('circle', {
        cx: x,
        cy: -z,
        r: 1.2,
        fill: COLORS.fence,
        'fill-opacity': 0.9,
      });
      g.appendChild(circle);
    }
  }

  // --- Main path ---
  if (mainPath.length >= 2) {
    // Thick outline
    const outline = svgEl('path', {
      d: pathD(mainPath),
      fill: 'none',
      stroke: '#000',
      'stroke-width': 4,
      'stroke-opacity': 0.3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    g.appendChild(outline);

    const mainPathEl = svgEl('path', {
      d: pathD(mainPath),
      fill: 'none',
      stroke: COLORS.mainPath,
      'stroke-width': 2.5,
      'stroke-opacity': 1,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    g.appendChild(mainPathEl);

    // Start marker
    const [sx, sz] = mainPath[0];
    const startMarker = svgEl('circle', {
      cx: sx, cy: -sz, r: 3,
      fill: '#40d040', stroke: '#fff', 'stroke-width': 1,
    });
    g.appendChild(startMarker);

    // End marker (if not a loop)
    const [ex, ez] = mainPath[mainPath.length - 1];
    const dist = Math.hypot(ex - sx, ez - sz);
    if (dist > 5) {
      const endMarker = svgEl('circle', {
        cx: ex, cy: -ez, r: 3,
        fill: '#d04040', stroke: '#fff', 'stroke-width': 1,
      });
      g.appendChild(endMarker);
    }
  }

  appEl.appendChild(svg);

  // ── Legend ───────────────────────────────────────────────────────────

  const legendItems: [string, string][] = [
    ['Main path', COLORS.mainPath],
    ['Footway', COLORS.footway],
    ['Cycleway', COLORS.cycleway],
    ['Building (grey)', COLORS.buildingGrey],
    ['Building (red)', COLORS.buildingRed],
    ['Water', COLORS.water],
    ['Fence', COLORS.fence],
  ];
  for (const [label, color] of legendItems) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<div class="legend-swatch" style="background:${color}"></div>${label}`;
    legendEl.appendChild(item);
  }

  // Course info
  const courseLen = mainPath.reduce((sum, [x, z], i) => {
    if (i === 0) return 0;
    const [px, pz] = mainPath[i - 1];
    return sum + Math.hypot(x - px, z - pz);
  }, 0);
  infoEl.innerHTML = `<strong>${level.name}</strong> — ${Math.round(courseLen)}m · ${buildings.length} buildings · ${otherPaths.length} paths · ${waterFeatures.length} water · ${fences.length} fences`;

  // ── Pan & Zoom ──────────────────────────────────────────────────────

  let vbX = minX, vbY = -maxZ, vbW = width, vbH = height;
  let dragging = false;
  let dragStartX = 0, dragStartY = 0;
  let dragVbX = 0, dragVbY = 0;

  const baseSize = Math.max(width, height);
  function updateViewBox() {
    svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    // Scale building labels inversely with zoom so they stay a constant visual size
    const currentSize = Math.max(vbW, vbH);
    const fontSize = currentSize * 0.006;
    const strokeWidth = currentSize * 0.001;
    for (const lbl of buildingLabels) {
      lbl.setAttribute('font-size', String(fontSize));
      lbl.setAttribute('stroke-width', String(strokeWidth));
    }
    for (const lbl of waterLabels) {
      lbl.setAttribute('font-size', String(fontSize));
      lbl.setAttribute('stroke-width', String(strokeWidth));
    }
  }

  svg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragVbX = vbX;
    dragVbY = vbY;
    svg.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = svg.getBoundingClientRect();
    // Convert pixel delta to SVG units
    const scaleX = vbW / rect.width;
    const scaleY = vbH / rect.height;
    vbX = dragVbX - (e.clientX - dragStartX) * scaleX;
    vbY = dragVbY - (e.clientY - dragStartY) * scaleY;
    updateViewBox();
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
    svg.classList.remove('dragging');
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    // Mouse position in SVG coords
    const mx = vbX + ((e.clientX - rect.left) / rect.width) * vbW;
    const my = vbY + ((e.clientY - rect.top) / rect.height) * vbH;

    const zoomFactor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const newW = vbW * zoomFactor;
    const newH = vbH * zoomFactor;

    // Keep mouse position fixed in SVG space
    vbX = mx - ((mx - vbX) / vbW) * newW;
    vbY = my - ((my - vbY) / vbH) * newH;
    vbW = newW;
    vbH = newH;

    updateViewBox();
  }, { passive: false });
}

main().catch((err) => {
  document.getElementById('info')!.innerHTML = `<strong>Error:</strong> ${err.message}`;
  console.error(err);
});
