# Codebase Review

Review date: September 3, 2026  
Scope: Full codebase audit — bugs, dead code, redundancy, docs mismatches, tooling gaps.  
Build status at review time: `npm run build` passes; collision map is a valid 40×40 grid.

Use the checkboxes below as a working todo list. Items are grouped by priority and category.

---

## Critical / Functional Bugs

- [x] **Fix `window.spotifyState` — never defined**  
  **Resolved:** Note particles now spawn while the music UI is visible (`isMusicUiVisible()`). Spotify embeds cannot expose play-state cross-origin.  
  **Files:** `src/main.js`

- [x] **Desktop Spotify close button is overridden every frame**  
  **Resolved:** Added `musicDismissed` flag; close respects dismiss until the player leaves `SPOTIFY_ZONE`. Removed duplicate inline close handler from `index.html`.  
  **Files:** `src/main.js`, `index.html`

- [x] **Mobile "A" button does nothing**  
  **Resolved:** Kept A button; Enter/Space call `handleInteract()` to open music when near the boombox (`musicForcedOpen`). Aria-label added.  
  **Files:** `src/main.js`, `src/mobileAdapter.js`

- [x] **Editor Backspace can trigger browser back navigation**  
  **Resolved:** `e.preventDefault()` when deleting a label in editor mode.  
  **Files:** `src/main.js`

- [x] **Gallery pinch-zoom edge case (`NaN` scale)**  
  **Resolved:** Re-init pinch baseline if missing; guard `currentDistance <= 0`.  
  **Files:** `gallery.js`

- [x] **Gallery duplicate IDs per slide**  
  **Resolved:** Slides use `createElement` + classes `.caption` / `.date` (and textContent). CSS updated in `gallery.html`.  
  **Files:** `gallery.js`, `gallery.html`

---

## Dead / Orphaned Code

- [ ] **Remove or implement `#reading-window`**  
  Markup exists in `index.html`, CSS targets `#reading-window.visible`, and `main.js` only wires the close button. Nothing ever opens the window.  
  **Files:** `index.html`, `src/styles.css`, `src/main.js`

- [ ] **Remove or implement `#transition-overlay.active`**  
  CSS and a close handler exist, but no code ever adds the `active` class.  
  **Files:** `index.html`, `src/styles.css`, `src/main.js`

- [ ] **Remove `HOME_COORDS`**  
  Empty deprecated array; portals use `PORTALS` instead.  
  **Files:** `src/main.js` (~line 514)

- [ ] **Remove unused `TILE_SIZE` constant**  
  Defined as `32` but never used; only `COLLISION_TILE_SIZE` (8) is referenced.  
  **Files:** `src/main.js` (~line 7)

- [ ] **Remove or use `playerLoaded` flag**  
  Set to `true` when sprites finish loading but never read.  
  **Files:** `src/main.js` (~lines 31, 63)

- [ ] **Remove or use `player.frameY`**  
  Updated in several places but sprite rendering uses `player.direction` + `player.frameX` only.  
  **Files:** `src/main.js`

- [ ] **Remove unused `.rooftop-label` CSS**  
  Defined in `styles.css` but not used in HTML or JS.  
  **Files:** `src/styles.css`

- [ ] **Clean up unused `keys` object entries**  
  `Enter`, `L`, `e`, `E`, ` `, `0`, `1`, `2` are tracked but never read in game logic (`0`/`1`/`2` painting uses `e.key` directly).  
  **Files:** `src/main.js`

- [ ] **Remove unused `isPlaying` variable in `draw()`**  
  Assigned (~line 733) but never used afterward.  
  **Files:** `src/main.js`

- [ ] **Delete or document unused image assets**  
  Not referenced in source:  
  `assets/cd.png`, `assets/cd.webp`, `assets/radio.png`, `assets/radio.webp`, `assets/player.png`, `assets/player.webp`, `assets/boombox.png`, `assets/map.png`  
  (Runtime uses `.webp` variants; `boombox.webp`, `map.webp`, etc.)

---

## Redundancy / Duplication

- [ ] **Consolidate radio tile coordinates**  
  `RADIO_FOOTPRINT` (~lines 369–374) and inline `radioTiles` (~line 448) are the same data. `RADIO_FOOTPRINT` is also recreated inside `update()` every frame.  
  **Files:** `src/main.js`  
  **Fix direction:** Single module-level constant, referenced everywhere.

- [ ] **Remove duplicate Spotify iframe URL assignment**  
  URL is set in the `mobileAdapter.js` HTML template and again on lines 75–77.  
  **Files:** `src/mobileAdapter.js`

