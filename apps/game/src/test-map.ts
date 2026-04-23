/**
 * /test/{level} — Interactive SVG map viewer for level data.
 *
 * Renders: main path, other paths, building outlines, fences, water, roads.
 * Supports drag-to-pan and scroll-to-zoom.
 * Sidebar with per-layer visibility + numbering toggles.
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
  road: '#aaaaaa',
  buildingGrey: '#8899aa',
  buildingRed: '#c06050',
  buildingKristineberg: '#6a4a2a',
  water: '#4488cc',
  river: '#3377bb',
  fence: '#806040',
  background: '#2a3a2a',
};

// ── Layer definitions for sidebar ───────────────────────────────────────

interface LayerDef {
  key: string;
  label: string;
  color: string;
  count?: number;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const infoEl = document.getElementById('info')!;
  const appEl = document.getElementById('app')!;
  const sidebarEl = document.getElementById('sidebar')!;

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

  // Roads: each road is [lat, lon][] → [x, z][]
  const roads = (level.roads ?? []).map((r) =>
    r.map(([lat, lon]) => gpsToLocal(lon, lat, origin)),
  );

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
    ...roads.flat(),
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

  const svg = svgEl('svg', { viewBox: `${minX} ${-maxZ} ${width} ${height}` });
  const g = svgEl('g');
  svg.appendChild(g);

  // Helper to convert [x, z] to SVG point string (z is flipped)
  const pt = (x: number, z: number) => `${x},${-z}`;
  const polyPoints = (pts: [number, number][]) =>
    pts.map(([x, z]) => pt(x, z)).join(' ');
  const pathD = (pts: [number, number][]) =>
    pts.map(([x, z], i) => `${i === 0 ? 'M' : 'L'}${x},${-z}`).join(' ');

  // Label font sizing
  const labelFontSize = Math.max(width, height) * 0.006;
  const labelStrokeWidth = Math.max(width, height) * 0.001;

  function makeLabel(cx: number, cz: number, text: string, fillColor: string, strokeColor: string): SVGTextElement {
    const label = svgEl('text', {
      x: cx,
      y: -cz,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': labelFontSize,
      'font-family': 'sans-serif',
      'font-weight': 'bold',
      fill: fillColor,
      stroke: strokeColor,
      'stroke-width': labelStrokeWidth,
      'paint-order': 'stroke',
    });
    label.textContent = text;
    return label;
  }

  // Track all label elements for zoom rescaling
  const allLabels: SVGTextElement[] = [];

  // ── SVG groups per layer (draw order: water → roads → buildings → paths → fences → course) ──

  const gWater = svgEl('g');
  const gWaterLabels = svgEl('g');
  const gRoads = svgEl('g');
  const gRoadLabels = svgEl('g');
  const gBuildings = svgEl('g');
  const gBuildingLabels = svgEl('g');
  const gPaths = svgEl('g');
  const gPathLabels = svgEl('g');
  const gFences = svgEl('g');
  const gFenceLabels = svgEl('g');
  const gCourse = svgEl('g');

  g.appendChild(gWater);
  g.appendChild(gWaterLabels);
  g.appendChild(gRoads);
  g.appendChild(gRoadLabels);
  g.appendChild(gBuildings);
  g.appendChild(gBuildingLabels);
  g.appendChild(gPaths);
  g.appendChild(gPathLabels);
  g.appendChild(gFences);
  g.appendChild(gFenceLabels);
  g.appendChild(gCourse);

  // --- Water ---
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
    gWater.appendChild(poly);

    const cx = w.points.reduce((s, p) => s + p[0], 0) / w.points.length;
    const cz = w.points.reduce((s, p) => s + p[1], 0) / w.points.length;
    const label = makeLabel(cx, cz, String(i), '#88ccff', '#003366');
    gWaterLabels.appendChild(label);
    allLabels.push(label);
  }

  // --- Roads ---
  for (let i = 0; i < roads.length; i++) {
    const road = roads[i];
    if (road.length < 2) continue;
    const roadPath = svgEl('path', {
      d: pathD(road),
      fill: 'none',
      stroke: COLORS.road,
      'stroke-width': 3,
      'stroke-opacity': 0.7,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    gRoads.appendChild(roadPath);

    // Label at midpoint
    const mid = road[Math.floor(road.length / 2)];
    const label = makeLabel(mid[0], mid[1], String(i), '#ddd', '#333');
    gRoadLabels.appendChild(label);
    allLabels.push(label);
  }

  // --- Buildings ---
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (b.points.length < 3) continue;
    const fill = b.type === 'red' ? COLORS.buildingRed : b.type === 'kristineberg' ? COLORS.buildingKristineberg : COLORS.buildingGrey;
    const poly = svgEl('polygon', {
      points: polyPoints(b.points),
      fill,
      'fill-opacity': 0.7,
      stroke: fill,
      'stroke-width': 0.3,
      'stroke-opacity': 1,
    });
    gBuildings.appendChild(poly);

    const cx = b.points.reduce((s, p) => s + p[0], 0) / b.points.length;
    const cz = b.points.reduce((s, p) => s + p[1], 0) / b.points.length;
    const label = makeLabel(cx, cz, String(i), '#fff', '#000');
    gBuildingLabels.appendChild(label);
    allLabels.push(label);
  }

  // --- Other paths ---
  for (let i = 0; i < otherPaths.length; i++) {
    const p = otherPaths[i];
    if (p.points.length < 2) continue;
    const color = COLORS[p.type as keyof typeof COLORS] ?? COLORS.path;
    const path = svgEl('path', {
      d: pathD(p.points),
      fill: 'none',
      stroke: color,
      'stroke-width': 1.2,
      'stroke-opacity': 0.7,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    gPaths.appendChild(path);

    // Label at midpoint
    const mid = p.points[Math.floor(p.points.length / 2)];
    const label = makeLabel(mid[0], mid[1], String(i), '#e0d0a0', '#3a3020');
    gPathLabels.appendChild(label);
    allLabels.push(label);
  }

  // --- Fences ---
  for (let i = 0; i < fences.length; i++) {
    const f = fences[i];
    if (f.points.length < 2) continue;
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
    gFences.appendChild(fencePath);

    for (const [x, z] of f.points) {
      const circle = svgEl('circle', {
        cx: x,
        cy: -z,
        r: 1.2,
        fill: COLORS.fence,
        'fill-opacity': 0.9,
      });
      gFences.appendChild(circle);
    }

    // Label at midpoint
    const mid = f.points[Math.floor(f.points.length / 2)];
    const label = makeLabel(mid[0], mid[1], String(i), '#c0a060', '#302010');
    gFenceLabels.appendChild(label);
    allLabels.push(label);
  }

  // --- Main course path ---
  if (mainPath.length >= 2) {
    const outline = svgEl('path', {
      d: pathD(mainPath),
      fill: 'none',
      stroke: '#000',
      'stroke-width': 4,
      'stroke-opacity': 0.3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    gCourse.appendChild(outline);

    const mainPathEl = svgEl('path', {
      d: pathD(mainPath),
      fill: 'none',
      stroke: COLORS.mainPath,
      'stroke-width': 2.5,
      'stroke-opacity': 1,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    gCourse.appendChild(mainPathEl);

    // Start marker
    const [sx, sz] = mainPath[0];
    const startMarker = svgEl('circle', {
      cx: sx, cy: -sz, r: 3,
      fill: '#40d040', stroke: '#fff', 'stroke-width': 1,
    });
    gCourse.appendChild(startMarker);

    // End marker (if not a loop)
    const [ex, ez] = mainPath[mainPath.length - 1];
    const dist = Math.hypot(ex - sx, ez - sz);
    if (dist > 5) {
      const endMarker = svgEl('circle', {
        cx: ex, cy: -ez, r: 3,
        fill: '#d04040', stroke: '#fff', 'stroke-width': 1,
      });
      gCourse.appendChild(endMarker);
    }
  }

  appEl.appendChild(svg);

  // ── Sidebar ─────────────────────────────────────────────────────────

  const layers: (LayerDef & { geoGroup: SVGGElement; labelGroup: SVGGElement })[] = [
    { key: 'course',    label: 'Course',     color: COLORS.mainPath,            count: 1,                       geoGroup: gCourse,    labelGroup: gCourse },
    { key: 'paths',     label: 'Paths',      color: COLORS.path,               count: otherPaths.length,        geoGroup: gPaths,     labelGroup: gPathLabels },
    { key: 'roads',     label: 'Roads',      color: COLORS.road,               count: roads.length,             geoGroup: gRoads,     labelGroup: gRoadLabels },
    { key: 'buildings', label: 'Buildings',   color: COLORS.buildingGrey,       count: buildings.length,         geoGroup: gBuildings, labelGroup: gBuildingLabels },
    { key: 'water',     label: 'Water',      color: COLORS.water,              count: waterFeatures.length,     geoGroup: gWater,     labelGroup: gWaterLabels },
    { key: 'fences',    label: 'Fences',     color: COLORS.fence,              count: fences.length,            geoGroup: gFences,    labelGroup: gFenceLabels },
  ];

  // Title
  const title = document.createElement('h3');
  title.textContent = 'Layers';
  sidebarEl.appendChild(title);

  // Master numbering toggle
  let numbersVisible = true;
  const numberSection = document.createElement('div');
  numberSection.className = 'sidebar-section';
  const numberRow = document.createElement('div');
  numberRow.className = 'sidebar-row';
  const numberCb = document.createElement('input');
  numberCb.type = 'checkbox';
  numberCb.checked = true;
  numberCb.id = 'toggle-numbers';
  const numberLabel = document.createElement('label');
  numberLabel.htmlFor = 'toggle-numbers';
  numberLabel.textContent = 'Show numbers';
  numberRow.appendChild(numberCb);
  numberRow.appendChild(numberLabel);
  numberSection.appendChild(numberRow);
  sidebarEl.appendChild(numberSection);

  const divider = document.createElement('hr');
  divider.className = 'sidebar-divider';
  sidebarEl.appendChild(divider);

  // Per-layer toggles
  const layerSection = document.createElement('div');
  layerSection.className = 'sidebar-section';
  const layerTitle = document.createElement('div');
  layerTitle.className = 'sidebar-section-title';
  layerTitle.textContent = 'Visibility';
  layerSection.appendChild(layerTitle);

  for (const layer of layers) {
    const row = document.createElement('div');
    row.className = 'sidebar-row';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.id = `toggle-${layer.key}`;

    const swatch = document.createElement('div');
    swatch.className = 'sidebar-swatch';
    swatch.style.background = layer.color;

    const lbl = document.createElement('label');
    lbl.htmlFor = `toggle-${layer.key}`;
    lbl.textContent = `${layer.label} (${layer.count})`;

    row.appendChild(cb);
    row.appendChild(swatch);
    row.appendChild(lbl);
    layerSection.appendChild(row);

    cb.addEventListener('change', () => {
      layer.geoGroup.style.display = cb.checked ? '' : 'none';
      layer.labelGroup.style.display = (cb.checked && numbersVisible) ? '' : 'none';
    });
  }
  sidebarEl.appendChild(layerSection);

  // Wire up numbering toggle
  numberCb.addEventListener('change', () => {
    numbersVisible = numberCb.checked;
    for (const layer of layers) {
      const layerCb = document.getElementById(`toggle-${layer.key}`) as HTMLInputElement;
      const visible = layerCb.checked && numbersVisible;
      layer.labelGroup.style.display = visible ? '' : 'none';
    }
  });

  // Course info
  const courseLen = mainPath.reduce((sum, [x, z], i) => {
    if (i === 0) return 0;
    const [px, pz] = mainPath[i - 1];
    return sum + Math.hypot(x - px, z - pz);
  }, 0);
  infoEl.innerHTML = `<strong>${level.name}</strong> — ${Math.round(courseLen)}m · ${buildings.length} buildings · ${otherPaths.length} paths · ${roads.length} roads · ${waterFeatures.length} water · ${fences.length} fences`;

  // ── Pan & Zoom ──────────────────────────────────────────────────────

  let vbX = minX, vbY = -maxZ, vbW = width, vbH = height;
  let dragging = false;
  let dragStartX = 0, dragStartY = 0;
  let dragVbX = 0, dragVbY = 0;

  function updateViewBox() {
    svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    // Scale labels inversely with zoom so they stay a constant visual size
    const currentSize = Math.max(vbW, vbH);
    const fontSize = currentSize * 0.006;
    const strokeWidth = currentSize * 0.001;
    for (const lbl of allLabels) {
      lbl.setAttribute('font-size', String(fontSize));
      lbl.setAttribute('stroke-width', String(strokeWidth));
    }
    updateScaleBar();
  }

  // ── Scale bar ─────────────────────────────────────────────────────────

  const scaleLineEl = document.getElementById('scale-line')!;
  const scaleLabelEl = document.getElementById('scale-label')!;
  const NICE_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

  function updateScaleBar() {
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) return;
    // metres per CSS pixel
    const metresPerPx = vbW / rect.width;
    // target the bar to be ~100px wide
    const targetMetres = metresPerPx * 100;
    // pick the nicest round number
    let niceMetres = NICE_STEPS[NICE_STEPS.length - 1];
    for (const s of NICE_STEPS) {
      if (s >= targetMetres * 0.5) { niceMetres = s; break; }
    }
    const barPx = niceMetres / metresPerPx;
    scaleLineEl.style.width = `${Math.round(barPx)}px`;
    scaleLabelEl.textContent = niceMetres >= 1000 ? `${niceMetres / 1000} km` : `${niceMetres} m`;
  }
  updateScaleBar();

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
    const mx = vbX + ((e.clientX - rect.left) / rect.width) * vbW;
    const my = vbY + ((e.clientY - rect.top) / rect.height) * vbH;

    const zoomFactor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const newW = vbW * zoomFactor;
    const newH = vbH * zoomFactor;

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
