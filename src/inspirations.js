/**
 * Inspirations collage.
 * Items come from inspirationsData.json (see docs/adding-inspirations.md).
 * Each item: { id, title, type, by?, year?, image, size?, note? }
 *
 * Layout is computed here, not by CSS auto-placement, so the grid never has
 * holes: each item takes the first empty cell, shrinks if its preferred size
 * does not fit there, and the last tiles stretch to square off the bottom.
 */

const DATA_URL = 'inspirationsData.json';
const MAP_URL = './?from=inspirations';
const TYPES = ['film', 'book', 'image', 'music', 'other'];
const SIZES = ['s', 'wide', 'tall', 'big'];
const CARD_KEY = 'inspo-card';
const MIN_COL_WIDTH = 220; // desktop; phones always get 2 columns

const collageEl = document.getElementById('inspo-collage');
const filtersEl = document.getElementById('inspo-filters');
const statusEl = document.getElementById('inspo-status');
const cardEl = document.getElementById('inspo-card');
const collapseBtn = document.getElementById('inspo-collapse');

const popupEl = document.getElementById('inspo-popup');
const popupFrame = popupEl.querySelector('.inspo-popup-frame');
const popupMedia = popupEl.querySelector('.inspo-popup-media');
const popupImg = document.getElementById('inspo-popup-img');
const popupTag = document.getElementById('inspo-popup-tag');
const popupTitle = document.getElementById('inspo-popup-title');
const popupMeta = document.getElementById('inspo-popup-meta');
const popupNote = document.getElementById('inspo-popup-note');
const prevBtn = document.getElementById('inspo-prev');
const nextBtn = document.getElementById('inspo-next');
const closeBtn = document.getElementById('inspo-close');

let items = [];
let activeFilter = 'all';
let visible = [];        // items in the current filter, in order
let columns = 0;         // column count of the current layout
let openIndex = -1;      // index into `visible` while the popup is open
let returnFocusTo = null;

// Items without a `size` get one from this rhythm (by position), so new entries
// need no layout thought. pack() still guarantees a gap-free grid either way.
const AUTO_SIZES = ['big', 's', 's', 's', 's', 'wide', 's', 's', 'wide', 's', 'big', 's', 's', 'wide', 's', 's'];
const TMDB_IMG = 'https://image.tmdb.org/t/p/w1280';

/**
 * Forgiving JSON: tolerates trailing commas and nested arrays, so a list pasted
 * straight from TMDB / the cue project still loads.
 */
function parseLoose(text) {
    const data = JSON.parse(text.replace(/,(\s*[\]}])/g, '$1'));
    return Array.isArray(data) ? data.flat(Infinity) : [];
}

function normalise(raw) {
    return raw
        .filter((it) => it && typeof it.title === 'string' && it.title.trim())
        .map((it, i) => {
            const tmdbPath = it.backdrop_path || it.poster_path || '';
            const fromTmdb = Boolean(it.movieId || it.tmdbId || tmdbPath);
            const local = typeof it.image === 'string' && it.image ? it.image : '';
            return {
                id: String(it.id || it.movieId || `item-${i}`),
                title: it.title.trim(),
                type: TYPES.includes(it.type) ? it.type : fromTmdb ? 'film' : 'other',
                by: typeof it.by === 'string' ? it.by.trim() : '',
                year: it.year ? String(it.year) : '',
                // Not downloaded yet? Use TMDB's CDN until `npm run inspo-images` localises it.
                image: local || (tmdbPath ? TMDB_IMG + tmdbPath : ''),
                size: SIZES.includes(it.size) ? it.size : null, // filled in after shuffling
                note: typeof it.note === 'string' ? it.note.trim() : ''
            };
        });
}

/** Fresh random order on every visit (Fisher–Yates). */
function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Items without a set size take one from the rhythm by their (shuffled) position. */
function assignAutoSizes(list) {
    return list.map((it, i) => (it.size ? it : { ...it, size: AUTO_SIZES[i % AUTO_SIZES.length] }));
}

function metaLine(item) {
    return [item.by, item.year].filter(Boolean).join(' · ');
}

function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle('is-error', isError);
}

/* ---------- Filters ---------- */

function renderFilters() {
    const present = TYPES.filter((t) => items.some((it) => it.type === t));
    filtersEl.replaceChildren();
    // One type only: filters would do nothing.
    if (present.length < 2) return;

    for (const key of ['all', ...present]) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = key.toUpperCase();
        btn.dataset.filter = key;
        btn.setAttribute('aria-pressed', String(key === activeFilter));
        btn.addEventListener('click', () => setFilter(key));
        filtersEl.appendChild(btn);
    }
}

