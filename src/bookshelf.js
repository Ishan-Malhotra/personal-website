import { SHEET_URL } from './bookshelf.config.mjs';
import { fetchSheetBooks } from './sheetLib.mjs';
import { findPages } from './pageLookup.mjs';

const SNAPSHOT_KEY = 'bookshelf_snapshot_v1';  // last full book list, for instant repeat visits
const PAGES_CACHE_KEY = 'bookshelf_pages_v1';  // local fallback only (no /api)
const MISS_RETRY_MS = 7 * 24 * 60 * 60 * 1000;

const favEl = document.getElementById('shelf-favourites');
const allEl = document.getElementById('shelf-collection');
const statusEl = document.getElementById('shelf-status');
const countEl = document.getElementById('book-count');
const searchEl = document.getElementById('shelf-search');
const tipEl = document.getElementById('book-tip');
const tipTitle = tipEl.querySelector('.tip-title');
const tipAuthor = tipEl.querySelector('.tip-author');
const tipNotes = tipEl.querySelector('.tip-notes');

// Book-cloth and jacket colours, each with an ink that reads clearly on it.
const PALETTE = [
  { base: '#7b2d26', ink: '#f3e6cf' }, // oxblood
  { base: '#b3322b', ink: '#fbeee0' }, // crimson
  { base: '#c8643b', ink: '#fff3e6' }, // terracotta
  { base: '#d9a63c', ink: '#1f1a12' }, // mustard
  { base: '#ece3cf', ink: '#1d1b18' }, // cream
  { base: '#f5f1e6', ink: '#2a2622' }, // ivory
  { base: '#cbb48e', ink: '#22201b' }, // sand
  { base: '#6b6a3a', ink: '#f4efd9' }, // olive
  { base: '#2f5a43', ink: '#f1ead6' }, // forest
  { base: '#8fa58b', ink: '#18201a' }, // sage
  { base: '#1f6f72', ink: '#f2efe4' }, // teal
  { base: '#1f2f4f', ink: '#efe6d0' }, // navy
  { base: '#2f5fa8', ink: '#f7f3ea' }, // cobalt
  { base: '#5b2d4f', ink: '#f3e3ec' }, // plum
  { base: '#4a5560', ink: '#f1eee6' }, // slate
  { base: '#24242a', ink: '#ece4d0' }, // charcoal
  { base: '#e3a7a1', ink: '#2a1a1a' }  // blush
];

// Spine typography, picked per author: a mix of faces is what makes a shelf look real.
const SPINE_STYLES = [
  { family: '"Playfair Display", serif', weight: 700 },
  { family: '"Playfair Display", serif', weight: 400, italic: true },
  { family: '"Libre Baskerville", serif', weight: 400, upper: true, tracking: 0.12 },
  { family: '"DM Serif Display", serif', weight: 400 },
  { family: '"Work Sans", sans-serif', weight: 600, upper: true, tracking: 0.08 },
  { family: '"Work Sans", sans-serif', weight: 600 },
  { family: '"Archivo Narrow", sans-serif', weight: 700, upper: true, tracking: 0.04 },
  { family: '"Oswald", sans-serif', weight: 500, upper: true, tracking: 0.03 },
  { family: '"Bebas Neue", sans-serif', weight: 400, upper: true, tracking: 0.04 },
  { family: '"Roboto Slab", serif', weight: 600 }
];
const MARKS = ['dot', 'ring', 'bar', 'none', 'none'];

const DEMO_BOOKS = [
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', favourite: true, notes: 'Demo book. Point SHEET_URL in src/bookshelf.config.mjs at your Google Sheet.', pages: 310 },
  { title: 'Dune', author: 'Frank Herbert', favourite: true, pages: 608 },
  { title: 'Project Hail Mary', author: 'Andy Weir', pages: 496 },
  { title: 'Norwegian Wood', author: 'Haruki Murakami', pages: 389 },
  { title: 'Sapiens', author: 'Yuval Noah Harari', pages: 443 },
  { title: 'Atomic Habits', author: 'James Clear', pages: 320 }
];

let books = [];
const designs = new Map();   // book index → its author group's spine design
let lastRendered = '';

function readJSON(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* quota / private mode */ }
}

/* ================= data ================= */

