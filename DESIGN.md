# Design guide

This site is a personal world that looks and behaves like a Game Boy Advance overworld. Navigation is walking. Pages are rooms you step into. New features should feel like they were always on the map, not like a widget bolted onto a website.

Read this before adding, restyling, or removing anything a visitor can see.

## What the site is

The home page (`index.html`) is a 320×320 canvas town. The player walks an 8px collision grid. Buildings, edges, and objects are portals or interactions. There is no site nav.

Interior pages sit on the same wallpaper and use the same pixel chrome, but each one is a physical object:

| Surface | File | Object |
| --- | --- | --- |
| Overworld | `index.html`, `src/main.js`, `src/styles.css` | The town itself |
| Gallery | `gallery.html`, `gallery.js`, `galleryData.json` | A Polaroid and a film strip |
| Bookshelf | `bookshelf.html`, `src/bookshelf.js`, `src/bookshelf.css`, `src/pageStyles.css` | A wooden bookcase |
| Work | `work.html`, `src/league.js`, `src/workData.js`, `src/work.css` | League rooms, one per role, walked in order |
| Mobile shell | `src/mobileAdapter.js` + the mobile block in `src/styles.css` | A purple Game Boy around the canvas |

Shared chrome on every HTML page:

- Favicon is the maple leaf emoji (`🍁`), inlined as an SVG data URI. Do not swap it for a logo file.
- Document title is `ishan's space`. Subpages may prefix a room name: `bookshelf — ishan's space`.
- Background is `assets/pokemon-wallpaper.webp`, `background-size: cover`, `background-position: center bottom`, `background-attachment: fixed`, `image-rendering: pixelated`. On small screens, switch attachment to `scroll` so iOS does not jitter.

## Two visual systems

Do not mix them.

**World chrome** is drawn on the canvas or as a small HUD over the wallpaper. Labels, the boombox hint, and note particles live here. They are tiny, black, and white.

**Room chrome** is HTML. It uses hard offset shadows, thick black borders, and a paper or object fill. `src/pageStyles.css` is the shared room kit (dialogue frame, top bar, buttons, forms). Gallery and the music card are bespoke objects and do not use the dialogue frame.

Bookshelf spine type is the only place real book fonts are allowed. Everywhere else, chrome is Press Start 2P and readable text is Courier New.

## Tokens

Room pages already define these in `src/pageStyles.css`. Reuse the variables. Do not invent a parallel palette for a new page.

| Token | Value | Use |
| --- | --- | --- |
| `--font-pixel` / `--font-secondary` | `'Press Start 2P', cursive` | All UI chrome |
| `--ink` | `#1a1a1a` | Borders, button fills, text on paper |
| `--paper` | `#f7f3e8` | Dialogue frames, inputs, tooltips |
| `--paper-edge` | `#e8e0d0` | Inner frame line |
| `--accent` | `#2d6b4f` | Secondary buttons, search focus |
| `--accent-dim` | `#1e4a36` | Links inside body text |
| `--danger` | `#a03030` | Destructive actions, errors |
| `--muted` | `#6a655c` | Meta lines, helper text |
| `--shadow` | `rgba(0, 0, 0, 0.45)` | Hard offset shadows |

Colors that are specific, and should stay specific:

| Color | Where | Do not reuse for |
| --- | --- | --- |
| `#1DB954` | Spotify, floating notes, boombox hint | Generic "success" or primary buttons |
| `#00ff00` | Active film thumbnail, editor selection | Marketing highlights |
| `#e8b860` / `#f0c040` | Shelf plaque and book count | Random gold accents |
| GBA purple `#7d63c4` → `#4b367c` | Mobile shell only | Desktop frames |
| A-button red `#e02020` | The Game Boy A button only | Alerts |
| `#111` | Music card and mailto card | Page backgrounds |

Book-cloth colors live in `PALETTE` inside `src/bookshelf.js`. New spine colors belong in that list, paired with an ink that stays readable. Do not pick a spine color in CSS per book.

