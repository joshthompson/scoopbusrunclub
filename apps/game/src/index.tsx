/* @refresh reload */
import { render } from 'solid-js/web';
import { createSignal, onMount, Show } from 'solid-js';
import earcut from 'earcut';
import { Game } from './game/Game';

// Babylon.js needs earcut on window for CreatePolygon
(window as any).earcut = earcut;

function App() {
  const [loading, setLoading] = createSignal(true);
  const [scored, setScored] = createSignal(0);
  const [speed, setSpeed] = createSignal(0);
  const [distance, setDistance] = createSignal(0);
  const [altitude, setAltitude] = createSignal(0);
  let canvasRef!: HTMLCanvasElement;
  let minimapRef!: HTMLCanvasElement;

  onMount(async () => {
    const game = new Game(canvasRef, {
      onScoopRunner: () => setScored((s) => s + 1),
      onSpeedChange: (s: number) => setSpeed(s),
      onDistanceChange: (d: number) => setDistance(d),
      onAltitudeChange: (a: number) => setAltitude(a),
    }, minimapRef);

    // Default to "haga" — can be overridden with ?event=xxx in URL
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event') || 'haga';

    await game.init(eventId);
    setLoading(false);
  });

  return (
    <>
      <Show when={loading()}>
        <div id="loading">Loading course data...</div>
      </Show>
      <div id="hud">
        <p>🚌 Scooped: {scored()}</p>
        <p>🏃 Speed: {speed().toFixed(1)} km/h</p>
        <p>📏 Distance: {(distance() / 1000).toFixed(2)} km</p>
        <p>⛰️ Altitude: {altitude().toFixed(1)} m</p>
      </div>
      <canvas id="gameCanvas" ref={canvasRef} />
      <canvas id="minimap" ref={minimapRef} />
    </>
  );
}

render(() => <App />, document.getElementById('app')!);
