---
name: course-wiring
description: Wire a run-game course (a level) into the game, or bring an older course up to the standard every course now meets. Use when adding a new course/level to Scoop Bus Run, or upgrading, auditing or "bringing up to date" an existing one.
---

# Course wiring

In the code a level is a **Course** (`CourseDefinition`, `src/courses/types.ts`). Game terms (Ground, Gap, Ledge, Platform, Ride, Boost, Collectable, Cheerer...) are defined in the repo's `GLOSSARY.md`, under "Run game". `types.ts` is the course API: every field has a doc comment, so read it before reaching for anything new.

Two branches:

- **New course**: do the steps under [New course](#new-course).
- **Existing course**: do the [audit](#upgrading-an-existing-course) against [the standard](#the-standard), then fill the gaps.

## The standard

What every course has as of the Challenges commit (`4db1312`). A course is **up to standard** when every row is true of it. Each row names where it lives.

| # | Item | Where |
|---|---|---|
| 1 | **Id** in the `CourseId` union | `src/courses/types.ts` |
| 2 | **In `COURSES`**, at its place in the difficulty order | `src/courses/index.ts` |
| 3 | **Medal scores**: an entry in `MEDAL_SCORES`, tuned rather than `null` once it's been played | `src/courses/medalScores.ts` |
| 4 | **5 km of terrain**: `createTerrain(heights, 10, 5000, ...)`; a real parkrun from its GPX via `pnpm --filter @scoopbus/run-game extract-profile <id>` and `parkrun: true` (its barcode is added for it). A course that isn't a hill profile (a building, a sewer, a body) writes its own `groundY` and wraps it in `withGaps(ground, gaps, steps, ledges)` (`game/terrain.ts`), as `sewers` and `karolinska` do; still `FINISH = START_X + 5000 * PX_PER_M`, since the server checks scores against 5 km a course | course file |
| 5 | **Deterministic layout**: a `layOut()` returning `obstacles`, `boosts`, `scenery`, all randomness from `seeded(n)` (`kit/seeded.ts`), usually via `scatter()` with a `clear` predicate (`kit/scatter.ts`); or placed by hand, as set pieces are (`karolinska`). Every player in a Round has to get the identical course, so `Math.random` never touches a layout. | course file |
| 6 | **Cast**: `runDirectors` and `cheerers`, club members from `@/data/runners` | course file |
| 7 | **Own look**: a `look` that makes it unmistakably not Haga (palette, horizon, ground layers...), heavy art in `src/courses/kit/<camelId>Scenery.ts`, drawn with the `pixel-art` skill | course file + kit |
| 8 | **Own fika**: a `<NAME>_FIKA` list with at least one item no earlier course has. Only collectables new to this course count towards its collectables goal (`courses/collectables.ts`), so a course on plain `FIKA_ITEMS` alone adds nothing. | `src/game/fika.ts` |
| 9 | **Own hat**: exactly one, placed somewhere it *takes doing* to reach (off a Ride, a head bounce, a secret route), with `withHat()` (`kit/hats.ts`) or by hand. It is the icon of the course's collectables goal (`courseHat`). | course file |
| 10 | **A Ride or flyer**: `ride` + `corgis` (+ `corgisUp`), and/or `flyer` + `flyovers` | course file |
| 11 | **Special goal**: `special: { goal, done(run) }`, `goal` a short imperative ("Long jump 10 m"), plus its picture in `SPECIAL` (or it falls back to a trophy) | course file + `src/draw/art/goals.tsx` |
| 12 | **Own tune** in `TUNES`, keyed by id (else it plays Haga's) | `src/music/tunes.ts` |
| 13 | **Fits a Round's camera**: climbs no more than `MAX_CLIMB` within the bus's leash. `COURSES` logs a `console.error` at load for any that do. | checked in `src/courses/index.ts` |
| 14 | **Within the server's ceilings**: no more of anything than `MOST_PER_COURSE` allows, or its online scores get rejected | `apps/api/convex/runScores.ts` |

## New course

1. **Pick the nearest course to crib from.** Read it whole before writing. Rough map: flat track → `kristineberg`; rolling parkrun → `haga`/`huddinge`; city with Platforms → `gamlaStan`/`cityRooftop`; Gaps and towers → `greatWall`; Cave and Tunnels → `caves`/`pyramids`; mountain climb → `everest`/`machuPicchu`; downhill on skis → `slopes`; sea and gliding → `cliff`.
2. **Write `src/courses/<camelId>.ts`** exporting a `CourseDefinition`, covering rows 4–11. Ids are kebab-case (`'great-wall'`), the file and export camelCase (`greatWall`). A file comment at the top says what the course is, in the voice of the others.
3. **Register it**: row 1, then row 3 (start at `null`: `medalScores()` works some out from what's on the course), then row 2. The compiler fails until `MEDAL_SCORES` has the id. Its place in `COURSES` sets its number, its unlock order and which collectables count as its own. Saved progress is an index into `COURSES` (`saved/progress.ts`), so inserting mid-list shifts every player's unlocks by one; appending doesn't. Say which you did.
4. **Fill rows 8–12.** Anything that doesn't exist yet (a new fika, hat, Ride, obstacle, look field, special-goal criterion), see [NEW-KINDS.md](NEW-KINDS.md).
5. **Check row 14**: count its fika, cheers, Rides, flyovers, hats, Rings and gates against `MOST_PER_COURSE`. Raising a ceiling means updating that comment's "most on any course" line too.
6. **Verify** (below).

### Building a big set-piece course

What worked for Karolinska, the first course built with this skill (shrink ray, a body to run through, two new mechanics):

- **Plan the x-axis first.** Write every section's start as a named constant at the top of the course file (`ENTRANCE`, `LAB`, `SHRINK_IN`...) and derive everything else from them: `groundY`, the Cave's `ceiling`, `strips`' colour stops, scenery and obstacles. Moving a section is then one number.
- **Heights:** `GROUND_Y` (490) is the lowest the camera looks; anything lower is off the bottom of the screen. A jump clears about 100 px (`JUMP_SPEED² / 2·GRAVITY`), a Steam Vent about 220, so Platform levels sit 80–90 apart. Anything steeper than a slope of ~0.2 nearly stops a runner: give a climb a gentler `slope` than its `groundY` (an escalator's `slope` can even be positive, carrying them up) and set `tilt` for how they lean.
- **Stub the art, then draw it.** Before any drawing, write the course's kit files with every export it needs as a labelled placeholder box (`stub()` in `kit/karolinskaScenery.ts`), at its real size, and anchor points as exported numbers (the shrink ray's `plate`, the sneezer's `nose`, the face's `nostril`) so the course file places art by them rather than by eye. The course plays and screenshots from the first hour, and the art can then be drawn in parallel (one helper per kit file) without touching the course.
- **One Cave can cover several places.** `look.cave.zones` gives each stretch its own tiles (a hospital's walls, then a nose, lungs, a heart); `cave.parts` opens each stretch's cover separately; a feature with `outside: true` is drawn on the cover (doors, a sign) and goes with it. Where the `ceiling` is undefined there's no rock at all: open sky, or whatever the horizon is.
- **Change the backdrop along the course** with `look.voyage` (horizons fading one into the next by camera position), each with its own `sky`.
- **Course-specific looks for shared obstacles** take a range or an override rather than a new kind: `look.rocks` entries with `from`/`to`, `look.cyclist` frames, `look.bouncer`. Check `CourseLook` before adding a kind.

## Upgrading an existing course

1. **Audit**: go row by row through the standard against the course file and each registry, and write the result down as a table of *has / missing / weak* (weak: e.g. a hat on the open path, fika only from `FIKA_ITEMS`, `MEDAL_SCORES` still `null`). Done when every one of the 14 rows has a verdict.
2. **Show the table to the user and agree which gaps to fill.** Design choices (what the hat is, what the special goal asks) are theirs; offer a concrete proposal for each.
3. **Fill the agreed gaps** the same way as for a new course, and touch nothing else in the course. An upgrade keeps the course's existing layout seed, so its familiar layout doesn't reshuffle, unless the user wants it to.
4. **Verify** (below).

## Verify

- `npx tsc --noEmit -p apps/run-game` is clean on `main`: treat any error as yours.
- `npx biome check <the files you touched>` (the app as a whole has two old findings, in `draw/art/track.tsx` and `reset.css`).
- `pnpm --filter @scoopbus/run-game build`.
- **Simulate it headlessly first.** The quickest check of a whole course is a bot run in the page: `createWorld`, then loop `stepWorld` with `right` held and `up` toggled (`up: ticks % 40 < 22`), clamping `world.bus.frontX` to stay 600 px behind so the bot can't be scooped, and log x, y, phase and any new state each time it changes. It shows where the course can't be got past (the bot stops) long before playing it does. A bot stumbles over everything, so judge difficulty by playing.
- **Screenshot frozen moments**, not live ones: step the world to a tick in the script, then render it with a no-op step (see the testing memory / `run.mts` drivers). Anything driven by the tick (a Portal's zoom, a Germ's bob) renders exactly. Render at most four or so at once: with a dozen headless Chromes the screenshot lands on the "Loading…" screen.
- **Play it.** `npx vite --port 3011 --strictPort` in `apps/run-game` (base `/run/`), Chrome launched with `--mute-audio`, `window.unlockAll()` in the console, reload. Watch the console for the `MAX_CLIMB` error. Look at: the course select card (preview, special goal, collectables count), the start, the hat's spot, a Ride, and the finish. For a headless check, import `/run/src/courses/index.ts`, `/run/src/game/world.ts` and `/run/src/game/step.ts` in the page, `createWorld(course, [...])` and loop `stepWorld(world)` with scripted controls. A bot is a poor judge of difficulty: compare against a neighbouring course rather than expecting it to finish.
- Leave "Send high score" unpressed while testing: dev runs post to the dev Convex deployment's real tables.
