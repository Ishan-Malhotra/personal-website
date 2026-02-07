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
*   `assets/`: Stores game resources (`map.png`, player sprites).

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
