# Drawing run-game's art

run-game draws the race with ScoopJS's Canvas Renderer: every sprite, the backdrop, the Ground, snow and fog are painted onto one `<canvas>`, which runs smoothly on phones. The scene's element (`[data-game-scene]`) holds only the canvas. The menus, the HUD and a course's preview are ordinary Solid components on the page.

ScoopJS's own rules are in its `packages/core/README.md` ("The Draw Hook", "What the Canvas Renderer draws from `style`", "Canvas Issues").

## How a piece is drawn

Each piece of the race is a Controller, made in `draw/sprites.tsx` (or a file of its own in `draw/`, such as `mine.tsx` or `portalFx.tsx`) and added to the Scene in `draw/RaceView.tsx`. It's drawn one of two ways:

- **Frames.** A Controller with `frames` and nothing else is drawn as its current Frame, an image.
- **A Draw Hook.** Anything else is painted by its `draw`:

```tsx
return createFixture({
	id,
	type: 'hazard',
	x: o.x,
	width: VENT_WIDTH,
	height: VENT_HEIGHT,
	world,
	draw: ({ ctx, image }) => {
		const vent = image(ventAsset)
		if (vent) ctx.drawImage(vent.image, 0, 0, VENT_WIDTH, VENT_HEIGHT)
	},
})
```

The hook gets `{ ctx, drawDefault, image, $, $scene, $currentFrame }`:

- **`ctx`** is already in the Sprite's own box, from (0, 0) to (width, height), with its position, rotation, flip, scale and opacity applied. Whatever the hook sets on it is undone afterwards.
- **`drawDefault()`** paints the current Frame. Call it before or after your own painting.
- **`image(url)`** gives `{ image, width, height }` once the image has loaded, and `undefined` until then. The canvas repaints when it arrives.
- **`$`** is the Controller's data (`$.width()`, `$.frames?.()` and so on), and `$currentFrame` is the Frame on screen.

`createFixture` (something that stays put, standing on the ground) and `createScoopable` (an Obstacle the bus can scoop up, which flies off with its box) take the same `draw` and `drawReach`.

The hook runs on every repaint, so keep it cheap:

- Allocate no DOM.
- Don't read layout.
- Paint art that doesn't change once with `cachedArt`, and draw it from there.

### Painting past the box: `drawReach`

The canvas skips a Controller whose box is off camera. Art that reaches outside its box (a speech bubble, steam rising, geese flying off) would vanish near the screen's edges, so say how far it reaches with `drawReach`, in the Sprite's own pixels: one number for every side, or `{ left, top, right, bottom }`. Many pieces work theirs out next to their painter (`bubbleReach`, `geeseReach`, `steamReach`, `flungReach`, `filterReach`). Don't make the box bigger instead: it's also what the piece collides with.

### What `style` can do

The Canvas Renderer reads these keys in a Controller's `style`:

- `transform`, `translate` and `transform-origin`
- `opacity`
- `visibility` and `display`
- `z-index`
- `image-rendering`
- in `filter`, the colour functions `hue-rotate`, `brightness`, `sepia`, `saturate` and `grayscale`, plus one `drop-shadow`

Anything else is a Canvas Issue: a `clip-path`, a custom property, a `background`, a `border`, an `animation` or a `transition`. Paint it in the hook instead, as a value the hook reads.

On WebKit the `filter` only recolours what `drawDefault()` paints, not what the hook paints itself (see "Filters" below).

## The helpers

Put shared painting code under `draw/paint/`, or next to the art it paints in `draw/art/`, and reuse what's there before writing more.

