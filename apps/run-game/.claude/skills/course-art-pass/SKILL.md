---
name: course-art-pass
description: Tour a run-game course start to finish in rendered frames and fill in the art it's missing, so it reads as one made-for-it place. Use for an art pass on a level, or when asked to go through a course looking for bits that need more (flowing, custom) art.
---

# Course art pass

A course (a level, `src/courses/<id>.ts`) can be fully wired and still look unfinished in places: a slab of flat colour under the path, the same three trees on repeat, a hard line where the forest turns to ash. The pass finds those by **touring** the course in rendered frames, fixes them, and tours it again to show the difference.

How to draw is the `pixel-art` skill, and the course API is the `course-wiring` skill. This skill is about where to look and what to look for.

## Steps

### 1. Tour it

From `apps/run-game`:

```sh
npx tsx .claude/skills/course-art-pass/tour.mts <course-id> <scratchpad> --as before
```

This gives a frame every 250 m and one at the finish, with a runner stood there (swimming in Deep Water). They're laid out on contact sheets of 10. Read every sheet. Set pieces fall between frames, so tour them too, passing `x`s taken from the course file's section constants: `... --as before 4300 4700 11200`. Open a full-size frame (`x<x>.png`) wherever a sheet is too small to judge.

**Done when** every stretch of the course, start line to finish, has been seen in some frame.

### 2. List what's missing

Go along the course section by section and judge each frame through [the lens](#the-lens). Write each finding as: where (`x` and the section), what's wrong, and what kind of fix it needs. The fix is one of:

- **new art**: something to draw
- **wiring**: art that exists, placed or layered differently
- **fix**: a seam, a layering bug, a light that's wrong

**Done when** every frame has either findings or an explicit "nothing to do". The biggest finding comes first: what's wrong on the most screens (a bare ground slab is usually it).

### 3. Draw, in parallel

Hand the new art to helpers, one per group of files, running at the same time. Do the wiring and fixes yourself while they draw. Each helper's brief carries:

- **Its files, and only them.** These are new exports in `courses/kit/<course>*.ts`. Say which files other helpers own and that you're editing the course file, and that it only *adds* exports, since the course uses the existing ones.
- **What to read first**: `.claude/skills/pixel-art/SKILL.md`, the existing pieces in its files to match, and the course's colours the art sits over (`look`, `ground`, `strips`).
- **Each export**: its name (and pattern id for a texture), its size in cells, and what's in it, specific enough to draw (for example "a monkey-puzzle tree, about 40×90 cells, tiers of spiky branches").
- **How to preview**: with `.claude/skills/pixel-art/sheet.mts`, into a scratchpad folder of its own.
- **When it's done**: `npx tsc --noEmit -p .` and `npx biome check --write <its files>` both clean. No dev server, browser or commit. It reports each export with its size, plus a sheet PNG path.

Look at every sheet a helper returns before placing anything.

### 4. Wire it in

Place the art and make the fixes. The rules are under [Wiring art in](#wiring-art-in).

### 5. Tour it again

Run the same `x`s with `--as after`, and compare each before and after frame. Fix what's off, such as a prop floating above a slope or a texture leaking past its stretch, and tour that spot again.

**Done when** every finding from step 2 is visibly fixed in an after frame, or listed as still weak.

### 6. Check and report

From `apps/run-game`, run `npx tsc --noEmit -p .`, `npx biome check src` and `pnpm build`. If anything you moved can be run into (an obstacle, a boost, a Platform), play the course through again to see it still finishes.

Set today's date in the course's **Last art pass** column in `docs/level-checklist.md`, and update its "Still to do" count.

Report by section: what was added and what was fixed, with the before and after sheets. End with a short **still weak** list: what you'd do on another pass.

## The lens

A course should read as one place, made for it, flowing from one section into the next. Look for:

- **Bare**: big flat surfaces of one colour, such as the ground under and behind the path, walls, water and sky bands. Give them a texture, a *suggestion* of one in see-through marks, never busier than the runners.
- **Repeated**: the same few scenery pieces over and over. Add variants that fit the place.
- **Borrowed**: shared or default art that belongs to another course, such as Haga's trees or generic rocks. Replace it with the course's own. Borrowed art is what looks "super out of place".
- **Seams**: hard lines where one section, layer or tint meets the next. Forest should flow into ash, and cliff into sea. Also look for hairlines between cells, and blends that go dark in the middle.
- **Floating or sunk**: props hovering over a slope or buried in it, back scenery poking up over the horizon, and things behind the path showing in front of it.
- **Empty set pieces**: a set piece or the finish that is just the default. Dress it for the course, like crater walls or a beach hut at the finish. Long stretches need a landmark.
- **Light**: light at odds with the place, like a deep seabed lit like a beach or sunbeams shining through rock.
- **Hidden**: art in front of an obstacle or a pickup. Playing it beats decorating it.

## Wiring art in

- **Ground textures**:
  - A texture is a `tile().pattern(id)` in `look.groundDefs`, following `kit/groundTextures.ts`. It's laid as a ground layer `[offset, 'url(#id)', smooth, edge]` straight after the colour layer it textures.
  - Keep it to its stretch with an `edge` that's `99999` (off-screen) everywhere else, as Dino Island's `only(where, edge)` does.
- **Blends**: a colour fading out in `strips` or a gradient ends in `rgba(r, g, b, 0)` of the colour beside it. Ending it in `transparent` goes through dark and leaves a line.
- **Hairlines**: cells painted edge to edge in a draw hook leave a seam between each pair. Paint them through `cellBatch` (`src/draw/paint/cellBatch.ts`), which explains why.
- **Scenery's randomness**:
  - Take new scenery's randomness from its own `seeded(n)`, as Haga's geese do.
  - Every course must stay identical for every player, and a new `random()` call in a shared stream moves everything placed after it.
- **Placement**:
  - Keep scenery, foreground plants above all, clear of obstacles, boosts and set pieces. Dino Island's `FOREGROUND_CLEAR` skips anything near them.
  - `setBack` puts scenery further back.
  - `onFloor` skews a piece to the slope under it, so leave it off for a piece that straddles a step or an edge.
