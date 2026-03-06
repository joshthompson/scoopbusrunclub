import { css } from "@style/css";

export function StravaWidget() {
  const url = 'https://www.strava.com/clubs/1970521/latest-rides/4618e7f1d2d4127a8642f3feabfdc4a1baa826bf?show_rides=true'
  return (
    <iframe
      title="Scoop Bus Strava Widget"
      src={url}
      height='454'
      width='100%'
      class={css({
        width: '100%',
        minHeight: '454px',
        overflow: 'hidden',
        border: 'none',
        background: 'transparent',
      })}
      allowfullscreen
    />
  );
}