// Whole shelf in one cached request (Vercel). Returns null when there's no /api (local dev).
async function loadFromApi() {
  let res;
  try { res = await fetch('/api/shelf'); } catch (_) { return null; }
  const type = res.headers.get('content-type') || '';
  if (res.status === 404 || !type.includes('json')) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Shelf request failed (${res.status})`);
  return data.demo ? DEMO_BOOKS : data.books;
}

// Local fallback: read the sheet directly, then fill in page counts in the background.
async function loadDirect() {
  try {
    const sheet = await fetchSheetBooks(SHEET_URL);
    return sheet || DEMO_BOOKS;
  } catch (err) {
    // Private sheets fail CORS before we ever see a status code.
    if (err instanceof TypeError) {
      throw new Error('Could not reach the sheet. Make sure it is shared as "Anyone with the link can view".');
    }
    throw err;
  }
}

function bookKey(b) {
  return `${b.title}|${b.author}|${b.isbn || ''}`.toLowerCase();
}

async function fillPagesDirect() {
  const cache = readJSON(PAGES_CACHE_KEY) || {};
  books.forEach((b) => {
    const hit = cache[bookKey(b)];
    if (!b.pages && hit && hit.pages) b.pages = hit.pages;
  });
  scheduleRender();

  const todo = books.filter((b) => {
    const hit = cache[bookKey(b)];
    return !b.pages && !(hit && Date.now() - hit.t < MISS_RETRY_MS);
  });
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < todo.length) {
      const b = todo[next++];
      let pages = null;
      try { pages = await findPages(b); } catch (_) { /* leave unknown */ }
      cache[bookKey(b)] = { pages, t: Date.now() };
      if (pages) { b.pages = pages; scheduleRender(); }
    }
  }));
  writeJSON(PAGES_CACHE_KEY, cache);
  writeJSON(SNAPSHOT_KEY, books);
}

/* ================= spine layout ================= */

const measureCtx = document.createElement('canvas').getContext('2d');
function fontString(style, size) {
  return `${style.italic ? 'italic ' : ''}${style.weight} ${size}px ${style.family}`;
}
function measure(text, style, size) {
  measureCtx.font = fontString(style, size);
  const tracking = (style.tracking || 0) * size * text.length;
  return Math.ceil(measureCtx.measureText(text).width + tracking);
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function isMobile() {
  return window.matchMedia('(max-width: 600px)').matches;
}

function spineMetrics() {
  return isMobile()
    ? { maxH: 186, minFont: 11, maxFont: 20, twoLineMin: 12 }
    : { maxH: 240, minFont: 12, maxFont: 26, twoLineMin: 14 };
}

// Greedy word-wrap by measured width. Returns null if one word alone is too wide.
function wrap(text, style, size, maxW) {
  const out = [];
  let line = '';
  for (const w of text.split(' ')) {
    if (measure(w, style, size) > maxW) return null;
    const trial = line ? `${line} ${w}` : w;
    if (measure(trial, style, size) <= maxW) line = trial;
    else { out.push(line); line = w; }
  }
  if (line) out.push(line);
  return out;
}

function fitTitle(text, style, usable, m, cap) {
  for (let s = cap; s >= m.minFont; s--) {
    if (measure(text, style, s) <= usable) return { size: s, lines: [text] };
  }
  for (let s = Math.min(cap, 18); s >= m.twoLineMin; s--) {
    const w = wrap(text, style, s, usable);
    if (w && w.length <= 2) return { size: s, lines: w };
  }
  return null;
}

function authorKey(b, i) {
  return (b.author || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() || `__no-author-${i}`;
}

// One design per author: same typeface, mark, size and height, so a series
// reads as a matched set. Height grows to the tallest any title in the set needs.
function groupDesign(key, indexes) {
  const m = spineMetrics();
  const seed = hash(key) >>> 2;
  const style = SPINE_STYLES[seed % SPINE_STYLES.length];
  const mark = MARKS[(seed >>> 5) % MARKS.length];
  const pad = 28 + (mark === 'none' ? 0 : 20);
  const cap = m.maxFont - ((seed >>> 9) % 4) * 2;
  const padX = 7 + ((seed >>> 13) % 4) * 3;

  let height = Math.round(m.maxH * (0.72 + ((seed >>> 3) % 29) / 100));
  for (const i of indexes) {
    const title = style.upper ? books[i].title.toUpperCase() : books[i].title;
    const fit = fitTitle(title, style, height - pad, m, cap);
    if (!fit || fit.lines.length > 1) { height = m.maxH; break; }
  }
  return { style, mark, pad, cap, padX, height };
}


function pagesFor(book) {
  return book.pages || null;
}

// Spine thickness from page count (~0.07px per page), within sane bounds.
function widthForPages(pages) {
  return Math.max(20, Math.min(96, Math.round(14 + pages * 0.075)));
}

function layoutSpine(book, design) {
  const m = spineMetrics();
  const { style, mark, pad, cap, padX, height } = design;
  const text = style.upper ? book.title.toUpperCase() : book.title;
  const pages = pagesFor(book);
  const pageW = pages ? widthForPages(pages) * (isMobile() ? 0.8 : 1) : 0;

  // With a known thickness, the title size is limited by how wide the spine is.
  const widthCap = pageW ? Math.floor((pageW - 8) / 1.15) : cap;
  let fit = fitTitle(text, style, height - pad, m, Math.min(cap, widthCap));
  if (fit && pageW && fit.lines.length * Math.round(fit.size * 1.15) + 8 > pageW) fit = null;
  if (!fit && pageW) fit = fitTitle(text, style, height - pad, m, cap); // thin book, long title: widen
  if (!fit) {
    const size = m.twoLineMin;
    const lines = (wrap(text, style, size, height - pad) || [text]).slice(0, 2);
    let last = lines[lines.length - 1];
    while (last.length > 1 && measure(`${last}…`, style, size) > height - pad) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
    fit = { size, lines };
  }

  const lineHeight = Math.round(fit.size * 1.15);
  const textW = fit.lines.length * lineHeight;
  const width = pageW
    ? Math.round(Math.max(pageW, textW + 8))
    : Math.max(26, textW + padX * 2);
  return { style, mark, text, height, width, lineHeight, pages, ...fit };
}

function createSpine(book, index, design) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'book';
  btn.dataset.index = String(index);
  btn.setAttribute('aria-label', book.author ? `${book.title} by ${book.author}` : book.title);
  btn.setAttribute('aria-describedby', 'book-tip');

  if (book.spine) return photoSpine(btn, book, index, design);

  const pi = hash(`${book.title}|${book.author}`) % PALETTE.length;
  const L = layoutSpine(book, design);
  btn.dataset.pi = String(pi);
  btn.style.cssText = [
    `--base:${PALETTE[pi].base}`, `--ink:${PALETTE[pi].ink}`,
    `--h:${L.height}px`, `--w:${L.width}px`,
    `--font:${L.style.family}`, `--fw:${L.style.weight}`, `--fst:${L.style.italic ? 'italic' : 'normal'}`,
    `--track:${L.style.tracking || 0}em`, `--fs:${L.size}px`, `--lh:${L.lineHeight}px`
  ].join(';');
  if (L.mark !== 'none') btn.classList.add(`book--mark-${L.mark}`);

  const title = document.createElement('span');
  title.className = 'book-title';
  L.lines.forEach((l, i) => {
    if (i) title.appendChild(document.createElement('br'));
    title.appendChild(document.createTextNode(l));
  });
  btn.appendChild(title);
  return btn;
}

// No two neighbouring spines in the same colour.
function separateColours(rowEl) {
  let prev = -1;
  rowEl.querySelectorAll('.book[data-pi]').forEach((el) => {
    let pi = Number(el.dataset.pi);
    if (pi === prev) {
      pi = (pi + 5) % PALETTE.length;
      el.dataset.pi = String(pi);
      el.style.setProperty('--base', PALETTE[pi].base);
      el.style.setProperty('--ink', PALETTE[pi].ink);
    }
    prev = pi;
  });
}

// A real spine photo from the sheet's "Spine" column; falls back to a generated spine.
function photoSpine(btn, book, index, design) {
  const { height } = design;
  btn.classList.add('book--photo');
  btn.style.cssText = `--h:${height}px;--w:34px`;
  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  img.onload = () => {
    const w = Math.round(height * (img.naturalWidth / img.naturalHeight));
    btn.style.setProperty('--w', `${Math.max(16, Math.min(110, w))}px`);
    scheduleRepack();
  };
  img.onerror = () => btn.replaceWith(createSpine({ ...book, spine: '' }, index, design));
  img.src = book.spine;
  btn.appendChild(img);
  return btn;
}

/* ================= render ================= */

function genreKey(b) {
  return (b.category || '').trim().toLowerCase() || '\uffffother'; // uncategorised last
}

// Author sets, ordered by genre (genres in order of first appearance in the sheet),
// then by author's first appearance. Within an author, sheet order = series order.
function shelfGroups() {
  const groups = new Map();
  books.forEach((b, i) => {
    const key = authorKey(b, i);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  });
  const genreRank = new Map();
  books.forEach((b) => {
    const g = genreKey(b);
    if (!genreRank.has(g)) genreRank.set(g, g.startsWith('\uffff') ? Infinity : genreRank.size);
  });
  return [...groups.entries()]
    .map(([key, indexes], order) => ({
      key, indexes, order,
      genre: genreKey(books[indexes[0]]),
      design: groupDesign(key, indexes)
    }))
    .sort((x, y) => (genreRank.get(x.genre) - genreRank.get(y.genre)) || (x.order - y.order));
}

function spineWidth(el) {
  return parseFloat(el.style.getPropertyValue('--w')) || 34;
}

/**
 * Pack author sets onto shelves, keeping genre + series order.
 * Like justified text: choose shelf breaks that use the fewest shelves, then make
 * them as evenly full as possible, so no shelf ends up holding a couple of books.
 * A set wider than a whole shelf is split across shelves.
 */
function packShelves(items, rowW) {
  const chunks = [];
  for (const item of items) {
    if (item.w <= rowW) { chunks.push(item); continue; }
    let cur = { ...item, spines: [], w: 0 };
    for (const sp of item.spines) {
      const w = spineWidth(sp);
      if (cur.w + w > rowW && cur.spines.length) { chunks.push(cur); cur = { ...item, spines: [], w: 0 }; }
      cur.spines.push(sp); cur.w += w;
    }
    if (cur.spines.length) chunks.push(cur);
  }

  // best[j] = cheapest way to shelve the first j chunks. Every shelf costs a lot
  // (fewest shelves wins), plus the squared empty space (evenness).
  const SHELF_COST = 1e6;
  const n = chunks.length;
  const best = new Array(n + 1).fill(Infinity);
  const from = new Array(n + 1).fill(0);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    let width = 0;
    for (let i = j - 1; i >= 0; i--) {
      width += chunks[i].w;
      if (width > rowW) break;
      const slack = (rowW - width) / rowW;
      const cost = best[i] + SHELF_COST + slack * slack * 1000;
      if (cost < best[j]) { best[j] = cost; from[j] = i; }
    }
  }

  const rows = [];
  for (let j = n; j > 0; j = from[j]) rows.unshift({ items: chunks.slice(from[j], j) });
  return rows;
}

function groupEl(spines) {
  const el = document.createElement('div');
  el.className = 'author-group';
  spines.forEach((sp) => el.appendChild(sp));
  return el;
}

function shelfInnerWidth(el) {
  const cs = getComputedStyle(el);
  return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
}

function renderShelf(container, items) {
  container.replaceChildren();
  if (!items.length) return;
  const rowW = shelfInnerWidth(container);
  for (const row of packShelves(items, rowW)) {
    const rowEl = document.createElement('div');
    rowEl.className = 'shelf-row';
    row.items.forEach((item) => rowEl.appendChild(groupEl(item.spines)));
    container.appendChild(rowEl);
    separateColours(rowEl);
  }
}

function render() {
  const q = searchEl.value.trim().toLowerCase();
  const signature = `${q}|${allEl.clientWidth}|${document.fonts.status}|${JSON.stringify(books)}`;
  if (signature === lastRendered) return;
  lastRendered = signature;
  hideTip();

  const match = (b) => !q || [b.title, b.author, b.category].some((v) => (v || '').toLowerCase().includes(q));
  const favItems = [];
  const allItems = [];
  designs.clear();
  for (const { indexes, design, genre } of shelfGroups()) {
    indexes.forEach((i) => designs.set(i, design));
    const fav = [];
    const all = [];
    for (const i of indexes) {
      const b = books[i];
      if (!match(b)) continue;
      if (b.favourite) fav.push(createSpine(b, i, design));
      all.push(createSpine(b, i, design));
    }
    const item = (spines) => ({ spines, genre, w: spines.reduce((sum, sp) => sum + spineWidth(sp), 0) });
    if (fav.length) favItems.push(item(fav));
    if (all.length) allItems.push(item(all));
  }
  renderShelf(favEl, favItems);
  renderShelf(allEl, allItems);

  const favCount = books.filter((b) => b.favourite).length;
  countEl.textContent = `${books.length} BOOK${books.length === 1 ? '' : 'S'} · ${favCount} ★`;

  if (!favEl.children.length) favEl.appendChild(emptyNote(q ? 'NO MATCHES' : 'ADD A "FAVOURITE" COLUMN TO THE SHEET AND MARK BOOKS TRUE'));
  if (!allEl.children.length) allEl.appendChild(emptyNote(q ? 'NO MATCHES' : 'THE SHELF IS EMPTY'));
}

// Batch bursts of updates (page counts arriving, photo spines loading) into one repack.
let renderTimer = 0;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 300);
}
const scheduleRepack = () => { lastRendered = ''; scheduleRender(); };

function emptyNote(text) {
  const p = document.createElement('p');
  p.className = 'shelf-empty';
  p.textContent = text;
  return p;
}

/* ================= hover card ================= */

let tipFor = null;

function showTip(el) {
  const b = books[Number(el.dataset.index)];
  if (!b) return;
  tipFor = el;
  tipTitle.textContent = b.title;
  tipAuthor.textContent = b.author ? `by ${b.author}` : '';
  tipNotes.textContent = b.notes || '';
  tipEl.classList.add('is-visible');
  tipEl.setAttribute('aria-hidden', 'false');

  const r = el.getBoundingClientRect();
  const tw = tipEl.offsetWidth;
  const th = tipEl.offsetHeight;
  const cx = r.left + r.width / 2;
  const left = Math.max(8, Math.min(window.innerWidth - tw - 8, cx - tw / 2));
  let top = r.top - th - 14;
  const below = top < 8;
  if (below) top = r.bottom + 14;
  tipEl.classList.toggle('below', below);
  tipEl.style.left = `${Math.round(left)}px`;
  tipEl.style.top = `${Math.round(top)}px`;
  tipEl.style.setProperty('--arrow-x', `${Math.round(Math.max(12, Math.min(tw - 12, cx - left)))}px`);
}

function hideTip() {
  tipFor = null;
  tipEl.classList.remove('is-visible');
  tipEl.setAttribute('aria-hidden', 'true');
}

document.addEventListener('pointerover', (e) => {
  const el = e.target.closest && e.target.closest('.book');
  if (el && el !== tipFor) showTip(el);
});
document.addEventListener('pointerout', (e) => {
  const from = e.target.closest && e.target.closest('.book');
  const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.book');
  if (from && from !== to && e.pointerType !== 'touch') hideTip();
});
// Touch: tap a spine to show its card, tap anywhere else to hide it.
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest && e.target.closest('.book');
  if (el) showTip(el);
  else hideTip();
});
document.addEventListener('focusin', (e) => {
  const el = e.target.closest && e.target.closest('.book');
  if (el) showTip(el);
});
document.addEventListener('focusout', (e) => {
  if (e.target.closest && e.target.closest('.book')) hideTip();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });
window.addEventListener('scroll', hideTip, { passive: true });

searchEl.addEventListener('input', render);

let lastMobile = isMobile();
let resizeTimer = 0;
window.addEventListener('resize', () => {
  const now = isMobile();
  if (now !== lastMobile) { lastMobile = now; lastRendered = ''; render(); return; }
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(render, 150);   // shelf width changed: repack
});

/* ================= boot ================= */

async function init() {
  // 1. Last visit's shelf, instantly.
  const snapshot = readJSON(SNAPSHOT_KEY);
  const hadSnapshot = Array.isArray(snapshot) && snapshot.length;
  if (hadSnapshot) { books = snapshot; render(); }
  else statusEl.textContent = 'LOADING SHELF…';

  // Spine sizes are measured per typeface: re-measure once the web fonts land.
  document.fonts.ready.then(() => render());

  // 2. First visit: show the sheet itself straight away (≈1s) rather than waiting on
  //    the server, which may still be gathering page counts. Widths fill in after.
  let apiDone = false;
  const direct = hadSnapshot ? null : loadDirect().then((sheet) => {
    if (apiDone) return sheet;
    books = sheet;
    statusEl.textContent = '';
    render();
    return sheet;
  }).catch((err) => { console.warn('[bookshelf] sheet', err); return null; });

  // 3. Fresh data with page counts: one cached request on Vercel.
  try {
    const fromApi = await loadFromApi();
    if (fromApi) {
      apiDone = true;
      books = fromApi;
      statusEl.textContent = '';
      render();
      writeJSON(SNAPSHOT_KEY, books);
      return;
    }
    // No /api (local dev): sheet directly, page counts looked up in the browser.
    books = (direct && await direct) || await loadDirect();
    statusEl.textContent = '';
    render();
    writeJSON(SNAPSHOT_KEY, books);
    fillPagesDirect();
  } catch (err) {
    console.error('[bookshelf]', err);
    const fallback = direct && await direct;
    if (fallback) { books = fallback; render(); fillPagesDirect(); return; }
    statusEl.textContent = books.length
      ? 'Showing saved shelf — could not reach the sheet.'
      : `COULD NOT LOAD SHELF. ${err.message || ''}`.trim();
  }
}

init();
