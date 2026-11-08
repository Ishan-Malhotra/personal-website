// The Work building: Emerald-style league rooms, one per role.
// Walk up through the top door to the next room; walk out the bottom to go
// back. The toolbar walks the trainer there for you.

import { ROOMS, roomArt } from './workData.js';
import {
    COLLISION_TILE_SIZE as T,
    isDesktopViewport,
    loadPlayerSprites,
    createPlayer,
    placePlayer,
    stepMovement,
    drawPlayer
} from './engine/player.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Room art is 208×224, drawn 1:1.
const COLS = 26;
const ROWS = 28;

// Tiles measured against assets/league/room_*.png
const DOOR_ROW = 5;            // top door; stepping in goes to the next room
const DOOR_COLS = [12, 13];
const EXIT_ROW = 21;           // first row of the bottom wall; stepping in goes back
const EXIT_COLS = [11, 12, 13, 14];
const LANE_COL = 12;           // the column the trainer walks to reach either door
const CENTER = [12, 14];       // standing spot on the Poké Ball, facing the plaque
const ENTER_BELOW = [12, 22];  // spawn when arriving from the room before
const ENTER_ABOVE = [12, 5];   // spawn when arriving from the room after

// Not index.html: clean-URL servers 301 it to / and drop the query.
const MAP_URL = './?from=work';

// Plaque over the league emblem on the door, canvas px
const PLAQUE = { x: 90, y: 20, size: 28 };

function buildCollision(isLastRoom) {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
    // Floor
    for (let y = 6; y <= 20; y++) {
        for (let x = 0; x < COLS; x++) grid[y][x] = 0;
    }
    // Display cases on both walls
    for (let y = 8; y <= 18; y++) {
        for (const x of [0, 1, 2, 23, 24, 25]) grid[y][x] = 1;
    }
    if (!isLastRoom) DOOR_COLS.forEach(x => { grid[DOOR_ROW][x] = 2; });
    EXIT_COLS.forEach(x => { grid[EXIT_ROW][x] = 2; });
    return grid;
}

// ── Assets ──
const roomImages = ROOMS.map((_, i) => {
    const img = new Image();
    img.src = roomArt(i);
    return img;
});

const logoImages = ROOMS.map(room => {
    const img = new Image();
    img.ok = false;
    img.onload = () => { img.ok = true; };
    img.src = room.logo;
    return img;
});

const sprites = loadPlayerSprites();

// ── State ──
let roomIndex = 0;
let collision = buildCollision(ROOMS.length === 1);
const player = createPlayer(ENTER_BELOW[0], ENTER_BELOW[1], 'up');

// Scripted walk: a queue of directions. `ghost` walks ignore walls and doors
// (used to walk in from off-floor spawn tiles).
let path = [];
let pathGhost = false;
let onPathDone = null;

// Fade: 'in' brightens after a room swap, 'out' darkens before one.
let fadePhase = 'in';
let fadeOpacity = 1;
let onBlack = null;

let frameCount = 0;
let isEditor = false;      // Shift+E: draws the collision grid (read-only)
let busy = false;          // walking somewhere on its own or changing rooms
let pendingTarget = null;  // room a toolbar click is heading to

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };

// ── DOM ──
const panel = document.getElementById('work-panel');
const panelTitle = document.getElementById('work-panel-title');
const panelMeta = document.getElementById('work-panel-meta');
const panelBody = document.getElementById('work-panel-body');
const panelClose = document.getElementById('work-panel-close');
const toolbar = document.getElementById('work-toolbar');

const initial = (name) => name.trim().charAt(0).toUpperCase();

function buildToolbar() {
    ROOMS.forEach((room, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'work-icon';
        btn.dataset.room = String(i);
        btn.setAttribute('aria-label', `Go to ${room.company}`);
        btn.title = room.company;

        const img = document.createElement('img');
        img.alt = '';
        img.src = room.icon;
        img.addEventListener('error', () => {
            img.remove();
            const fallback = document.createElement('span');
            fallback.className = 'work-icon-initial';
            fallback.textContent = initial(room.company);
            btn.prepend(fallback);
        });

        btn.append(img);
        btn.addEventListener('click', () => goToRoom(i));
        toolbar.appendChild(btn);
    });
}

function updateToolbar() {
    toolbar.querySelectorAll('.work-icon').forEach(btn => {
        const active = Number(btn.dataset.room) === roomIndex;
        btn.classList.toggle('active', active);
        if (active) btn.setAttribute('aria-current', 'true');
        else btn.removeAttribute('aria-current');
    });
}

