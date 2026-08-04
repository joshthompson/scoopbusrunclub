# Scoop Bus Run Club

Nx monorepo for the Scoop Bus Run Club website and services.

## Structure

- `apps/web` — SolidJS frontend (Vite + PandaCSS)
- `apps/api` — Convex backend (coming soon)
- `apps/results-scraper` — local-only Chrome extension that fetches parkrun pages
  for the Process Results admin page (see its README; `pnpm scraper:build`)
- `libs/shared` — parsers, URLs and types shared by all three

## Setup

```bash
pnpm install
```

## Development

```bash
# Start the web app
pnpm dev

# Or via Nx directly
npx nx run web:dev
```

## Build

```bash
pnpm build
```

## Deployment

The web app auto-deploys to GitHub Pages on push to `main` via the workflow in `.github/workflows/deploy-web.yml`.

## Deployment

You can deploy the `dist` folder to any static host provider (netlify, surge, now, etc.)

## This project was created with the [Solid CLI](https://github.com/solidjs-community/solid-cli)