- [ ] **Consolidate music popup close handlers (3×)**  
  - Inline `<script>` in `index.html` (~lines 214–217)  
  - `DOMContentLoaded` handler in `main.js` (~lines 199–206)  
  Inline handler does not reset `showRadioSpeechBubble`; `main.js` handler does.  
  **Files:** `index.html`, `src/main.js`

- [ ] **Remove duplicate `player.direction` assignment**  
  Set once before collision check (~line 439) and again after a successful move (~lines 473–476).  
  **Files:** `src/main.js`

- [ ] **Clean up repeated comments in `main.js`**  
  Multiple stale duplicates: "Trigger Handler", "Map Data", "Dynamic Labels", etc.

- [ ] **Remove duplicate PNG + WebP assets**  
  Source PNGs remain alongside WebP outputs (`map`, `cd`, `radio`, `boombox`, `player`), increasing repo size without runtime use.  
  **Files:** `assets/`

- [ ] **Deduplicate gallery CSS for `.photo-slide img`**  
  Rules appear twice in `gallery.html` (~lines 90–96 and ~291–301) with overlapping properties.  
  **Files:** `gallery.html`

---

## Logic / UX Issues

- [ ] **Mobile GBA shell only initializes at page load**  
  `mobileAdapter.js` checks viewport width once. Resizing desktop ↔ mobile does not inject or remove the shell.  
  **Files:** `src/mobileAdapter.js`

- [ ] **Decide on gallery shuffle behavior**  
  Fisher–Yates shuffle on every page load means order differs each visit. Intentional?  
  **Files:** `gallery.js` (~lines 20–24)

- [ ] **Align gallery navigation loop behavior**  
  `navigateFixed()` wraps at ends; direct thumbnail `navigateTo()` does not loop.  
  **Files:** `gallery.js`

- [ ] **Review double-tap zoom vs drag conflict**  
  `touchStart` updates `lastTapTime` on every touch, which can interfere with double-tap detection during quick interactions.  
  **Files:** `gallery.js`

- [ ] **Review mailto portal UX inconsistency**  
  `mailto:` portals abort the fade transition and show a prompt instead of completing the fade like HTTP portals (intentional Chrome workaround, but inconsistent).  
  **Files:** `src/main.js`

- [ ] **Improve editor persistence workflow**  
  Collision/label edits live only in memory unless manually exported and pasted into `mapData.js`.  
  **Files:** `src/main.js`, `src/mapData.js`, `README.md`

- [ ] **Improve export UX**  
  "Export Config" only logs JSON to the console; does not copy to clipboard or download a file.  
  **Files:** `src/main.js`

---

## Documentation vs Code Mismatches

- [ ] **Fix README sprite render size**  
  README says 28×42px; code draws at 24×36px (`main.js` ~line 716).  
  **Files:** `README.md`, `src/main.js`

- [ ] **Fix README file extension references**  
  README references `.png` sprites and `map.png`; code uses `.webp`.  
  **Files:** `README.md`

- [ ] **Fix README animation file naming**  
  README says `direction_frame.png`; actual files are `direction_frame.webp`.  
  **Files:** `README.md`, `assets/player/`

- [ ] **Fix `package.json` `"main"` field**  
  Set to `"gallery.js"` but is misleading for a static site; `index.html` / `src/main.js` is the real entry.  
  **Files:** `package.json`

- [ ] **Align `package.json` repository URL with repo name**  
  Points to `personal-website.git`; workspace folder is `OldaleWebsite`.  
  **Files:** `package.json`

- [ ] **Normalize gallery caption casing**  
  e.g. `"Pilani"` vs `"pilani"` in `galleryData.json`.  
  **Files:** `galleryData.json`

---

## Build / Tooling / Config

- [ ] **Add real tests or remove failing `npm test` script**  
  Default script is `echo "Error: no test specified" && exit 1`.  
  **Files:** `package.json`

- [ ] **Resolve `package.json` module type inconsistency**  
  `"type": "commonjs"` but app source uses ES modules (`import`/`export` in `main.js`, `mapData.js`).  
  **Files:** `package.json`, `src/`

- [ ] **Decide on production `console` stripping**  
  `scripts/build.js` uses `drop: ['console', 'debugger']`, removing all `mailDebug()` output in production.  
  **Files:** `scripts/build.js`, `src/main.js`

- [ ] **Add linting / type checking / CI**  
  No ESLint, TypeScript, or CI workflow in the repo.  
  **Fix direction:** Add at minimum ESLint + a basic GitHub Actions build check.

