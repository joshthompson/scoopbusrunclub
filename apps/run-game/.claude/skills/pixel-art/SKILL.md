---
name: pixel-art
description: Draw or change art for Scoop Bus Run (run-game) so it matches the game's pixel-art style: sprites, Rides, hats, fika, obstacles, scenery, horizons, ground textures, goal icons. Use when making, adding or restyling any game art, in code or as a PNG.
---

# Pixel art

Every picture in the game is chunky, flat-coloured pixel art on one shared grid. New art has to look like it was drawn by the same hand as what's there. The way to get that is to **draw beside a neighbour**: before drawing, pick two or three existing pieces of the same type (see [By type](#by-type)), preview them, and match them.

## The grid

- **One cell is 2 screen pixels.** Runners are drawn at `RUNNER_SCALE = 2`, and everything else matches them: art files declare `const CELL = 2`, author in cells, and size on screen as `columns * CELL` by `rows * CELL`. Sizes are always whole cells, and so are positions within a piece.
- **Big or far-off things use 4-pixel cells**: the Giant Furby, cloud Platforms, sea rocks, the condor carrying the bus. Use them only for something many times a runner's size.
- **Hard edges only.** Axis-aligned rects, `shape-rendering="crispEdges"`, and `<img>`s through `PixelArt` (`draw/PixelArt.tsx`) or the `pixelated` class. Curves are stepped in cells (`paintedArt`, `pixelCircle`, `pixelPolygon`), never smoothed.
- A few old PNGs (`scenery/palm.png`) are 1 px a cell. They're the exception; draw on the 2-pixel grid.

## The look

- **Flat colour, small palette.** 3–8 colours per object (runners 7, the corgi 6, coffee 5). Per material: a base, one lit tone and one shade tone. No gradients or dithering inside a sprite.
- **Lit from above.** A lighter row of cells along top edges and glints; darker cells along undersides, bottom rows and the far side.
- **No outlines.** Shapes read by silhouette and by contrast with the sky blue behind them (`--sky-blue-*`, around `#c8deec`). Dark ink (`#1d1d1d`–`#2b2722`) is for small details: an eye is one dark cell, plus wheels, a hat band.
- **Semi-transparent colour only for air:** steam, glow round a lamp, mist (`rgba(255,255,255,0.85)` steam, `#ffd76a18` halo). Solid things are fully opaque.
- **Small, friendly and specific.** Something reads from its shape plus one or two telling details: the goat's prayer-flag blanket, the mint cake's red wrapper with its blue end, Gamla Stan's cobbles. Real things are drawn as the real thing (Kendal Mint Cake, a lussekatt, the Katarinahissen) and named in the comment above them.
- **Restraint on big surfaces.** Ground, walls and backdrops stay plain with a *suggestion* of texture: cobbles are "a few stones at a time, each just a shadow under it and a glint along its top" (`kit/cobbles.ts`). The runners must always be the busiest thing on screen.

## Drawing in code

Draw new art in code, in `courses/kit/<course>Scenery.ts` / `<course>Fika.ts` for a course's art, or `draw/art/<thing>.tsx` for game-wide art. Code art is diffable, its colours are named constants, and a course can recolour it. The toolkit is in `courses/kit/pixelArt.ts`:

| Tool | For |
|---|---|
| `pixelArt(w, h, rects)` | Most things. `[x, y, w, h, colour]` rects in cells, painted in order, so later ones go over. Group them under comments naming the part (`// Its beard, hanging under its chin.`). |
| a letter grid (`rowsArt` in `draw/art/goals.tsx`) | Small icons: rows of letters, each one a colour, `.` empty |
| `paintedArt(w, h, (x, y) => colour)` | Round or organic shapes, painted cell by cell |
| `pixelCircle`, `pixelPolygon` | Stepped shapes inside a bigger SVG (`cell = 2`) |
| `tile(w, h)` | Seamless patterns: `.pattern(id)` for a course's `groundDefs`, used as `url(#id)` |
| `pixelText(text, x, y, cell, fill)` | Lettering on signs: 5×7 glyphs (A–Z, ÅÄÖ, digits, arrows) |
| `svgUrl(w, h, body)` | Wraps any of the above into an image URL |

