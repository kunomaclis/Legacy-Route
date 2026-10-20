# Alliance Legacy Point Route

WoW Forever guide for leveling a main plus eight alts on rested XP and organizing professions for Legacy Points.
Alliance version of Ceedsy's "Ultimate Alt Army Blueprint".

Live site: https://kunomaclis.github.io/Legacy-Route/

## Layout

| Path | What it is |
|---|---|
| `index.html` | All guide content: dashboard, roster, route phases, Legacy Points |
| `assets/css/base.css` | Layout, components, standard light/dark look, class colors |
| `assets/css/themes.css` | The Ironforge and Stormwind looks, plus self-hosted fonts |
| `assets/js/app.js` | Tracker, Legacy Point math, search, focus filter, step checkboxes, looks |
| `assets/icons.svg` | Icon sprite: `class-*`, `race-*`, `prof-*` symbols |
| `sw.js`, `manifest.webmanifest` | Offline support and Add to Home Screen |

## Editing the guide

- Route steps are plain `<li>` items inside each `<details class="phase-d">` in `index.html`. Every step gets a checkbox automatically.
- A step heading (`<h3>`) that names a class (`2. Druid 1–15`) gets that class's icon and color automatically.
- Icons in content: `<i data-cls="shaman"></i>`, `<i data-race="dwarf"></i>`, `<i data-prof="mining"></i>`.
- After changing CSS, JS or the icon sprite, bump the `?v=` number everywhere it appears (`index.html`, `SPRITE` in `assets/js/app.js`, and `sw.js` along with `CACHE`). Otherwise browsers can pair a new page with an old script for up to 10 minutes.

Progress (levels, skills, ticked steps, parked times, look) is stored in each browser's localStorage under `alr-v2`.

## Credits

Icons are original SVGs made for this site. Class colors follow the in-game class colors.
Fonts: Cinzel and Crimson Pro, SIL Open Font License 1.1 (`assets/fonts`).
World of Warcraft is a trademark of Blizzard Entertainment; this is an unofficial fan guide.