## Type

Load Press Start 2P from Google Fonts on every page. It is a bitmap face: keep sizes in whole pixels, keep lines short, and never set it below 8px except for the 6–7px music-card micro label and the canvas boombox hint.

| Role | Face | Size | Case |
| --- | --- | --- | --- |
| Canvas building labels | Press Start 2P | 8px | As written in `dynamicLabels` (`Home`, `Blog`) |
| HUD | Press Start 2P | 9–10px | UPPERCASE, `letter-spacing: 1px` |
| Top-bar links and `.page-btn` | Press Start 2P | 9px | Short, often with a `←` |
| Dialogue title | Press Start 2P | 16px desktop, 13px mobile | lowercase |
| Dialogue meta | Press Start 2P | 8px | as needed |
| Body, inputs, list meta, errors | `'Courier New', Courier, monospace`, **bold** | 14–16px | Sentence case |
| Gallery caption | Press Start 2P | 10px | lowercase place name |
| Gallery date | Press Start 2P | 8px | `feb 2026` style, `#888` |
| Book spines | The face assigned to that author | Fitted in JS | Whatever that style's `upper` flag says |

Long reading text never goes in Press Start 2P. If a feature needs a paragraph, put it in Courier New inside a dialogue frame.

## Shape, shadow, motion

Page buttons and links:

- Fill `--ink` (or `--accent` / `--danger`), 3px white border, padding about `10px 14px`.
- Shadow is `4px 4px 0` (frames use `8px 8px 0`). No blur on these.
- Hover: `translate(-1px, -1px)`. Active: `translate(2px, 2px)` and shrink the shadow to `1px 1px 0`.
- Disabled: opacity `0.45`, no transform.

Dialogue frame (`.dialogue-frame`):

- Paper fill, 5px ink border, `8px 8px 0` shadow, inner `3px` paper-edge line.
- Padding `28px` desktop, `20px 16px` under 768px.
- Max content width `720px`. Bookshelf is the wide exception at `1180px` because it is a piece of furniture, not a text column.

Signature easing is `cubic-bezier(0.175, 0.885, 0.32, 1.275)` over ~0.3–0.35s. Use it when a frame, polaroid, or reading window appears. It overshoots slightly, like a menu popping in Emerald.

Pixel motion, when something should feel like the console rather than the web:

- Stepped transitions: `steps(3, end)` on the book tooltip, `steps(6, end)` on the mobile Spotify pad.
- Gallery swipe is drag plus momentum, not a crossfade.
- Portal exit is a canvas black fade, `fadeOpacity += 0.02` per frame, then `location.href`.

Honor `prefers-reduced-motion: reduce` on new page animations the way `.dialogue-frame` and `.book` already do.

Hover on physical objects lifts them: books move `translateY(-8px)`; thumbnails scale to `1.05`. Do not add glow, gradient borders, or glassmorphism.

## Breakpoints

| Width | What changes |
| --- | --- |
| `≤ 768px` | Overworld becomes the Game Boy. Desktop HUD and the floating music card hide. Gallery stacks film strip over a shorter Polaroid and hides the controls HUD. |
| `≥ 769px` | Canvas frame is 640×640 inside a 4px `#1a1a1a` border. `box-sizing: content-box` on `#game-container` is required so the border does not shrink the map off the pixel grid. |
| Height `≥ 920px` | Canvas display size 800×800. |
| Height `≥ 1080px` | Canvas display size 960×960. |
| `≤ 600px` | Bookshelf only: shorter shelf row (`196px`), narrower search. |

The canvas backing store stays **320×320**. Display size must stay a whole multiple of 320 (2×, 2.5×, 3×). A fractional scale makes sprites shimmer. `imageSmoothingEnabled` stays `false`. CSS uses both `image-rendering: pixelated` and `crisp-edges`.

