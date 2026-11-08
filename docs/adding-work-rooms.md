# Adding a work room

The Work building on the town map opens `work.html`: a chain of league rooms, one per role. You walk up through each room's top door to get to the next one, the way you take on a gauntlet of rooms in a monster-catching RPG. This guide covers how the rooms are built and the exact steps to add, reorder, or remove one. Read [DESIGN.md](../DESIGN.md) first for the site-wide rules (pixel scale, tokens, mobile shell).

## How it fits together

| Piece | File | What it holds |
| --- | --- | --- |
| Room list | `src/workData.js` | `ROOMS`: one entry per role, in walking order (newest first) |
| Room text | `content/work/<id>.md` | Header with `role` and `dates`, then the write-up. One file per room |
| Logos | `assets/work/<id>.webp` (24×24), `assets/work/<id>_icon.webp` (96×96) | Plaque above the door + toolbar button |
| Logo originals | `assets/work/original/` | Source files the two sizes are made from |
| Room art | `assets/league/room_{1,2,3}.webp` (+ `.png` sources) | 208×224 backgrounds. They cycle by position |
| Engine | `src/league.js` | Collision, movement, fades, toolbar, panel, Markdown rendering |
| Shared movement | `src/engine/player.js` | Trainer sprites and tile stepping, shared with the town (`src/main.js`) |
| Page + styles | `work.html`, `src/work.css` | Panel (left), canvas (centre), toolbar (right); Game Boy layout ≤768px |
| Build | `scripts/build.js` | Bundles `league.js`, minifies `work.css`, copies `content/` and `assets/` |

Flow:

- The first entry in `ROOMS` is the room you enter from the town.
- The top door (tiles `(12–13, 5)`) leads to the next room. The last room's door is a wall.
- The bottom exit (row 21) goes back one room. In the first room it returns to the town at `(30, 34)` via `./?from=work`.
- Clicking a toolbar icon walks the trainer to the right door and fades into that room, skipping any rooms in between.
- The URL hash is the room `id` (`work.html#allin`).

Nothing on screen is numbered. Rooms are identified by their logo and company name only. Do not add "Room 1" labels or number badges back.

## Add a room

Say the new role is at "Acme" and gets the id `acme`.

1. **Logo.** Put the original file in `assets/work/original/acme.<ext>`. Then make the two sizes with a high-quality downscale. Do not let the canvas shrink a large image, because smoothing is off and it turns to mush. Run this from the repo root:

   ```bash
   node -e "
   const sharp = require('sharp');
   (async () => {
     const src = await sharp('assets/work/original/acme.png', { page: 0 }).trim().toBuffer();
     for (const [suffix, size] of [['', 24], ['_icon', 96]]) {
       await sharp(src)
         .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
         .webp({ lossless: true })
         .toFile('assets/work/acme' + suffix + '.webp');
     }
   })()"
   ```

   - `{ page: 0 }` takes the first frame of an animated GIF.
   - If the logo is a wide wordmark, crop to the symbol first. At 24px only a mark reads (Breathe ESG uses just its "B").
   - If the logo sits on an opaque white box, make the white transparent so it sits on the paper plaque.
   - Look at the result scaled up before moving on.

2. **Text.** Create `content/work/acme.md`. Start it with a header for the designation and dates, then the write-up:

   ```markdown
   ---
   role: Product Intern
   dates: Jan – Mar 2026
   ---

   First paragraph…
   ```

   The format rules are in `content/work/README.md`: blank line between paragraphs, `[text](https://…)` for links, `**bold**`, `*italic*`, and `- ` for lists. Raw HTML is escaped, not rendered.

3. **Entry.** Add an object to `ROOMS` in `src/workData.js` at the right spot. The list is newest first.

   ```js
   {
       id: 'acme',                       // lowercase, no spaces; matches the .md and logo names
       company: 'Acme',                  // toolbar label, plaque fallback initial, panel title
       logo: 'assets/work/acme.webp',
       icon: 'assets/work/acme_icon.webp'
   }
   ```

4. **Room art.** Nothing to do. `roomArt(i)` cycles `room_1 → room_2 → room_3` by position.

   To give a room its own art:
   - Add a 208×224 PNG as `assets/league/room_4.png`.
   - Convert it losslessly: `sharp(...).webp({ lossless: true })`. `npm run convert-images` is lossy (q80), which blurs pixel art.
   - Change `roomArt` in `src/workData.js` to cycle over 4.
   - The new art must keep the same layout as the others (door at the top centre, cases on the side walls, floor in rows 6–20), because collision is shared. If the layout differs, see "Collision" below.

5. **Check it.**
   - Run `npm run dev` and open `http://localhost:3000/work#acme`.
   - Walk into the room from both neighbouring rooms, click its toolbar icon from a room on each side, and check the plaque, the toolbar icon, and the panel text.
   - Shrink the window to 768px or less and reload to check the Game Boy layout.
   - `npm run build` must still pass. `content/` and `assets/` are copied into `dist/` automatically, so the build script needs no changes.

## Reorder or remove a room

- **Reorder:** move the entry in `ROOMS`. Door targets, the locked last door, the town exit, and the art cycle all follow array order. Nothing else is hard-coded.
- **Remove:** delete the entry, `content/work/<id>.md`, `assets/work/<id>.webp`, `assets/work/<id>_icon.webp`, and the original if nothing else uses it. Then check that the room before it now leads to the right place.

## Change existing text or details

- **Text:** edit `content/work/<id>.md` and reload. No build is needed in dev.
- **Role or dates:** edit the `---` header at the top of `content/work/<id>.md`.
- **Company name:** edit `company` in `src/workData.js` (or add `company:` to the `.md` header to change only the panel title).

## Collision

The grid is built in code by `buildCollision()` in `src/league.js`. It is not a painted map. It uses the same 8px tiles as the town, 26×28:

- floor walkable: rows 6–20, every column
- display cases blocked: columns 0–2 and 23–25, rows 8–18
- door trigger (`2`): `(12, 5)`, `(13, 5)`, except in the last room
- exit trigger (`2`): row 21, columns 11–14

Shift+E on `work.html` draws the grid over the room (red = wall, blue = trigger). Use it to check new art. If a room ever needs a different layout, give its entry an optional collision override and branch in `buildCollision()`. Do not add a second engine.

Key positions are constants at the top of `src/league.js`:

- `CENTER` `(12, 14)`: where the trainer stops, facing the plaque
- `ENTER_BELOW` / `ENTER_ABOVE`: spawn tiles for arriving from the room before or after
- `PLAQUE`: the canvas rectangle drawn over the door emblem

## Rules to keep

- **Canvas:** 208×224 backing store, shown at whole multiples only (1× mobile, 2× desktop, 3× at ≥1180×820). `imageSmoothingEnabled` stays `false`.
- **Fonts:** the panel title and meta use Press Start 2P. Body text uses bold Courier New. Never put paragraphs in Press Start 2P.
- **Mobile:** the panel and toolbar move into the Game Boy through `data-gba-slot`. Do not build a separate mobile layout.
- **Interact:** A / Enter / Space is the only interact verb. On this page it reopens the panel when you face the plaque.
- **Triggers:** never assign `location.href` straight from a trigger. Always fade first.
