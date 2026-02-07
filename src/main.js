import { MAP_CONFIG } from './mapData.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Constants
const TILE_SIZE = 32;
const COLLISION_TILE_SIZE = 8; // Updated to 8px
const ROWS = 40;               // 320 / 8
const COLS = 40;               // 320 / 8
const MOVEMENT_SPEED = 4;

// Game State
const PORTALS = [
    { name: 'Home', url: 'https://ishanmalhotra.bearblog.dev/', coords: [[10, 14], [10, 15], [11, 14], [11, 15]] },
    { name: 'Blog', url: 'https://ishanmalhotra.bearblog.dev/blog/', coords: [[28, 12], [29, 12], [29, 13], [28, 13]] },
    { name: 'Theme', url: 'https://ishanmalhotra.bearblog.dev/theme/', coords: [[30, 32], [31, 32], [31, 33], [30, 33]] },
    { name: 'Bookshelf', url: 'https://ishanmalhotra.bearblog.dev/bookshelf/', coords: [[12, 32], [13, 32], [13, 33], [12, 33]] },
    { name: 'X', url: 'https://x.com/_ishanmalhotra_', coords: [[0, 20], [0, 21], [0, 22], [0, 23]] },
    { name: 'Mail', url: 'mailto:ishanmalhotra2004@gmail.com', coords: [[39, 16], [39, 17], [39, 18], [39, 19], [39, 20], [39, 21], [39, 22], [39, 23]] }
];

// Game State
let assetsLoaded = false;
let playerLoaded = false;
let fadeOpacity = 0;
let isTransitioning = false;
let redirectTriggered = false;
let pendingURL = '';

// Assets
const mapImage = new Image();
mapImage.onload = () => {
    assetsLoaded = true;
    console.log('Map loaded');
};
mapImage.src = 'assets/map.png';

const playerSprites = {};
let loadedSpritesCount = 0;
const totalSprites = 16;

function loadPlayerAssets() {
    const directions = ['down', 'left', 'right', 'up'];
    directions.forEach(dir => {
        for (let i = 0; i < 4; i++) {
            const key = `${dir}_${i}`;
            const img = new Image();
            img.src = `assets/player/${key}.png`;
            img.onload = () => {
                loadedSpritesCount++;
                if (loadedSpritesCount === totalSprites) {
                    console.log('All 16 Player Sprites Loaded');
                    playerLoaded = true;
                }
            };
            img.onerror = () => {
                console.error(`Failed to load sprite: ${key}`);
            };
            playerSprites[key] = img;
        }
    });
}

loadPlayerAssets();

let isEditorMode = false;
let inputEnabled = true;

// Trigger Handler
// (Trigger Handler at bottom)

// Dynamic Labels State
let dynamicLabels = [...MAP_CONFIG.dynamicLabels];
let selectedLabelIndex = -1;
let isAddingLabel = false;

// Map Data
let collisionMap = JSON.parse(JSON.stringify(MAP_CONFIG.collisionMap));

// Mouse State
let mousePixelX = 0;
let mousePixelY = 0;
let mouseGridX = 0;
let mouseGridY = 0;

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    '0': false,
    '1': false,
    '2': false,
    'L': false,
    'Enter': false
};

const player = {
    x: 20,
    y: 20,
    pixelX: 20 * COLLISION_TILE_SIZE,
    pixelY: 20 * COLLISION_TILE_SIZE,
    moving: false,
    direction: 'down',
    targetX: 20 * COLLISION_TILE_SIZE,
    targetY: 20 * COLLISION_TILE_SIZE,
    frameX: 0,
    frameY: 0,
    tick: 0
};

// Map Data
// Map Data (Moved up)

// (Assets moved to top)


