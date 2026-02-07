import { MAP_CONFIG } from './mapData.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Constants
const TILE_SIZE = 32;
const COLLISION_TILE_SIZE = 16;
const ROWS = 20;
const COLS = 20;
const MOVEMENT_SPEED = 4;

// Game State
let isEditorMode = false;
let inputEnabled = true;

// Dynamic Labels State
let dynamicLabels = [...MAP_CONFIG.dynamicLabels];
let selectedLabelIndex = -1;
let isAddingLabel = false;

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
    'L': false
};

const player = {
    x: 5,
    y: 5,
    pixelX: 5 * TILE_SIZE,
    pixelY: 5 * TILE_SIZE,
    moving: false,
    direction: 'down',
    targetX: 5 * TILE_SIZE,
    targetY: 5 * TILE_SIZE
};

// Map Data 20x20
const collisionMap = JSON.parse(JSON.stringify(MAP_CONFIG.collisionMap));

// Assets
const mapImage = new Image();
mapImage.src = 'assets/map.png';

let assetsLoaded = false;
mapImage.onload = () => {
    assetsLoaded = true;
    console.log('Map loaded');
};
if (mapImage.complete) {
    assetsLoaded = true;
}

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

    // 2. Select existing label (Rough 80x20 box check based on user render strict)
    let clickedIndex = -1;
    for (let i = 0; i < dynamicLabels.length; i++) {
        const lbl = dynamicLabels[i];
        // Rect: x-40, y-20, w80, h20
        if (mousePixelX >= lbl.x - 40 && mousePixelX <= lbl.x + 40 &&
            mousePixelY >= lbl.y - 20 && mousePixelY <= lbl.y) {
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
            // Remove positioning logic (handled by CSS fixed header)

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
    if (!inputEnabled || isEditorMode) return;

    if (!player.moving) {
        let dx = 0;
        let dy = 0;

        if (keys.ArrowUp || keys.w) dy = -1;
        else if (keys.ArrowDown || keys.s) dy = 1;
        else if (keys.ArrowLeft || keys.a) dx = -1;
        else if (keys.ArrowRight || keys.d) dx = 1;

        if (dx !== 0 || dy !== 0) {
            const nextGridX = player.x + dx;
            const nextGridY = player.y + dy;

            if (nextGridX >= 0 && nextGridX < 10 && nextGridY >= 0 && nextGridY < 10) {
                // Check 4 sub-tiles
                const cX = nextGridX * 2;
                const cY = nextGridY * 2;

                const isBlocked =
                    collisionMap[cY][cX] === 1 ||
                    collisionMap[cY][cX + 1] === 1 ||
                    collisionMap[cY + 1][cX] === 1 ||
                    collisionMap[cY + 1][cX + 1] === 1;

                if (!isBlocked) {
                    player.moving = true;
                    player.targetX = nextGridX * TILE_SIZE;
                    player.targetY = nextGridY * TILE_SIZE;
                    player.x = nextGridX;
                    player.y = nextGridY;

                    if (dy === -1) player.direction = 'up';
                    if (dy === 1) player.direction = 'down';
                    if (dx === -1) player.direction = 'left';
                    if (dx === 1) player.direction = 'right';

                    // Check Triggers (Door = 2)
                    const hitDoor =
                        collisionMap[cY][cX] === 2 ||
                        collisionMap[cY][cX + 1] === 2 ||
                        collisionMap[cY + 1][cX] === 2 ||
                        collisionMap[cY + 1][cX + 1] === 2;

                    if (hitDoor) {
                        // collision logic
                    }
                }
            }
        }
    } else {
        if (player.pixelX < player.targetX) player.pixelX += MOVEMENT_SPEED;
        if (player.pixelX > player.targetX) player.pixelX -= MOVEMENT_SPEED;
        if (player.pixelY < player.targetY) player.pixelY += MOVEMENT_SPEED;
        if (player.pixelY > player.targetY) player.pixelY -= MOVEMENT_SPEED;

        if (player.pixelX === player.targetX && player.pixelY === player.targetY) {
            player.moving = false;
        }
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
    // 1. Draw Map
    if (assetsLoaded) {
        ctx.drawImage(mapImage, 0, 0);
    } else {
        ctx.fillStyle = '#000';
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
    ctx.fillStyle = 'red';
    ctx.fillRect(player.pixelX + 8, player.pixelY + 8, 16, 16);

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
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
