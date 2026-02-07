const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Constants
const TILE_SIZE = 32;          // Visual/Movement step size
const COLLISION_TILE_SIZE = 16; // Collision grid tile size
const ROWS = 20;               // 320 / 16
const COLS = 20;               // 320 / 16
const MOVEMENT_SPEED = 4;

// Game State
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    // Painter keys
    '0': false,
    '1': false,
    '2': false
};

const player = {
    x: 5, // Grid coordinates (32px grid)
    y: 5,
    // Visual pixel position
    pixelX: 5 * TILE_SIZE,
    pixelY: 5 * TILE_SIZE,
    moving: false,
    direction: 'down',
    targetX: 5 * TILE_SIZE,
    targetY: 5 * TILE_SIZE
};

// Map Data 20x20 (16px grid) - Reset to empty for manual painting
const collisionMap = [];
for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
        row.push(0);
    }
    collisionMap.push(row);
}

// Trigger Zones (Doors) - Mapped to 32px grid coords (0-9)
// These provide the CONTENT for the doors. The '2' on the map provides the TRIGGER location.
const triggers = [
    {
        x: 2, y: 2, // House Top-Left "HOME"
        type: 'door',
        label: 'HOME',
        content: { title: 'Home', text: 'Welcome to your digital home base. Kick off your shoes and relax.' }
    },
    {
        x: 7, y: 2, // House Top-Right "BLOG"
        type: 'door',
        label: 'BLOG',
        content: { title: 'Blog', text: 'Thoughts, updates, and ramblings about code and life.' }
    },
    {
        x: 2, y: 7, // House Bottom-Left "BOOKSHELF"
        type: 'door',
        label: 'BOOKSHELF',
        content: { title: 'Bookshelf', text: 'A collection of my favorite reads and resources.' }
    },
    {
        x: 7, y: 7, // House Bottom-Right "THEME"
        type: 'door',
        label: 'THEME',
        content: { title: 'Themes', text: 'Customize your experience. (Feature coming soon!)' }
    }
];

// Assets
const mapImage = new Image();
mapImage.src = 'assets/map.png';

let assetsLoaded = false;
mapImage.onload = () => {
    assetsLoaded = true;
    console.log('Map loaded');
};

let inputEnabled = true;
let mouseGridX = 0;
let mouseGridY = 0;

// Input Handling
window.addEventListener('keydown', (e) => {
    // Always allow painter keys if debug/dev mode implies it
    if (['0', '1', '2'].includes(e.key)) {
        handlePainter(e.key);
    }

    if (!inputEnabled) return;
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Mouse Tracking for Painter
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const x = (e.clientX - rect.left) / scaleX;
    const y = (e.clientY - rect.top) / scaleY;

    mouseGridX = Math.floor(x / COLLISION_TILE_SIZE);
    mouseGridY = Math.floor(y / COLLISION_TILE_SIZE);
});

// Click to toggle (Legacy/Simple painter)
canvas.addEventListener('mousedown', (e) => {
    if (mouseGridX >= 0 && mouseGridX < COLS && mouseGridY >= 0 && mouseGridY < ROWS) {
        // Toggle 1/0
        // collisionMap[mouseGridY][mouseGridX] = collisionMap[mouseGridY][mouseGridX] === 0 ? 1 : 0;
        // console.log(`Toggled ${mouseGridX},${mouseGridY} to ${collisionMap[mouseGridY][mouseGridX]}`);
    }
});

function handlePainter(key) {
    if (mouseGridX >= 0 && mouseGridX < COLS && mouseGridY >= 0 && mouseGridY < ROWS) {
        const val = parseInt(key);
        collisionMap[mouseGridY][mouseGridX] = val;
        console.log(`Painted ${mouseGridX},${mouseGridY} to ${val}`);
    }
}

document.getElementById('export-btn').addEventListener('click', () => {
    console.log("Current Collision Map (20x20):");
    console.log(JSON.stringify(collisionMap));
    alert("Map exported to console! (Check F12)");
});