// Input Handling
window.addEventListener('keydown', (e) => {
    // Toggle Editor Mode
    if (e.key === 'E' && e.shiftKey) {
        toggleEditorMode();
    }

    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;

    // Backspace to Delete Label
    if (isEditorMode && selectedLabelIndex !== -1 && e.key === 'Backspace') {
        const removed = dynamicLabels.splice(selectedLabelIndex, 1);
        console.log("Deleted label:", removed[0].text);
        selectedLabelIndex = -1;
    }

    // Painter shortcut keys
    if (isEditorMode && !isAddingLabel && ['0', '1', '2'].includes(e.key)) {
        paintTile(e.key);
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Click Interaction
canvas.addEventListener('mousedown', (e) => {
    if (!isEditorMode) return;
    updateMousePos(e);

    // 1. Adding Label
    if (isAddingLabel) {
        const text = prompt("Enter label text:");
        if (text) {
            dynamicLabels.push({
                text: text,
                x: mousePixelX,
                y: mousePixelY
            });
            console.log(`Added label: ${text} at ${mousePixelX}, ${mousePixelY}`);
        }
        isAddingLabel = false;
        document.body.style.cursor = 'default';
        return;
    }

    // 2. Select existing label
    let clickedIndex = -1;
    ctx.font = '8px "Press Start 2P"';

    for (let i = 0; i < dynamicLabels.length; i++) {
        const lbl = dynamicLabels[i];

        const textWidth = ctx.measureText(lbl.text).width;
        const boxWidth = textWidth + 10;
        const boxHeight = 16;

        const boxLeft = lbl.x - boxWidth / 2;
        const boxRight = lbl.x + boxWidth / 2;
        const boxTop = lbl.y - 20;
        const boxBottom = lbl.y;

        if (mousePixelX >= boxLeft && mousePixelX <= boxRight &&
            mousePixelY >= boxTop && mousePixelY <= boxBottom) {
            clickedIndex = i;
            break;
        }
    }

    if (clickedIndex !== -1) {
        selectedLabelIndex = clickedIndex;
        console.log("Selected label:", dynamicLabels[clickedIndex].text);
    } else {
        selectedLabelIndex = -1;
    }
});


// Mouse Tracking
canvas.addEventListener('mousemove', (e) => {
    updateMousePos(e);
    // Tooltip logic
    if (isEditorMode) {
        const tooltip = document.getElementById('dev-tooltip');
        if (tooltip) {
            if (isAddingLabel) {
                tooltip.innerText = "MODE: ADDING LABEL | Click anywhere on the map to name a building";
            } else if (selectedLabelIndex !== -1) {
                tooltip.innerText = `SELECTED: ${dynamicLabels[selectedLabelIndex].text} | Press BACKSPACE to delete`;
            } else {
                tooltip.innerText = `EDITOR MODE | Grid: (${mouseGridX}, ${mouseGridY}) | 1: Wall, 2: Door, 0: Clear | Shift+E to Exit`;
            }
        }
    }
});

// Add Label Button Logic
const addLabelBtn = document.getElementById('add-label-btn');
if (addLabelBtn) {
    addLabelBtn.addEventListener('click', () => {
        isAddingLabel = true;
        document.body.style.cursor = 'crosshair';
        selectedLabelIndex = -1;
    });
}

function toggleEditorMode() {
    isEditorMode = !isEditorMode;
    document.body.classList.toggle('editor-active', isEditorMode);

    const btn = document.getElementById('add-label-btn');
    const tooltip = document.getElementById('dev-tooltip');
    const exportBtn = document.getElementById('export-btn');

    if (!isEditorMode) {
        isAddingLabel = false;
        selectedLabelIndex = -1;
        document.body.style.cursor = 'default';
        if (btn) btn.style.display = 'none';
        if (tooltip) tooltip.style.display = 'none';
        if (exportBtn) exportBtn.style.display = 'none';
    } else {
        if (btn) btn.style.display = 'block';
        if (tooltip) tooltip.style.display = 'flex';
        if (exportBtn) exportBtn.style.display = 'block';
    }
    console.log(isEditorMode ? 'Dev Mode Active' : 'Dev Mode Inactive');
}

function updateMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    mousePixelX = (e.clientX - rect.left) / scaleX;
    mousePixelY = (e.clientY - rect.top) / scaleY;

    mouseGridX = Math.floor(mousePixelX / COLLISION_TILE_SIZE);
    mouseGridY = Math.floor(mousePixelY / COLLISION_TILE_SIZE);
}

function paintTile(valStr) {
    if (mouseGridX >= 0 && mouseGridX < COLS && mouseGridY >= 0 && mouseGridY < ROWS) {
        const val = parseInt(valStr);
        collisionMap[mouseGridY][mouseGridX] = val;
    }
}

// Export Config
const exportBtn = document.getElementById('export-btn');
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const config = {
            collisionMap: collisionMap,
            dynamicLabels: dynamicLabels
        };
        console.log("EXPORT CONFIG:");
        console.log(JSON.stringify(config, null, 2));
        alert("Config exported to console.");
    });
}

