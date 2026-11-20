---
name: minigame
description: Make or change a run-game minigame: a Multi Player Round that isn't a race (Fruit Kebab, Potato Rain, Jump Rope). Use for a new minigame, its rules, or its arena and setting.
---

# Minigame

A minigame is one screen of somewhere, its camera still, everyone on it at once, playing something other than a race. It runs on the race engine: the same runners, running, jumping and bouncing on each other's heads, with the minigame's own goings-on stepped after them each tick. The engine, the Room and the phones already handle everything round it (lobby choice of Races / Minigames / Mixup, the Results, Pick and Choose, Remote Play), so a new one is a rules module, its drawing and its arena.

Read one whole existing minigame before writing: `src/minigames/pogoSticks.ts` (out, last standing), `src/minigames/potatoRain.ts` (most points, with players knocked out) or `src/minigames/fruitKebab.ts` (a score, first to finish), with its drawing in `src/draw/`.

## Steps

### 1. Pin the rules

Answer each of these from the request, or with a sensible default stated back to the user:

- **The goal**: what scores, and what decides the order (first to finish, last one standing, most points).
- **Out**: what puts someone out, and how they look while out (buried, sat down). Out players stay on screen and send reactions.
- **The end**: decided early (all done, or all but one), or at the clock, 60 s by default.
- **The ramp**: what gets harder the longer it goes on.
- **Solo**: what one player's told at the end: how long it took, or how long they lasted.
- **The chip**: each player's few characters on the HUD ("2/4", "Out", a count).
- **Max players**, if it can't take eight.

**Done when** every point has an answer.

### 2. Pick the arena

- **A new place**: `arenaCourse(id, name, blurb, look)` in `src/minigames/arena.ts` gives a flat path. Its `look` sets the sky, ground and path colours and the horizon. Its scenery is a set in `src/draw/arenaSets.ts`, drawn in `courses/kit/<place>Scenery.ts`. Draw it with the `pixel-art` skill, handing pieces to parallel helpers as `course-art-pass` does.
- **A spot on a course, as it is**: `courseArena(course, id, name, blurb, { middle, walls, floorOnScreen })`. This strips the course of everything to run into, pick up or ride. Set `minigame.arena` from it. It reuses the course's ground, scenery and sky with no new art. Check what's live there: platforms (a rope bridge's sag lets fast fallers through, so Jump Rope makes its bridge rigid), Gaps, and anything triggered by where players are (Dino Island's eruption).

- **A floor that moves**: give the course its own `terrain` whose `groundY`, `slope` and `inGap` read the minigame's live state, as Iceberg Bump's iceberg does. Running, sliding down a slope, jumping and head-bouncing then all come from the engine. Set `look.ground: []` so the static ground isn't drawn, draw the floor yourself, and keep `finishX` within a few thousand px, since the ground drawing builds a column every few px up to it.
- **Ice**: `course.ice` stretches make running slippery (`src/game/ice.ts`), anywhere in races too.
- **Horizon bands** for `look.horizon` are drawn at the picture's own size, so they need 2 px a cell, not the 1 px a cell that props scaled up use.

**Done when** a `shot` (step 7) shows everyone standing where they should, nothing of the race left on screen.

### 3. Register it

