---
status: accepted
---

# The game engine is ScoopJS, a package from its own repo

The engine run-game is built on used to be `apps/web/src/engine`, which run-game reached through a `@/` alias into the website. It is moving out into its own repo, `scoopjs`, and is published as a package, with extras as plugin packages next to it. Until its npm name is settled, it's `@joshthompson/scoopjs` on GitHub Packages, which the apps install under the alias `scoopjs`, so moving it to npm later changes one line per app. run-game and the website install it like any other dependency. The engine was already being copied into other projects (freediver has a fork that has drifted a long way), and a package is the one copy everything can share.

## Considered Options

- **Keep it in this monorepo as a workspace package, and move it out later.** That makes changing run-game and the engine together easier, but nothing outside this repo could use it until it moved. We chose to give it its own repo straight away.
- **A git submodule.** Rejected: you get the friction of two repos without a versioned release.

## Consequences

- When run-game needs an engine change, that change has to be published before run-game's commit is pushed. CI installs ScoopJS from the registry, so an unpublished engine change breaks the deploy.
- GitHub Packages wants a token even to install, so `deploy-web.yml` logs in with its `GITHUB_TOKEN` (the package lets this repo's Actions read it), and installing locally needs a token with `read:packages` in `~/.npmrc`.
- While working on both at once, run-game and the website use a linked copy of ScoopJS. Their Vite configs dedupe `solid-js` and their tsconfigs map `solid-js` to their own copy, because a linked ScoopJS would otherwise bring its own Solid: signals would silently stop updating, and `createController` would lose its types.
- ScoopJS must not know anything about Scoop Bus. Anything seasonal (the Halloween and Christmas asset swaps) is passed in by the game.
- ScoopJS draws with DOM elements today. Game code only talks to Controllers and Sprites, never the DOM directly, so the renderer can be swapped for a canvas one later.