function update() {
    // Cinematic Transition Logic
    if (isTransitioning) {
        // Force Walking Up Animation
        player.direction = 'up';
        player.frameY = 3;

        // Manual Animation Tick
        player.tick++;
        if (player.tick % 8 === 0) {
            player.frameX = (player.frameX + 1) % 4;
        }
        return;
    }

    if (!inputEnabled || isEditorMode) return;

    if (!player.moving) {
        let dx = 0;
        let dy = 0;

        if (keys.ArrowUp || keys.w) dy = -1;
        else if (keys.ArrowDown || keys.s) dy = 1;
        else if (keys.ArrowLeft || keys.a) dx = -1;
        else if (keys.ArrowRight || keys.d) dx = 1;

        if (dx !== 0 || dy !== 0) {
            // Update Direction Frame (Rows) - Emerald Order
            if (dy === 1) player.frameY = 0; // Down
            if (dx === -1) player.frameY = 1; // Left
            if (dx === 1) player.frameY = 2; // Right
            if (dy === -1) player.frameY = 3; // Up

            player.direction = (dy === 1) ? 'down' : (dy === -1) ? 'up' : (dx === -1) ? 'left' : 'right';

            const nextGridX = player.x + dx;
            const nextGridY = player.y + dy;

            // Updated Boundary Check (0-40)
            if (nextGridX >= 0 && nextGridX < COLS && nextGridY >= 0 && nextGridY < ROWS) {

                // Surgical Collision Check (8px grid)
                const tileVal = collisionMap[nextGridY][nextGridX];
                const isBlocked = (tileVal === 1);

                if (!isBlocked) {
                    player.moving = true;
                    // Use COLLISION_TILE_SIZE (8) for target pixels
                    player.targetX = nextGridX * COLLISION_TILE_SIZE;
                    player.targetY = nextGridY * COLLISION_TILE_SIZE;
                    player.x = nextGridX;
                    player.y = nextGridY;

                    if (dy === -1) player.direction = 'up';
                    if (dy === 1) player.direction = 'down';
                    if (dx === -1) player.direction = 'left';
                    if (dx === 1) player.direction = 'right';

                    // Trigger Integration
                    // Check if tile is 2 OR if it's a Portal Coordinate
                    const isPortal = PORTALS.some(p => p.coords.some(c => c[0] === nextGridX && c[1] === nextGridY));
                    if (tileVal === 2 || isPortal) {
                        checkBuildingTrigger(nextGridX, nextGridY);
                    }
                }
            }
        } else {
            // Idle
            player.frameX = 0;
            player.tick = 0;
        }
    } else {
        // Moving Animation
        player.tick++;
        if (player.tick % 8 === 0) {
            player.frameX = (player.frameX + 1) % 4;
        }

        if (player.pixelX < player.targetX) player.pixelX += MOVEMENT_SPEED;
        if (player.pixelX > player.targetX) player.pixelX -= MOVEMENT_SPEED;
        if (player.pixelY < player.targetY) player.pixelY += MOVEMENT_SPEED;
        if (player.pixelY > player.targetY) player.pixelY -= MOVEMENT_SPEED;

        if (player.pixelX === player.targetX && player.pixelY === player.targetY) {
            player.moving = false;
        }
    }
}

// Trigger Handler
// Trigger Handler
// Trigger Handler
// Portals defined at top of file
const HOME_COORDS = []; // Deprecated, using PORTALS

function checkBuildingTrigger(gx, gy) {
    if (isTransitioning) return;

    // Check all portals
    const portal = PORTALS.find(p =>
        p.coords.some(coord => coord[0] === gx && coord[1] === gy)
    );

    if (portal) {
        console.log(`Triggered Portal: ${portal.name}`);
        pendingURL = portal.url;
        isTransitioning = true;
        inputEnabled = false;
        redirectTriggered = false;
    } else {
        console.log(`Trigger activated at ${gx}, ${gy} (No Portal)`);
    }
}

