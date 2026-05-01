/**
 * Player-centred rotating minimap rendered on a 2D canvas overlay.
 *
 * Shows 500 m of world around the bus.  The whole map rotates so that
 * the bus's forward direction always points UP on the canvas.
 *
 * Coordinate conventions (matching Game.ts):
 *   World X  = right
 *   World Z  = forward when yaw = 0
 *   busYaw   = 0 → facing +Z;  forward = (sin(yaw), cos(yaw)) in (x,z)
 *
 * Projection (bus-relative, rotated so forward = canvas up):
 *   minimap_x =  dx·cos(yaw) − dz·sin(yaw)
 *   minimap_y = −(dx·sin(yaw) + dz·cos(yaw))
 *
 * Gap detection uses an adaptive threshold computed from the segment-
 * length distribution so it works regardless of coordinate scaling.
 *
 * CSS size is capped at min(220px, 30vw).
 */

const MAX_VW = 0.3; // 30 vw
const PREFERRED_PX = 220; // desktop cap
const PAD = 8; // px inside the circle kept clear
const DEFAULT_VIEW_RADIUS = 500; // world-metres visible around the player
const LOOKAHEAD_SEGMENT_METRES = 300; // how far ahead to render guidance on minimap
const LOOKAHEAD_BACKTRACK_METRES = 150; // extra distance behind anchor to include
const LOOKAHEAD_SAMPLE_STEP = 12; // metres between sampled points along lookahead segment
const BORDER_W = 3;

const COL_BG = '#1e5e15';
const COL_PATH = '#c4a44a';
const COL_PATH_OUTLINE = '#6b5a10';
const COL_WATER = '#1a5faa';
const COL_ROAD = '#5a5a60';
const COL_TRAIL = '#1a4e12';
const COL_BUILDING_GREY = '#8f8f96';
const COL_BUILDING_RED = '#a94a46';
const COL_BUILDING_BLUE = '#3f7fc7';
const COL_BUILDING_GREEN = '#8C9E7E';
const COL_BUILDING_YELLOW = '#FFD021';
const COL_BORDER = '#ffffffcc';
const COL_LOOKAHEAD = '#ffffff';
const COL_LOOKAHEAD_OUTLINE = '#0f3c0a';


/** Info for one player marker on the minimap. */
export interface MinimapPlayer {
  x: number;
  z: number;
  yaw: number;
  color: string; // CSS colour for the arrow fill
  isLocal: boolean;
}

