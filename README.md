# TC2 Tierlist Maker

Vite + React + TypeScript tierlist maker for Typical Colors 2 weapons, maps, cosmetics, taunts, and unusual effects.

## Requirements

- Node.js 22 or newer
- Python 3 with Pillow, used by the map label helper

## Development

```sh
npm install
npm run dev
```

The app runs at `http://127.0.0.1:5173/` by default.

## Generated Data

Scrapers write generated TypeScript data to `src/data/generated/` and downloaded assets to `public/tc2-assets/`.

```sh
npm run scrape
npm run scrape:weapons
npm run scrape:maps
npm run scrape:cosmetics
npm run scrape:taunts
npm run scrape:unusuals
```

Validate and build:

```sh
npm run validate:generated
npm run build
```

## Deployment

`.github/workflows/deploy.yml` builds the site and deploys `dist/` to GitHub Pages on `main` pushes or manual workflow runs.