function setFilter(key) {
    activeFilter = key;
    for (const btn of filtersEl.querySelectorAll('button')) {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === key));
    }
    resetCollage();
    window.scrollTo({ top: 0 });
}

/* ---------- Collage ---------- */

function makeTile(item, index, eager) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = `inspo-tile size-${item.size}`;
    tile.dataset.index = String(index);
    tile.setAttribute('aria-label', [item.title, metaLine(item)].filter(Boolean).join(', '));

    if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = '';
        img.loading = eager ? 'eager' : 'lazy';
        img.decoding = 'async';
        img.addEventListener('error', () => tile.classList.add('no-image'), { once: true });
        tile.appendChild(img);
    } else {
        tile.classList.add('no-image');
    }

    const cap = document.createElement('span');
    cap.className = 'inspo-caption';
    cap.textContent = item.title;
    tile.appendChild(cap);
    return tile;
}

const SPANS = { s: [1, 1], wide: [2, 1], tall: [1, 2], big: [2, 2] };
// If the preferred size does not fit at the next free cell, try these instead.
const FALLBACK = { big: ['big', 'wide', 'tall', 's'], wide: ['wide', 's'], tall: ['tall', 's'], s: ['s'] };

function columnCount() {
    if (window.matchMedia('(max-width: 768px)').matches) return 2;
    const style = getComputedStyle(collageEl);
    const gap = parseFloat(style.columnGap) || 0;
    const inner = collageEl.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return Math.max(2, Math.floor((inner + gap) / (MIN_COL_WIDTH + gap)));
}

/**
 * Pack `prefs` (one size key per item) into `cols` columns, row by row.
 * Each item takes the first empty cell, so holes can only appear at the end.
 * With `stretch`, neighbours grow into any leftover cells.
 * Returns { boxes: [{ col, row, w, h }] (0-based cells), holes: empty cell count }.
 */
function packOnce(prefs, cols, stretch) {
    const grid = [];               // grid[row][col] = item index | undefined
    const cell = (r, c) => (grid[r] || (grid[r] = []))[c];
    const fits = (r, c, w, h) => {
        if (c + w > cols) return false;
        for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (cell(y, x) !== undefined) return false;
        return true;
    };
    const fill = (r, c, w, h, i) => {
        for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) (grid[y] || (grid[y] = []))[x] = i;
    };

    const boxes = [];
    let r = 0;
    let c = 0;
    prefs.forEach((pref, i) => {
        while (cell(r, c) !== undefined) { if (++c >= cols) { c = 0; r++; } }
        // Phones: a 2×2 tile would be the whole width and very tall; keep it 2×1.
        const options = cols <= 2 && pref === 'big' ? ['wide', 's'] : FALLBACK[pref];
        const size = options.find((k) => fits(r, c, ...SPANS[k])) || 's';
        const [w, h] = SPANS[size];
        fill(r, c, w, h, i);
        boxes.push({ col: c, row: r, w, h });
    });

    // Square off the bottom: stretch neighbours into any empty cells left over.
    const rows = grid.length;
    let changed = stretch;
    while (changed) {
        changed = false;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (cell(y, x) !== undefined) continue;
                // Grow the tile on the left rightwards (all its rows must be free here).
                const left = x > 0 ? cell(y, x - 1) : undefined;
                if (left !== undefined) {
                    const b = boxes[left];
                    if (b.col + b.w === x && fits(b.row, x, 1, b.h)) {
                        fill(b.row, x, 1, b.h, left); b.w++; changed = true; continue;
                    }
                }
                // Grow the tile above downwards (all its columns must be free here).
                const up = y > 0 ? cell(y - 1, x) : undefined;
                if (up !== undefined) {
                    const b = boxes[up];
                    if (b.row + b.h === y && fits(y, b.col, b.w, 1)) {
                        fill(y, b.col, b.w, 1, up); b.h++; changed = true; continue;
                    }
                }
            }
        }
    }

    let holes = 0;
    for (const row of grid) for (let x = 0; x < cols; x++) if (row[x] === undefined) holes++;
    return { boxes, holes };
}