| To draw | Use |
|---|---|
| A picture, or pixel art | `image(url)` and `ctx.drawImage`. Smoothing is off, so pixel art stays crisp. `paintPicture` (`paint/picture.ts`) adds a shadow or outline; `paintPixelArt` a filter. |
| Pixel art as rects of cells | `cellArt` (`paint/cells.ts`) |
| An SVG component of the game's own that doesn't change | `svgArt(key, () => <Art />)` (`canvasArt.ts`) gives an image URL for `image(url)`. CSS animations inside it don't play. |
| A long SVG, as long as a course | `svgPainter` (`paint/svgPainter.ts`), which paints only the chunks in view; or `readSvg` and `compileSvg` (`paint/svgCanvas.ts`) to turn it into paths |
| SVG `<path d>` | `new Path2D(d)`, built once and filled each time |
| A CSS colour, gradient or background from a course's `look` | `cssColour`, `fillBackground` (`paint/cssBackground.ts`), `cssGradient` and `paletteOf` (`paint/css.ts`) |
| A picture through a CSS `filter` | `filtered(url, loaded, filter)` (`paint/css.ts`) |
| A pattern repeated along, going by with the camera | `paintTiled` (`paint/bands.ts`) |
| Text | `fillLine` and `wrapLines` (`paint/lettering.ts`), in the CSS's font families (`FONT_PIXEL`, `FONT_SIGN`). Text in a web font repaints once the font loads. |
| Something faded or masked as one | `inLayer` (`paint/layer.ts`) |
| Art as long as a course | Tiles: `tileControllers` (`paint/tiles.ts`), as the Ground does |
| Steam, flung dirt, hazard stripes, a speech bubble | `paintSteam`, `paintFlung`, `paintHazardStripes`, `paintBubble` |

### Kept art: `cachedArt`

`cachedArt(key, width, height, paint)` paints art once into a canvas of its own and keeps it, for the hook to `drawImage` every time. The key has to say everything that changes it (its size, its colours, a Frame), since art with a key already kept isn't painted again. It's painted at the screen's density, up to 2, or at a `density` you give it.

### Filters, and WebKit

An iPhone is WebKit, and WebKit's canvas has no `filter`. Never use `ctx.filter`. To recolour a picture (a course's rocks, geese, mud, foliage), draw it through `filtered(url, loaded, filter)`: it recolours the pixels once, keeps the result, and draws the same in every browser. Its `pad` and `filterReach` allow for a `drop-shadow` reaching past the picture.

### Animation

Nothing on the canvas moves by itself: there are no CSS animations or transitions. Work every moving thing out from the game's ticks, `world.ticks()` (or the Controller's `$age`), so it pauses with the game and looks the same on every screen in a Round. `paint/animation.ts` has `cycle` (how far through a repeating animation), `steps`, `keyframed` and CSS's `ease` timings. A fade, such as the hut's front or a Cave's cover, is a signal moved a tick at a time.

## Draw order

The canvas paints in the Scene's `assetOrder` (in `RaceView.tsx`), then by `z-index`. A new Controller type goes where it belongs in that list. One that must sit behind or in front of everything goes in `BEHIND_TYPES` or `OVER_TYPES` in `draw/backdropControllers.ts`. The page layers are Controllers too: the backdrop, the Ground, snow and fog (`backdropControllers.ts`), and a Cave's cover and the sea's waves (`frontControllers.ts`).

When a Controller swaps its `frames` for a shorter list, make sure the `frame` it sets is in that list.

## Phones are the target

- iOS allows about 16 million pixels in one canvas, and a few hundred MB across all of them.
  - Never paint a whole course into one canvas; courses are tens of thousands of pixels wide.
  - Paint long art in tiles, as the Ground does, or paint paths every time.
  - `cachedArt` lets go of the oldest art beyond 16 million pixels.
- To measure on a phone, run `pnpm run-game:phones` and open `/run/?fps=1`, which adds a frame meter in the corner.

## Check it

1. Play the course to the end, and run `raceScene.canvasIssues()` in the console. It must be empty, with no exceptions. Each entry names the Controller's type and id, the feature the canvas can't draw, and where it was created; the same issues are logged as `[scoopjs:canvas]` errors. Each type and feature is reported once, so fix one and play again.
2. Look at it on the screen, near the edges too (for a missing `drawReach`), in Chrome and Safari (for filters).
3. Run `npx tsc -p apps/run-game/tsconfig.json --noEmit`, and `npx biome check` on the files you changed.