// ── Room text: content/work/<id>.md, fetched once per room ──
const textCache = new Map();

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inlineMarkdown(text) {
    return escapeHtml(text)
        // [text](url). Bear Blog's `tab:` prefix is accepted; every link opens in a new tab anyway.
        .replace(/\[([^\]]+)\]\((?:tab:)?(https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

/** Tiny Markdown subset: paragraphs, `- ` lists, links, bold, italic. */
function renderMarkdown(md) {
    return md.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/).map(block => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length && lines.every(l => /^[-*] /.test(l))) {
            return `<ul>${lines.map(l => `<li>${inlineMarkdown(l.slice(2))}</li>`).join('')}</ul>`;
        }
        return `<p>${inlineMarkdown(lines.join(' '))}</p>`;
    }).join('');
}

/** Splits an optional `---` header (`key: value` lines) from the Markdown body. */
function parseFrontMatter(md) {
    const text = md.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!match) return { meta: {}, body: text };
    const meta = {};
    match[1].split('\n').forEach(line => {
        const i = line.indexOf(':');
        if (i > 0) meta[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
    });
    return { meta, body: text.slice(match[0].length) };
}

function loadRoomText(room) {
    if (!textCache.has(room.id)) {
        textCache.set(room.id, fetch(`content/work/${room.id}.md`)
            .then(r => {
                if (!r.ok) throw new Error(r.status);
                return r.text();
            })
            .then(md => {
                const { meta, body } = parseFrontMatter(md);
                return { meta, html: renderMarkdown(body) };
            })
            .catch(() => ({ meta: {}, html: '<p class="work-panel-missing">Nothing written here yet.</p>' })));
    }
    return textCache.get(room.id);
}

function fillPanel() {
    const room = ROOMS[roomIndex];
    panelTitle.textContent = room.company;
    panelMeta.textContent = '';
    panelBody.innerHTML = '';
    panelBody.scrollTop = 0;
    loadRoomText(room).then(({ meta, html }) => {
        if (ROOMS[roomIndex] !== room) return; // moved on before it loaded
        panelTitle.textContent = meta.company || room.company;
        // Designation on one line, dates on the next
        panelMeta.replaceChildren(...[meta.role, meta.dates].filter(Boolean).map(text => {
            const line = document.createElement('span');
            line.className = 'work-panel-meta-line';
            line.textContent = text.toLowerCase();
            return line;
        }));
        panelBody.innerHTML = html;
        panelBody.querySelectorAll('a').forEach(a => {
            a.target = '_blank';
            a.rel = 'noopener';
        });
    });
}

function openPanel() {
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    // Wait a frame so the opened panel has its real position
    requestAnimationFrame(maybeShowReadHint);
}

function closePanel() {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    hideReadHint();
}

// ── Mobile "more text" cue ──
// On phones the write-up sits under the D-pad, often below the fold. Like
// Emerald's dialogue arrow, a blinking ▼ at the bottom of the room says
// there's more; A scrolls to it. Auto-hides when the panel shows or after 4s.
const isMobileShell = () => window.innerWidth <= 768;
const prefersReducedMotion = () => window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let showReadHint = false;
let readHintTimer = null;
let panelInView = false;

if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
        panelInView = entries[0].isIntersecting;
        if (panelInView) hideReadHint();
    }, { threshold: 0.15 }).observe(panel);
}

function maybeShowReadHint() {
    if (!isMobileShell() || !panel.classList.contains('is-open')) return;
    if (panel.getBoundingClientRect().top < window.innerHeight - 48) return;
    showReadHint = true;
    clearTimeout(readHintTimer);
    readHintTimer = setTimeout(hideReadHint, 4000);
}

function hideReadHint() {
    showReadHint = false;
    clearTimeout(readHintTimer);
    readHintTimer = null;
}

