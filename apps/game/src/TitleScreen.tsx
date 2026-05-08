import { createSignal, createEffect, onCleanup } from 'solid-js';
import logoSrc from './assets/logo.png';
import { useMenuNav } from './useMenuNav';
import { startMusic } from './music';
import { MuteButton } from './MuteButton';

type GameMode = 'single' | 'local' | 'host' | 'join' | 'online';

interface TitleScreenProps {
  onSelectMode: (mode: GameMode) => void;
}

export function TitleScreen(props: TitleScreenProps) {
  const [showCredits, setShowCredits] = createSignal(false);
  // 5 items: mute(0), single(1), local(2), online(3), credits(4)
  const { isFocused, setFocusedIndex } = useMenuNav(() => showCredits() ? 0 : 5);

  // Keyboard + gamepad handling for credits modal
  createEffect(() => {
    if (!showCredits()) return;
    let prevO = false;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        setShowCredits(false);
      }
    }
    function pollCreditsGamepad() {
      const gamepads = navigator.getGamepads();
      let gp: Gamepad | null = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]?.connected) { gp = gamepads[i]; break; }
      }
      if (gp) {
        const xPressed = (gp.buttons[0]?.pressed ?? false);
        const oPressed = (gp.buttons[1]?.pressed ?? false);
        if ((xPressed || (oPressed && !prevO))) {
          setShowCredits(false);
        }
        prevO = oPressed;
      }
      if (showCredits()) requestAnimationFrame(pollCreditsGamepad);
    }
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(pollCreditsGamepad);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  // Start with Single Player focused (index 1), not mute
  setFocusedIndex(1);

  function handleModeSelect(mode: GameMode) {
    startMusic();
    props.onSelectMode(mode);
  }

  const music = [
    {
      artist: 'Monume',
      userLink: 'https://pixabay.com/users/monume-44679891/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=519219',
      trackLink: 'https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=519219',
    },
    {
      artist: 'Dmitrii Kolesnikov',
      userLink: 'https://pixabay.com/users/the_mountain-3616498/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=143303',
      trackLink: 'https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=143303',
    },
    {
      artist: 'Universfield',
      userLink: 'https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=226021',
      trackLink: 'https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=226021',
    },
    {
      artist: 'Omar Faruque',
      userLink: 'https://pixabay.com/users/desifreemusic-28163210/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=328498',
      trackLink: 'https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=328498',
    }
  ]

  const soundeffects = [
    // Sound Effect by <a href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=47297">freesound_community</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=47297">Pixabay</a>
    // Sound Effect by <a href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=28880">freesound_community</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=28880">Pixabay</a>
  ]

  return (
    <div id="title-screen" onClick={() => startMusic()}>
      <MuteButton focused={isFocused(0)} />
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <div class="course-buttons">
          <button class="course-btn" classList={{ 'menu-focused': isFocused(1) }} onClick={() => handleModeSelect('single')}>
            Single Player
          </button>
          <button class="course-btn local-btn" classList={{ 'menu-focused': isFocused(2) }} onClick={() => handleModeSelect('local')}>
            Local Multiplayer
          </button>
          <button class="course-btn online-btn" classList={{ 'menu-focused': isFocused(3) }} onClick={() => handleModeSelect('online')}>
            Online Multiplayer
          </button>
        </div>
        <button class="credits-btn" classList={{ 'menu-focused': isFocused(4) }} onClick={() => setShowCredits(true)}>
          Credits
        </button>
      </div>

      {showCredits() && (
        <div class="credits-overlay" onClick={() => setShowCredits(false)}>
          <div class="credits-panel" onClick={(e) => e.stopPropagation()}>
            <h2>Credits</h2>
            <p><strong>Developer:</strong> Josh Thompson</p>
            <p><strong>Design:</strong> Josh Thompson &amp; Alisa Vasileva</p>
            <p><strong>3D Artist:</strong> Olesia Vasileva</p>
            <p><strong>Testing:</strong> The Scoop Bus Run Club</p>

            <h3>Music</h3>
            {music.map(track => (
              <p>
                <a href={track.userLink} target="_blank" rel="noopener noreferrer">
                  {track.artist}
                </a> from <a href={track.trackLink} target="_blank" rel="noopener noreferrer">Pixabay</a>
              </p>
            ))}

            <h3>Special Thanks</h3>
            <p>Keith Clark for providing GPS data for Huddinge</p>
            <p>Roman Fadeev for engine optimisation tips</p>
            <p>Parkrun for running the events this game is inspired by</p>

            <h3>Extra Special Thanks</h3>
            <p>Alisa for constant feedback, ideas and putting up with me showing her every new version! ❤️</p>

            <button class="course-btn menu-focused" onClick={() => setShowCredits(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
