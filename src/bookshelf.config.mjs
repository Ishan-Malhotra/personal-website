/**
 * Bookshelf data source.
 *
 * Paste your Google Sheet link here. Either works:
 *   1. "Publish to web" CSV link (recommended):
 *      File → Share → Publish to web → pick the sheet → CSV → Publish
 *      https://docs.google.com/spreadsheets/d/e/XXXX/pub?gid=0&single=true&output=csv
 *   2. A normal sheet link, if the sheet is shared as "Anyone with the link can view":
 *      https://docs.google.com/spreadsheets/d/XXXX/edit#gid=0
 *
 * Header row (case-insensitive, any column order):
 *   Title | Author | Favourite | Notes
 * Favourite accepts: TRUE / yes / y / 1 / x / ★
 *
 * Optional columns:
 *   Category  groups the shelves by genre, searchable
 *   Pages     page count — sets the spine's thickness (otherwise looked up)
 *   ISBN      pins the exact edition used to look up the page count
 *   Spine     photo of the real spine — replaces the generated one. Either:
 *               - a Google Drive share link (file shared "Anyone with the link"), or
 *               - a repo path like assets/spines/dune.jpg
 *             Crop the photo tight to the spine; width is taken from its aspect ratio.
 *
 * Leave empty to show a demo shelf.
 */
export const SHEET_URL = 'https://docs.google.com/spreadsheets/d/13a9NSBDoTBfifwz-nBoFU9raJJYfR6VqYg64_gtKlM8/edit?gid=0#gid=0';