/**
 * Pack with no holes and no odd stretched tiles.
 * 1. Balance: walking back from the bottom, try turning a small tile wide or a
 *    wide/tall tile small, and keep the change only if the leftover gap shrinks.
 *    Items are placed in order, so changing item i only moves items after it.
 * 2. Fallback: stretch neighbours into whatever is left (always succeeds).
 */
function pack(items, cols) {
    const prefs = items.map((it) => it.size);
    const n = prefs.length;

    // The last couple of rows stay one tile tall: a big or tall tile there leaves
    // a ragged two-row edge that can only be closed by stretching something.
    const tailStart = Math.max(0, n - cols * 2);
    for (let i = tailStart; i < n; i++) {
        if (prefs[i] === 'big') prefs[i] = 'wide';
        else if (prefs[i] === 'tall') prefs[i] = 's';
    }

    let { boxes, holes } = packOnce(prefs, cols, false);

    // Walk back from the end trying one-cell swaps (small <-> wide, big -> wide),
    // keeping a swap only if the leftover gap shrinks. Items are placed in order,
    // so changing item i only moves the items after it.
    const stop = Math.max(0, n - cols * 2 - 80);
    for (let pass = 0; pass < 3 && holes > 0; pass++) {
        for (let i = n - 1; i >= stop && holes > 0; i--) {
            const { w, h } = boxes[i];
            const swaps = w * h === 1 ? ['wide'] : w * h === 2 ? ['s'] : ['wide'];
            if (i < tailStart && w * h === 1) swaps.push('tall');
            const before = prefs[i];
            for (const swap of swaps) {
                prefs[i] = swap;
                const next = packOnce(prefs, cols, false);
                if (next.holes < holes) { ({ boxes, holes } = next); break; }
                prefs[i] = before;
            }
        }
    }
    if (!holes) return boxes;

    // Still ragged: try pairs of one-cell swaps among the last two rows' tiles.
    const swapOf = (i) => {
        const { w, h } = boxes[i];
        return w * h === 1 ? 'wide' : w * h === 2 ? 's' : 'wide';
    };
    const pairFrom = Math.max(0, n - cols * 2 - 4);
    for (let i = n - 1; i > pairFrom; i--) {
        for (let j = i - 1; j >= pairFrom; j--) {
            const [bi, bj] = [prefs[i], prefs[j]];
            prefs[i] = swapOf(i);
            prefs[j] = swapOf(j);
            const next = packOnce(prefs, cols, false);
            if (!next.holes) return next.boxes;
            prefs[i] = bi;
            prefs[j] = bj;
        }
    }

    // Stretch neighbours into what's left. If even that leaves a hole, fall back
    // to all-small tiles: then the only gap is the end of the last row, and
    // growing the last tile always closes it. So this never returns holes.
    const stretched = packOnce(prefs, cols, true);
    return stretched.holes ? packOnce(prefs.map(() => 's'), cols, true).boxes : stretched.boxes;
}

function layoutCollage() {
    const cols = columnCount();
    columns = cols;
    collageEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    const boxes = pack(visible, cols);
    const tiles = collageEl.querySelectorAll('.inspo-tile');
    boxes.forEach((b, i) => {
        tiles[i].style.gridColumn = `${b.col + 1} / span ${b.w}`;
        tiles[i].style.gridRow = `${b.row + 1} / span ${b.h}`;
    });
}

function resetCollage() {
    visible = activeFilter === 'all' ? items : items.filter((it) => it.type === activeFilter);
    const frag = document.createDocumentFragment();
    visible.forEach((item, i) => frag.appendChild(makeTile(item, i, i < 12)));
    collageEl.replaceChildren(frag);
    if (visible.length) layoutCollage();
}

collageEl.addEventListener('click', (e) => {
    const tile = e.target.closest('.inspo-tile');
    if (!tile) return;
    openPopup(Number(tile.dataset.index), tile);
});

let resizeTimer = 0;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (visible.length && columnCount() !== columns) layoutCollage();
    }, 120);
});

/* ---------- Glass card: collapse + drag ---------- */

function loadCardState() {
    try {
        return JSON.parse(localStorage.getItem(CARD_KEY)) || {};
    } catch {
        return {};
    }
}

function saveCardState(patch) {
    try {
        localStorage.setItem(CARD_KEY, JSON.stringify({ ...loadCardState(), ...patch }));
    } catch {
        /* private mode: just don't remember */
    }
}

function setCollapsed(collapsed, save = true) {
    cardEl.classList.toggle('is-collapsed', collapsed);
    collapseBtn.setAttribute('aria-expanded', String(!collapsed));
    collapseBtn.setAttribute('aria-label', collapsed ? 'Expand' : 'Collapse');
    collapseBtn.textContent = collapsed ? '+' : '–';
    if (save) saveCardState({ collapsed });
    clampCard();
}

