# Oldale Town - Personal Website Engine

A personal website presented as a fully interactive GBA-style RPG overworld. This engine mimics the feel of *Pokémon Emerald*, featuring a grid-based movement system, collision detection, and a built-in map editor.

## 🎮 Engine Features

### Core Systems
*   **Canvas 2D Rendering**: The game runs on a simplified HTML5 Canvas engine with a dedicated render loop (`requestAnimationFrame`).
*   **Grid-Based Movement**: Characters move on a pixel-perfect grid.
    *   **Visual Tile Size**: 32x32px (standard map tiles).
    *   **Collision Grid**: 8x8px (high-precision collision for detailed geometry).
*   **Modular Animation System**: Player sprites are loaded from 16 individual files (`assets/player/direction_frame.png`) to allow for easy asset swapping and expansion.
*   **Action Triggers**: Support for "Door" tiles that trigger events when stepped on.

### Project Structure
*   `index.html`: Main entry point and canvas container.
*   `src/main.js`: The core game engine. Handles the game loop, input, player logic, and rendering.
*   `src/mapData.js`: A data file storing the `MAP_CONFIG`, including the 2D collision array and dynamic label data.
*   `src/styles.css`: GBA-style UI styling for the container and overlays.
*   `src/mobileAdapter.js`: Mobile-only Game Boy shell + on-screen controls injection (D-pad + A button + Spotify panel container).
*   `gallery.html` / `gallery.js`: Standalone cinematic photo viewer with native swipe physics.
*   `galleryData.json`: Data source for populating the Gallery.
*   `assets/`: Stores game resources (`map.png`, player sprites).

---

## 📱 Mobile Game Boy UI + Spotify

On mobile (`≤ 768px`) the canvas is wrapped in a CSS Game Boy shell with touch controls. Spotify is integrated into the Game Boy body (not a floating overlay on mobile).

### Controls Layout (Mobile)
*   **D-pad + A button**: Rendered in the top controller row (`src/mobileAdapter.js`, styled in `src/styles.css`).
*   **Spotify panel**: Renders as a compact iframe below the controls row and is **hidden by default**. It uses a slide/reveal animation via `.spotify-hidden` CSS toggling.

### Spotify Visibility Logic (Mobile + Desktop)
Spotify visibility is driven by a shared, explicit tile whitelist (`SPOTIFY_ZONE`) in `src/main.js`:
*   **Mobile**: toggles the embedded panel inside the Game Boy shell.
*   **Desktop**: toggles the floating popup card (`#music-player-popup` in `index.html`).

The panel/popup is shown when the player is standing on any of these tiles:

```javascript
[
  {x:20,y:17},{x:21,y:17},
  {x:20,y:18},{x:21,y:18},
  {x:20,y:19},{x:21,y:19},
  {x:20,y:20},{x:21,y:20},
  {x:20,y:21},{x:21,y:21},
  {x:22,y:20},{x:22,y:21},
  {x:23,y:20},{x:23,y:21},
  {x:24,y:20},{x:25,y:20},
  {x:24,y:21},{x:25,y:21},
  {x:24,y:16},{x:24,y:17},{x:24,y:18},{x:24,y:19},
  {x:25,y:16},{x:25,y:17},{x:25,y:18},{x:25,y:19}
]
```

### Spawnpoint
The player spawnpoint is set in `src/main.js`:
*   **Grid spawn**: `(20, 11)`

---

## 🛠️ God Mode (In-Game Editor)

The engine features a robust "God Mode" that allows you to edit the game world directly in the browser.

### How to Use
Press **Shift + E** to toggle Editor Mode.
*   **Visuals**: A green debug tooltip appears, and the map shows overlay grids (Red = Wall, Blue = Trigger).
*   **Controls**: Mouse interaction is enabled for painting and labeling.

### 🎨 Painting Collision
Modify the walkable areas by hovering your mouse and pressing keys:
*   **`1`**: Paint **Wall** (Red). Blocks player movement.
*   **`2`**: Paint **Trigger** (Blue). Fires `checkBuildingTrigger()` events.
*   **`0`**: **Clear**. Makes the tile walkable.

### 🏷️ Dynamic Labels
Floating labels (e.g., "Projects", "About Me") can be managed dynamically:
*   **Add**: Click the **"Add Label"** button (top-left) -> Click map -> Enter text.
*   **Delete**: Click an existing label to select it (turns green) -> Press **Backspace**.
*   **Export**: Click **"Export Config"** (bottom-right) to dump the new configuration (Collision + Labels) to the console as JSON.

---

## 📸 Cinematic Photo Gallery

The website includes a dedicated, highly-polished **Photo Gallery** accessible via the top map boundary (grid coordinates `(16..23, 0)`).

### Features
*   **Polaroid Aesthetic**: Photos are rendered inside a clean, high-fidelity Polaroid frame over the Pokémon wallpaper.
*   **35mm Film Reel**: A dark, repeating gradient generates realistic film sprocket holes for the thumbnail navigation bar.
*   **Native Swipe Physics**: A bespoke sliding engine (`gallery.js`) allows users to physically drag the Polaroid card horizontally. It features momentum-based logic, `cubic-bezier` spring/bounce easing, and automatic frame snapping.
*   **Continuous Inner Track**: The transition handles all photos inside a `flex` track wrapped by a rigidly fixed, `overflow: hidden` frame context. This creates a seamless "film advancing" visual effect where the photos stay connected side-by-side. 
*   **Data-Driven (`galleryData.json`)**: Loading arbitrary imagery, captions, and dates dynamically via a JSON fetch map.

---

## 🧑‍💻 Technical Details

### Player Animation
The player uses a 4-direction, 4-frame animation cycle:
*   **State Machine**: Tracks `frameX` (0-3) and `frameY` (Row/Direction).
*   **Files**: Sprites are named `direction_frame.png` (e.g., `down_0.png`, `left_2.png`).
*   **Scaling**: The 16x32px source sprites are rendered at **28x42px** to match the map scale, using `imageSmoothingEnabled = false` for crisp pixel art.

### 8px Precision Grid
Collision is checked against a `40x40` grid of 8px tiles. This allows for:
*   Sub-tile movement blocking (players can stand "halfway" on a visual tile).
*   Tight collision boxes for non-square geometry (fences, small obstacles).

### Saving Changes
Since the editor runs in the browser, changes are not automatically saved to files.
1.  Make edits in God Mode.
2.  Click "Export Config".
3.  Copy the JSON from the Console.
4.  Paste it into `src/mapData.js` to persist changes.
