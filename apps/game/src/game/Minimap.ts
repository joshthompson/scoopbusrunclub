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
const VIEW_RADIUS = 500; // world-metres visible around the player
const BORDER_W = 3;

const COL_BG = '#1e5e15';
const COL_PATH = '#c4a44a';
const COL_PATH_OUTLINE = '#6b5a10';
const COL_WATER = '#1a5faa';
const COL_BORDER = '#ffffffcc';

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
  private waterZones: { points: [number, number][] }[] = [];

  private gapThresholdSq = Infinity; // adaptive gap detection
  private cssSize = PREFERRED_PX;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.applyCssSize();
    window.addEventListener('resize', () => this.applyCssSize());
  }

  /* ---- public data setters ---- */

  setPath(positions: [number, number][]) {
    this.pathPositions = positions;
    this.computeGapThreshold();
  }

  setWaterZones(zones: { points: [number, number][] }[]) {
    this.waterZones = zones;
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

  draw(busX: number, busZ: number, busYaw: number, players: MinimapPlayer[] = []) {
    const S = this.cssSize;
    const R = S / 2;
    const ctx = this.ctx;
    const sinY = Math.sin(busYaw);
    const cosY = Math.cos(busYaw);
    const scale = (R - PAD) / VIEW_RADIUS;

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

    // --- path (outline + core for bordered-road look) ---
    if (this.pathPositions.length > 1) {
      this.strokePath(ctx, project, 6, COL_PATH_OUTLINE);
      this.strokePath(ctx, project, 3.5, COL_PATH);
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
}