Colours go in named constants at the top (`COAT`, `SHADE`, `INK`), and the doc comment says what it is and what's in it, in the voice of the files around it. Animation is a sheet of same-sized frames side by side, usually 2–4 of them.

**PNGs** are for art that's mostly there already: per-member runner sprites, and older assets in `src/assets/<type>/`. A new PNG uses one image pixel per screen pixel with each cell 2×2 (or 1 per cell, shown at 2×), a limited indexed palette and fully opaque or fully clear pixels. It sits beside the others of its type.

## By type

Facing below means the direction the source art faces.

| Type | Where | Size and specifics |
|---|---|---|
| **Runners** (members) | `apps/web/src/assets/runners/<member>/` | 23×29 a frame, facing left; `run.png` is 4 frames (92×29). The website uses the same art. A new pose (like `ski/`, `board/`, `stand/` in `src/assets`) needs one PNG per member, plus a version built from the custom-runner template for custom runners and guests (`runners/skiPoses.ts` shows how) |
| **Hats** | `draw/art/hats.tsx` | Facing left, like the runners. Small: about 8–12 × 4–8 cells. Each needs `crown` (how far down it sits over the head) and `middle` |
| **Fika** | `courses/kit/<course>Fika.ts` | About 8–14 × 7–14 cells; its size goes in `FIKA_SIZE` as cells × `CELL`. Wrappers, plates and steam make it read |
| **Rides** | `draw/art/<ride>.tsx` | Facing right, poses `sit`/`crouch`/`leap` (`CorgiPose`), plus exported heights for its back and saddle. Big enough to carry a runner: the goat is 26×24 cells |
| **Obstacles** | `draw/art/`, `src/assets/obstacles/` | Has to read at a glance as *jump it* (low and solid) or *duck it* (overhead). Anything coming towards the runner faces left |
| **Scenery** | `courses/kit/<course>Scenery.ts` | Drawn at a cell a pixel, so its `Scenery` entry takes `scale: 2` (the default is 1, for PNGs with their cells already baked in at 2×2). Stands on the path's back edge (`setBack`, `onFloor`, `front`). 10–50 cells tall, bigger for landmarks. A lighter hand than sprites: fewer details, so it stays background |
| **Horizon bands** | `courses/kit/*Scenery.ts`, `voyageHorizons.ts` | 960 or 1200 wide × 160, and must wrap seamlessly: waves are whole numbers of cycles across. Drawn in 2-px steps. Flat silhouettes in 1–3 colours, paler and bluer the further off; `far`/`near`/`nearer` bands get more detail as they come closer |
| **Ground textures** | `tile()` patterns in a course's `groundDefs` | Plain with hints (see the look). Tile sizes in whole cells |
| **Goal icons** | `draw/art/goals.tsx` | A letter grid, about 11–16 cells square, showing what's to be done |
| **Lettering** | `pixelText` | Signs, banners; UI text uses the `remi-pop` font instead |

## Check it

Render the new piece next to its neighbours, blown up, and compare them side by side. From `apps/run-game`:

```sh
npx tsx .claude/skills/pixel-art/sheet.mts /tmp/sheet.png 6 \
  src/assets/rides/corgi-sit.png src/courses/kit/everestScenery.ts#yak src/courses/kit/myCourseScenery.ts#thing
```

It takes PNG paths and `module.ts#export` for art drawn in code (any `pixelArt`/`paintedArt` URL or `{ src }`), and draws them over the game's sky blue. Then `Read` the sheet. It's done when the new piece sits with at least two neighbours of its type and matches them in cell size, palette size, shading and level of detail. After that, see it in the game, at real size and moving (the `course-wiring` skill's Verify section covers running the game).
