/**
 * Proximity-based game sound system.
 *
 * Manages bus engine and goose ambient sounds with volume based on
 * distance from the listener (camera/player) and, for buses, speed.
 *
 * Respects the global mute setting — when muted, no audio is loaded or played.
 */
import { getMuted } from '../../music';
import busEngineUrl from '../../assets/sounds/freesound_community-bus-engine-47297.mp3';
import gooseUrl from '../../assets/sounds/freesound_community-goose-2-28880.mp3';
import thudUrl from '../../assets/sounds/freesound_community-loud-thud-45719.m4a';
import scoopedUrl from '../../assets/sounds/scooped1.mp3';
import hello1Url from '../../assets/sounds/hello1.mp3';
import hello2Url from '../../assets/sounds/hello2.mp3';
import hello3Url from '../../assets/sounds/hello3.mp3';
import hello4Url from '../../assets/sounds/hello4.mp3';
import hello5Url from '../../assets/sounds/hello5.mp3';
import hello6Url from '../../assets/sounds/hello6.mp3';
import huh1Url from '../../assets/sounds/huh1.mp3';
import huh2Url from '../../assets/sounds/huh2.mp3';
import huh3Url from '../../assets/sounds/huh3.mp3';
import huh4Url from '../../assets/sounds/huh4.mp3';
import huh5Url from '../../assets/sounds/huh5.mp3';
import huh6Url from '../../assets/sounds/huh6.mp3';

// ── Volume control ──

const GAME_VOLUME_KEY = 'sbrc-game-volume';
const DEFAULT_GAME_VOLUME = 1.0;

function getStoredGameVolume(): number {
  const v = localStorage.getItem(GAME_VOLUME_KEY);
  if (v === null) return DEFAULT_GAME_VOLUME;
  const n = parseFloat(v);
  return isNaN(n) ? DEFAULT_GAME_VOLUME : Math.max(0, Math.min(1, n));
}

let masterVolume = getStoredGameVolume();

/** Get current game sound volume (0–1). */
export function getGameVolume(): number {
  return masterVolume;
}

/** Set game sound volume (0–1). Persists to localStorage. */
export function setGameVolume(vol: number): void {
  masterVolume = Math.max(0, Math.min(1, vol));
  localStorage.setItem(GAME_VOLUME_KEY, String(masterVolume));
}

// ── Constants ──

/** Beyond this distance (metres) sounds are silent / not loaded */
const MAX_AUDIBLE_DISTANCE = 100;
/** Bus engine base volume (when stopped but nearby) — this is the "x1" baseline */
const BUS_ENGINE_BASE_VOLUME = 0.08;
/** At normal max speed the engine is this many times the base volume */
const BUS_ENGINE_SPEED_MULTIPLIER = 5;
/** Extra multiplier on top when at boosted max speed */
const BUS_ENGINE_BOOST_MULTIPLIER = 8;
/** Normal max speed (m/s) — matches BUS_MAX_SPEED */
const BUS_ENGINE_NORMAL_MAX_SPEED = 36;
/** Boosted max speed (m/s) — matches BUS_MAX_SPEED * SCOOP_BOOST_MULTIPLIER */
const BUS_ENGINE_BOOST_MAX_SPEED = 72;
/** Extra multiplier when working hard (uphill + accelerating) */
const BUS_ENGINE_EFFORT_MULTIPLIER = 1.5;
/** Slope (radians) considered "steep" for full effort bonus */
const BUS_ENGINE_STEEP_SLOPE = 0.15;
/** Minimum playback rate (pitch) at idle */
const BUS_PITCH_MIN = 0.85;
/** Maximum playback rate (pitch) at boosted max */
const BUS_PITCH_MAX = 1.5;
/** How many seconds before track end to start crossfading the second layer */
const CROSSFADE_DURATION = 2.0;
/** Maximum goose volume when right next to listener */
const GOOSE_MAX_VOLUME = 0.35;

// ── Types ──

export interface BusSoundSource {
  x: number;
  y: number;
  z: number;
  speed: number; // m/s (absolute)
  slope: number; // radians — positive = uphill
}

export interface GoosePosition {
  x: number;
  z: number;
}