/** Keep the card fully on screen. */
function clampCard() {
    const r = cardEl.getBoundingClientRect();
    const margin = 6;
    const x = Math.min(Math.max(margin, r.left), window.innerWidth - r.width - margin);
    const y = Math.min(Math.max(margin, r.top), window.innerHeight - r.height - margin);
    if (x !== r.left || y !== r.top) placeCard(x, y);
}

function placeCard(x, y) {
    cardEl.style.left = `${Math.round(x)}px`;
    cardEl.style.top = `${Math.round(y)}px`;
}

collapseBtn.addEventListener('click', () => {
    setCollapsed(!cardEl.classList.contains('is-collapsed'));
});

let drag = null;

cardEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('a, button')) return;
    const r = cardEl.getBoundingClientRect();
    drag = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top };
    cardEl.setPointerCapture(e.pointerId);
    cardEl.classList.add('is-dragging');
    e.preventDefault();
});

cardEl.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    placeCard(e.clientX - drag.dx, e.clientY - drag.dy);
    clampCard();
});

function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    cardEl.classList.remove('is-dragging');
    const r = cardEl.getBoundingClientRect();
    saveCardState({ x: r.left, y: r.top });
}

cardEl.addEventListener('pointerup', endDrag);
cardEl.addEventListener('pointercancel', endDrag);
window.addEventListener('resize', clampCard);

(function restoreCard() {
    const state = loadCardState();
    if (state.collapsed) setCollapsed(true, false);
    if (Number.isFinite(state.x) && Number.isFinite(state.y)) {
        placeCard(state.x, state.y);
        clampCard();
    }
})();

/* ---------- Popup ---------- */

function fillPopup(item) {
    popupTag.textContent = item.type;
    popupTitle.textContent = item.title;
    popupMeta.textContent = metaLine(item);
    popupNote.textContent = item.note;

    if (item.image) {
        popupMedia.classList.remove('hidden-media');
        popupImg.src = item.image;
        popupImg.alt = item.title;
        popupImg.onerror = () => popupMedia.classList.add('hidden-media');
    } else {
        popupMedia.classList.add('hidden-media');
        popupImg.removeAttribute('src');
    }

    const many = visible.length > 1;
    prevBtn.classList.toggle('hidden', !many);
    nextBtn.classList.toggle('hidden', !many);
    popupFrame.scrollTop = 0;
}

function openPopup(index, fromTile) {
    openIndex = index;
    returnFocusTo = fromTile || null;
    fillPopup(visible[index]);
    popupEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
}

function closePopup() {
    if (openIndex < 0) return;
    popupEl.classList.add('hidden');
    document.body.style.overflow = '';
    openIndex = -1;
    if (returnFocusTo) returnFocusTo.focus({ preventScroll: false });
    returnFocusTo = null;
}

function step(delta) {
    if (openIndex < 0 || visible.length < 2) return;
    openIndex = (openIndex + delta + visible.length) % visible.length;
    fillPopup(visible[openIndex]);
    // Closing should land on the tile you ended up at.
    returnFocusTo = collageEl.querySelector(`.inspo-tile[data-index="${openIndex}"]`) || returnFocusTo;
}

function trapFocus(e) {
    const focusables = [...popupEl.querySelectorAll('button:not(.hidden)')];
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

popupEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closePopup();
});
closeBtn.addEventListener('click', closePopup);
prevBtn.addEventListener('click', () => step(-1));
nextBtn.addEventListener('click', () => step(1));

window.addEventListener('keydown', (e) => {
    if (openIndex >= 0) {
        if (e.key === 'Escape') { e.preventDefault(); closePopup(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        else if (e.key === 'Tab') trapFocus(e);
        return;
    }
    if (e.key === 'Escape') window.location.href = MAP_URL;
});

/* ---------- Load ---------- */

async function load() {
    try {
        const res = await fetch(DATA_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        items = assignAutoSizes(shuffle(normalise(parseLoose(await res.text()))));
    } catch (err) {
        console.error('Inspirations failed to load', err);
        setStatus("Couldn't load the collage. Try again in a bit.", true);
        return;
    }

    if (!items.length) {
        setStatus('Nothing pinned up yet.');
        return;
    }

    renderFilters();
    resetCollage();
}

load();