- [ ] **Add Vercel Insights to gallery page (or remove from main)**  
  `index.html` includes `/_vercel/insights/script.js`; `gallery.html` does not.  
  **Files:** `index.html`, `gallery.html`

- [ ] **Handle Vercel Insights 404 locally**  
  Script path `/_vercel/insights/script.js` 404s during `npm run dev`.  
  **Files:** `index.html`

---

## Security / Accessibility

> Deep vulnerability scan completed September 5, 2026.  
> Stack posture: static client-side site (no auth, no backend API, no secrets in repo).  
> Primary risk areas: XSS sinks, missing security headers, untrusted image URL handling in a build script, and vulnerable npm build tooling.

### High — App / Client XSS & Injection

- [ ] **Sanitize gallery `innerHTML` injection (stored XSS if JSON is poisoned)**  
  `gallery.js` builds slides with unescaped `photo.url`, `photo.caption`, and `photo.date` inside `innerHTML`. A malicious caption like `"><img src=x onerror=alert(1)>` or a `javascript:` / `data:` `url` would execute in the visitor's browser. Today data is static/trusted, but any future CMS, PR, or compromised `galleryData.json` becomes an XSS vector. Thumbnails also assign `thumb.src = photo.url` with no scheme allowlist.  
  **CWE:** CWE-79 (XSS), CWE-83 (improper neutralization in web page)  
  **Files:** `gallery.js` (~lines 41, 61–66)  
  **Fix direction:** Prefer `textContent` / `createElement` + `setAttribute`; allowlist image URLs to relative `assets/gallery/*.webp` only; escape HTML if templating must stay.

- [ ] **Sanitize mailto prompt DOM construction**  
  `showMailtoPrompt(mailtoUrl)` injects `email` and `mailtoUrl` into `innerHTML` / `href` without escaping. Values currently come from hardcoded `PORTALS`, so exploitability is low today — but the sink is unsafe if portal URLs ever become data-driven. Attribute breakout in `href="${mailtoUrl}"` or HTML injection in `${email}` is possible with a crafted mailto string.  
  **CWE:** CWE-79  
  **Files:** `src/main.js` (~lines 551–578)  
  **Fix direction:** Build nodes with `createElement` / `textContent`; set `href` via property after validating `mailto:` scheme and email format.

- [ ] **Editor label `prompt()` input is unsanitized (low impact)**  
  God Mode label text from `prompt("Enter label text:")` is stored and rendered via canvas `fillText` (not HTML), so classic DOM XSS is unlikely. Still, unbounded length / special characters can degrade UI; if labels are later exported into HTML, the risk rises.  
  **Files:** `src/main.js` (~line 220)

### High — Dependency CVEs (npm audit)

Affects **build/dev tooling** (`scripts/convert-images.js`), not the shipped static `dist/` browser bundle — but still important if you run convert/build on untrusted input or in CI.

