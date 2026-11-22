# PeaceCream

**What does peace taste like?**

An interactive ice-cream and dessert experience by **Leah Kim and Miki Kawamura**.

Live website: https://peacecream-one.vercel.app/

## Run locally

No build step or API keys are required. From this directory, run:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080/ in your browser. Use an HTTP server rather than opening `index.html` directly, so the map data and lazy-loaded modules can load.

## Features

- Create an ice cream with flavors, toppings and a personal peace message.
- Discover a scoop through a guided reflection.
- Explore the illustrated World Peace Map and collect Passport stamps.
- Keep a Recipe Book and Time Capsules, or try Melt Your Worries.
- Browse ready-made, fixed-flavor dessert gifts with original AI-generated product photography.
- Create branded photos and share cards.
- English, Japanese and Simplified Chinese interfaces.

The home page keeps the original ice-cream introduction. **Little world** opens the feature directory at `#world`.

## Storage and demo behavior

Recipes, Passport stamps, Time Capsules and demo rewards are saved in the visitor's browser. They are not backed up or synchronized across devices. The World Peace Map currently reflects recipes shared in that browser; it is not a global shared database.

Gift checkout and reward codes are demonstrations. No payment is taken, no dessert is delivered, and demo discount codes are not valid for real purchases.

Melt Your Worries keeps entered text only in memory and clears it when the experience ends or the visitor leaves. Camera photos are processed locally in the browser.

## Tests

With Node.js installed, run:

```sh
node --test tests/*.test.js
```

## Code structure

- `index.html`, `app.js`, `style.css`: main page, ice-cream creator and navigation.
- `pc-ui.js`, `pc.css`, `pc-sweet.css`: shared feature routing, navigation and styles.
- `pc-store.js`: browser-local persistence and validation.
- `pc-map.js`, `pc-passport.js`, `pc-recipes.js`, `pc-capsules.js`, `pc-melt.js`: Little world experiences.
- `pc-catalog.js`, `pc-shop.js`, `pc-gift.js`: fixed dessert catalog and demo gifts.
- `pc-camera*.js`, `pc-photos.js`, `pc-share.js`, `pc-rewards-core.js`: photos, sharing and demo rewards.
- `pc-i18n.js`, `i18n/`: language support.
- `quiz-*.js`: guided discovery.
- `assets/`, `fonts/`: website images and bundled fonts.
- `data/world-paths.json`: geographic map data.
- `tools/`: optional map-building, translation and visual-development helpers.
- `tests/`: storage and reward tests.

The map uses Natural Earth geographic data via world-atlas. Bundled typefaces are DM Sans and Fraunces. Optional map rebuilding dependencies are listed in `tools/build-map.mjs`; rebuilding is unnecessary to run the site.

## Deployment

This is a static website. Publish this directory to a static web host with `index.html` as the entry point and no build command. Vercel deployment identifiers and credentials are intentionally excluded from this repository.
