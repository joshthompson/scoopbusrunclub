# Porting a course to the Canvas Renderer

run-game is moving from ScoopJS's DOM Renderer to its Canvas Renderer, which paints the whole race onto one `<canvas>` and runs smoothly on phones. Until every course is ported, both Renderers stay in the game:

- `?renderer=canvas` picks the Canvas Renderer (`draw/rendererChoice.ts`), and `?fps=1` adds a frame meter.
- Each Controller keeps its `children`, which only the DOM Renderer draws, and gets a **Draw Hook** (`draw`) beside them, which only the Canvas Renderer calls.
- Under the DOM Renderer, the game must look and behave exactly as before.

Once every course is ported, a final cleanup deletes the `children` and the DOM path.

ScoopJS's own rules are in its `packages/core/README.md` ("Canvas Renderer", "Draw Hook", "Canvas Issues").

## 1. Find what's left

A course is ported when a full run under `?renderer=canvas` gives no Canvas Issues and no exceptions, and every piece looks as it does under the DOM Renderer.

- **In the game.** Play the course with `?renderer=canvas`, and run `raceScene.canvasIssues()` in the console. Each entry names the Controller's type and id, the feature the canvas can't draw, and where it was created. The same issues are logged as `[scoopjs:canvas]` errors.
- **Each type and feature is reported once.** If the vent is reported as a `hazard` with `children`, the geese and steam (also hazards) don't show until the vent is ported. Fix one, then run the course again.
- **In the code.** A `children` given to `createController`, `createFixture` or `createConnectedController`, with no `draw` beside it, is a piece to port. This finds pieces you haven't reached in a run.
- **Page layers.** Anything `RaceView.tsx` wraps in `InScene` (the cave cover, the sea's front) is still a page element over the canvas, moved with the camera. It moves onto the canvas as a Controller of its own, as `draw/backdropControllers.ts` did for the backdrop, ground, snow and fog.

## 2. Port a Controller

Add a `draw` to the call that has the `children`, and leave the `children` as they are:

```tsx
return createFixture({
	id,
	type: 'hazard',
	// …
	children: () => <VentArt />,
	draw: ({ ctx, image }) => {
		const vent = image(ventAsset)
		if (vent) ctx.drawImage(vent.image, 0, 0, VENT_WIDTH, VENT_HEIGHT)
	},
})
```

The hook gets `{ ctx, drawDefault, image, $, $scene, $currentFrame }`:

- **`ctx`** is already in the Sprite's own box, from (0, 0) to (width, height), with its position, rotation, flip, scale and opacity applied. Whatever the hook sets on it is undone afterwards. It may draw outside the box, as `children` overflow.
- **`drawDefault()`** paints the current Frame. Call it before or after your own painting.
- **`image(url)`** gives `{ image, width, height }` once the image has loaded, and `undefined` until then. The canvas repaints when it arrives.
- **`$`** is the Controller's data (`$.width()`, `$.frames?.()` and so on), and `$currentFrame` is the Frame on screen.

The hook runs on every repaint, so keep it cheap:

- Allocate no DOM.
- Don't read layout.
- Paint art that doesn't change once with `cachedArt`, and draw it from there.

### Turning the art into painting

| Under the DOM Renderer | Under the Canvas Renderer |
|---|---|
| `<img>`, `PixelArt` | `image(url)` and `ctx.drawImage`. Smoothing is already off, so pixel art stays crisp. |
| An SVG component of the game's own that doesn't change | `svgArt(key, () => <Art />)` gives an image URL for `image(url)`. CSS animations inside it don't play. |
| Positioned `<div>`s | `fillRect`, or `fillBackground` from `paint/cssBackground.ts` for a CSS background |
| SVG `<path d>` | `new Path2D(d)`, built once and filled each time, or `compileSvg` from `paint/svgCanvas.ts` |
| `linear-gradient` | `cssGradient` from `paint/css.ts` |
| `clip-path` | `ctx.clip()` |
| A CSS `filter` on art | `filtered(url, loaded, filter)` from `paint/css.ts`. WebKit's canvas has no `filter`, so this recolours the pixels once and keeps the result. |
| Text | `fillLine` and `wrapLines` from `paint/lettering.ts`, in the CSS's font families (`FONT_PIXEL`, `FONT_SIGN`). Text in a web font repaints once the font loads. |
| A CSS animation or `transition` | Values worked out from `world.ticks()` or `$age`, with `ease`, `cycle`, `keyframed` and `steps` from `paint/animation.ts`. They now pause with the game. |

The ported pieces are the best examples. Start with these:

- the runners (`createPlayer`, `paint/picture.ts`, `art/skis.tsx`);
- the slalom gates (`paintGate`) and the rings (`paintRing`);
- the fika (`fikaPicture`);
- the rails and platforms (`railPainter`, `platformPainter`);
- the bus (`paintBusSpray`, `paintBusLegs`).

Put shared painting code under `draw/paint/`, or next to the JSX art it mirrors, and reuse what's there before writing more.

### The Controller's `style`

The Canvas Renderer translates these keys in a Controller's `style`:

- `transform`, `translate` and `transform-origin`
- `opacity`
- `visibility` and `display`
- `z-index`
- `image-rendering`
- in `filter`, the colour functions `hue-rotate`, `brightness`, `sepia`, `saturate` and `grayscale`, plus one `drop-shadow`

Anything else is a Canvas Issue, for example `clip-path`, a custom property such as `--knocked`, a `background`, a `border`, an `animation` or a `transition`. Move it into the hook, as painting or as a value the hook reads. Where the DOM path still needs it, keep it, for example `style: rendererChoice.canvas ? {} : { … }`.

### Watch out for

- **Culling.** The Canvas Renderer skips a Controller whose box is off camera. Art that reaches far outside its box can vanish near the screen's edges. Report it rather than resizing the Controller, because its box is also what it collides with.
- **Frames.** When a Controller swaps its `frames` for a shorter list, make sure the `frame` it sets is in that list.
- **Draw order.** The canvas paints in the Scene's `assetOrder`, then `z-index`, as the page stacks them. A new Controller type that must sit behind or in front of everything goes in `BEHIND_TYPES` or `OVER_TYPES` in `backdropControllers.ts`.

## 3. Check it

1. Take a screenshot of the same moment under both Renderers and compare them, for example the start line about 1.5 s in, before anyone moves. Your pieces must look the same, and nothing else may change.
2. Play the course to the end under `?renderer=canvas`. `raceScene.canvasIssues()` must be empty, with no exceptions in the console.
3. Run `npx tsc -p apps/run-game/tsconfig.json --noEmit`, and `npx biome check` on the files you changed.

## Phones are the target

- An iPhone is WebKit. Its canvas has no `filter`, so recolour with `filtered()`, never `ctx.filter`.
- iOS allows about 16 million pixels in one canvas, and a few hundred MB across all of them.
  - Never paint a whole course into one canvas; courses are tens of thousands of pixels wide.
  - Cache art in tiles, as the ground does, or paint paths every time.
  - `cachedArt` lets go of the oldest art beyond 16 million pixels.
- To measure on a phone, run `pnpm run-game:phones` and open `/run/?renderer=canvas&fps=1`, then `?renderer=dom&fps=1`.