- [ ] **Upgrade `axios` (currently 1.14.0) — multiple High/Moderate advisories**  
  Includes SSRF / `NO_PROXY` bypasses, prototype-pollution gadgets, header injection, XSRF leakage, etc. Used to download remote images in `convert-images.js`.  
  **Advisories (examples):** [GHSA-pmwg-cvhr-8vh7](https://github.com/advisories/GHSA-pmwg-cvhr-8vh7), [GHSA-pf86-5x62-jrwf](https://github.com/advisories/GHSA-pf86-5x62-jrwf), [GHSA-6chq-wfr3-2hj9](https://github.com/advisories/GHSA-6chq-wfr3-2hj9)  
  **Fix direction:** `npm audit fix` / bump to ≥ `1.15.2` (verify latest patched).

- [ ] **Upgrade `sharp` (currently 0.34.5) — High (libvips CVEs)**  
  Inherited libvips issues (CVE-2026-33327/33328, CVE-2026-35590/35591). Processes untrusted image bytes downloaded from URLs.  
  **Advisory:** [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)  
  **Fix direction:** bump to ≥ `0.35.0` (may be breaking — test convert script).

- [ ] **Upgrade `form-data` / `follow-redirects` (axios transitive)**  
  - `form-data@4.0.5` — High CRLF injection ([GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx))  
  - `follow-redirects@1.15.11` — Moderate auth header leak on cross-domain redirects ([GHSA-r4q5-vmmm-2653](https://github.com/advisories/GHSA-r4q5-vmmm-2653))  
  **Fix direction:** resolved by upgrading axios / `npm audit fix`.

- [ ] **Upgrade `brace-expansion` (via `glob` → `minimatch`) — High DoS**  
  Multiple DoS advisories in 3.0.0–5.0.8 range. Lower risk here (local glob of `assets/**`), but still should be patched.  
  **Fix direction:** `npm audit fix` / bump `glob`.

### High — Build Script SSRF / Untrusted Fetch

- [ ] **`convert-images.js` fetches arbitrary `http(s)` URLs from `galleryData.json` (SSRF)**  
  Any entry with `url` starting with `http` is downloaded via axios with **no allowlist**, no size limit, no protocol restrictions beyond `startsWith('http')`, and follows redirects (see follow-redirects CVE). A crafted URL could target internal metadata (`169.254.169.254`), localhost services, or huge payloads.  
  **CWE:** CWE-918 (SSRF)  
  **Files:** `scripts/convert-images.js` (~lines 47–70, also wallpaper download ~line 92)  
  **Fix direction:** Allowlist hosts; block private/link-local IPs; set `maxContentLength` / `maxBodyLength` / timeout; disable or carefully control redirects; prefer manual download of assets.

- [ ] **Untrusted image pipeline into `sharp` (image bomb / parser risk)**  
  Downloaded bytes are passed straight into `sharp(...).webp()`. Combined with known sharp/libvips CVEs, malicious images can crash the process or worse.  
  **Files:** `scripts/convert-images.js`  
  **Fix direction:** Upgrade sharp; constrain input dimensions/size before processing.

### Medium — Missing Browser Security Hardening

- [ ] **No Content-Security-Policy (CSP)**  
  Pages load Google Fonts, Spotify embeds, and Vercel Insights with no CSP. A successful XSS would have an open exfiltration/script surface.  
  **Files:** `index.html`, `gallery.html`, `vercel.json`  
  **Fix direction:** Add CSP via `vercel.json` `headers` (and meta as fallback). Start with `default-src 'self'`; allowlist `fonts.googleapis.com`, `fonts.gstatic.com`, `open.spotify.com`, `/_vercel/insights`.

- [ ] **No security headers in `vercel.json`**  
  Missing recommended headers: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` / `frame-ancestors`, HSTS (if custom domain).  
  **Files:** `vercel.json`  
  **Fix direction:** Add a `headers` block for `/(.*)`.

- [ ] **Spotify iframes lack `sandbox` / tight `allow` policy**  
  Embeds use broad `allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"` with no `sandbox` attribute. Third-party iframe compromise or clickjacking-within-embed is an accepted risk of Spotify embeds, but permissions can be minimized.  
  **Files:** `index.html`, `src/mobileAdapter.js`  
  **Fix direction:** Drop unused `allow` tokens; consider `referrerpolicy="strict-origin-when-cross-origin"`.

- [ ] **Third-party script/style trust (supply chain)**  
  - Google Fonts CSS from CDN  
  - Vercel Insights `/_vercel/insights/script.js`  
  - Spotify embed origin  
  Compromise of any of these affects all visitors. No SRI on the Insights script (path is platform-hosted).  
  **Files:** `index.html`, `gallery.html`

### Medium — Open Redirect / Navigation Trust

- [ ] **Portal navigation uses `window.location.href = pendingURL` with no scheme allowlist**  
  Today `PORTALS` is a hardcoded constant (bearblog, X, gallery, mailto) — safe. There is **no runtime validation** that URLs are `https:` / relative / `mailto:`. If portals are ever moved into `mapData.js` or remote config, this becomes an open redirect / `javascript:` risk.  
  **CWE:** CWE-601  
  **Files:** `src/main.js` (~lines 19–27, 526, 808–828)  
  **Fix direction:** Validate scheme against an allowlist before assign; reject `javascript:`, `data:`, unknown schemes.

### Low / Informational

- [ ] **Personal email address exposed in client JS**  
  `mailto:ishanmalhotra2004@gmail.com` is public in `src/main.js` (and thus in the minified bundle). Expected for a contact portal, but enables scraping/spam.  
  **Files:** `src/main.js`

- [ ] **Verbose mail debug logging in source**  
  `mailDebug()` logs URLs, user agent, and interaction stages to the console in non-production builds. Production build drops `console` via esbuild — good — but local/dev still leaks flow details.  
  **Files:** `src/main.js`, `scripts/build.js`

- [ ] **No Subresource Integrity (SRI) on external stylesheets**  
  Google Fonts `<link>` has no integrity hash (often impractical for Google Fonts CSS). Prefer self-hosting the font files.  
  **Files:** `index.html`, `gallery.html`

- [ ] **Gallery fetch has no integrity / Content-Type check**  
  `fetch('./galleryData.json')` trusts response JSON shape without schema validation. Malformed or swapped content only needs to pass `response.json()`.  
  **Files:** `gallery.js`

- [ ] **Consider Content Security Policy** *(duplicate of CSP item above — keep for parity with earlier review)*  
  External scripts/styles loaded from Google Fonts, Spotify, and Vercel.  
  **Files:** `index.html`, `gallery.html`

- [ ] **Improve accessibility**  
  - Game canvas has no `aria-label`  
  - Mobile D-pad / A button lack descriptive labels  
  - Editor mode relies on color-only feedback (red/blue overlays)  
  **Files:** `index.html`, `src/mobileAdapter.js`, `src/main.js`, `src/styles.css`

### Not found / Out of scope (good news)

- No secrets, API keys, tokens, or `.env` files in the repo  
- No server-side user auth, sessions, or cookies to steal  
- No SQL / command injection surface in shipped site  
- Portal URLs and Spotify playlist IDs are developer-controlled constants today  
- Production build strips `console` / `debugger` (reduces info leak in prod)

---

## Assets / Rendering

- [ ] **Verify player sprite scaling**  
  Source sprites are 500×500px but drawn at 24×36 on a 320×320 canvas. Confirm art is centered correctly in the large source files.  
  **Files:** `assets/player/`, `src/main.js`

- [ ] **Review boombox hardcoded position**  
  Source is 1062×1062, drawn at 24×24 at fixed canvas position `(172, 140)` — not tied to map grid data.  
  **Files:** `src/main.js`, `assets/boombox.webp`

- [ ] **Consider refactoring `mapData.js` size**  
  ~1,700 lines with inlined 40×40 collision grid bloats the JS bundle. Works, but hard to maintain.  
  **Files:** `src/mapData.js`  
  **Fix direction:** Compress format, generate at build time, or split collision from labels.

---

## Minor / Cosmetic

- [ ] **Move editor button inline styles to CSS**  
  `#add-label-btn` and `#export-btn` use inline `style=` in `index.html`.  
  **Files:** `index.html`, `src/styles.css`

- [ ] **Move music player inline CSS to `styles.css`**  
  ~135 lines of CSS live inline in `index.html`.  
  **Files:** `index.html`, `src/styles.css`

- [ ] **Rename `#game-container` on gallery page**  
  ID suggests the game page but wraps the polaroid frame on `gallery.html`.  
  **Files:** `gallery.html`, `gallery.js`

- [ ] **Clarify Home portal destination**  
  Points to `https://ishanmalhotra.bearblog.dev/` (blog root) — may overlap semantically with the site's role as a personal homepage.  
  **Files:** `src/main.js`

---

## Summary

| Category | Items |
|---|---|
| Critical / functional bugs | 6 |
| Dead / orphaned code | 10 |
| Redundancy / duplication | 7 |
| Logic / UX issues | 7 |
| Documentation mismatches | 6 |
| Build / tooling / config | 6 |
| Security / accessibility / vulns | ~20 (expanded deep scan) |
| Assets / rendering | 3 |
| Minor / cosmetic | 4 |
| **Total** | **~69** |

### Vulnerability scan verdict

This is a **static personal site** with a small attack surface. There is no backend auth or secrets exposure. The realistic risks today are:

1. **XSS** if `galleryData.json` (or future portal config) is ever attacker-controlled  
2. **Vulnerable build dependencies** (`axios`, `sharp`, etc.) when running `convert-images`  
3. **SSRF** in `convert-images.js` against arbitrary gallery URLs  
4. **Missing CSP / security headers** on Vercel (defense-in-depth gap)

Nothing critical appears exploitable by a random site visitor **with the current trusted static data** — but the sinks and tooling should still be hardened.

### Recommended starting order

1. Fix gallery XSS sinks (`innerHTML` / image URL allowlist)  
2. Add Vercel security headers + CSP  
3. `npm audit fix` / upgrade `axios` + `sharp`  
4. Harden `convert-images.js` (URL allowlist, size limits)  
5. Validate portal URL schemes before `location.href`  
6. Fix `spotifyState` or remove the particle feature  
7. Fix desktop Spotify dismiss behavior  
8. Wire or remove the mobile A button  
9. Delete dead UI (`reading-window`, `transition-overlay`)  
10. Consolidate duplicated radio-tile data and close handlers  
11. Remove unused assets and dead variables  
12. Update README and `package.json` to match the code