The work rooms are the one other canvas: **208×224**, the native size of the room art, shown at 2× on desktop and 3× at `≥ 1180×820`. On mobile, `fitMobileCanvas()` in `src/league.js` picks the largest size that is a whole number of *device* pixels per game pixel (312px on 2× phones, 277px on 3× phones), thinning the screen bezel to as little as 4px when that buys the next size. Same rule: never a fractional device-pixel scale.

`src/mobileAdapter.js` injects the Game Boy only when the viewport is `≤ 768px` at load. Do not build a second mobile layout in `index.html`. Add mobile controls inside `.gba-body` / `.controls`. Other canvas pages hand their UI to the shell with `data-gba-slot="after-screen"` (between the screen and the D-pad) or `data-gba-slot="after-controls"` (inside `.controls`). The Spotify pad is only injected on the page that has `#music-player-popup`.

## Voice

UI copy is short, dry, and a little like a game menu.

- Labels are one or two words: `Home`, `Blog`, `Work`, `Bookshelf`, `Mail`, `Gallery`.
- Instructions name the input: `CONTROLS: Use ARROW KEYS or WASD to move`, `Walk into buildings to explore`, `CONTROLS: ← →`, `← BACK [ESC]`, `← MAP`.
- Actions are verbs in caps: `CLOSE`, `OPEN WITH`, `COPY EMAIL`, `SEARCH…`.
- Gallery captions are casual lowercase place names. Dates are `mon yyyy`, lowercase month.
- Do not write marketing lines, emoji (except the favicon and the music `♪`), or explanation paragraphs in the HUD.

The music card title `WELCOME TO LIMINAL SPACE` is part of that card. Do not reuse it as a site tagline.

## Z-index

Stack new overlays in this order. Do not jump to `99999`.

| Layer | z-index |
| --- | --- |
| Canvas labels (drawn, not CSS) | n/a |
| `#transition-overlay` | 20 |
| Gallery `#zoom-overlay` | 50 |
| `.book-tip` | 60 |
| `#reading-window`, gallery HUD / back, work panel + toolbar | 100 |
| Gallery container while zoomed | 150 |
| `#music-player-popup` | 900 |
| Editor buttons | 1000 |
| `#mailto-prompt` | 2000 |
| `#dev-tooltip` (editor only) | 10000 |

## How features are discovered

A feature is a place on the map, not a button in a header.

Current places (`PORTALS` in `src/main.js`, coordinates are collision tiles `[x, y]`):

| Name | Opens | Tiles |
| --- | --- | --- |
| Home | Bear blog home | `(10–11, 14–15)` |
| Blog | Bear blog | `(28–29, 12–13)` |
| Work | `work.html` (league rooms) | `(30–31, 32–33)` |
| Bookshelf | `bookshelf.html` | `(12–13, 32–33)` |
| X | `https://x.com/_ishanmalhotra_` | `(0, 20–23)` |
| Mail | `mailto:` chooser | `(39, 16–23)` |
| Gallery | `gallery.html` | `(16–23, 0)` |

The boombox is not a portal. Standing in `SPOTIFY_ZONE` (or within Manhattan distance 2 of `RADIO_FOOTPRINT`) shows the player. Pressing Enter, Space, or the A button calls `handleInteract()` and forces it open. The `♪` hint auto-hides after 3 seconds.

Player spawn is grid `(20, 11)`.

Collision values in `src/mapData.js`:

- `0` walkable
- `1` wall
- `2` trigger, fires `checkBuildingTrigger()`

Labels in `MAP_CONFIG.dynamicLabels` are pixel positions on the 320 canvas, not grid cells. They render as a black `rgba(0,0,0,0.6)` box, 16px tall, text width plus 10px, white 8px Press Start 2P, centered.

## Add a feature

### A new place you walk into