export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private pathPositions: [number, number][] = [];
  private pathCumDist: number[] = [];
  private pathTotalDist = 0;
  private waterZones: { points: [number, number][] }[] = [];
  private roads: [number, number][][] = [];
  private trails: [number, number][][] = [];
  private buildings: { type: 'grey' | 'red' | 'blue' | 'green' | 'yellow' | 'kristineberg'; points: [number, number][] }[] = [];


  private gapThresholdSq = Infinity; // adaptive gap detection
  private cssSize = PREFERRED_PX;

  private viewRadius = DEFAULT_VIEW_RADIUS;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.applyCssSize();
    window.addEventListener('resize', () => this.applyCssSize());
  }

  setZoom(multiplier: number) {
    this.viewRadius = DEFAULT_VIEW_RADIUS / Math.max(0.1, multiplier);
  }

  /* ---- public data setters ---- */

  setPath(positions: [number, number][]) {
    this.pathPositions = positions;
    this.computeGapThreshold();
    this.computePathDistances();
  }

  private computePathDistances() {
    this.pathCumDist = [0];
    if (this.pathPositions.length < 2) {
      this.pathTotalDist = 0;
      return;
    }

    for (let i = 1; i < this.pathPositions.length; i++) {
      const dx = this.pathPositions[i][0] - this.pathPositions[i - 1][0];
      const dz = this.pathPositions[i][1] - this.pathPositions[i - 1][1];
      const segLen = Math.sqrt(dx * dx + dz * dz);
      this.pathCumDist.push(this.pathCumDist[i - 1] + segLen);
    }
    this.pathTotalDist = this.pathCumDist[this.pathCumDist.length - 1] ?? 0;
  }

  setWaterZones(zones: { points: [number, number][] }[]) {
    this.waterZones = zones;
  }

  setRoads(roads: [number, number][][]) {
    this.roads = roads;
  }

  setTrails(trails: [number, number][][]) {
    this.trails = trails;
  }

  setBuildings(buildings: { type: 'grey' | 'red' | 'blue' | 'green' | 'yellow' | 'kristineberg'; points: [number, number][] }[]) {
    this.buildings = buildings;
  }



  /* ---- sizing ---- */

  private applyCssSize() {
    const vwPx = window.innerWidth * MAX_VW;
    this.cssSize = Math.min(PREFERRED_PX, Math.round(vwPx));
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.cssSize * dpr;
    this.canvas.height = this.cssSize * dpr;
    this.canvas.style.width = `${this.cssSize}px`;
    this.canvas.style.height = `${this.cssSize}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---- adaptive gap threshold ---- */

  private computeGapThreshold() {
    const pts = this.pathPositions;
    if (pts.length < 3) { this.gapThresholdSq = Infinity; return; }
    const lengths: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dz = pts[i][1] - pts[i - 1][1];
      lengths.push(Math.sqrt(dx * dx + dz * dz));
    }
    lengths.sort((a, b) => a - b);
    const median = lengths[Math.floor(lengths.length / 2)];
    const threshold = median * 8;
    this.gapThresholdSq = threshold * threshold;
  }

  /* ---- draw (called once per frame) ---- */

  draw(
    busX: number,
    busZ: number,
    busYaw: number,
    players: MinimapPlayer[] = [],
    lookaheadStart?: { x: number; z: number },
    passengerDots?: { x: number; z: number; color: string }[],
    passengerFlags?: { x: number; z: number; color: string }[],
  ) {
    const S = this.cssSize;
    const R = S / 2;
    const ctx = this.ctx;
    const sinY = Math.sin(busYaw);
    const cosY = Math.cos(busYaw);
    const scale = (R - PAD) / this.viewRadius;

    /** World position → canvas pixel, rotated so bus forward = up. */
    const project = (wx: number, wz: number): [number, number] => {
      const dx = wx - busX;
      const dz = wz - busZ;
      const mx = (dx * cosY - dz * sinY) * scale;
      const my = -(dx * sinY + dz * cosY) * scale;
      return [R + mx, R + my];
    };

    // --- clear & clip circle ---
    ctx.save();
    ctx.clearRect(0, 0, S, S);
    ctx.beginPath();
    ctx.arc(R, R, R - BORDER_W, 0, Math.PI * 2);
    ctx.clip();

    // Background
    ctx.fillStyle = COL_BG;
    ctx.fillRect(0, 0, S, S);

    // --- buildings ---
    for (const building of this.buildings) {
      if (building.points.length < 3) continue;
      ctx.beginPath();
      const [fx, fy] = project(building.points[0][0], building.points[0][1]);
      ctx.moveTo(fx, fy);
      for (let i = 1; i < building.points.length; i++) {
        const [px, py] = project(building.points[i][0], building.points[i][1]);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = building.type === 'red'
        ? COL_BUILDING_RED
        : building.type === 'blue'
          ? COL_BUILDING_BLUE
          : building.type === 'kristineberg'
            ? COL_BUILDING_BLUE
            : building.type === 'green'
              ? COL_BUILDING_GREEN
              : building.type === 'yellow'
                ? COL_BUILDING_YELLOW
                : COL_BUILDING_GREY;
      ctx.fill();
    }

    // --- water zones ---
    ctx.fillStyle = COL_WATER;
    for (const wz of this.waterZones) {
      if (wz.points.length < 3) continue;
      ctx.beginPath();
      const [fx, fy] = project(wz.points[0][0], wz.points[0][1]);
      ctx.moveTo(fx, fy);
      for (let i = 1; i < wz.points.length; i++) {
        const [px, py] = project(wz.points[i][0], wz.points[i][1]);
        ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // --- trails (under roads and main path) ---
    for (const trail of this.trails) {
      if (trail.length < 2) continue;
      this.strokePolyline(ctx, project, trail, 1.8, COL_TRAIL);
    }

    // --- roads (outline + core, slightly thicker than path) ---
    for (const road of this.roads) {
      if (road.length < 2) continue;
      this.strokePolyline(ctx, project, road, 3, COL_ROAD);
    }

    // --- path (outline + core for bordered-road look) ---
    if (this.pathPositions.length > 1) {
      this.strokePath(ctx, project, 6, COL_PATH_OUTLINE);
      this.strokePath(ctx, project, 3.5, COL_PATH);
      if (lookaheadStart) {
        this.drawLookaheadSegment(
          ctx,
          project,
          lookaheadStart.x,
          lookaheadStart.z,
        );
      }
    }

    // --- passenger dots (waiting passengers) ---
    if (passengerDots) {
      for (const dot of passengerDots) {
        const [dx, dy] = project(dot.x, dot.z);
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // --- passenger flags (delivery targets) ---
    if (passengerFlags) {
      for (const flag of passengerFlags) {
        const [fx, fy] = project(flag.x, flag.z);
        // Draw a small flag icon: pole + triangular flag
        const poleH = 14;
        const flagW = 8;
        const flagH = 7;
        // Pole
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.lineTo(fx, fy - poleH);
        ctx.stroke();
        // Triangular flag
        ctx.fillStyle = flag.color;
        ctx.beginPath();
        ctx.moveTo(fx, fy - poleH);
        ctx.lineTo(fx + flagW, fy - poleH + flagH / 2);
        ctx.lineTo(fx, fy - poleH + flagH);
        ctx.closePath();
        ctx.fill();
        // White outline for flag
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // --- player arrows: remote players first, then local on top ---
    const remotes = players.filter(p => !p.isLocal);
    const locals = players.filter(p => p.isLocal);
    for (const p of [...remotes, ...locals]) {
      this.drawPlayerArrow(ctx, project, p, busYaw);
    }

    ctx.restore();

    // --- border ring (outside clip) ---
    ctx.beginPath();
    ctx.arc(R, R, R - BORDER_W / 2, 0, Math.PI * 2);
    ctx.strokeStyle = COL_BORDER;
    ctx.lineWidth = BORDER_W;
    ctx.stroke();
  }

  /* ---- draw a single player arrow ---- */

  private drawPlayerArrow(
    ctx: CanvasRenderingContext2D,
    project: (wx: number, wz: number) => [number, number],
    player: MinimapPlayer,
    cameraYaw: number,
  ) {
    const S = this.cssSize;
    const R = S / 2;
    const [cx, cy] = project(player.x, player.z);

    // Arrow dimensions
    const aLen = 10;
    const aHalf = 5;

    // Rotation: the arrow needs to point in the player's yaw direction
    // relative to the camera yaw (since the whole map is rotated)
    const relYaw = player.yaw - cameraYaw;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(relYaw);

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(0, -aLen);                    // tip (up)
    ctx.lineTo(-aHalf, aLen * 0.4);          // bottom-left
    ctx.lineTo(0, aLen * 0.1);               // notch
    ctx.lineTo(aHalf, aLen * 0.4);           // bottom-right
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  /* ---- path stroke with adaptive gap detection ---- */

  private strokePath(
    ctx: CanvasRenderingContext2D,
    project: (wx: number, wz: number) => [number, number],
    lineWidth: number,
    color: string,
  ) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    let penDown = false;
    for (let i = 0; i < this.pathPositions.length; i++) {
      if (i > 0) {
        const dx = this.pathPositions[i][0] - this.pathPositions[i - 1][0];
        const dz = this.pathPositions[i][1] - this.pathPositions[i - 1][1];
        if (dx * dx + dz * dz > this.gapThresholdSq) {
          penDown = false;
        }
      }

      const [cx, cy] = project(this.pathPositions[i][0], this.pathPositions[i][1]);
      if (!penDown) {
        ctx.moveTo(cx, cy);
        penDown = true;
      } else {
        ctx.lineTo(cx, cy);
      }
    }
    ctx.stroke();
  }

  private strokePolyline(
    ctx: CanvasRenderingContext2D,
    project: (wx: number, wz: number) => [number, number],
    points: [number, number][],
    lineWidth: number,
    color: string,
  ) {
    if (points.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const [sx, sy] = project(points[0][0], points[0][1]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < points.length; i++) {
      const [px, py] = project(points[i][0], points[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  private findClosestPathDistance(x: number, z: number): number {
    if (this.pathPositions.length < 1 || this.pathCumDist.length !== this.pathPositions.length) return 0;

    let closestDistSq = Infinity;
    let closestPathDist = 0;

    for (let i = 0; i < this.pathPositions.length; i++) {
      const [px, pz] = this.pathPositions[i];
      const dx = px - x;
      const dz = pz - z;
      const distSq = dx * dx + dz * dz;
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestPathDist = this.pathCumDist[i] ?? 0;
      }
    }

    return closestPathDist;
  }

  private samplePathAtDistance(pathDist: number): [number, number] | null {
    if (this.pathPositions.length < 2 || this.pathCumDist.length < 2 || this.pathTotalDist <= 0) return null;

    const d = Math.max(0, Math.min(this.pathTotalDist, pathDist));

    let segIdx = 0;
    for (let i = 1; i < this.pathCumDist.length; i++) {
      if (this.pathCumDist[i] >= d) {
        segIdx = i - 1;
        break;
      }
    }

    const segStart = this.pathCumDist[segIdx] ?? 0;
    const segEnd = this.pathCumDist[segIdx + 1] ?? segStart;
    const segLen = segEnd - segStart;
    const t = segLen > 0 ? (d - segStart) / segLen : 0;

    const [ax, az] = this.pathPositions[segIdx];
    const [bx, bz] = this.pathPositions[segIdx + 1] ?? this.pathPositions[segIdx];
    return [ax + (bx - ax) * t, az + (bz - az) * t];
  }

  private drawLookaheadSegment(
    ctx: CanvasRenderingContext2D,
    project: (wx: number, wz: number) => [number, number],
    startX: number,
    startZ: number,
  ) {
    if (this.pathPositions.length < 2 || this.pathTotalDist <= 0) return;

    const anchorDist = this.findClosestPathDistance(startX, startZ);
    const startDist = Math.max(0, anchorDist - LOOKAHEAD_BACKTRACK_METRES);
    const endDist = Math.min(this.pathTotalDist, anchorDist + LOOKAHEAD_SEGMENT_METRES);

    const points: [number, number][] = [];
    for (let d = startDist; d < endDist; d += LOOKAHEAD_SAMPLE_STEP) {
      const p = this.samplePathAtDistance(d);
      if (p) points.push(p);
    }
    const endPoint = this.samplePathAtDistance(endDist);
    if (endPoint) points.push(endPoint);

    if (points.length < 2) return;

    ctx.beginPath();
    let [x0, y0] = project(points[0][0], points[0][1]);
    ctx.moveTo(x0, y0);
    for (let i = 1; i < points.length; i++) {
      const [x, y] = project(points[i][0], points[i][1]);
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = COL_LOOKAHEAD_OUTLINE;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.strokeStyle = COL_LOOKAHEAD;
    ctx.lineWidth = 2.8;
    ctx.stroke();

    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    const [lx, ly] = project(last[0], last[1]);
    const [px, py] = project(prev[0], prev[1]);
    const dirX = lx - px;
    const dirY = ly - py;
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
    if (dirLen < 0.001) return;

    const nx = dirX / dirLen;
    const ny = dirY / dirLen;
    const perpX = -ny;
    const perpY = nx;
    const arrowLen = 10;
    const arrowHalf = 5;

    const tipX = lx;
    const tipY = ly;
    const baseX = lx - nx * arrowLen;
    const baseY = ly - ny * arrowLen;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX + perpX * arrowHalf, baseY + perpY * arrowHalf);
    ctx.lineTo(baseX - perpX * arrowHalf, baseY - perpY * arrowHalf);
    ctx.closePath();

    ctx.fillStyle = COL_LOOKAHEAD;
    ctx.fill();
  }
}
