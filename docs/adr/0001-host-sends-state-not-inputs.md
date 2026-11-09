# The Host sends race state; everyone else sends only inputs

In run-game multiplayer, the Host runs the only real simulation. Phone Controllers and Remote Players send only their inputs. About 20 times a second, the Host sends every device the state of each runner, the bus, obstacles, Pacers, furbies and corgis, and remote screens smooth between those updates.

## Considered Options

- **Inputs only, with every device running the race itself** (lockstep). This sends much less data, but every device's simulation has to stay exactly in step. The run-game's simulation doesn't today:
  - Pacers, furbies, corgis and flings use `Math.random`.
  - Input is read inside the step code.
  - Where Pacers appear depends on the camera.

  Making it deterministic is possible. But keeping it that way is fragile: one stray non-deterministic call makes the screens drift apart without anyone noticing.

## Consequences

- Remote Players see their own jumps delayed by about one round trip. If that feels sluggish, the fix is local prediction for the player's own runner, not a switch to lockstep.
- The race state is small (a few hundred numbers), so the Host's upload isn't a concern at 8 Players.
