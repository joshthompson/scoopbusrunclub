# Adding a new kind of thing

For when a course needs something no course has yet. Paths are under `apps/run-game/src` unless they start `apps/`.

**The method, for any kind:** find the newest thing of the same kind and grep its key across `apps/run-game/src` and `apps/api/convex`. Every hit outside course files is a place yours goes too. Then let the compiler finish the list: most registries are a `Record<Union, ...>` or `satisfies Record<...>`, so a new union member won't build until every one has it. The lists below are what that turned up on 2026-11-13; trust the grep over them if they disagree.

Nearly every kind below comes with new art: draw it with the `pixel-art` skill.

## Fika item

Newest: `butterTea`.

- `FikaItem` union, `FIKA_SIZE`, and the course's `<NAME>_FIKA` list in `game/fika.ts`
- its art drawn in the course's `courses/kit/<course>Fika.ts`, and listed in `ART`, `draw/art/fika.tsx`
- `COLLECTABLE_NAMES` and `PICKUP_WORD` in `game/collectables.ts` (most fika says `'Fika!'`; the course's own items get their own word)
- worn as a hat when picked up (like the captain's hat)? `WORN_FIKA` in `game/hats.ts`

## Hat

Newest: `bobbleHat`.

- `HatKind` union, and its line in the comment list above it, in `game/hats.ts`
- `HAT_RULES` (speed, whether it falls off or takes a knock)
- `CODED`, **on the end only**. Hats go to Remote Players by their index, so inserting one renumbers every hat after it mid-Round. The compiler doesn't catch this one.
- its art in `ART`, `draw/art/hats.tsx`
- `COLLECTABLE_NAMES` and `PICKUP_WORD`
- if the hat is also the special goal's picture, give the collectables goal something else in `COLLECTABLES_ICON`, `draw/art/goals.tsx`

## Ride or flyer

Newest: `'goat'` (ride), `'condor'` (flyer).

- the `ride` or `flyer` union on `Course` in `courses/types.ts`, and its doc comment listing which course has which
- `draw/rideLook.ts` (ride) or `draw/flyerLook.ts` (flyer), with its art in `draw/art/<name>.tsx`
- `COLLECTABLE_NAMES` / `PICKUP_WORD` as `ride:<kind>`
- behaviour that differs from a corgi or goose goes in `game/corgis.ts` / `game/flyers.ts`, switched on the course's `ride`/`flyer`, never on its id

## Obstacle or Boost kind

Newest: `'cone'` (obstacle), `'gate'` (boost).

- a member of `Obstacle` or `Boost` in `courses/types.ts`, with a doc comment saying how to get past it or what it gives
- collision and effect in `collide()`, `game/step.ts`; if the bus should scoop it as it passes, `knockOver()` there too
- drawing: a `case` in `createObstacle`, `draw/sprites.tsx`. **The compiler doesn't catch a missing one**: the switch has no exhaustive check, and a kind with no case adds `undefined` to the scene, which crashes it. Anything that moves by the tick (a Germ bobbing) gets its own controller reading `world.ticks()`, so the same tick draws it the same on every screen
- obstacle state goes to Remote Players generically (`used`, `flown`, `scooped` in `ObstacleFrame`), so put an obstacle's changes in those fields, not new ones
- a Boost: add its kind to the boost list in `scatter()` (`courses/kit/scatter.ts`), or `scatter` files it as an obstacle
- **Prefer an existing bonus kind.** A new one is rejected by the deployed server (`FIXED_POINTS`/`RANGED_POINTS` in `apps/api/convex/runScores.ts`) until the API is deployed with it. Karolinska's Germs, popped by landing on them, score as `heads` through `bounceOff()` (`game/pack.ts`), and count for the special goal on a `SpecialRun` field instead
- a Boost that scores: a bonus kind in `game/world.ts` (the union and the zeroed `bonuses`), its label in `screens/Summary.tsx`, its worth in `BOOST_POINTS` (`game/medals.ts`), and on the server `FIXED_POINTS` and `MOST_PER_COURSE` in `apps/api/convex/runScores.ts`. Without the server entries, scores containing it are rejected.
- a new term worth naming goes in the repo's `GLOSSARY.md` under "Run game"

## Look field

Newest: `battlements`.

- an optional field on `CourseLook` in `courses/types.ts`, doc-commented with the course that uses it
- drawn in `draw/Backdrop.tsx`, `draw/RaceView.tsx` or `draw/sprites.tsx`, whichever layer it belongs in (behind the runners, the ground, or in front)
- reuse before adding: `CourseLook` already has dozens of fields (palette, horizon bands, ground layers, strips, fog, snow, pits, caves, bridges, buildings...), and most "new look" needs are a combination of them

## Course mechanic

A field on `Course` (like `longJump`, `mine`, `skiJump`, `leap`, `portals`): a `game/<mechanic>.ts` module for its rules, called from `game/world.ts` / `game/step.ts`, drawn in `draw/`. Keyed off the field's presence, so the next course can reuse it. Newest: `portals` (`game/portals.ts`), and Germs and Heart Valves (`game/body.ts`); a set piece that's only drawn, like Karolinska's opening mouth (`look.mouth`, `draw/giantMouth.tsx`), is a look field with its own sprites, the Ground under it ordinary terrain.

Checklist, beyond the rules themselves:

- **State lives on the world or the body, as plain state**, set by the physics and read by the drawing. Never keep it in a sprite.
- **Remote Players.** In a Round, phones and second screens don't run the physics: they replay the Host's `RaceFrame`s (`multiplayer/protocol.ts`, sent from `multiplayer/stream.ts`, applied in `multiplayer/Mirror.tsx`). Any new state the drawing reads has to go in the frame, or remote screens show it wrong. `portal` is the newest field; positions, `used`/`flown` on obstacles, and the camera already go.
- **Sound** is a `Sound` in `sfx.ts`, played with `play()`. It goes to Remote Players with the frame by name, so a new one needs nothing more.
- **Stopping the world** (a cut-scene, like a Portal going off): `stepWorld` skips movement while `stepPortals` says it's frozen, and the clock (`raceTicks`) doesn't run, so the speed bonus isn't docked for it. Take over the camera the same way (`portalCamera`), and effects on the whole view (zoom on a point, shake, flash) go in `RaceCanvas`, `draw/RaceView.tsx`.
- **Racers it holds** must be skipped by everything that moves or hits them: `stepRunner`, `collide`, the bus's scoop, and head bounces in `game/pack.ts` (`isHeld`).
- **Pacers**: decide whether they take part. If not, keep them out (`shrunkAt` in `game/pack.ts` stops them joining, and removes any that walk in).
- **A Round** frames everyone (`frameEveryone`), zoomed out up to 3x: anything that has to be unseen (the far side of a Portal) needs to be further off than that, about 800 px past where anyone can be.

## Special-goal criterion

`done(run)` only sees `SpecialRun` (`courses/types.ts`). Something it can't already judge from `finished`, `counts`, `hat`, `longJump`, `rodeWearing`, `toppedTower` or `germsPopped`: add a field to `SpecialRun`, track it on the world or body (`toppedTower` is set in `game/step.ts`), and pass it in where the special goal is judged in `screens/Game.tsx`. Then draw its picture for `SPECIAL` in `draw/art/goals.tsx`.
