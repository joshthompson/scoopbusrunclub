/**
 * Local Multiplayer Results Screen — shown when both players finish.
 *
 * Displays a leaderboard table of finish times, winner, and navigation buttons.
 */
import { For } from 'solid-js';
import logoSrc from './assets/logo.png';
import { useMenuNav } from './useMenuNav';
import { MuteButton } from './MuteButton';

interface LocalResultsScreenProps {
  p1Role: 'bus' | 'runner';
  p2Role: 'bus' | 'runner';
  p1FinishTime: number | null;
  p2FinishTime: number | null;
  p1Scored: number;
  p2Scored: number;
  onReplay: () => void;
  onExit: () => void;
}

/** Format seconds as M:SS */
function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const PLAYERS = [
  { name: 'Yellow Bus', css: '#f0c820', emoji: '🚌' },
  { name: 'Red Bus', css: '#d94030', emoji: '🚌' },
];

export function LocalResultsScreen(props: LocalResultsScreenProps) {
  const { isFocused, setFocusedIndex } = useMenuNav(() => 3); // mute + replay + exit
  setFocusedIndex(1);

  // Build a sorted leaderboard
  const leaderboard = () => {
    const entries = [
      { ...PLAYERS[0], role: props.p1Role, time: props.p1FinishTime, scored: props.p1Scored, idx: 1 },
      { ...PLAYERS[1], role: props.p2Role, time: props.p2FinishTime, scored: props.p2Scored, idx: 2 },
    ];
    // Sort: finished first (lower time wins), then unfinished
    entries.sort((a, b) => {
      if (a.time !== null && b.time === null) return -1;
      if (a.time === null && b.time !== null) return 1;
      if (a.time !== null && b.time !== null) return a.time - b.time;
      return 0;
    });
    return entries;
  };

  const bothFinished = () => props.p1FinishTime !== null && props.p2FinishTime !== null;

  const winner = () => {
    if (!bothFinished()) return null;
    const t1 = props.p1FinishTime!;
    const t2 = props.p2FinishTime!;
    if (Math.abs(t1 - t2) < 0.1) return 'tie';
    return t1 < t2 ? 1 : 2;
  };

  const winnerName = () => {
    const w = winner();
    if (w === 'tie') return "It's a Tie! 🤝";
    if (w === 1) return `🏆 ${PLAYERS[0].name} Wins!`;
    if (w === 2) return `🏆 ${PLAYERS[1].name} Wins!`;
    return null;
  };

  return (
    <div id="finish-overlay">
      <MuteButton focused={isFocused(0)} />
      <div class="finish-card" style={{ 'max-width': '900px' }}>
        <img src={logoSrc} alt="Scoop Bus" class="title-logo" style={{ width: '80px', margin: '0 auto 12px' }} />
        <h1>🏁 Race Finished!</h1>

        {winnerName() && (
          <p style={{
            'font-size': 'clamp(22px, 3.5vw, 32px)',
            'font-weight': 'bold',
            'font-family': "'Arial Black', 'Impact', sans-serif",
            color: '#ffc107',
            'text-shadow': '0 2px 8px rgba(0,0,0,0.7), 0 0 12px rgba(255,200,0,0.4)',
            margin: '12px 0 20px',
          }}>
            {winnerName()}
          </p>
        )}

        {/* Leaderboard table */}
        <table style={{
          width: '100%',
          'border-collapse': 'separate',
          'border-spacing': '0 6px',
          'margin-top': '8px',
        }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={{ ...thStyle, 'text-align': 'left' }}>Bus</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Scooped</th>
            </tr>
          </thead>
          <tbody>
            <For each={leaderboard()}>{(entry, i) => {
              return (
                <tr style={{
                  background: 'rgba(0,0,0,0.35)',
                  'border-radius': '8px',
                }}>
                  <td style={{
                    ...tdStyle,
                    'border-radius': '8px 0 0 8px',
                    color: '#fff',
                    'font-weight': 'bold',
                    'font-size': 'clamp(16px, 2.5vw, 22px)',
                    width: '40px',
                  }}>
                    {i() === 0 && entry.time !== null ? '🥇' : i() === 1 && entry.time !== null ? '🥈' : '-'}
                  </td>
                  <td style={{
                    ...tdStyle,
                    'text-align': 'left',
                  }}>
                    <span style={{
                      color: entry.css,
                      'font-weight': 'bold',
                      'font-size': 'clamp(16px, 2.5vw, 22px)',
                      'text-shadow': `0 1px 4px rgba(0,0,0,0.6)`,
                    }}>
                      {entry.emoji} {entry.name}
                    </span>
                  </td>
                  <td style={{
                    ...tdStyle,
                    'font-family': "'Arial Black', monospace",
                    'font-size': 'clamp(18px, 3vw, 26px)',
                    color: '#fff',
                    'text-shadow': '0 1px 4px rgba(0,0,0,0.6)',
                    'font-weight': 'bold',
                  }}>
                    {entry.time !== null ? fmtTime(entry.time) : (
                      <span style={{ opacity: '0.5', 'font-size': '0.8em' }}>Racing...</span>
                    )}
                  </td>
                  <td style={{
                    ...tdStyle,
                    'border-radius': '0 8px 8px 0',
                    color: '#ccc',
                    'font-size': 'clamp(14px, 2vw, 18px)',
                  }}>
                    {entry.role === 'bus' ? `🏃 ${entry.scored}` : '-'}
                  </td>
                </tr>
              );
            }}</For>
          </tbody>
        </table>

        <div class="finish-buttons" style={{ 'margin-top': '24px' }}>
          <button class="course-btn" classList={{ 'menu-focused': isFocused(1) }} onClick={props.onReplay}>Play Again</button>
          <button class="course-btn finish-exit-btn" classList={{ 'menu-focused': isFocused(2) }} onClick={props.onExit}>Exit to Menu</button>
        </div>
      </div>
    </div>
  );
}

const thStyle: Record<string, string> = {
  'font-family': "'Arial Black', 'Impact', sans-serif",
  'font-size': 'clamp(11px, 1.5vw, 14px)',
  'font-weight': 'bold',
  color: 'rgba(255,255,255,0.55)',
  'text-transform': 'uppercase',
  'letter-spacing': '0.06em',
  'text-align': 'center',
  padding: '0 8px 4px',
  'border-bottom': '1px solid rgba(255,255,255,0.15)',
};

const tdStyle: Record<string, string> = {
  padding: '10px 10px',
  'text-align': 'center',
  'vertical-align': 'middle',
};