1. Add a `PORTALS` entry in `src/main.js`: `name`, `url`, and `coords` on the 8px grid. Relative URLs (`bookshelf.html`) and `https://` both fade to black, then navigate. `mailto:` must go through `showMailtoPrompt`. Do not assign `location.href` to a mailto.
2. Paint those tiles as `2` and block the surrounding walls as `1`. Use God mode: **Shift+E**, hover, press `2` or `1`, then **Export Config**, and paste the JSON into `src/mapData.js`. Export is the source of truth; do not hand-edit a huge collision row if you can export it.
3. Add a `dynamicLabels` entry beside the door, in canvas pixels. Keep the name short enough to read at 8px.
4. If the destination is a new HTML page, build it as a room (next section) and add a `vercel.json` rewrite if it needs a clean path (`/bookshelf` → `/bookshelf.html`).
5. If the page has its own JS or CSS entry, teach `scripts/build.js` to bundle or copy it. Production serves `dist/`, not the source tree.
6. Confirm the walkable path from spawn `(20, 11)` actually reaches the new tiles.

### A new room page

Start from the bookshelf shell, not from a blank document, unless the feature is a physical object like the gallery.

- `body.page-shell` plus `src/pageStyles.css`.
- Wallpaper, maple favicon, Press Start 2P.
- `.page-topbar` with `<a href="index.html">← MAP</a>` on the left.
- Content inside `.dialogue-frame`, width `min(720px, 100%)`.
- Body copy in `.dialogue-body` (Courier New bold).
- Buttons use `.page-btn`, `.page-btn.secondary`, `.page-btn.danger`.
- Empty and error states use `.page-empty` / `.page-error`.
- Inputs use the admin/gate field style: Courier New bold, 3px ink border, white fill.
- At `≤ 768px`, reduce padding and let the top bar wrap. Do not invent a hamburger.

If the feature is an object (a player, a frame, a case), it may skip the dialogue frame, but it still needs the wallpaper, the favicon, Press Start 2P for chrome, a way back to the map, and the 768px breakpoint.

### Something that happens in the town

Follow the boombox, not a modal menu.

- Gate it on tiles or distance, the way `SPOTIFY_ZONE` and `RADIO_FOOTPRINT` do.
- Hint on the canvas (small white or paper rect, Press Start 2P, one glyph or a few words). Auto-dismiss. Do not leave a permanent tooltip.
- Desktop UI can be a fixed card. Mobile UI goes inside the Game Boy (`.spotify-pad` pattern): hidden until the world says so, animated with steps, never a second floating card. The desktop music card is `display: none !important` under 768px.
- A / Enter / Space already mean "interact." Extend `handleInteract()` rather than adding a new keyboard verb, unless the action is editor-only.
- Sprites and props are WebP, drawn with smoothing off. Player frames are `assets/player/{down,left,right,up}_{0-3}.webp`, drawn at 24×36. The boombox is `assets/boombox.webp` at `(172, 140)`, 24×24.

### Photos

Append to `galleryData.json`:

```json
{ "url": "assets/gallery/gallery_N.webp", "caption": "place", "date": "mon yyyy" }
```

Run `npm run convert-images` so the file is WebP. Captions stay lowercase. The gallery shuffles on each load; do not sort it chronologically unless asked. Thumbnails stay grayscale until `.active`, which is a `#00ff00` border. Zoom hides chrome by putting `zoomed-in` on `body`.

### Work roles

Roles live in `ROOMS` inside `src/workData.js`, newest first. The first entry is the room you walk into from the town; the top door leads to the next room, the bottom exit to the previous one (or the town from the first room, which lands at `(30, 34)` via `./?from=work`). The last room's door is locked.

