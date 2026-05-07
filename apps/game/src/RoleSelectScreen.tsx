import logoSrc from './assets/logo.png';
import { useMenuNav } from './useMenuNav';
import { MuteButton } from './MuteButton';

type PlayerRole = 'bus' | 'runner';

interface RoleSelectScreenProps {
  courseName: string;
  onSelect: (role: PlayerRole) => void;
  onBack: () => void;
}

export function RoleSelectScreen(props: RoleSelectScreenProps) {
  const { isFocused, setFocusedIndex } = useMenuNav(() => 4, { onBack: props.onBack }); // mute + bus + runner + back
  setFocusedIndex(1);

  return (
    <div id="title-screen">
      <MuteButton focused={isFocused(0)} />
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <p class="lobby-course">{props.courseName}</p>
        <h2 class="screen-heading">Choose Your Role</h2>
        <div class="course-buttons">
          <button class="course-btn" classList={{ 'menu-focused': isFocused(1) }} onClick={() => props.onSelect('bus')}>
            🚌 Bus Driver
          </button>
          <button class="course-btn runner-btn" classList={{ 'menu-focused': isFocused(2) }} onClick={() => props.onSelect('runner')}>
            🏃 Runner
          </button>
        </div>
        <button class="course-btn cancel-btn back-btn" classList={{ 'menu-focused': isFocused(3) }} onClick={props.onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
