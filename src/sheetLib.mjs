/**
 * Google Sheet → book list. Shared by the browser (src/bookshelf.js)
 * and the cached Vercel function (api/shelf.mjs).
 */

// Plain sheet link → CSV endpoint (sheet must be shared "anyone with the link can view").
export function normalizeSheetUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (/\/pub\?|output=csv|tqx=out:csv/.test(trimmed)) return trimmed;
  const m = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) {
    const gid = (trimmed.match(/[#&?]gid=(\d+)/) || [])[1];
    return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ''}`;
  }
  return trimmed;
}

// RFC-4180-ish: quoted fields, escaped quotes, commas/newlines inside quotes.
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row);
      row = []; field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Google Drive share links → direct image URL (file must be shared "anyone with the link").
function normalizeImageUrl(url) {
  const m = (url || '').match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  return m ? `https://lh3.googleusercontent.com/d/${m[1]}` : url;
}

function isTruthy(v) {
  return /^(true|yes|y|1|x|★|\*)$/i.test((v || '').trim());
}

export function rowsToBooks(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names) => header.findIndex((h) => names.includes(h));
  const iTitle = col('title', 'book', 'name');
  const iAuthor = col('author', 'authors', 'by');
  const iFav = col('favourite', 'favorite', 'fav', 'favourites', 'favorites');
  const iNotes = col('notes', 'note', 'review', 'thoughts');
  const iCategory = col('category', 'genre', 'type');
  const iIsbn = col('isbn', 'isbn13', 'isbn-13', 'isbn10', 'isbn-10');
  const iSpine = col('spine', 'spine url', 'spine image', 'spine photo');
  const iPages = col('pages', 'page count', 'pagecount', 'no. of pages', 'number of pages');
  if (iTitle === -1) throw new Error('No "Title" column found in the sheet header.');

  const cell = (r, i) => (i >= 0 ? (r[i] || '').trim() : '');
  return rows.slice(1)
    .map((r) => ({
      title: cell(r, iTitle).replace(/\s+/g, ' '),
      author: cell(r, iAuthor).replace(/\s+/g, ' '),
      favourite: iFav >= 0 ? isTruthy(r[iFav]) : false,
      notes: cell(r, iNotes),
      category: cell(r, iCategory),
      isbn: cell(r, iIsbn),
      spine: normalizeImageUrl(cell(r, iSpine)),
      pages: parseInt(cell(r, iPages).replace(/[^0-9]/g, ''), 10) || null
    }))
    .filter((b) => b.title);
}

export async function fetchSheetBooks(sheetUrl) {
  const url = normalizeSheetUrl(sheetUrl);
  if (!url) return null;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Sheet is private. Share it as "Anyone with the link can view".');
  }
  if (!res.ok) throw new Error(`Sheet request failed (${res.status})`);
  const text = await res.text();
  if (/^\s*<!doctype html|^\s*<html/i.test(text)) {
    throw new Error('Sheet is not public. Share it as "Anyone with the link can view".');
  }
  return rowsToBooks(parseCSV(text));
}
