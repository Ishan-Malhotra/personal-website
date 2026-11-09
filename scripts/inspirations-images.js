/**
 * Get every inspiration's image onto the site as a web-sized WebP.
 *
 *   npm run inspo-images            # process new things only
 *   npm run inspo-images -- --force # redo every image
 *
 * It does two jobs:
 * 1. Originals: each file in originals/inspirations/ (jpg/png/webp/gif/avif)
 *    becomes assets/inspirations/<name>.webp, max 1600px on the long edge.
 * 2. TMDB entries: any item in inspirationsData.json with a `backdrop_path`
 *    (or `poster_path`) and no local image is downloaded from TMDB's image CDN,
 *    saved as assets/inspirations/<id>.webp, and the entry is rewritten in the
 *    page's format (id, title, type, year, image, tmdbId). Trailing commas and
 *    nested arrays from a pasted list are cleaned up on the way.
 *
 * Sizes are left alone: items without `size` get one automatically on the page.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'originals/inspirations');
const OUT = path.join(ROOT, 'assets/inspirations');
const DATA = path.join(ROOT, 'inspirationsData.json');
const TMDB_IMG = 'https://image.tmdb.org/t/p/w1280';
const MAX_EDGE = 1600;
const force = process.argv.includes('--force');

const slug = (t) =>
  String(t).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function toWebp(input, dest) {
  await sharp(input, { page: 0 })
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(dest);
}

async function processOriginals() {
  if (!fs.existsSync(SRC)) return;
  const files = fs.readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp|gif|avif)$/i.test(f));
  for (const file of files) {
    const name = slug(path.basename(file, path.extname(file)));
    const dest = path.join(OUT, `${name}.webp`);
    if (!force && fs.existsSync(dest)) continue;
    await toWebp(path.join(SRC, file), dest);
    console.log(`original  → assets/inspirations/${name}.webp`);
  }
}

async function processTmdbEntries() {
  const text = fs.readFileSync(DATA, 'utf8');
  let list;
  try {
    list = JSON.parse(text.replace(/,(\s*[\]}])/g, '$1'));
  } catch (err) {
    console.error(`inspirationsData.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  list = Array.isArray(list) ? list.flat(Infinity) : [];

  const used = new Set(list.map((it) => it && it.id).filter(Boolean));
  let changed = text !== JSON.stringify(list, null, 2) + '\n';
  let failed = 0;

  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    if (!it || !it.title) continue;
    const tmdbPath = it.backdrop_path || it.poster_path;
    const hasLocal = typeof it.image === 'string' && it.image && !/^https?:/.test(it.image);
    if (!tmdbPath || (hasLocal && !force)) continue;

    let id = it.id || slug(it.title);
    if (!it.id) { while (used.has(id)) id += '-2'; used.add(id); }
    const dest = path.join(OUT, `${id}.webp`);

    if (force || !fs.existsSync(dest)) {
      const res = await fetch(TMDB_IMG + tmdbPath);
      if (!res.ok) {
        console.warn(`FAILED    ${it.title} (HTTP ${res.status}), left as is`);
        failed++;
        continue;
      }
      await toWebp(Buffer.from(await res.arrayBuffer()), dest);
      console.log(`tmdb      → assets/inspirations/${id}.webp  (${it.title})`);
    }

    // Rewrite in the page's format, keeping anything you already set.
    const { movieId, backdrop_path, poster_path, ...rest } = it;
    list[i] = {
      id,
      title: it.title,
      type: it.type || 'film',
      ...rest,
      ...(it.year ? { year: Number(it.year) || it.year } : {}),
      id,
      image: `assets/inspirations/${id}.webp`,
      tmdbId: it.tmdbId || movieId
    };
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(DATA, JSON.stringify(list, null, 2) + '\n');
    console.log('updated inspirationsData.json');
  }
  if (failed) process.exitCode = 1;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await processOriginals();
  await processTmdbEntries();
  console.log('done');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