function scrollToPanel() {
    hideReadHint();
    panel.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

// ── Room flow ──
function enterRoom(index, from) {
    roomIndex = index;
    collision = buildCollision(index === ROOMS.length - 1);
    pendingTarget = null;
    history.replaceState(null, '', `#${ROOMS[index].id}`);
    fillPanel();
    updateToolbar();

    const [sx, sy] = from === 'above' ? ENTER_ABOVE : ENTER_BELOW;
    placePlayer(player, sx, sy, from === 'above' ? 'down' : 'up');

    const steps = Math.abs(CENTER[1] - sy);
    const dir = from === 'above' ? 'down' : 'up';
    walk(Array(steps).fill(dir), true, () => {
        player.direction = 'up';
        busy = false;
        openPanel();
    });

    fadePhase = 'in';
    fadeOpacity = 1;
}

function walk(dirs, ghost, done) {
    busy = true;
    path = dirs.slice();
    pathGhost = ghost;
    onPathDone = done || null;
}

function fadeOutThen(fn) {
    fadePhase = 'out';
    onBlack = fn;
}

function leaveToMap() {
    if (fadePhase === 'out') return;
    busy = true;
    closePanel();
    fadeOutThen(() => { window.location.href = MAP_URL; });
}

/** Toolbar: walk to the right door, then arrive in room `target`. */
function goToRoom(target) {
    if (target === roomIndex) {
        if (!busy) openPanel();
        return;
    }
    if (busy || player.moving) return;

    pendingTarget = target;
    closePanel();

    const dirs = [];
    const dx = LANE_COL - player.x;
    for (let i = 0; i < Math.abs(dx); i++) dirs.push(dx > 0 ? 'right' : 'left');
    const goalRow = target > roomIndex ? DOOR_ROW : EXIT_ROW;
    const dy = goalRow - player.y;
    for (let i = 0; i < Math.abs(dy); i++) dirs.push(dy > 0 ? 'down' : 'up');
    walk(dirs, false, null);
}

function onTrigger(gx, gy) {
    busy = true;
    path = [];
    onPathDone = null;
    closePanel();

    if (gy === DOOR_ROW) {
        const next = pendingTarget != null ? pendingTarget : roomIndex + 1;
        fadeOutThen(() => enterRoom(next, 'below'));
    } else if (roomIndex === 0) {
        fadeOutThen(() => { window.location.href = MAP_URL; });
    } else {
        const prev = pendingTarget != null ? pendingTarget : roomIndex - 1;
        fadeOutThen(() => enterRoom(prev, 'above'));
    }
}

// ── Movement ──
const DELTAS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function dirFromKeys() {
    if (keys.ArrowUp || keys.w) return 'up';
    if (keys.ArrowDown || keys.s) return 'down';
    if (keys.ArrowLeft || keys.a) return 'left';
    if (keys.ArrowRight || keys.d) return 'right';
    return null;
}

function tryMove(dir, ghost) {
    player.direction = dir;
    const [dx, dy] = DELTAS[dir];
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;

    const tile = collision[ny][nx];
    if (!ghost && tile === 1) return false;

    player.moving = true;
    player.x = nx;
    player.y = ny;
    player.targetX = nx * T;
    player.targetY = ny * T;

    if (!ghost && tile === 2) onTrigger(nx, ny);
    return true;
}

function update() {
    if (player.moving) {
        stepMovement(player);
        return;
    }

    // Changing rooms: stand still on the trigger tile while the fade finishes
    if (fadePhase === 'out') return;

    let dir = null;
    let ghost = false;
    if (path.length) {
        dir = path.shift();
        ghost = pathGhost;
    } else if (onPathDone) {
        const done = onPathDone;
        onPathDone = null;
        done();
    } else if (busy) {
        // Path finished without a callback (toolbar walk blocked); free input.
        busy = false;
        pendingTarget = null;
    } else if (!isEditor) {
        dir = dirFromKeys();
    }

    if (!dir) {
        player.frameX = 0;
        player.tick = 0;
        player.moveCarry = 0;
        return;
    }

    if (tryMove(dir, ghost)) {
        if (isDesktopViewport()) stepMovement(player);
    } else {
        player.frameX = 0;
    }
}

// ── Drawing ──
function drawPlaque() {
    const { x, y, size } = PLAQUE;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(x + 2, y + 2, size - 4, size - 4);

    const logo = logoImages[roomIndex];
    if (logo && logo.ok) {
        ctx.drawImage(logo, x + 2, y + 2, size - 4, size - 4);
    } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initial(ROOMS[roomIndex].company), x + size / 2, y + size / 2 + 1);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }
}

/** Blinking ▼ on a paper tab, bottom centre of the room (pixel rows, no font). */
function drawReadHint() {
    frameCount++;
    if (Math.floor(frameCount / 24) % 2 === 1) return;
    const cx = 104;
    const y = 208;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(cx - 8, y - 2, 16, 12);
    ctx.fillStyle = '#f7f3e8';
    ctx.fillRect(cx - 7, y - 1, 14, 10);
    ctx.fillStyle = '#1a1a1a';
    [10, 8, 6, 4, 2].forEach((w, row) => {
        ctx.fillRect(cx - w / 2, y + 2 + row, w, 1);
    });
}

function drawEditorGrid() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const v = collision[r][c];
            if (v === 1) ctx.fillStyle = 'rgba(255, 0, 0, 0.35)';
            else if (v === 2) ctx.fillStyle = 'rgba(0, 0, 255, 0.45)';
            else continue;
            ctx.fillRect(c * T, r * T, T, T);
        }
    }
}