document.getElementById('close-btn').addEventListener('click', () => {
    const overlay = document.getElementById('transition-overlay');
    const readingWindow = document.getElementById('reading-window');
    readingWindow.classList.add('hidden');
    overlay.classList.remove('active');
    inputEnabled = true;
});

function draw() {
    ctx.imageSmoothingEnabled = false;

    // 1. Draw Map
    if (assetsLoaded) {
        ctx.drawImage(mapImage, 0, 0);
    } else {
        ctx.fillStyle = '#202020';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Dynamic Labels (Requested specific rendering loop)
    // 2. Dynamic Labels
    // 2. Dynamic Labels (Auto-Width Implementation)
    ctx.font = '8px "Press Start 2P"'; // Set font first to measure correctly
    ctx.textAlign = 'center';          // Center text horizontally
    ctx.textBaseline = 'middle';       // Center text vertically

    dynamicLabels.forEach((lbl, index) => {
        // 1. Measure the word
        const textWidth = ctx.measureText(lbl.text).width;

        // 2. Calculate dynamic box size (Text width + 10px padding)
        const boxWidth = textWidth + 10;
        const boxHeight = 16;

        // 3. Draw the background box
        // Centered on lbl.x, sitting 20px above lbl.y
        ctx.fillStyle = (index === selectedLabelIndex) ? 'rgba(0, 255, 0, 0.6)' : 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(lbl.x - (boxWidth / 2), lbl.y - 20, boxWidth, boxHeight);

        // 4. Draw the text perfectly in the middle of that box
        ctx.fillStyle = 'white';
        ctx.fillText(lbl.text, lbl.x, lbl.y - 12);
    });

    // Reset alignment so it doesn't break the rest of your game's drawing
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';

    // 3. Draw Player
    const spriteKey = `${player.direction}_${player.frameX}`;
    const currentSprite = playerSprites[spriteKey];

    if (currentSprite && currentSprite.complete) {
        // Center on 8px grid (Scaled to 28x42 as requested)
        // Fixed dimensions, no scaling animation
        ctx.drawImage(currentSprite, player.pixelX - 8, player.pixelY - 28, 24, 36);
    }

    // 4. Editor Overlay
    if (isEditorMode) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const val = collisionMap[r][c];
                if (val === 1) {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                    ctx.fillRect(c * COLLISION_TILE_SIZE, r * COLLISION_TILE_SIZE, COLLISION_TILE_SIZE, COLLISION_TILE_SIZE);
                } else if (val === 2) {
                    ctx.fillStyle = 'rgba(0, 0, 255, 0.4)';
                    ctx.fillRect(c * COLLISION_TILE_SIZE, r * COLLISION_TILE_SIZE, COLLISION_TILE_SIZE, COLLISION_TILE_SIZE);
                    ctx.fillStyle = 'white';
                    ctx.font = '10px monospace';
                    ctx.fillText('2', c * COLLISION_TILE_SIZE + 4, r * COLLISION_TILE_SIZE + 12);
                }
            }
        }

        // Highlight Mouse Hover
        if (mouseGridX >= 0 && mouseGridX < COLS && mouseGridY >= 0 && mouseGridY < ROWS) {
            ctx.strokeStyle = '#0f0';
            ctx.strokeRect(mouseGridX * COLLISION_TILE_SIZE, mouseGridY * COLLISION_TILE_SIZE, COLLISION_TILE_SIZE, COLLISION_TILE_SIZE);
        }
    }

    // 5. Cinematic Fade Overlay & Redirect
    if (isTransitioning) {
        fadeOpacity += 0.02;
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (fadeOpacity >= 1 && !redirectTriggered) {
            redirectTriggered = true;
            console.log('FINAL REDIRECT TO:', pendingURL);
            window.open(pendingURL, '_blank');

            // Reset game state after delay so player can continue if they return
            setTimeout(() => {
                isTransitioning = false;
                fadeOpacity = 0;
                inputEnabled = true;
                redirectTriggered = false;
            }, 1000);
        }
    }
}

function loop() {
    update();
    draw();
    // Debug Log (User requested for 1 second, but I'll update it to check frame)
    if (Math.random() < 0.05) { // Log occasionally to avoid spamming too hard, or just log
        console.log('Current Frame:', player.frameX, 'Direction:', player.direction);
    }
    requestAnimationFrame(loop);
}

loop();
