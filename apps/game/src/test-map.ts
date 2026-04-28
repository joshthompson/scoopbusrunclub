/**
 * /test/{level} — Interactive SVG map editor for level data.
 *
 * Features:
 * - Renders: course, paths, buildings, water, fences, fields, manual trees
 * - Click elements to select → sidebar shows properties + delete button
 * - Draw new buildings, fields, and place trees
 * - Drag polygon vertices to adjust shapes
 * - Export each data layer as JSON for copy-pasting into level files
 */
import { loadLevel, levels } from './levels';
import type { LevelData } from './levels/types';

// ── Coordinate helpers ──────────────────────────────────────────────────

function gpsToLocal(
  lon: number,
  lat: number,
  origin: [number, number],
): [number, number] {
  const toRad = Math.PI / 180;
  const R = 6_371_000;
  const cosLat = Math.cos(origin[1] * toRad);
  const x = (lon - origin[0]) * toRad * R * cosLat;
  const z = (lat - origin[1]) * toRad * R;
  return [x, z];
}

function localToGps(
  x: number,
  z: number,
  origin: [number, number],
): [number, number] {
  const toRad = Math.PI / 180;
  const R = 6_371_000;
  const cosLat = Math.cos(origin[1] * toRad);
  const lon = x / (toRad * R * cosLat) + origin[0];
  const lat = z / (toRad * R) + origin[1];
  return [lat, lon];
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
  buildingGreen: '#8C9E7E',
  buildingYellow: '#FFD021',
  buildingKristineberg: '#4488cc',
  water: '#4488cc',
  river: '#3377bb',
  fence: '#806040',
  field: '#55aa44',
  concrete: '#999999',
  tree: '#228833',
  bench: '#8B6914',
  lamppost: '#888899',
  tennisCourt: '#2d8a4e',
  floodlight: '#ff9922',
  selected: '#ffcc00',
};

// ── Layer items (edited in-place) ───────────────────────────────────────

