// Shared trainer sprite + tile movement for every canvas room (town, league).
// Behaviour here is the town's original code, moved so both pages walk alike.

export const COLLISION_TILE_SIZE = 8;

// Phones (≤768px). Was 6; a touch slower reads better on the small screen.
const MOVEMENT_SPEED = 5;
// Desktop draws on whole pixels. 1.75px/frame is a little slower than 2,
// and the leftover fraction is carried so the sprite never sits between pixels.
const MOVEMENT_SPEED_DESKTOP = 1.75;

export function isDesktopViewport() {
    return window.innerWidth >= 769;
}

export function getMovementSpeed() {
    return isDesktopViewport() ? MOVEMENT_SPEED_DESKTOP : MOVEMENT_SPEED;
}

/** Loads the 16 walk frames. `onReady` fires once all of them have loaded. */
export function loadPlayerSprites(onReady) {
    const sprites = {};
    let loaded = 0;
    const total = 16;
    ['down', 'left', 'right', 'up'].forEach(dir => {
        for (let i = 0; i < 4; i++) {
            const key = `${dir}_${i}`;
            const img = new Image();
            img.src = `assets/player/${key}.webp`;
            img.onload = () => {
                loaded++;
                if (loaded === total && onReady) onReady();
            };
            img.onerror = () => {
                console.error(`Failed to load sprite: ${key}`);
            };
            sprites[key] = img;
        }
    });
    return sprites;
}

export function createPlayer(gx, gy, direction = 'down') {
    return {
        x: gx,
        y: gy,
        pixelX: gx * COLLISION_TILE_SIZE,
        pixelY: gy * COLLISION_TILE_SIZE,
        moving: false,
        direction,
        targetX: gx * COLLISION_TILE_SIZE,
        targetY: gy * COLLISION_TILE_SIZE,
        frameX: 0,
        frameY: 0,
        tick: 0,
        moveCarry: 0
    };
}

/** Snap the player onto a tile, standing still. */
export function placePlayer(player, gx, gy, direction) {
    player.x = gx;
    player.y = gy;
    player.pixelX = player.targetX = gx * COLLISION_TILE_SIZE;
    player.pixelY = player.targetY = gy * COLLISION_TILE_SIZE;
    player.moving = false;
    player.frameX = 0;
    player.tick = 0;
    player.moveCarry = 0;
    if (direction) player.direction = direction;
}

/** Advance one frame toward the current target tile. */
export function stepMovement(player) {
    player.tick++;
    if (player.tick % 8 === 0) {
        player.frameX = (player.frameX + 1) % 4;
    }

    const speed = getMovementSpeed();
    const fractional = !Number.isInteger(speed);
    let pixels = speed;
    if (fractional) {
        player.moveCarry += speed;
        pixels = Math.floor(player.moveCarry);
        player.moveCarry -= pixels;
    }

    const stepAxis = (current, target, budget) => {
        if (budget <= 0 || current === target) return { value: current, used: 0 };
        const dir = current < target ? 1 : -1;
        const used = Math.min(budget, Math.abs(target - current));
        return { value: current + dir * used, used };
    };

    const nextX = stepAxis(player.pixelX, player.targetX, pixels);
    const nextY = stepAxis(player.pixelY, player.targetY, pixels - nextX.used);
    player.pixelX = nextX.value;
    player.pixelY = nextY.value;
    const unused = pixels - nextX.used - nextY.used;
    if (fractional && unused > 0) player.moveCarry += unused;

    if (player.pixelX === player.targetX && player.pixelY === player.targetY) {
        player.moving = false;
    }
}

export function drawPlayer(ctx, player, sprites) {
    const sprite = sprites[`${player.direction}_${player.frameX}`];
    if (sprite && sprite.complete) {
        ctx.drawImage(sprite, player.pixelX - 8, player.pixelY - 28, 24, 36);
    }
}