export interface ListenerPosition {
  x: number;
  y: number;
  z: number;
}

// ── Internal state ──

/** Dual-track bus engine audio for seamless crossfade looping */
interface BusAudioPair {
  a: HTMLAudioElement;
  b: HTMLAudioElement;
  /** Which track is currently "primary" (the other crossfades in near the end) */
  primary: 'a' | 'b';
}

const busAudioMap = new Map<string, BusAudioPair>();

let gooseAudio: HTMLAudioElement | null = null;
let disposed = false;

// ── Helpers ──

function dist3d(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function distXZ(ax: number, az: number, bx: number, bz: number): number {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Volume falloff: 1 at distance 0, 0 at MAX_AUDIBLE_DISTANCE, quadratic curve */
function proximityFactor(distance: number): number {
  if (distance >= MAX_AUDIBLE_DISTANCE) return 0;
  const t = 1 - distance / MAX_AUDIBLE_DISTANCE;
  return t * t; // quadratic falloff
}

function createBusAudioElement(): HTMLAudioElement {
  const audio = new Audio(busEngineUrl);
  audio.loop = true;
  audio.volume = 0;
  return audio;
}

function getOrCreateBusPair(id: string): BusAudioPair {
  let pair = busAudioMap.get(id);
  if (!pair) {
    pair = {
      a: createBusAudioElement(),
      b: createBusAudioElement(),
      primary: 'a',
    };
    busAudioMap.set(id, pair);
  }
  return pair;
}

/**
 * Update a bus audio pair with crossfade logic.
 * Both tracks play the same sound but offset in time. As the primary nears
 * its end, the secondary fades in from the start, creating a seamless loop.
 */
function updateBusPairVolume(pair: BusAudioPair, targetVolume: number, pitchRate: number): void {
  const primary = pair.primary === 'a' ? pair.a : pair.b;
  const secondary = pair.primary === 'a' ? pair.b : pair.a;

  if (targetVolume <= 0) {
    primary.volume = 0;
    secondary.volume = 0;
    if (!primary.paused) primary.pause();
    if (!secondary.paused) secondary.pause();
    return;
  }

  // Apply pitch (playbackRate) to both tracks
  primary.playbackRate = pitchRate;
  secondary.playbackRate = pitchRate;

  // Ensure primary is playing
  if (primary.paused) {
    primary.currentTime = 0;
    primary.play().catch(() => {});
  }

  const duration = primary.duration;
  const currentTime = primary.currentTime;

  // If duration is known and we're near the end, crossfade
  if (duration && isFinite(duration) && currentTime > duration - CROSSFADE_DURATION) {
    const fadeProgress = (currentTime - (duration - CROSSFADE_DURATION)) / CROSSFADE_DURATION;
    // Primary fades out, secondary fades in
    primary.volume = Math.max(0, Math.min(1, targetVolume * (1 - fadeProgress)));
    secondary.volume = Math.max(0, Math.min(1, targetVolume * fadeProgress));

    // Start secondary if not already playing
    if (secondary.paused) {
      secondary.currentTime = 0;
      secondary.play().catch(() => {});
    }

    // Once primary finishes (or very close), swap roles
    if (fadeProgress >= 1) {
      pair.primary = pair.primary === 'a' ? 'b' : 'a';
      primary.pause();
      primary.currentTime = 0;
    }
  } else {
    // Normal playback — only primary at full target volume
    primary.volume = Math.max(0, Math.min(1, targetVolume));
    // Keep secondary silent
    if (!secondary.paused) {
      secondary.volume = 0;
      secondary.pause();
    }
  }
}

function ensureGooseAudio(): HTMLAudioElement {
  if (!gooseAudio) {
    gooseAudio = new Audio(gooseUrl);
    gooseAudio.loop = true;
    gooseAudio.volume = 0;
  }
  return gooseAudio;
}

// ── Thud (impact) sound ──

const THUD_BASE_VOLUME = 0.5;

/**
 * Play a one-shot thud/impact sound.
 * Call on initial collision with solid/elastic objects.
 * Each call creates a fresh Audio element so overlapping thuds are possible.
 */
export function playThud(speed: number): void {
  if (disposed || getMuted() || masterVolume <= 0) return;
  // Scale volume with impact speed (louder hits at higher speed)
  const speedFactor = Math.min(Math.abs(speed) / 20, 1);
  const volume = THUD_BASE_VOLUME * (0.3 + 0.7 * speedFactor) * masterVolume;
  const audio = new Audio(thudUrl);
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.play().catch(() => {});
}

// ── Scooped sound ──

const SCOOPED_VOLUME = 0.3;

/**
 * Play the scooped sound when a runner is scooped by the bus.
 * Plays once.
 */
export function playScooped(): void {
  return
  if (disposed || getMuted() || masterVolume <= 0) return;
  const audio = new Audio(scoopedUrl);
  audio.volume = Math.max(0, Math.min(1, SCOOPED_VOLUME * masterVolume));
  audio.play().catch(() => {});
}

/** No-op kept for API compatibility. */
export function stopScooped(): void {}

// ── Helper: pick random index, never the same as last ──

function pickRandom(count: number, lastIndex: number): number {
  if (count <= 1) return 0;
  let idx: number;
  do {
    idx = Math.floor(Math.random() * count);
  } while (idx === lastIndex);
  return idx;
}

// ── Hello (runner wave greeting) sounds ──

const HELLO_URLS = [hello1Url, hello2Url, hello3Url, hello4Url, hello5Url, hello6Url];
const HELLO_VOLUME = 0.3;
let lastHelloIndex = -1;

/**
 * Play a random hello sound when an NPC runner waves at the player.
 * Never plays the same clip twice in a row.
 */
export function playHello(): void {
  if (disposed || getMuted() || masterVolume <= 0) return;
  lastHelloIndex = pickRandom(HELLO_URLS.length, lastHelloIndex);
  const audio = new Audio(HELLO_URLS[lastHelloIndex]);
  audio.volume = Math.max(0, Math.min(1, HELLO_VOLUME * masterVolume));
  audio.play().catch(() => {});
}

// ── Huh (jump / double-jump) sounds ──

const HUH_URLS = [huh1Url, huh2Url, huh3Url, huh4Url, huh5Url, huh6Url];
const HUH_VOLUME = 0.4;
let lastHuhIndex = -1;

/**
 * Play a random huh sound on jump/double-jump.
 * Never plays the same clip twice in a row.
 */
export function playHuh(): void {
  if (disposed || getMuted() || masterVolume <= 0) return;
  lastHuhIndex = pickRandom(HUH_URLS.length, lastHuhIndex);
  const audio = new Audio(HUH_URLS[lastHuhIndex]);
  audio.volume = Math.max(0, Math.min(1, HUH_VOLUME * masterVolume));
  audio.play().catch(() => {});
}

// ── Public API ──

/**
 * Update all game sounds for a single frame.
 *
 * Call once per frame from the game update loop.
 *
 * @param listener  Camera / player world position
 * @param buses     Array of bus sound sources (local bus + remote players)
 * @param geese     Array of goose positions (only closest is used)
 */
export function updateGameSounds(
  listener: ListenerPosition,
  buses: BusSoundSource[],
  geese: GoosePosition[],
): void {
  if (disposed) return;

  // If muted, make sure everything is silent and don't load anything
  if (getMuted()) {
    silenceAll();
    return;
  }

  // ── Bus engine sounds ──
  const activeBusIds = new Set<string>();

  for (let i = 0; i < buses.length; i++) {
    const bus = buses[i];
    const id = `bus_${i}`;
    activeBusIds.add(id);

    const distance = dist3d(listener.x, listener.y, listener.z, bus.x, bus.y, bus.z);

    if (distance >= MAX_AUDIBLE_DISTANCE) {
      // Too far — silence if exists, don't create
      const existing = busAudioMap.get(id);
      if (existing) {
        updateBusPairVolume(existing, 0, 1);
      }
      continue;
    }

    const pFactor = proximityFactor(distance);
    // Two-tier speed scaling:
    //   0 → normal max: ramps from x1 to SPEED_MULTIPLIER
    //   normal max → boost max: ramps from SPEED_MULTIPLIER to BOOST_MULTIPLIER
    const absSpeed = Math.abs(bus.speed);
    let speedScale: number;
    let speedFraction: number; // 0–1 over the full range for pitch
    if (absSpeed <= BUS_ENGINE_NORMAL_MAX_SPEED) {
      const t = absSpeed / BUS_ENGINE_NORMAL_MAX_SPEED;
      speedScale = 1 + t * (BUS_ENGINE_SPEED_MULTIPLIER - 1);
      speedFraction = t * 0.5; // 0–0.5 for pitch
    } else {
      const t = Math.min((absSpeed - BUS_ENGINE_NORMAL_MAX_SPEED) / (BUS_ENGINE_BOOST_MAX_SPEED - BUS_ENGINE_NORMAL_MAX_SPEED), 1);
      speedScale = BUS_ENGINE_SPEED_MULTIPLIER + t * (BUS_ENGINE_BOOST_MULTIPLIER - BUS_ENGINE_SPEED_MULTIPLIER);
      speedFraction = 0.5 + t * 0.5; // 0.5–1.0 for pitch
    }

    // Effort: uphill while moving increases volume (harder work)
    // slope > 0 = uphill; we only add effort when going forward uphill
    const uphillAmount = (bus.speed > 0.5 && bus.slope > 0)
      ? Math.min(bus.slope / BUS_ENGINE_STEEP_SLOPE, 1)
      : 0;
    const effortScale = 1 + uphillAmount * (BUS_ENGINE_EFFORT_MULTIPLIER - 1);

    const volume = pFactor * BUS_ENGINE_BASE_VOLUME * speedScale * effortScale * masterVolume;

    // Pitch: scales up with speed and effort
    const effortFactor = speedFraction * 0.8 + uphillAmount * 0.2;
    const pitchRate = BUS_PITCH_MIN + effortFactor * (BUS_PITCH_MAX - BUS_PITCH_MIN);

    const pair = getOrCreateBusPair(id);
    updateBusPairVolume(pair, volume, pitchRate);
  }

  // Remove bus audios that are no longer in the source list
  for (const [id, pair] of busAudioMap) {
    if (!activeBusIds.has(id)) {
      pair.a.pause();
      pair.b.pause();
      busAudioMap.delete(id);
    }
  }

  // ── Goose sounds ──
  if (geese.length === 0) {
    if (gooseAudio) {
      gooseAudio.volume = 0;
      gooseAudio.pause();
    }
    return;
  }

  // Find the closest goose
  let closestDist = Infinity;
  for (const g of geese) {
    const d = distXZ(listener.x, listener.z, g.x, g.z);
    if (d < closestDist) closestDist = d;
  }

  if (closestDist >= MAX_AUDIBLE_DISTANCE) {
    if (gooseAudio) {
      gooseAudio.volume = 0;
      gooseAudio.pause();
    }
    return;
  }

  const gVolume = proximityFactor(closestDist) * GOOSE_MAX_VOLUME * masterVolume;
  const gAudio = ensureGooseAudio();
  gAudio.volume = Math.max(0, Math.min(1, gVolume));
  if (gAudio.paused) {
    gAudio.play().catch(() => {});
  }
}

/** Silence and release all sound resources. Call on game dispose. */
export function disposeGameSounds(): void {
  disposed = true;
  for (const [, pair] of busAudioMap) {
    pair.a.pause();
    pair.b.pause();
  }
  busAudioMap.clear();
  if (gooseAudio) {
    gooseAudio.pause();
    gooseAudio.srcObject = null;
    gooseAudio = null;
  }
}

/** Reset internal state so a new game instance starts fresh. */
export function resetGameSounds(): void {
  disposeGameSounds();
  disposed = false;
}

/** Pause all currently playing sounds (without disposing). */
function silenceAll(): void {
  for (const [, pair] of busAudioMap) {
    if (!pair.a.paused) { pair.a.volume = 0; pair.a.pause(); }
    if (!pair.b.paused) { pair.b.volume = 0; pair.b.pause(); }
  }
  if (gooseAudio && !gooseAudio.paused) {
    gooseAudio.volume = 0;
    gooseAudio.pause();
  }
}
