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
- collision and effect in `game/step.ts`; drawing in `draw/sprites.tsx`
- a Boost: add its kind to the boost list in `scatter()` (`courses/kit/scatter.ts`), or `scatter` files it as an obstacle
- a Boost that scores: a bonus kind in `game/world.ts` (the union and the zeroed `bonuses`), its label in `screens/Summary.tsx`, its worth in `BOOST_POINTS` (`game/medals.ts`), and on the server `FIXED_POINTS` and `MOST_PER_COURSE` in `apps/api/convex/runScores.ts`. Without the server entries, scores containing it are rejected.
- a new term worth naming goes in the repo's `GLOSSARY.md` under "Run game"

## Look field

Newest: `battlements`.

- an optional field on `CourseLook` in `courses/types.ts`, doc-commented with the course that uses it
- drawn in `draw/Backdrop.tsx`, `draw/RaceView.tsx` or `draw/sprites.tsx`, whichever layer it belongs in (behind the runners, the ground, or in front)
- reuse before adding: `CourseLook` already has dozens of fields (palette, horizon bands, ground layers, strips, fog, snow, pits, caves, bridges, buildings...), and most "new look" needs are a combination of them

## Course mechanic

A field on `Course` (like `longJump`, `mine`, `skiJump`, `leap`): a `game/<mechanic>.ts` module for its rules, called from `game/world.ts` / `game/step.ts`, drawn in `draw/`. Keyed off the field's presence, so the next course can reuse it.

## Special-goal criterion

`done(run)` only sees `SpecialRun` (`courses/types.ts`). Something it can't already judge from `finished`, `counts`, `hat`, `longJump`, `rodeWearing` or `toppedTower`: add a field to `SpecialRun`, track it on the world or body (`toppedTower` is set in `game/step.ts`), and pass it in where the special goal is judged in `screens/Game.tsx`. Then draw its picture for `SPECIAL` in `draw/art/goals.tsx`.
