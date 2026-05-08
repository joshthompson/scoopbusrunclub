import track1Url from './assets/music/monume-cyberpunk-519219.mp3';
import track2Url from './assets/music/the_mountain-retro-143303.mp3';
import track3Url from './assets/music/desifreemusic-driving-bass-neon-city-vibes-cinematic-build-up-328498.mp3';
import track4Url from './assets/music/universfield-motivational-electronic-background-226021.mp3';

const STORAGE_KEY = 'sbrc-music-muted';
const VOLUME_KEY = 'sbrc-music-volume';
const DEFAULT_MUSIC_VOLUME = 0.5;
const trackUrls = [
  { url: track1Url, track: 'Cyberpunk', artist: 'Monume' },
  { url: track2Url, track: 'Retro', artist: 'The Mountain' },
  { url: track3Url, track: 'Driving Bass', artist: 'Desifreemusic' },
  { url: track4Url, track: 'Motivational Electronic', artist: 'Universfield' },
];

let audio: HTMLAudioElement | null = null;
let currentIndex = 0;
let started = false;

function isMuted(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

function setMuted(muted: boolean) {
  localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
}

function getStoredVolume(): number {
  const v = localStorage.getItem(VOLUME_KEY);
  if (v === null) return DEFAULT_MUSIC_VOLUME;
  const n = parseFloat(v);
  return isNaN(n) ? DEFAULT_MUSIC_VOLUME : Math.max(0, Math.min(1, n));
}

function playNext() {
  if (isMuted()) return;
  if (audio) {
    audio.pause();
    audio.removeEventListener('ended', onEnded);
  }
  audio = new Audio(trackUrls[currentIndex].url);
  audio.volume = getStoredVolume();
  audio.addEventListener('ended', onEnded);
  audio.play().catch(() => {});
}

function onEnded() {
  currentIndex = (currentIndex + 1) % trackUrls.length;
  playNext();
}

/** Start music playback (call once on first user interaction). */
export function startMusic() {
  if (started) return;
  started = true;
  if (isMuted()) return;
  // Shuffle starting track
  currentIndex = Math.floor(Math.random() * trackUrls.length);
  playNext();
}

/** Toggle mute state. Returns the new muted value. */
export function toggleMute(): boolean {
  const nowMuted = !isMuted();
  setMuted(nowMuted);
  if (nowMuted) {
    if (audio) {
      audio.pause();
      audio.removeEventListener('ended', onEnded);
      audio = null;
    }
  } else {
    currentIndex = Math.floor(Math.random() * trackUrls.length);
    playNext();
  }
  return nowMuted;
}

/** Get current mute state. */
export function getMuted(): boolean {
  return isMuted();
}

/** Get current music volume (0–1). */
export function getMusicVolume(): number {
  return getStoredVolume();
}

/** Set music volume (0–1). Persists to localStorage. */
export function setMusicVolume(vol: number): void {
  const clamped = Math.max(0, Math.min(1, vol));
  localStorage.setItem(VOLUME_KEY, String(clamped));
  if (audio) {
    audio.volume = clamped;
  }
}
