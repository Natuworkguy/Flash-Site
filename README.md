# FLASH Site

The landing page for [FLASH](https://github.com/Natuworkguy/Flash), Fast Local Agent Shell: an AI-powered CLI for Ollama.

## Structure

- `index.html`: thin page shell; each section is fetched at runtime from `partials/`
- `partials/`: one HTML file per section (hero, watch, features, onyx, install, etc.)
- `assets/css/style.css`: all styles
- `assets/js/config.js`: single source of truth for install commands, links, and the current Flash Onyx release. Edit this file to update content site-wide.
- `assets/js/`: small ES modules: `include.js` (loads partials and fills `{{tokens}}` from config), `scroll.js` (scroll-linked animation), `terminal.js` (hero typing demo), `ui.js` (nav, tabs, copy buttons, reveal animations)
- `scripts/generate-og-image.py`: rebuilds the social card from the logo SVG

## Running locally

Partials are loaded with `fetch`, so opening `index.html` directly won't work (browsers block `fetch` on `file://`). Serve the folder instead:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Updating content

Most text lives directly in the relevant `partials/*.html` file. Commands, links, and the Flash Onyx model info live in `assets/js/config.js`, change them there and every reference across the site updates automatically.

## Regenerating the social card

`assets/images/og-image.png` is built from `assets/images/logo.svg`. Rebuild it after changing the logo, or after editing the tagline near the top of the script:

```bash
pip install pillow
python3 scripts/generate-og-image.py
```

The script reads the lockup out of `logo.svg` itself (the bolt's `<rect>` grid, the `<g>` transform, and the `<text>` position/size/tracking), so restyling the logo and rerunning is enough. The bolt is pixel art, so each `<rect>` is drawn at an integer scale instead of resampling the SVG, keeping the edges hard and the palette exact. Output is 1200x630 to match the `og:image:width` / `og:image:height` tags in `index.html`. Fonts are fetched into `scripts/.fonts/` on first run.
