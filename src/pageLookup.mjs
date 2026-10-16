/**
 * Page count for a book via Open Library (used for spine thickness).
 * Shared by the browser (local fallback) and the cached Vercel function (api/pages.mjs).
 */

const OL = 'https://openlibrary.org';
const TIMEOUT_MS = 6000;

// Open Library asks API clients to identify themselves; browsers can't set
// User-Agent, so only the server sends it.
const HEADERS = typeof window === 'undefined'
  ? { Accept: 'application/json', 'User-Agent': 'IshanMalhotraBookshelf/1.0 (+https://www.ishanmalhotra.me/bookshelf)' }
  : { Accept: 'application/json' };

function getJSON(url) {
  return fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

function cleanTitle(title) {
  return (title || '')
    .replace(/\(.*?\)/g, ' ')   // "(about 20 incl. ...)"
    .replace(/\s+/g, ' ')
    .trim();
}

function words(s) {
  return (s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
}

// Loose title match so a title-only search doesn't grab an unrelated book.
function titleMatches(wanted, found) {
  const a = words(wanted).filter((w) => w.length > 2);
  const b = new Set(words(found));
  if (!a.length) return true;
  return a.filter((w) => b.has(w)).length / a.length >= 0.6;
}

async function search(params, wantedTitle) {
  const url = `${OL}/search.json?${new URLSearchParams({ ...params, limit: '5', fields: 'title,number_of_pages_median' })}`;
  const res = await getJSON(url);
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const { docs = [] } = await res.json();
  const doc = docs.find((d) => d.number_of_pages_median && titleMatches(wantedTitle, d.title));
  return doc ? doc.number_of_pages_median : null;
}

/** → page count, or null if unknown */
export async function findPages({ title, author, isbn }) {
  const isbnClean = (isbn || '').replace(/[^0-9Xx]/g, '');
  if (isbnClean) {
    const res = await getJSON(`${OL}/isbn/${isbnClean}.json`);
    const pages = res.ok ? (await res.json()).number_of_pages : null;
    if (pages) return pages;
  }

  const t = cleanTitle(title);
  if (!t) return null;
  const a = (author || '').trim();
  if (a) {
    const hit = await search({ title: t, author: a }, t);
    if (hit) return hit;
  }
  // Author may be misspelled in the sheet: try title alone.
  return search({ title: t }, t);
}
