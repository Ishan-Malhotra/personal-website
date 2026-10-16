/**
 * GET /api/pages?title=...&author=...&isbn=...  →  { pages: 412 | null }
 *
 * Cached on Vercel's CDN, so each book hits Open Library once.
 */
import { findPages } from '../src/pageLookup.mjs';

const HIT_CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800';
const MISS_CACHE = 'public, max-age=3600, s-maxage=86400';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const title = (params.get('title') || '').slice(0, 300);
  const author = (params.get('author') || '').slice(0, 200);
  const isbn = (params.get('isbn') || '').slice(0, 20);

  if (!title && !isbn) {
    return Response.json({ error: 'title or isbn required' }, { status: 400 });
  }

  try {
    const pages = await findPages({ title, author, isbn });
    return Response.json({ pages }, {
      headers: { 'Cache-Control': pages ? HIT_CACHE : MISS_CACHE }
    });
  } catch (err) {
    return Response.json({ pages: null, error: 'lookup failed' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
}
