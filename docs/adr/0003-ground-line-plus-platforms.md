# The Ground stays one line; Gaps and Platforms are added to it

In run-game, a Course's Ground is still one height at every point along it, following the Course's hills. Two things are added on top of it rather than replacing it:

- **Gaps**: stretches along the line where there is no Ground.
- **Platforms**: a separate list of raised surfaces, some of them moving.

On City Rooftop, the rooftops are the Ground, with steps in its height for the buildings' Walls and Gaps between them.

## Considered Options

- **Every surface is the same kind of thing, with no special Ground.** A Course would be a list of surfaces at different heights. That's more general, since a Course could have a cave or an overhang at the bottom. We rejected it because:
  - every existing Course, the Pacers, the Scoop Bus, the backdrop, the course preview and the obstacle placement all read the Ground as one height at a point, and would have to be rewritten
  - the Scoop Bus and the Pacers need one line to follow anyway. With a plain list of surfaces, we'd have to pick one and call it the Ground.

## Consequences

- The Scoop Bus and the Pacers keep to the Ground line and go straight over Gaps. The bus reaches runners above or below that line with its Scoop Arm.
- Anything below the Ground line is never a surface to stand on. A lower path has to be the Ground, with the higher paths as Platforms above it.
- A Course's lowest Ground and highest Platform stay within 2 screen heights of each other, so a Round can zoom out to fit everyone.
