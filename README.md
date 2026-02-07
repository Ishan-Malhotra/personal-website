# Oldale Town - Personal Website

A personal website inspired by Pokémon Emerald's Oldale Town, featuring a grid-based overworld engine with custom map editing tools.

## 🛠️ God Mode (Map Editor)

The website includes a built-in level editor ("God Mode") that allows you to modify collision data, place interactive triggers, and manage rooftop labels directly in the browser.

### How to Enable
Press **Shift + E** to toggle Editor Mode on and off.
- **On**: You will see a green debug tooltip following your cursor, the "Add Label" button, and red/blue overlays on the map.
- **Off**: Standard view.

### 🎨 Painting the Map
Modify the collision logic by hovering over any tile and pressing a key:
- **`1`**: Mark as **Wall** (Red Overlay). The player cannot walk here.
- **`2`**: Mark as **Door/Trigger** (Blue Overlay). Walking here triggers an event.
- **`0`**: **Clear** the tile.

### 🏷️ Managing Labels
Dynamic labels can be placed anywhere on the map:
1. **Add Label**: Click the **"Add Label"** button in the top-left corner.
2. **Place**: Click anywhere on the map.
3. **Text**: Enter the label text in the prompt and press OK.
4. **Delete**: Click an existing label to select it (it will turn green), then press **Backspace** to remove it.

### 💾 Saving Your Changes
Changes made in the editor are local to your current session. To save them permanently:
1. Click the **"Export Config"** button in the bottom-right corner.
2. Open your browser's Developer Tools (F12 or Cmd+Option+I) and look at the **Console**.
3. Copy the JSON output.
4. Open `src/main.js` in your code editor.
5. Replace the `collisionMap` and `dynamicLabels` arrays with your exported data.
