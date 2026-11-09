# Adding inspirations

Walking off the bottom edge of the town (the south road, row 39) opens `inspirations.html`. It is a scrollable collage of the films, books, images and music that shaped my taste. Clicking a tile opens a paper card with the title, creator, year, type and an optional note. Read [DESIGN.md](../DESIGN.md) first for the site-wide rules.

## How it fits together

| Piece | File | What it holds |
| --- | --- | --- |
| Item list | `inspirationsData.json` | One object per item, in collage order |
| Stills | `assets/inspirations/<id>.webp` | Web-sized images the page loads |
| Originals | `originals/inspirations/` | Full-size source files. Not deployed (the build only copies `assets/`) |
| Resize script | `scripts/inspirations-images.js` (`npm run inspo-images`) | Turns originals into WebP, max 1600px on the long edge |
| Page + logic | `inspirations.html`, `src/inspirations.js`, `src/inspirations.css` | Title card, filters, collage, popup |
| Town entrance | `PORTALS` in `src/main.js`, `Inspo` label in `src/mapData.js` | South-edge portal. Coming back lands at `(20, 37)` via `./?from=inspirations` |
| Build | `scripts/build.js` | Bundles the JS/CSS and copies `inspirationsData.json` |

## Add an item

You never have to think about layout. Add entries in any order with or without a `size`, and the collage always packs with no gaps.

### Films from TMDB (easiest)

Paste entries straight into `inspirationsData.json`, in the same shape as the cue project:

```json
{ "movieId": 149, "title": "Akira", "year": "1988", "backdrop_path": "/jmlM5sa8vrBWHSBubqAithX6Fx5.jpg" }
```

Trailing commas and nested `[ [ … ] ]` arrays are fine. The page shows the film right away, loading its image from TMDB's CDN. Then run:

```bash
npm run inspo-images
```

This downloads each new backdrop to `assets/inspirations/<id>.webp` and rewrites the entry in the page's own format. Your `note`, `by` or `size` are kept if you added them. Run it before committing so the site doesn't depend on TMDB. It is safe to run any number of times: done entries are skipped.

### Anything else (books, photos, music)

1. Put the original image in `originals/inspirations/`, for example `norwegian-wood.jpg`, and run `npm run inspo-images`. That writes `assets/inspirations/norwegian-wood.webp`.
2. Add the entry:

   ```json
   {
     "id": "norwegian-wood",
     "title": "Norwegian Wood",
     "type": "book",
     "by": "Haruki Murakami",
     "year": 1987,
     "image": "assets/inspirations/norwegian-wood.webp",
     "note": "Optional, 1–3 lines."
   }
   ```

| Field | Required | Values |
| --- | --- | --- |
| `title` | yes | Shown on the tile and in the card |
| `id` | no | Lowercase, no spaces. Defaults to the TMDB id or the position |
| `type` | no | `film`, `book`, `image`, `music` or `other`. TMDB entries default to `film`, everything else to `other` |
| `by` | no | Director, author, artist… |
| `year` | no | Number or string |
| `image` | no | Local path. If it is missing or broken, the tile shows a paper block with the title |
| `size` | no | `s` (1×1), `wide` (2×1), `tall` (1×2), `big` (2×2). Leave it out (recommended) and one is picked from a built-in rhythm by the item's shuffled position, so big tiles stay spread out. A set size travels with the item wherever it lands |
| `note` | no | 1–3 lines, plain text |

`npm run inspo-images -- --force` redoes every image.

## Notes on the collage

- The order is shuffled on every visit, so the order in the JSON doesn't matter. ←/→ in the popup follow the shuffled order. Layout is computed in `src/inspirations.js` (`pack()`), not by CSS, so there are never gaps, whatever you add:
  - Each item goes in the first empty cell. If its `size` doesn't fit there, it falls back to a smaller one.
  - The last two rows stay one tile tall. Near the end, single and then paired swaps between `s` and `wide` square off the last row.
  - If nothing lines up, a tile next to the gap stretches to close it. This happens in under 1% of random layouts. A list with just one or two items on a wide screen will also stretch to fill the row.
  - Fuzz-tested on 4,000 random lists (1–400 items, 2–13 columns) with zero gaps or overlaps. Treat `size` as a preference, not a guarantee.
- Mixing in a `big` or `wide` every few items gives the packed, film-still look.
- Film stills look best as `wide` or `big`. Book covers and posters look best as `tall`.
- Filter buttons only appear for types that actually have items, and only when there are at least two types.
- Columns: as many 220px columns as fit (re-laid out when the count changes on resize). On phones (≤ 768px) the grid is always two columns, `big` becomes `wide`, captions are always visible, and the popup opens as a bottom sheet.
- If a TMDB backdrop has baked-in black bars, trim them with sharp's `.trim({ background: '#000000', threshold: 20 })`. Check the result, because dark scenes can lose real picture.
- The title card floats over the collage. Drag it anywhere, or collapse it with `–`. Its position and collapsed state are remembered per browser (`localStorage` key `inspo-card`). The `←` button on it goes back to the map.
- Keys: ESC closes the popup, or goes back to the map when no popup is open. ←/→ move between items in the current filter.