function draw() {
    ctx.imageSmoothingEnabled = false;

    const art = roomImages[roomIndex];
    if (art.complete && art.naturalWidth) {
        ctx.drawImage(art, 0, 0);
    } else {
        ctx.fillStyle = '#202020';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawPlaque();
    drawPlayer(ctx, player, sprites);
    if (showReadHint) drawReadHint();
    if (isEditor) drawEditorGrid();

    if (fadePhase === 'out') {
        fadeOpacity = Math.min(1, fadeOpacity + 0.02);
        if (fadeOpacity >= 1 && onBlack) {
            const fn = onBlack;
            onBlack = null;
            fn();
        }
    } else if (fadePhase === 'in') {
        fadeOpacity = Math.max(0, fadeOpacity - 0.02);
        if (fadeOpacity === 0) fadePhase = 'none';
    }
    if (fadeOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

// ── Input ──
window.addEventListener('keydown', (e) => {
    if (e.key === 'E' && e.shiftKey) {
        isEditor = !isEditor;
        return;
    }
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        if (e.key.startsWith('Arrow')) e.preventDefault();
    }

    if (e.key === 'Escape') {
        leaveToMap();
        return;
    }

    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
        // Let buttons and links handle their own Enter/Space
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'BUTTON' || tag === 'A') return;
        e.preventDefault();
        handleInteract();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Lost focus with a key held would keep walking forever
window.addEventListener('blur', () => {
    Object.keys(keys).forEach(k => { keys[k] = false; });
});

/** A / Enter / Space — read the plaque when facing it. */
function handleInteract() {
    if (busy || player.moving) return;
    const facingPlaque = player.direction === 'up'
        && player.y <= DOOR_ROW + 2
        && Math.abs(player.x - LANE_COL) <= 2;
    const onCenter = player.x === CENTER[0] && player.y === CENTER[1];
    if (isMobileShell() && panel.classList.contains('is-open')) {
        if (!panelInView) scrollToPanel();
        return;
    }
    if (facingPlaque || onCenter) {
        openPanel();
        if (isMobileShell()) requestAnimationFrame(scrollToPanel);
    }
}

panelClose.addEventListener('click', closePanel);

// ── Boot ──
function startIndex() {
    const id = window.location.hash.slice(1);
    const i = ROOMS.findIndex(r => r.id === id);
    return i >= 0 ? i : 0;
}

buildToolbar();
ROOMS.forEach(loadRoomText); // warm the cache so the panel never waits
enterRoom(startIndex(), 'below');

// Same-page links like work.html#breathe don't reload; walk in from below.
window.addEventListener('hashchange', () => {
    const i = startIndex();
    if (i === roomIndex || fadePhase === 'out') return;
    busy = true;
    path = [];
    onPathDone = null;
    closePanel();
    fadeOutThen(() => enterRoom(i, 'below'));
});

// ── Mobile: biggest room that stays on whole device pixels ──
// CSS px × devicePixelRatio must be a whole multiple of 208, or sprites shimmer.
// 2× phones get 312px (3 device px per game px), 3× phones 277px (4).
function fitMobileCanvas() {
    if (window.innerWidth > 768) {
        canvas.style.removeProperty('width');
        canvas.style.removeProperty('height');
        return;
    }
    const screenEl = canvas.closest('.screen');
    if (!screenEl) return;
    // The bezel may thin down to 4px a side if that buys the next size up.
    const MIN_BEZEL = 4;
    const MAX_BEZEL = 14;
    const available = screenEl.clientWidth - 2 * MIN_BEZEL;
    const dpr = window.devicePixelRatio || 1;
    const k = Math.max(1, Math.floor((available * dpr + 0.01) / canvas.width));
    const cssWidth = (canvas.width * k) / dpr;
    const bezel = Math.min(MAX_BEZEL, Math.max(MIN_BEZEL, (screenEl.clientWidth - cssWidth) / 2));
    screenEl.style.paddingLeft = screenEl.style.paddingRight = `${bezel}px`;
    canvas.style.setProperty('width', `${cssWidth}px`, 'important');
    canvas.style.setProperty('height', `${(canvas.height * k) / dpr}px`, 'important');
}

fitMobileCanvas();
window.addEventListener('resize', fitMobileCanvas, { passive: true });

// Canvas text needs the bitmap face loaded before the fallback initial draws
if (document.fonts && document.fonts.load) {
    document.fonts.load('12px "Press Start 2P"');
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
