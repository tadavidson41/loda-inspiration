# inspiration.b2brizz.com

Static LinkedIn ad inspiration gallery for B2BRizz. Client-side filters read from `data/ads.json` (LODA order). No backend.

Brand tokens: navy `#27273a`, ink `#12121b`, cream `#efd2ba`, sky `#b0e2eb` (accent only), white.

Headline: **LinkedIn ad inspiration that doesn't suck**

## Local preview

Browsers block `fetch()` on `file://`. Serve the folder over HTTP:

```bash
cd inspiration-site
python3 -m http.server 8080
```

Open http://127.0.0.1:8080 — filters (Company, Industry, Ad Type + search) update the grid and live count. Multi-value tags (split on `;`) match if **any** pill matches.

## Data

- **Source of truth for order:** `data/loda-full.json` (do not alphabetically re-sort).
- **Runtime feed:** `data/ads.json` — rebuilt from LODA with `order: 1..n`, local creatives under `assets/creatives/`, and `industryTags[]` / `adTypeTags[]` for pills.
- **Tag colors:** `data/tag-colors.json` — Coda-like soft pastels keyed by emoji-stripped tag name. Pill labels keep leading emoji from the source.
- **Creatives:** every file in `assets/creatives/` is padded to **1080×1080** (contain / letterbox on white) so previews are never cropped. Card CSS uses `aspect-ratio: 1 / 1` and `object-fit: contain`.
- **Landing pages:** optional `landingUrl` on each ad. The Coda export columns we have are Image, Company, Industry, Ad Type, Ad Format, and Ad Link (Google Drive creative). **Landing page URLs were not in that export** — leave `landingUrl` empty unless Tim points us to where LP URLs live. Drive `sourceUrl` links show as **View creative** in the UI.

## Deploy to Netlify

1. Push this folder (or the parent repo) to GitHub/GitLab/Bitbucket.
2. In Netlify: **Add new site → Import an existing project**.
3. Set **Publish directory** to `inspiration-site` (or `.` if this folder is the repo root).
4. Add domain alias `inspiration.b2brizz.com`.

## Project layout

```
inspiration-site/
├── index.html
├── netlify.toml
├── README.md
├── data/
│   ├── ads.json
│   ├── tag-colors.json
│   └── loda-full.json
├── js/
│   └── app.js
└── assets/
    ├── brand/
    │   ├── b2brizz-logo-negative.svg
    │   └── b2brizz-logo.svg
    ├── css/site.css
    └── creatives/
```