type RegionType = 'field' | 'concrete';
interface RegionItem { type: RegionType; points: [number, number][]; }
type BuildingType = 'grey' | 'red' | 'green' | 'yellow' | 'kristineberg';
interface BuildingItem { type: BuildingType; points: [number, number][]; }
interface WaterItem { type: 'water' | 'river'; points: [number, number][]; }
interface FenceItem { points: [number, number][]; }
interface TreeItem { pos: [number, number]; }
type ObjectKind = 'bench' | 'lamppost' | 'tennisCourt' | 'floodlight';
interface ObjectItem { kind: ObjectKind; pos: [number, number]; rotation: number; }

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  const infoEl = document.getElementById('info')!;
  const appEl = document.getElementById('app')!;
  const sidebarEl = document.getElementById('sidebar')!;

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
    level.course.coordinates[0][0],
    level.course.coordinates[0][1],
  ];

  // ── Convert all features to local coordinates (editable arrays) ─────

  const mainPath = level.course.coordinates.map(([lon, lat]) =>
    gpsToLocal(lon, lat, origin),
  );

  const otherPaths = (level.paths ?? []).map((p) => ({
    type: p.type,
    points: p.points.map(([lat, lon]) => gpsToLocal(lon, lat, origin)) as [number, number][],
  }));

  const buildingItems: BuildingItem[] = (level.buildings ?? []).map((b) => ({
    type: (b.type === 'red' || b.type === 'green' || b.type === 'yellow' || b.type === 'kristineberg') ? b.type as BuildingType : 'grey' as const,
    points: b.points.map(([lat, lon]) => gpsToLocal(lon, lat, origin)) as [number, number][],
  }));

  const waterItems: WaterItem[] = (level.water ?? []).map((w) => ({
    type: w.type,
    points: w.coords.map(([lon, lat]) => gpsToLocal(lon, lat, origin)) as [number, number][],
  }));

  const fenceItems: FenceItem[] = (level.customFences ?? []).map((f) => ({
    points: f.points.map(([lat, lon]) => gpsToLocal(lon, lat, origin)) as [number, number][],
  }));

  const regionItems: RegionItem[] = [
    ...(level.regions?.fields ?? []).map((polygon): RegionItem => ({
      type: 'field',
      points: polygon.map(([lat, lon]) => gpsToLocal(lon, lat, origin)) as [number, number][],
    })),
    ...(level.regions?.concrete ?? []).map((polygon): RegionItem => ({
      type: 'concrete',
      points: polygon.map(([lat, lon]) => gpsToLocal(lon, lat, origin)) as [number, number][],
    })),
  ];

  const treeItems: TreeItem[] = (level.manualTrees ?? []).map(([lat, lon]) => ({
    pos: gpsToLocal(lon, lat, origin),
  }));

  const objectItems: ObjectItem[] = [
    ...(level.objects?.benches ?? []).map(([lat, lon, rot]): ObjectItem => ({
      kind: 'bench', pos: gpsToLocal(lon, lat, origin), rotation: rot,
    })),
    ...(level.objects?.lampposts ?? []).map(([lat, lon, rot]): ObjectItem => ({
      kind: 'lamppost', pos: gpsToLocal(lon, lat, origin), rotation: rot,
    })),
    ...(level.objects?.tennisCourts ?? []).map(([lat, lon, rot]): ObjectItem => ({
      kind: 'tennisCourt', pos: gpsToLocal(lon, lat, origin), rotation: rot,
    })),
    ...(level.objects?.floodlights ?? []).map(([lat, lon, rot]): ObjectItem => ({
      kind: 'floodlight', pos: gpsToLocal(lon, lat, origin), rotation: rot,
    })),
  ];

  // ── Compute bounding box ────────────────────────────────────────────

  const allPoints = [
    ...mainPath,
    ...otherPaths.flatMap((p) => p.points),
    ...buildingItems.flatMap((b) => b.points),
    ...waterItems.flatMap((w) => w.points),
    ...fenceItems.flatMap((f) => f.points),
    ...regionItems.flatMap((r) => r.points),
    ...treeItems.map((t) => t.pos),
    ...objectItems.map((o) => o.pos),
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
  const baseWidth = maxX - minX;
  const baseHeight = maxZ - minZ;

  // ── State ───────────────────────────────────────────────────────────

  type SelectionKind = 'building' | 'water' | 'fence' | 'region' | 'tree' | 'object';
  type DrawMode = 'none' | 'building' | 'field' | 'concrete' | 'tree' | 'bench' | 'lamppost' | 'tennisCourt' | 'floodlight';

  let selectedKind: SelectionKind | null = null;
  let selectedIndex: number = -1;
  let selectedSubVertex: number = -1;  // sub-selected vertex within polygon (-1 = none)
  let selectedSubEdge: number = -1;    // sub-selected edge within polygon (-1 = none)
  let drawMode: DrawMode = 'none';
  let drawingPoints: [number, number][] = [];
  let dragVertexInfo: { kind: SelectionKind; itemIdx: number; vertIdx: number } | null = null;
  let didDragVertex = false;  // true if mouse moved during a vertex drag

  // ── Build SVG ───────────────────────────────────────────────────────

  const svg = svgEl('svg', { viewBox: `${minX} ${-maxZ} ${baseWidth} ${baseHeight}` });
  svg.style.background = '#2a3a2a';
  const g = svgEl('g');
  svg.appendChild(g);

  const layerWater = svgEl('g', { 'data-layer': 'water' });
  const layerRegions = svgEl('g', { 'data-layer': 'regions' });
  const layerBuildings = svgEl('g', { 'data-layer': 'buildings' });
  const layerPaths = svgEl('g', { 'data-layer': 'paths' });
  const layerFences = svgEl('g', { 'data-layer': 'fences' });
  const layerMainPath = svgEl('g', { 'data-layer': 'mainPath' });
  const layerTrees = svgEl('g', { 'data-layer': 'trees' });
  const layerObjects = svgEl('g', { 'data-layer': 'objects' });
  const layerHandles = svgEl('g', { 'data-layer': 'handles' });
  const layerDrawing = svgEl('g', { 'data-layer': 'drawing' });

  g.appendChild(layerWater);
  g.appendChild(layerRegions);
  g.appendChild(layerBuildings);
  g.appendChild(layerPaths);
  g.appendChild(layerFences);
  g.appendChild(layerMainPath);
  g.appendChild(layerTrees);
  g.appendChild(layerObjects);
  g.appendChild(layerHandles);
  g.appendChild(layerDrawing);

  const pt = (_x: number, _z: number) => `${_x},${-_z}`;
  const polyPoints = (pts: [number, number][]) => pts.map(([x, z]) => pt(x, z)).join(' ');
  const pathD = (pts: [number, number][]) =>
    pts.map(([x, z], i) => `${i === 0 ? 'M' : 'L'}${x},${-z}`).join(' ');

  // ── Viewbox state ───────────────────────────────────────────────────

  let vbX = minX, vbY = -maxZ, vbW = baseWidth, vbH = baseHeight;

  function updateViewBox() {
    svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    updateScaleBar();
    updateHandleScale();
  }

  // ── SVG ↔ screen conversion ─────────────────────────────────────────

  function clientToSvg(clientX: number, clientY: number): [number, number] {
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) {
      // Fallback — shouldn't happen
      const rect = svg.getBoundingClientRect();
      const svgX = vbX + ((clientX - rect.left) / rect.width) * vbW;
      const svgY = vbY + ((clientY - rect.top) / rect.height) * vbH;
      return [svgX, -svgY];
    }
    const transformed = point.matrixTransform(ctm.inverse());
    return [transformed.x, -transformed.y]; // un-flip Z back to [x, z]
  }

  // ── Handle (vertex) scale management ────────────────────────────────

  let handleRadius = 3;

  function updateHandleScale() {
    handleRadius = Math.max(vbW, vbH) * 0.004;
    const handles = layerHandles.querySelectorAll('circle');
    handles.forEach((h) => h.setAttribute('r', String(handleRadius)));
  }

  // ── Render functions ────────────────────────────────────────────────

  function renderWater() {
    layerWater.innerHTML = '';
    for (let i = 0; i < waterItems.length; i++) {
      const w = waterItems[i];
      if (w.points.length < 3) continue;
      const isSel = selectedKind === 'water' && selectedIndex === i;
      const poly = svgEl('polygon', {
        points: polyPoints(w.points),
        fill: w.type === 'river' ? COLORS.river : COLORS.water,
        'fill-opacity': 0.6,
        stroke: isSel ? COLORS.selected : (w.type === 'river' ? COLORS.river : COLORS.water),
        'stroke-width': isSel ? 2 : 0.5,
        'stroke-opacity': 0.8,
        'data-kind': 'water',
        'data-idx': i,
      });
      poly.style.cursor = 'pointer';
      layerWater.appendChild(poly);
    }
  }

  function renderRegions() {
    layerRegions.innerHTML = '';
    for (let i = 0; i < regionItems.length; i++) {
      const r = regionItems[i];
      if (r.points.length < 3) continue;
      const isSel = selectedKind === 'region' && selectedIndex === i;
      const color = r.type === 'concrete' ? COLORS.concrete : COLORS.field;
      const poly = svgEl('polygon', {
        points: polyPoints(r.points),
        fill: color,
        'fill-opacity': 0.35,
        stroke: isSel ? COLORS.selected : color,
        'stroke-width': isSel ? 2 : 0.8,
        'stroke-opacity': 0.9,
        'stroke-dasharray': '3,1.5',
        'data-kind': 'region',
        'data-idx': i,
      });
      poly.style.cursor = 'pointer';
      layerRegions.appendChild(poly);
    }
  }

  function renderBuildings() {
    layerBuildings.innerHTML = '';
    for (let i = 0; i < buildingItems.length; i++) {
      const b = buildingItems[i];
      if (b.points.length < 3) continue;
      const fill = b.type === 'red' ? COLORS.buildingRed : b.type === 'green' ? COLORS.buildingGreen : b.type === 'yellow' ? COLORS.buildingYellow : b.type === 'kristineberg' ? COLORS.buildingKristineberg : COLORS.buildingGrey;
      const isSel = selectedKind === 'building' && selectedIndex === i;
      const poly = svgEl('polygon', {
        points: polyPoints(b.points),
        fill,
        'fill-opacity': 0.7,
        stroke: isSel ? COLORS.selected : fill,
        'stroke-width': isSel ? 2 : 0.3,
        'stroke-opacity': 1,
        'data-kind': 'building',
        'data-idx': i,
      });
      poly.style.cursor = 'pointer';
      layerBuildings.appendChild(poly);
    }
  }

  function renderFences() {
    layerFences.innerHTML = '';
    for (let i = 0; i < fenceItems.length; i++) {
      const f = fenceItems[i];
      if (f.points.length < 2) continue;
      const isSel = selectedKind === 'fence' && selectedIndex === i;
      const closed = pathD(f.points) + ' Z';
      const p = svgEl('path', {
        d: closed,
        fill: 'none',
        stroke: isSel ? COLORS.selected : COLORS.fence,
        'stroke-width': isSel ? 2 : 1.5,
        'stroke-dasharray': '4,2',
        'stroke-opacity': 0.9,
        'stroke-linecap': 'round',
        'data-kind': 'fence',
        'data-idx': i,
      });
      p.style.cursor = 'pointer';
      layerFences.appendChild(p);
    }
  }

  function renderTrees() {
    layerTrees.innerHTML = '';
    const r = Math.max(vbW, vbH) * 0.003;
    for (let i = 0; i < treeItems.length; i++) {
      const t = treeItems[i];
      const isSel = selectedKind === 'tree' && selectedIndex === i;
      const circle = svgEl('circle', {
        cx: t.pos[0],
        cy: -t.pos[1],
        r,
        fill: isSel ? COLORS.selected : COLORS.tree,
        stroke: '#114411',
        'stroke-width': r * 0.3,
        'data-kind': 'tree',
        'data-idx': i,
      });
      circle.style.cursor = 'pointer';
      layerTrees.appendChild(circle);
    }
  }

  const OBJECT_COLORS: Record<ObjectKind, string> = {
    bench: COLORS.bench,
    lamppost: COLORS.lamppost,
    tennisCourt: COLORS.tennisCourt,
    floodlight: COLORS.floodlight,
  };

  function renderObjects() {
    layerObjects.innerHTML = '';
    const s = Math.max(vbW, vbH) * 0.005;
    for (let i = 0; i < objectItems.length; i++) {
      const o = objectItems[i];
      const isSel = selectedKind === 'object' && selectedIndex === i;
      const cx = o.pos[0];
      const cy = -o.pos[1];
      const rot = -o.rotation;
      const color = isSel ? COLORS.selected : OBJECT_COLORS[o.kind];

      const group = svgEl('g', {
        transform: `translate(${cx},${cy}) rotate(${rot})`,
        'data-kind': 'object',
        'data-idx': i,
      });
      group.style.cursor = 'pointer';

      if (o.kind === 'bench') {
        const rect = svgEl('rect', {
          x: -s * 1.2, y: -s * 0.5, width: s * 2.4, height: s * 1,
          fill: color, stroke: isSel ? '#fff' : '#5a4510',
          'stroke-width': s * 0.12, rx: s * 0.1,
        });
        group.appendChild(rect);
        const indicator = svgEl('line', {
          x1: 0, y1: -s * 0.5, x2: 0, y2: -s * 0.9,
          stroke: isSel ? '#fff' : '#c8a020',
          'stroke-width': s * 0.15, 'stroke-linecap': 'round',
        });
        group.appendChild(indicator);
      } else if (o.kind === 'lamppost') {
        const circle = svgEl('circle', {
          cx: 0, cy: 0, r: s * 0.6,
          fill: color, stroke: isSel ? '#fff' : '#555566',
          'stroke-width': s * 0.12,
        });
        group.appendChild(circle);
        const dot = svgEl('circle', {
          cx: 0, cy: 0, r: s * 0.2,
          fill: isSel ? '#fff' : '#eeee88',
        });
        group.appendChild(dot);
        const indicator = svgEl('line', {
          x1: 0, y1: -s * 0.6, x2: 0, y2: -s * 1.0,
          stroke: isSel ? '#fff' : '#aaaa77',
          'stroke-width': s * 0.12, 'stroke-linecap': 'round',
        });
        group.appendChild(indicator);
      } else if (o.kind === 'tennisCourt') {
        const rect = svgEl('rect', {
          x: -s * 2.0, y: -s * 1.0, width: s * 4.0, height: s * 2.0,
          fill: color, stroke: isSel ? '#fff' : '#1a6636',
          'stroke-width': s * 0.12, rx: s * 0.05,
        });
        group.appendChild(rect);
        const net = svgEl('line', {
          x1: -s * 2.0, y1: 0, x2: s * 2.0, y2: 0,
          stroke: '#ffffff', 'stroke-width': s * 0.08, 'stroke-opacity': '0.6',
        });
        group.appendChild(net);
        const indicator = svgEl('line', {
          x1: 0, y1: -s * 1.0, x2: 0, y2: -s * 1.4,
          stroke: isSel ? '#fff' : '#80cc80',
          'stroke-width': s * 0.15, 'stroke-linecap': 'round',
        });
        group.appendChild(indicator);
      } else if (o.kind === 'floodlight') {
        // Tall tower icon — outer ring + inner bright dot + cross-hairs
        const outerRing = svgEl('circle', {
          cx: 0, cy: 0, r: s * 0.9,
          fill: 'none', stroke: isSel ? '#fff' : color,
          'stroke-width': s * 0.15,
        });
        group.appendChild(outerRing);
        const innerDot = svgEl('circle', {
          cx: 0, cy: 0, r: s * 0.35,
          fill: isSel ? '#fff' : '#ffcc44',
        });
        group.appendChild(innerDot);
        // Direction indicator
        const indicator = svgEl('line', {
          x1: 0, y1: -s * 0.9, x2: 0, y2: -s * 1.3,
          stroke: isSel ? '#fff' : '#dd8811',
          'stroke-width': s * 0.12, 'stroke-linecap': 'round',
        });
        group.appendChild(indicator);
      }

      layerObjects.appendChild(group);
    }
  }

  function renderOtherPaths() {
    layerPaths.innerHTML = '';
    for (const p of otherPaths) {
      if (p.points.length < 2) continue;
      const color = COLORS[p.type as keyof typeof COLORS] ?? COLORS.path;
      const pathEl = svgEl('path', {
        d: pathD(p.points),
        fill: 'none',
        stroke: color,
        'stroke-width': 1.2,
        'stroke-opacity': 0.7,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      });
      layerPaths.appendChild(pathEl);
    }
  }

  function renderMainPath() {
    layerMainPath.innerHTML = '';
    if (mainPath.length < 2) return;
    const outline = svgEl('path', {
      d: pathD(mainPath),
      fill: 'none',
      stroke: '#000',
      'stroke-width': 4,
      'stroke-opacity': 0.3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    layerMainPath.appendChild(outline);
    const mainEl = svgEl('path', {
      d: pathD(mainPath),
      fill: 'none',
      stroke: COLORS.mainPath,
      'stroke-width': 2.5,
      'stroke-opacity': 1,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
    layerMainPath.appendChild(mainEl);
    const [sx, sz] = mainPath[0];
    layerMainPath.appendChild(svgEl('circle', {
      cx: sx, cy: -sz, r: 3,
      fill: '#40d040', stroke: '#fff', 'stroke-width': 1,
    }));
    const [ex, ez] = mainPath[mainPath.length - 1];
    if (Math.hypot(ex - sx, ez - sz) > 5) {
      layerMainPath.appendChild(svgEl('circle', {
        cx: ex, cy: -ez, r: 3,
        fill: '#d04040', stroke: '#fff', 'stroke-width': 1,
      }));
    }
  }

  function renderHandles() {
    layerHandles.innerHTML = '';
    if (selectedKind === null || selectedIndex < 0) return;
    if (selectedKind === 'tree') return;
    if (selectedKind === 'object') return;

    let points: [number, number][] = [];
    if (selectedKind === 'building') points = buildingItems[selectedIndex]?.points ?? [];
    else if (selectedKind === 'water') points = waterItems[selectedIndex]?.points ?? [];
    else if (selectedKind === 'fence') points = fenceItems[selectedIndex]?.points ?? [];
    else if (selectedKind === 'region') points = regionItems[selectedIndex]?.points ?? [];
    for (let vi = 0; vi < points.length; vi++) {
      const [x, z] = points[vi];
      const isSub = selectedSubVertex === vi;
      const handle = svgEl('circle', {
        cx: x,
        cy: -z,
        r: isSub ? handleRadius * 1.5 : handleRadius,
        fill: isSub ? '#ff4444' : '#ffcc00',
        stroke: isSub ? '#fff' : '#000',
        'stroke-width': handleRadius * 0.25,
        'data-handle': 'true',
        'data-kind': selectedKind,
        'data-item-idx': selectedIndex,
        'data-vert-idx': vi,
      });
      handle.style.cursor = 'move';
      layerHandles.appendChild(handle);
    }

    // Edge midpoint markers (clickable to add a vertex)
    if (points.length >= 2) {
      const edgeCount = points.length; // closed polygon: last→first too
      for (let ei = 0; ei < edgeCount; ei++) {
        const [x1, z1] = points[ei];
        const [x2, z2] = points[(ei + 1) % points.length];
        const mx = (x1 + x2) / 2;
        const mz = (z1 + z2) / 2;
        const isSub = selectedSubEdge === ei;
        const markerSize = handleRadius * (isSub ? 1.4 : 1.0);
        const marker = svgEl('rect', {
          x: mx - markerSize,
          y: -mz - markerSize,
          width: markerSize * 2,
          height: markerSize * 2,
          fill: isSub ? '#44aaff' : 'rgba(255,255,255,0.35)',
          stroke: isSub ? '#fff' : 'rgba(255,255,255,0.6)',
          'stroke-width': handleRadius * 0.2,
          rx: handleRadius * 0.2,
          'data-edge': 'true',
          'data-edge-idx': ei,
        });
        marker.style.cursor = 'pointer';
        layerHandles.appendChild(marker);
      }
    }
  }

  function renderDrawing() {
    layerDrawing.innerHTML = '';
    if (drawMode === 'none' || drawingPoints.length === 0) return;
    if (drawMode !== 'building' && drawMode !== 'field' && drawMode !== 'concrete') return;
    const color = drawMode === 'building' ? COLORS.buildingGrey : (drawMode === 'concrete' ? COLORS.concrete : COLORS.field);
    if (drawingPoints.length >= 2) {
      const d = pathD(drawingPoints);
      layerDrawing.appendChild(svgEl('path', {
        d,
        fill: 'none',
        stroke: color,
        'stroke-width': 1.5,
        'stroke-dasharray': '5,3',
        'stroke-opacity': 0.8,
      }));
    }
    for (const [x, z] of drawingPoints) {
      layerDrawing.appendChild(svgEl('circle', {
        cx: x, cy: -z, r: handleRadius,
        fill: color, stroke: '#fff', 'stroke-width': handleRadius * 0.3,
      }));
    }
  }

  function renderAll() {
    renderWater();
    renderRegions();
    renderBuildings();
    renderFences();
    renderOtherPaths();
    renderMainPath();
    renderTrees();
    renderObjects();
    renderHandles();
    renderDrawing();
  }

  renderAll();
  appEl.appendChild(svg);

  // ── Selection & sidebar ─────────────────────────────────────────────

  function select(kind: SelectionKind | null, idx: number) {
    selectedKind = kind;
    selectedIndex = idx;
    selectedSubVertex = -1;
    selectedSubEdge = -1;
    renderAll();
    renderSidebar();
  }

  function deleteSelected() {
    if (selectedKind === null || selectedIndex < 0) return;
    if (selectedKind === 'building') buildingItems.splice(selectedIndex, 1);
    else if (selectedKind === 'water') waterItems.splice(selectedIndex, 1);
    else if (selectedKind === 'fence') fenceItems.splice(selectedIndex, 1);
    else if (selectedKind === 'region') regionItems.splice(selectedIndex, 1);
    else if (selectedKind === 'tree') treeItems.splice(selectedIndex, 1);
    else if (selectedKind === 'object') objectItems.splice(selectedIndex, 1);
    select(null, -1);
  }

  function renderSidebar() {
    sidebarEl.innerHTML = '';

    // Title
    const title = document.createElement('h3');
    title.textContent = level.name;
    title.style.cssText = 'color:#fff;font-size:13px;margin:0 0 8px;';
    sidebarEl.appendChild(title);

    // ── Draw tools ──
    const drawSection = document.createElement('div');
    drawSection.className = 'sidebar-section';
    const drawTitle = document.createElement('div');
    drawTitle.className = 'sidebar-section-title';
    drawTitle.textContent = 'Draw Tools';
    drawSection.appendChild(drawTitle);

    const drawTools: [string, DrawMode, string][] = [
      ['Building', 'building', COLORS.buildingGrey],
      ['Field', 'field', COLORS.field],
      ['Concrete', 'concrete', COLORS.concrete],
      ['Tree', 'tree', COLORS.tree],
      ['Bench', 'bench', COLORS.bench],
      ['Lamppost', 'lamppost', COLORS.lamppost],
      ['Tennis Court', 'tennisCourt', COLORS.tennisCourt],
      ['Floodlight', 'floodlight', COLORS.floodlight],
    ];
    for (const [label, mode, color] of drawTools) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.className = 'draw-btn' + (drawMode === mode ? ' active' : '');
      btn.style.borderColor = drawMode === mode ? color : 'rgba(255,255,255,0.15)';
      btn.addEventListener('click', () => {
        if (drawMode === mode) {
          drawMode = 'none';
          drawingPoints = [];
        } else {
          drawMode = mode;
          drawingPoints = [];
          select(null, -1);
          return; // select() already calls renderSidebar
        }
        renderDrawing();
        renderSidebar();
      });
      drawSection.appendChild(btn);
    }

    const isPolygonDraw = drawMode === 'building' || drawMode === 'field' || drawMode === 'concrete';
    if (isPolygonDraw) {
      const hint = document.createElement('div');
      hint.className = 'sidebar-hint';
      hint.textContent = 'Click to add points. Double-click to finish.';
      drawSection.appendChild(hint);
    }
    if (drawMode === 'tree') {
      const hint = document.createElement('div');
      hint.className = 'sidebar-hint';
      hint.textContent = 'Click on map to place trees.';
      drawSection.appendChild(hint);
    }
    if (drawMode === 'bench' || drawMode === 'lamppost' || drawMode === 'tennisCourt' || drawMode === 'floodlight') {
      const hint = document.createElement('div');
      hint.className = 'sidebar-hint';
      hint.textContent = 'Click to place. Scroll-wheel on placed object to rotate.';
      drawSection.appendChild(hint);
    }
    sidebarEl.appendChild(drawSection);
    sidebarEl.appendChild(makeDivider());

    // ── Layer toggles ──
    const layerSection = document.createElement('div');
    layerSection.className = 'sidebar-section';
    const layerTitle2 = document.createElement('div');
    layerTitle2.className = 'sidebar-section-title';
    layerTitle2.textContent = 'Layers';
    layerSection.appendChild(layerTitle2);

    const layerToggles: [string, string, SVGGElement][] = [
      ['Main path', COLORS.mainPath, layerMainPath],
      ['Paths', COLORS.footway, layerPaths],
      ['Buildings', COLORS.buildingGrey, layerBuildings],
      ['Water', COLORS.water, layerWater],
      ['Regions', COLORS.field, layerRegions],
      ['Fences', COLORS.fence, layerFences],
      ['Trees', COLORS.tree, layerTrees],
      ['Objects', COLORS.bench, layerObjects],
    ];
    for (const [label, color, layer] of layerToggles) {
      const row = document.createElement('div');
      row.className = 'sidebar-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = layer.style.display !== 'none';
      cb.addEventListener('change', () => { layer.style.display = cb.checked ? '' : 'none'; });
      const swatch = document.createElement('div');
      swatch.className = 'sidebar-swatch';
      swatch.style.background = color;
      const lbl = document.createElement('label');
      lbl.textContent = label;
      lbl.addEventListener('click', () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); });
      row.appendChild(cb);
      row.appendChild(swatch);
      row.appendChild(lbl);
      layerSection.appendChild(row);
    }
    sidebarEl.appendChild(layerSection);
    sidebarEl.appendChild(makeDivider());

    // ── Selection info ──
    if (selectedKind !== null && selectedIndex >= 0) {
      const selSection = document.createElement('div');
      selSection.className = 'sidebar-section';
      const selTitle = document.createElement('div');
      selTitle.className = 'sidebar-section-title';
      selTitle.textContent = 'Selected';
      selSection.appendChild(selTitle);

      const info = document.createElement('div');
      info.className = 'sidebar-info';
      if (selectedKind === 'building') {
        const b = buildingItems[selectedIndex];
        info.textContent = `Building #${selectedIndex} — ${b.points.length} verts`;

        const typeRow = document.createElement('div');
        typeRow.style.cssText = 'display:flex;gap:4px;margin-top:6px;align-items:center;';
        const typeLabel = document.createElement('span');
        typeLabel.style.cssText = 'color:#ccc;font-size:11px;';
        typeLabel.textContent = 'Type:';
        typeRow.appendChild(typeLabel);

        const typeSelect = document.createElement('select');
        typeSelect.style.cssText = 'flex:1;background:#333;color:#fff;border:1px solid #555;border-radius:3px;padding:2px 4px;font-size:11px;';
        const buildingTypes: { value: BuildingType; label: string; color: string }[] = [
          { value: 'grey', label: 'Grey', color: COLORS.buildingGrey },
          { value: 'red', label: 'Red', color: COLORS.buildingRed },
          { value: 'green', label: 'Green', color: COLORS.buildingGreen },
          { value: 'yellow', label: 'Yellow', color: COLORS.buildingYellow },
          { value: 'kristineberg', label: 'Kristineberg', color: COLORS.buildingKristineberg },
        ];
        for (const bt of buildingTypes) {
          const opt = document.createElement('option');
          opt.value = bt.value;
          opt.textContent = bt.label;
          if (bt.value === b.type) opt.selected = true;
          typeSelect.appendChild(opt);
        }
        typeSelect.addEventListener('change', () => {
          b.type = typeSelect.value as BuildingType;
          renderBuildings();
          renderSidebar();
        });
        typeRow.appendChild(typeSelect);
        selSection.appendChild(typeRow);
      } else if (selectedKind === 'water') {
        const w = waterItems[selectedIndex];
        info.textContent = `Water #${selectedIndex} (${w.type}) — ${w.points.length} verts`;
      } else if (selectedKind === 'fence') {
        info.textContent = `Fence #${selectedIndex} — ${fenceItems[selectedIndex].points.length} verts`;
      } else if (selectedKind === 'region') {
        const r = regionItems[selectedIndex];
        const labels: Record<RegionType, string> = { field: 'Field', concrete: 'Concrete' };
        info.textContent = `${labels[r.type]} #${selectedIndex} — ${r.points.length} verts`;
      } else if (selectedKind === 'tree') {
        const t = treeItems[selectedIndex];
        info.textContent = `Tree #${selectedIndex} @ (${t.pos[0].toFixed(1)}, ${t.pos[1].toFixed(1)})`;
      } else if (selectedKind === 'object') {
        const o = objectItems[selectedIndex];
        const labels: Record<ObjectKind, string> = { bench: 'Bench', lamppost: 'Lamppost', tennisCourt: 'Tennis Court', floodlight: 'Floodlight' };
        info.textContent = `${labels[o.kind]} #${selectedIndex} rot=${o.rotation.toFixed(0)}°`;
      }
      selSection.appendChild(info);

      // ── Vertex/edge sub-selection controls for polygons ──
      const isPolygon = selectedKind === 'building' || selectedKind === 'water' || selectedKind === 'fence' || selectedKind === 'region';
      if (isPolygon) {
        let points: [number, number][] = [];
        if (selectedKind === 'building') points = buildingItems[selectedIndex]?.points ?? [];
        else if (selectedKind === 'water') points = waterItems[selectedIndex]?.points ?? [];
        else if (selectedKind === 'fence') points = fenceItems[selectedIndex]?.points ?? [];
        else if (selectedKind === 'region') points = regionItems[selectedIndex]?.points ?? [];

        if (selectedSubVertex >= 0 && selectedSubVertex < points.length) {
          const subInfo = document.createElement('div');
          subInfo.className = 'sidebar-info';
          subInfo.style.cssText = 'color:#ff8888;margin-top:4px;';
          subInfo.textContent = `Vertex #${selectedSubVertex} selected`;
          selSection.appendChild(subInfo);

          const removeVertBtn = document.createElement('button');
          removeVertBtn.textContent = 'Remove Vertex';
          removeVertBtn.className = 'delete-btn';
          removeVertBtn.style.cssText += 'margin-top:4px;display:block;width:100%;';
          removeVertBtn.addEventListener('click', () => {
            if (points.length <= 3) return; // minimum 3 for polygon
            points.splice(selectedSubVertex, 1);
            selectedSubVertex = -1;
            renderAll();
            renderSidebar();
          });
          selSection.appendChild(removeVertBtn);
          if (points.length <= 3) {
            removeVertBtn.disabled = true;
            removeVertBtn.style.opacity = '0.4';
            removeVertBtn.title = 'Polygon needs at least 3 vertices';
          }
        } else if (selectedSubEdge >= 0 && selectedSubEdge < points.length) {
          const ei = selectedSubEdge;
          const [x1, z1] = points[ei];
          const [x2, z2] = points[(ei + 1) % points.length];
          const subInfo = document.createElement('div');
          subInfo.className = 'sidebar-info';
          subInfo.style.cssText = 'color:#88aaff;margin-top:4px;';
          subInfo.textContent = `Edge #${ei}→#${(ei + 1) % points.length} selected`;
          selSection.appendChild(subInfo);

          const addVertBtn = document.createElement('button');
          addVertBtn.textContent = 'Add Vertex at Midpoint';
          addVertBtn.style.cssText = 'margin-top:4px;display:block;width:100%;padding:5px 0;background:#2a3a5a;color:#88ccff;border:1px solid rgba(100,160,220,0.3);border-radius:4px;cursor:pointer;font-size:11px;text-align:center;';
          addVertBtn.addEventListener('click', () => {
            const mid: [number, number] = [(x1 + x2) / 2, (z1 + z2) / 2];
            points.splice(ei + 1, 0, mid);
            selectedSubEdge = -1;
            selectedSubVertex = ei + 1; // auto-select the new vertex
            renderAll();
            renderSidebar();
          });
          selSection.appendChild(addVertBtn);
        } else {
          const subHint = document.createElement('div');
          subHint.className = 'sidebar-hint';
          subHint.textContent = 'Click a vertex (circle) to select it, or an edge midpoint (square) to add a point.';
          selSection.appendChild(subHint);
        }
      }

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;gap:4px;margin-top:6px;';

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'delete-btn';
      delBtn.addEventListener('click', deleteSelected);
      btnRow.appendChild(delBtn);

      const deselectBtn = document.createElement('button');
      deselectBtn.textContent = 'Deselect';
      deselectBtn.className = 'deselect-btn';
      deselectBtn.addEventListener('click', () => select(null, -1));
      btnRow.appendChild(deselectBtn);

      // Rotation control for objects
      if (selectedKind === 'object') {
        const rotRow = document.createElement('div');
        rotRow.style.cssText = 'display:flex;gap:4px;margin-top:6px;align-items:center;';
        const rotLabel = document.createElement('span');
        rotLabel.style.cssText = 'color:#ccc;font-size:11px;';
        rotLabel.textContent = 'Rotation:';
        rotRow.appendChild(rotLabel);

        const rotInput = document.createElement('input');
        rotInput.type = 'number';
        rotInput.min = '0';
        rotInput.max = '359';
        rotInput.step = '15';
        rotInput.value = String(Math.round(objectItems[selectedIndex].rotation));
        rotInput.style.cssText = 'width:60px;background:#333;color:#fff;border:1px solid #555;border-radius:3px;padding:2px 4px;font-size:11px;';
        rotInput.addEventListener('input', () => {
          const raw = parseFloat(rotInput.value) || 0;
          objectItems[selectedIndex].rotation = ((raw % 360) + 360) % 360;
          renderObjects();
        });
        rotRow.appendChild(rotInput);

        const degLabel = document.createElement('span');
        degLabel.style.cssText = 'color:#888;font-size:11px;';
        degLabel.textContent = '°';
        rotRow.appendChild(degLabel);
        selSection.appendChild(rotRow);
      }

      selSection.appendChild(btnRow);
      sidebarEl.appendChild(selSection);
      sidebarEl.appendChild(makeDivider());
    }

    // ── Export section ──
    const exportSection = document.createElement('div');
    exportSection.className = 'sidebar-section';
    const exportTitle = document.createElement('div');
    exportTitle.className = 'sidebar-section-title';
    exportTitle.textContent = 'Export JSON';
    exportSection.appendChild(exportTitle);

    const exportItems: [string, () => unknown][] = [
      ['buildings.json', () => buildingItems.map((b) => ({
        type: b.type,
        points: b.points.map(([x, z]) => localToGps(x, z, origin)),
      }))],
      ['water.json', () => waterItems.map((w) => ({
        type: w.type,
        coords: w.points.map(([x, z]) => {
          const [lat, lon] = localToGps(x, z, origin);
          return [lon, lat];
        }),
      }))],
      ['regions.json', () => {
        const result: Record<string, unknown> = {};
        const fields = regionItems.filter(r => r.type === 'field');
        const concretes = regionItems.filter(r => r.type === 'concrete');
        if (fields.length) result.fields = fields.map(f => f.points.map(([x, z]) => localToGps(x, z, origin)));
        if (concretes.length) result.concrete = concretes.map(c => c.points.map(([x, z]) => localToGps(x, z, origin)));
        return result;
      }],
      ['fences.json', () => fenceItems.map((f) => ({
        points: f.points.map(([x, z]) => localToGps(x, z, origin)),
      }))],
      ['trees.json', () => treeItems.map((t) => localToGps(t.pos[0], t.pos[1], origin))],
      ['objects.json', () => {
        const toGps = (items: ObjectItem[]) => items.map((o) => {
          const [lat, lon] = localToGps(o.pos[0], o.pos[1], origin);
          return [lat, lon, Math.round(o.rotation * 10) / 10];
        });
        const result: Record<string, unknown> = {};
        const benches = objectItems.filter(o => o.kind === 'bench');
        const lampposts = objectItems.filter(o => o.kind === 'lamppost');
        const courts = objectItems.filter(o => o.kind === 'tennisCourt');
        const floodlights = objectItems.filter(o => o.kind === 'floodlight');
        if (benches.length) result.benches = toGps(benches);
        if (lampposts.length) result.lampposts = toGps(lampposts);
        if (courts.length) result.tennisCourts = toGps(courts);
        if (floodlights.length) result.floodlights = toGps(floodlights);
        return result;
      }],
    ];

    for (const [filename, getData] of exportItems) {
      const btn = document.createElement('button');
      btn.textContent = filename;
      btn.className = 'export-btn';
      btn.addEventListener('click', () => {
        const data = getData();
        const json = JSON.stringify(data, null, 2);
        navigator.clipboard.writeText(json).then(() => {
          btn.textContent = `✓ ${filename} copied!`;
          setTimeout(() => { btn.textContent = filename; }, 2000);
        }).catch(() => {
          const w = window.open('', '_blank');
          if (w) { w.document.write(`<pre>${json}</pre>`); }
        });
      });
      exportSection.appendChild(btn);
    }
    sidebarEl.appendChild(exportSection);
    sidebarEl.appendChild(makeDivider());

    // ── Reframe ──
    const reframeBtn = document.createElement('button');
    reframeBtn.textContent = 'Reframe';
    reframeBtn.className = 'reframe-btn';
    reframeBtn.addEventListener('click', () => {
      vbX = minX; vbY = -maxZ; vbW = baseWidth; vbH = baseHeight;
      updateViewBox();
    });
    sidebarEl.appendChild(reframeBtn);

    // Stats
    const statsEl = document.createElement('div');
    statsEl.className = 'sidebar-stats';
    statsEl.innerHTML = `${Math.round(courseLen)}m · ${buildingItems.length} bldgs · ${waterItems.length} water · ${regionItems.length} regions · ${treeItems.length} trees · ${objectItems.length} objects`;
    sidebarEl.appendChild(statsEl);
  }

  function makeDivider() {
    const d = document.createElement('hr');
    d.className = 'sidebar-divider';
    return d;
  }

  const courseLen = mainPath.reduce((sum, [x, z], i) => {
    if (i === 0) return 0;
    const [px, pz] = mainPath[i - 1];
    return sum + Math.hypot(x - px, z - pz);
  }, 0);

  renderSidebar();

  // ── Info bar ────────────────────────────────────────────────────────

  infoEl.innerHTML = `<strong>${level.name}</strong> — ${Math.round(courseLen)}m`;

  // ── Scale bar ───────────────────────────────────────────────────────

  const scaleLineEl = document.getElementById('scale-line')!;
  const scaleLabelEl = document.getElementById('scale-label')!;

  function updateScaleBar() {
    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width === 0) return;
    const metersPerPx = vbW / svgRect.width;
    const targetPx = 100;
    const rawMeters = metersPerPx * targetPx;
    const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    let niceMeters = niceSteps[niceSteps.length - 1];
    for (const s of niceSteps) {
      if (s >= rawMeters * 0.5) { niceMeters = s; break; }
    }
    const barPx = niceMeters / metersPerPx;
    scaleLineEl.style.width = `${Math.round(barPx)}px`;
    scaleLabelEl.textContent = niceMeters >= 1000 ? `${niceMeters / 1000} km` : `${niceMeters} m`;
  }
  updateScaleBar();

  // ── Click handling (selection + drawing) ────────────────────────────

  let justFinishedDraw = false;
  let lastClickTime = 0;

  svg.addEventListener('click', (e) => {
    if (justFinishedDraw) { justFinishedDraw = false; return; }
    const target = e.target as SVGElement;

    // Handle click (vertex sub-selection) — only if we didn't drag
    if (target.getAttribute('data-handle') === 'true' && !didDragVertex) {
      const vertIdx = parseInt(target.getAttribute('data-vert-idx')!, 10);
      selectedSubEdge = -1;
      selectedSubVertex = selectedSubVertex === vertIdx ? -1 : vertIdx; // toggle
      renderHandles();
      renderSidebar();
      return;
    }
    if (target.getAttribute('data-handle') === 'true') return; // was a drag, ignore click

    // Edge midpoint click
    if (target.getAttribute('data-edge') === 'true') {
      const edgeIdx = parseInt(target.getAttribute('data-edge-idx')!, 10);
      selectedSubVertex = -1;
      selectedSubEdge = selectedSubEdge === edgeIdx ? -1 : edgeIdx; // toggle
      renderHandles();
      renderSidebar();
      return;
    }

    const [x, z] = clientToSvg(e.clientX, e.clientY);

    // Drawing mode
    if (drawMode === 'tree') {
      treeItems.push({ pos: [x, z] });
      select('tree', treeItems.length - 1);
      return;
    }
    if (drawMode === 'bench' || drawMode === 'lamppost' || drawMode === 'tennisCourt' || drawMode === 'floodlight') {
      objectItems.push({ kind: drawMode, pos: [x, z], rotation: 0 });
      select('object', objectItems.length - 1);
      return;
    }
    if (drawMode === 'building' || drawMode === 'field' || drawMode === 'concrete') {
      const now = performance.now();
      if (now - lastClickTime < 400 && drawingPoints.length >= 3) {
        // Second click of a double-click — close the polygon immediately
        // (dblclick may not fire if renderDrawing replaced DOM elements)
        lastClickTime = 0;

        let newKind: SelectionKind;
        let newIdx: number;
        if (drawMode === 'building') {
          buildingItems.push({ type: 'grey', points: [...drawingPoints] });
          newKind = 'building';
          newIdx = buildingItems.length - 1;
        } else {
          const regionType: RegionType = drawMode === 'concrete' ? 'concrete' : 'field';
          regionItems.push({ type: regionType, points: [...drawingPoints] });
          newKind = 'region';
          newIdx = regionItems.length - 1;
        }
        drawingPoints = [];
        justFinishedDraw = true;
        drawMode = 'none';
        select(newKind, newIdx);
        return;
      }
      lastClickTime = now;
      drawingPoints.push([x, z]);
      renderDrawing();
      return;
    }

    // Selection mode
    let kind = target.getAttribute('data-kind') as SelectionKind | null;
    let idx = target.getAttribute('data-idx');
    // Object elements are nested in <g> — walk up
    if (!kind) {
      const group = (target as Element).closest?.('[data-kind]') as SVGElement | null;
      if (group) {
        kind = group.getAttribute('data-kind') as SelectionKind;
        idx = group.getAttribute('data-idx');
      }
    }
    if (kind && idx !== null) {
      select(kind, parseInt(idx, 10));
    } else {
      select(null, -1);
    }
  });

  svg.addEventListener('dblclick', (e) => {
    if (drawMode !== 'building' && drawMode !== 'field' && drawMode !== 'concrete') return;
    if (drawingPoints.length < 3) return;

    e.preventDefault();
    e.stopPropagation();

    let newKind: SelectionKind;
    let newIdx: number;
    if (drawMode === 'building') {
      buildingItems.push({ type: 'grey', points: [...drawingPoints] });
      newKind = 'building';
      newIdx = buildingItems.length - 1;
    } else {
      const regionType: RegionType = drawMode === 'concrete' ? 'concrete' : 'field';
      regionItems.push({ type: regionType, points: [...drawingPoints] });
      newKind = 'region';
      newIdx = regionItems.length - 1;
    }

    drawingPoints = [];
    justFinishedDraw = true;
    drawMode = 'none';
    select(newKind, newIdx);
  });

  // ── Vertex dragging ─────────────────────────────────────────────────

  let panning = false;
  let panDragStartX = 0, panDragStartY = 0;
  let panVbX = 0, panVbY = 0;

  svg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const target = e.target as SVGElement;

    // Handle drag
    if (target.getAttribute('data-handle') === 'true') {
      const kind = target.getAttribute('data-kind') as SelectionKind;
      const itemIdx = parseInt(target.getAttribute('data-item-idx')!, 10);
      const vertIdx = parseInt(target.getAttribute('data-vert-idx')!, 10);
      dragVertexInfo = { kind, itemIdx, vertIdx };
      didDragVertex = false; // will be set to true on first mousemove
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Tree drag
    if (target.getAttribute('data-kind') === 'tree' && drawMode !== 'tree') {
      const idx = parseInt(target.getAttribute('data-idx')!, 10);
      if (idx >= 0 && idx < treeItems.length) {
        dragTreeIdx = idx;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Object drag
    const objGroup = (target as Element).closest?.('[data-kind="object"]') as SVGElement | null;
    if (objGroup && drawMode !== 'bench' && drawMode !== 'lamppost' && drawMode !== 'tennisCourt') {
      const idx = parseInt(objGroup.getAttribute('data-idx')!, 10);
      if (idx >= 0 && idx < objectItems.length) {
        dragObjectIdx = idx;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Pan
    panning = true;
    panDragStartX = e.clientX;
    panDragStartY = e.clientY;
    panVbX = vbX;
    panVbY = vbY;
    svg.classList.add('dragging');
  });

  let dragTreeIdx = -1;
  let dragObjectIdx = -1;

  window.addEventListener('mousemove', (e) => {
    // Vertex drag
    if (dragVertexInfo) {
      didDragVertex = true;
      const { kind, itemIdx, vertIdx } = dragVertexInfo;
      const [x, z] = clientToSvg(e.clientX, e.clientY);
      let points: [number, number][] | null = null;
      if (kind === 'building') points = buildingItems[itemIdx]?.points ?? null;
      else if (kind === 'water') points = waterItems[itemIdx]?.points ?? null;
      else if (kind === 'fence') points = fenceItems[itemIdx]?.points ?? null;
      else if (kind === 'region') points = regionItems[itemIdx]?.points ?? null;
      if (points && vertIdx < points.length) {
        points[vertIdx] = [x, z];
        renderAll();
      }
      return;
    }
    // Tree drag
    if (dragTreeIdx >= 0) {
      const [x, z] = clientToSvg(e.clientX, e.clientY);
      treeItems[dragTreeIdx].pos = [x, z];
      renderTrees();
      return;
    }
    // Object drag
    if (dragObjectIdx >= 0) {
      const [x, z] = clientToSvg(e.clientX, e.clientY);
      objectItems[dragObjectIdx].pos = [x, z];
      renderObjects();
      return;
    }
    // Pan
    if (!panning) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = vbW / rect.width;
    const scaleY = vbH / rect.height;
    vbX = panVbX - (e.clientX - panDragStartX) * scaleX;
    vbY = panVbY - (e.clientY - panDragStartY) * scaleY;
    updateViewBox();
  });

  window.addEventListener('mouseup', () => {
    if (dragVertexInfo) {
      dragVertexInfo = null;
      renderSidebar();
      return;
    }
    if (dragTreeIdx >= 0) {
      dragTreeIdx = -1;
      renderSidebar();
      return;
    }
    if (dragObjectIdx >= 0) {
      dragObjectIdx = -1;
      renderSidebar();
      return;
    }
    panning = false;
    svg.classList.remove('dragging');
  });

  // ── Zoom ────────────────────────────────────────────────────────────

  svg.addEventListener('wheel', (e) => {
    // Rotate object on scroll when hovering over one
    const target = e.target as SVGElement;
    const objGroup = target.closest?.('[data-kind="object"]') as SVGElement | null;
    if (objGroup) {
      const idx = parseInt(objGroup.getAttribute('data-idx')!, 10);
      if (idx >= 0 && idx < objectItems.length) {
        e.preventDefault();
        const step = e.deltaY > 0 ? 15 : -15;
        objectItems[idx].rotation = ((objectItems[idx].rotation + step) % 360 + 360) % 360;
        renderObjects();
        if (selectedKind === 'object' && selectedIndex === idx) renderSidebar();
        return;
      }
    }

    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    const mx = vbX + ((e.clientX - rect.left) / rect.width) * vbW;
    const my = vbY + ((e.clientY - rect.top) / rect.height) * vbH;
    const zoomFactor = e.deltaY > 0 ? 1.035 : 1 / 1.035;
    const newW = vbW * zoomFactor;
    const newH = vbH * zoomFactor;
    vbX = mx - ((mx - vbX) / vbW) * newW;
    vbY = my - ((my - vbY) / vbH) * newH;
    vbW = newW;
    vbH = newH;
    updateViewBox();
  }, { passive: false });

  // ── Keyboard shortcuts ──────────────────────────────────────────────

  window.addEventListener('keydown', (e) => {
    // Don't intercept keys when typing in an input
    const tag = (document.activeElement as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'Escape') {
      if (drawMode !== 'none') {
        drawMode = 'none';
        drawingPoints = [];
        renderDrawing();
        renderSidebar();
      } else if (selectedKind !== null) {
        select(null, -1);
      }
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedKind !== null) {
      e.preventDefault();
      deleteSelected();
    }
  });
}

main().catch((err) => {
  document.getElementById('info')!.innerHTML = `<strong>Error:</strong> ${err.message}`;
  console.error(err);
});
