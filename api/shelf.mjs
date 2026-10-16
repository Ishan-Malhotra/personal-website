/**
 * GET /api/shelf  →  { books: [{ title, author, favourite, notes, category, isbn, spine, pages }] }
 *
 * The whole bookshelf in one response: the Google Sheet plus page counts.
 * Cached on Vercel's CDN for 5 minutes and served stale while it refreshes,
 * so visitors get it instantly and new sheet rows show up within ~5 minutes.
 * Page counts come from /api/pages (itself CDN-cached for 30 days), so only
 * newly added books ever reach Open Library.
 */
import { SHEET_URL } from '../src/bookshelf.config.mjs';
import { fetchSheetBooks } from '../src/sheetLib.mjs';
import { findPages } from '../src/pageLookup.mjs';

const LANES = 16;
// Never keep visitors waiting on Open Library: answer after this long with whatever
// page counts are ready. Missing ones fill in on later refreshes (/api/pages caches them).
const LOOKUP_BUDGET_MS = 7000;

async function pagesVia(origin, book) {
  const qs = new URLSearchParams({ title: book.title, author: book.author || '' });
  if (book.isbn) qs.set('isbn', book.isbn);
  try {
    const res = await fetch(`${origin}/api/pages?${qs}`);
    if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
      return (await res.json()).pages || null;
    }
  } catch (_) { /* fall through */ }
  // Own endpoint unreachable (e.g. protected preview): ask Open Library directly.
  try { return await findPages(book); } catch (_) { return null; }
}

export async function GET(request) {
  try {
    const books = await fetchSheetBooks(SHEET_URL);
    if (!books) return Response.json({ books: [], demo: true });

    const origin = new URL(request.url).origin;
    const todo = books.filter((b) => !b.pages);
    const found = new Map();
    let next = 0;
    const lookups = Promise.all(Array.from({ length: LANES }, async () => {
      while (next < todo.length) {
        const book = todo[next++];
        found.set(book, await pagesVia(origin, book));
      }
    }));
    const finished = await Promise.race([
      lookups.then(() => true),
      new Promise((r) => setTimeout(() => r(false), LOOKUP_BUDGET_MS))
    ]);
    todo.forEach((b) => { b.pages = found.get(b) || null; });

    // Incomplete answers are cached briefly so the next refresh picks up the rest.
    const sMaxAge = finished ? 300 : 30;
    return Response.json({ books, complete: finished, generatedAt: new Date().toISOString() }, {
      headers: { 'Cache-Control': `public, max-age=0, s-maxage=${sMaxAge}, stale-while-revalidate=86400` }
    });
  } catch (err) {
    return Response.json({ error: err.message || 'Could not load the sheet' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
