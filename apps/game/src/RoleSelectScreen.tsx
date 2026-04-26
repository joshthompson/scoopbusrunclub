import logoSrc from './assets/logo.png';

type PlayerRole = 'bus' | 'runner';

interface RoleSelectScreenProps {
  courseName: string;
  onSelect: (role: PlayerRole) => void;
  onBack: () => void;
}

export function RoleSelectScreen(props: RoleSelectScreenProps) {
  return (
    <div id="title-screen">
      <div class="title-content">
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" />
        <p class="lobby-course">{props.courseName}</p>
        <h2 class="screen-heading">Choose Your Role</h2>
        <div class="course-buttons">
          <button class="course-btn" onClick={() => props.onSelect('bus')}>
            🚌 Bus Driver
          </button>
          <button class="course-btn runner-btn" onClick={() => props.onSelect('runner')}>
            🏃 Runner
          </button>
        </div>
        <button class="course-btn cancel-btn back-btn" onClick={props.onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