// Game Loop
function update() {
    if (!inputEnabled) return;

    if (!player.moving) {
        let dx = 0;
        let dy = 0;

        if (keys.ArrowUp || keys.w) dy = -1;
        else if (keys.ArrowDown || keys.s) dy = 1;
        else if (keys.ArrowLeft || keys.a) dx = -1;
        else if (keys.ArrowRight || keys.d) dx = 1;

        if (dx !== 0 || dy !== 0) {
            // Target 32px grid position
            const nextGridX = player.x + dx;
            const nextGridY = player.y + dy;

            // Bounds check (0-9 for 32px tiles)
            if (nextGridX >= 0 && nextGridX < 10 && nextGridY >= 0 && nextGridY < 10) {

                // Check 4 sub-tiles (16px) for BLOCKING logic
                const cX = nextGridX * 2;
                const cY = nextGridY * 2;

                // 1 = Blocked
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

                    // Check for Door trigger (Value 2)
                    // If any of the 4 sub-tiles is 2, trigger!
                    // Also check triggers array for content
                    const hitDoor =
                        collisionMap[cY][cX] === 2 ||
                        collisionMap[cY][cX + 1] === 2 ||
                        collisionMap[cY + 1][cX] === 2 ||
                        collisionMap[cY + 1][cX + 1] === 2;

                    if (hitDoor) {
                        // Find content matching this 32px tile (roughly)
                        checkTriggers(nextGridX, nextGridY);
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

function checkTriggers(x, y) {
    const trigger = triggers.find(t => t.x === x && t.y === y);
    if (trigger) {
        console.log('Trigger content found:', trigger);
        handleTransition(trigger);
    } else {
        // Fallback if map has '2' but no content defined
        console.log('Door hit (2) but no content defined for', x, y);
        // Optionally handle generic door
    }
}

function handleTransition(trigger) {
    inputEnabled = false;
    Object.keys(keys).forEach(k => keys[k] = false);

    const overlay = document.getElementById('transition-overlay');
    const readingWindow = document.getElementById('reading-window');
    const title = document.getElementById('window-title');
    const text = document.getElementById('window-text');

    overlay.classList.add('active');

    setTimeout(() => {
        title.innerText = trigger.content.title;
        text.innerText = trigger.content.text;
        readingWindow.classList.add('visible');
        readingWindow.classList.remove('hidden');
    }, 500);
}

document.getElementById('close-btn').addEventListener('click', () => {
    const overlay = document.getElementById('transition-overlay');
    const readingWindow = document.getElementById('reading-window');

    readingWindow.classList.remove('visible');
    readingWindow.classList.add('hidden');
    overlay.classList.remove('active');

    setTimeout(() => {
        inputEnabled = true;
    }, 500);
});


function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (assetsLoaded) {
        ctx.drawImage(mapImage, 0, 0);
    }

    // Draw Player (16x16 Red Box centered in 32x32 tile)
    // PixelX is top-left of 32px tile.
    // Center 16px box: +8 offset (32-16)/2 = 8
    ctx.fillStyle = 'red';
    ctx.fillRect(player.pixelX + 8, player.pixelY + 8, 16, 16);

    // Draw Collision Map (16px grid)
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const val = collisionMap[r][c];
            if (val === 1) {
                // Blocked - Red
                ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
                ctx.fillRect(c * COLLISION_TILE_SIZE, r * COLLISION_TILE_SIZE, COLLISION_TILE_SIZE, COLLISION_TILE_SIZE);
            } else if (val === 2) {
                // Door - Blue
                ctx.fillStyle = 'rgba(0, 0, 255, 0.4)';
                ctx.fillRect(c * COLLISION_TILE_SIZE, r * COLLISION_TILE_SIZE, COLLISION_TILE_SIZE, COLLISION_TILE_SIZE);
            }
        }
    }

    // Highlight Mouse Hover (Painter Helper)
    if (mouseGridX >= 0 && mouseGridX < COLS && mouseGridY >= 0 && mouseGridY < ROWS) {
        ctx.strokeStyle = 'white';
        ctx.strokeRect(mouseGridX * COLLISION_TILE_SIZE, mouseGridY * COLLISION_TILE_SIZE, COLLISION_TILE_SIZE, COLLISION_TILE_SIZE);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