- Each entry needs `id` (the URL hash, `work.html#allin`), `company`, `logo`, and `icon`. Role, dates, and the write-up live in `content/work/<id>.md` (a `---` header, then a small Markdown subset; see `content/work/README.md`).
- Rooms are not numbered anywhere on screen. Identify them by logo and company name.
- Step-by-step guide for adding, reordering, or removing rooms: [docs/adding-work-rooms.md](docs/adding-work-rooms.md).
- `logo` is a **24×24** WebP drawn 1:1 on the plaque over the door. `icon` is **96×96** for the toolbar. Make both from the original in `assets/work/original/` with a high-quality downscale; do not let the canvas shrink a large logo. A missing file falls back to the company initial.
- Room art is `assets/league/room_{1,2,3}.webp` and cycles by position, so a fourth role needs only a new entry.
- Collision is built in code from the room layout (floor rows 6–20, cases at cols 0–2 / 23–25, door `(12–13, 5)`, exit row 21). Shift+E shows it; there is no painter on this page.

### Books

Books come from the Google Sheet in `src/bookshelf.config.mjs`, not from a hardcoded list. `DEMO_BOOKS` is only the fallback when the sheet is empty. Columns and rules are documented at the top of that file. Spine width follows page count. One author shares one typeface, mark, and height so a series matches. Do not hand-style a single title.

## Remove a feature

Remove every layer, or the town will still point at a dead door.

1. Delete the `PORTALS` entry.
2. Delete its `dynamicLabels` entry.
3. Set its trigger tiles back to `0` (path) or `1` (wall) in `collisionMap`. Leaving them as `2` logs "No Portal" and still eats the step.
4. Delete the HTML, CSS, JS, JSON, and any `vercel.json` rewrite.
5. Remove the matching rewrite in `scripts/build.js` if one exists.
6. If it had a prop sprite, stop drawing it in `draw()` and drop the image from `assets/` only when nothing else references it.
7. If it had a mobile control, remove that node from `mobileAdapter.js` and its CSS in the `≤ 768px` block.
8. Do not leave a HUD line, empty frame, or "coming soon" tile behind.

Editor-only UI (`#add-label-btn`, `#export-btn`, `#dev-tooltip`) stays `display: none` until Shift+E. Do not delete it while removing a visitor-facing feature.

`#reading-window` and `#transition-overlay` exist but nothing currently opens the reading window, and the overlay's `.active` class is unused (the fade is drawn on the canvas). Do not build a new feature on those nodes unless you are deliberately finishing them.

## Assets

- Runtime images are WebP. Add a source, then run `npm run convert-images`.
- Map art is `assets/map.webp`. Do not stretch it; it is drawn 1:1 into the 320 canvas.
- New sprites should be pixel art that reads at the same scale as the player (about 24×36) or the boombox (24×24). No anti-aliased illustrations on the canvas.
- Paths in source are relative (`assets/...`, `src/...`). The build rewrites HTML to minified files under `dist/assets/`.

## Checks before you finish

Walk the change the way a visitor would.

- Desktop (`≥ 769px`): spawn, walk to the feature, trigger it, come back with the room's back control. Confirm the canvas is still crisp and the HUD is one line.
- Mobile width (`≤ 768px`): the Game Boy wraps the map, the new feature is reachable with the D-pad, and any extra UI sits inside the shell. A still interacts with the boombox.
- Bookshelf, if you touched `pageStyles.css`: top bar, search, a spine hover tooltip, and a 600px-wide layout.
- Gallery, if you touched shared wallpaper or type: film strip, swipe, zoom, back, ESC.
- Reduced motion: new page animation is disabled.
- `npm run build` still emits the new page.

## Do not

- Add a top navigation, hamburger, footer, or cookie bar to the overworld.
- Introduce Inter, system-ui, Tailwind defaults, pill buttons, blur shadows, or gradient text.
- Put body copy in Press Start 2P.
- Scale the canvas to a size that is not a whole multiple of 320.
- Turn on image smoothing.
- Use Spotify green, editor green, or Game Boy purple as general UI colors.
- Open a feature from a button on the map page. Open it by walking.
- Ship a desktop-only overlay without a mobile home inside the Game Boy.
- Leave trigger tiles, labels, or rewrites behind after a removal.
