import track1Url from './assets/music/monume-cyberpunk-519219.mp3';
import track2Url from './assets/music/the_mountain-retro-143303.mp3';
import track3Url from './assets/music/desifreemusic-driving-bass-neon-city-vibes-cinematic-build-up-328498.mp3';
import track4Url from './assets/music/universfield-motivational-electronic-background-226021.mp3';

const STORAGE_KEY = 'sbrc-music-muted';
const trackUrls = [track1Url, track2Url, track3Url, track4Url];

let audio: HTMLAudioElement | null = null;
let currentIndex = 0;
let started = false;

function isMuted(): boolean {
  return localStorage.getItem(STORAGE_KEY) === '1';
}

function setMuted(muted: boolean) {
  localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
}

function playNext() {
  if (isMuted()) return;
  if (audio) {
    audio.pause();
    audio.removeEventListener('ended', onEnded);
  }
  audio = new Audio(trackUrls[currentIndex]);
  audio.volume = 0.35;
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