- `MinigameId` in `src/minigames/types.ts`.
- `CourseId` in `src/courses/types.ts` (its arena's id), with `null` in `MEDAL_SCORES` (`courses/medalScores.ts`) and `'in the'` in `WHERE` (`courses/collectables.ts`).
- `MINIGAMES` in `src/minigames/index.ts`: it's in Rooms, lineups and Pick and Choose from there.
- `createMinigameItself` in `src/draw/RaceView.tsx`, for its drawing.

**Done when** `npx tsc --noEmit -p .` is clean.

### 4. Write the rules

`src/minigames/<camelId>.ts` exports the `Minigame` and implements `MinigameRun` (see `types.ts`). Its `start(world)` places everyone (spread between the walls in `inRandomOrder(racers)`, facing in, on the floor) and returns the run. Each part of the run:

- `step()`: one tick, on the Host only, after everyone's moved. It clamps everyone between the walls, holds anyone out still (`b.held = 2`, `b.vx = 0`), sets `b.celebrating = done(racer)` (they dance stood still), and calls `world.setOrder(order)` with `world.decidedAt` once it's decided. The Round ends a few seconds after that.
- `done` and `out` drive the dance (a winner stops and dances, whatever they're holding), the phone's status ("Out! Watch on…"), reactions, and head-bouncing (out players' heads can't be bounced on). Where players can fall out of the arena (`racer.out`), count that in `out` too, as Jump Rope does.
- `note` is each player's Results line. With one player, it includes the time (`clock()` from `clock.ts`).
- `timeNote` is the line on Single Player's result card, under the place: how long it took or they lasted, or their score.
- `bot(racer)` is the controls a bot plays with. Single Player is always against bots (`botsFor`). It needn't be good, but it should play the game, a little late and sloppy, as a person would.
- Clocks run on `world.raceTicks()`, from "Go!". Pass `'down'` to `clock` for elapsed time.
- State a body needs for drawing lives on `Body` in `src/game/world.ts` (`skewered`, `buriedAt`, `trippedAt`). Anything else for drawing goes in a `WeakMap<World, …>` with a getter (`kebabOf`, `potatoesOf`, `ropeOf`).
- Anything random is either sent to phones (step 6) or worked out from what every screen shares: who's playing, the tick. Jump Rope's rope holders and Fruit Kebab's crab are picked that way.

**Done when** every rule from step 1 is in `step`, `note`, `chip`, `done` and `out`.

### 5. Draw it

`src/draw/<camelId>.ts` returns controllers for the scene. Use whole-arena layers (one controller the size of the screen, painting everything of a kind), as `potatoRain.ts` does.

- Pick a `type` for what it's in front of. `boost` is behind the players, `furby` is in front, `foreground` is in front of the path, `scenery` and `platform` are backdrop props. Something that passes both behind and in front (a rope) is two controllers, each drawing its half.
- A draw hook repaints only when something it reads changes. Read `world.ticks()` in it, or it freezes.
- Stay on the 2 px grid. Air (smoke, steam) can be see-through; solid things are opaque. Big art goes through the `pixel-art` skill.
- Extra people on screen who aren't players (rope holders) are a `Racer` made in `start` and drawn with `createPlayer(world, them)`. They aren't in `world.racers`, so physics leaves them still.

**Done when** a `shot` shows every part of it.

### 6. Send it to phones

Remote players' phones rebuild the world from frames. `frame()` returns the minigame's state as compact arrays; add its fields to `MinigameFrame`. `apply(a, b, share)` puts it back on the phone, mixing `a` toward `b` by `share` for smooth motion, or rebuilding it from the tick. Anything worked out from the tick needs nothing sent.

**Done when** every field `step` changes that drawing reads is in `frame`.

### 7. Play it

From `apps/run-game`:

```sh
npx tsx .claude/skills/minigame/play.mts shot <id> <scratchpad> --players 4 --at 30 400
npx tsx .claude/skills/minigame/play.mts sim <id> <scratchpad> --players 1 3 6 --games 2
npx tsx .claude/skills/minigame/play.mts sim <id> <scratchpad> --players 1 --bot <file.js>
```

- `shot` screenshots it so many ticks after "Go!". Read every PNG.
- `sim` plays whole games out and prints each player's place and note. Its default bot is restless: running about, jumping now and then.
- A `--bot` file is a function body given `world`, `racer` and `game` (the minigame's module, for its getters), returning `{ left, right, up, down }`. Write a skilled one to check the ramp: it should be beaten eventually, or nearly. A bot file of `return world.minigame.bot(racer)` plays the minigame's own bot.

Then run `npx tsc --noEmit -p .` and `npx biome check --write <changed files>` from the repo root, and `npx vite build --outDir <scratchpad>/dist`.

**Done when** each `sim` ends every game in its own way, each note reads right, a skilled bot shows the ramp biting, the minigame's own bot plays it passably, and the checks are clean.

### 8. Report

What it is, how it plays (goal, out, end, ramp, solo), where it's set, the `shot` PNGs, the `sim` results, and anything a bot couldn't judge.

## Traps

- **A second copy of a module**: a dev server left running through edits can serve a changed module twice over, and the page's drawing reads the empty copy. Nothing draws, though the state's fine. `play.mts` starts its own fresh server, so restart any other server after edits.
- **Next shuffle**: lineups count the rest of the current shuffle as played, so a minigame isn't lined up twice running. Keep that when changing `Party`'s `nextShuffle`.
- **Hats**: a minigame can put everyone in a hat in `start` (Fruit Kebab's sword). The Room puts back what they had on before it, after.
- **Teams**: Beach Volleyball is the team game to copy. Places are shared, so it sets `placeOf` (the Results, points and Single Player's "You won!" use it). A team that's a Player short gets a bot pushed onto `world.racers` in `start`, with a fixed id. Phones are sent it with everyone else, so `start` reuses it there rather than adding another. It's left out of `setOrder`, which has no seat for it.
