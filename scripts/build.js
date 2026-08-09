/**
 * Production build: bundle + minify JS/CSS into dist/
 * Source stays readable for local `npm run dev`.
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function rewriteIndexHtml(html) {
  return html
    .replace(/href="src\/styles\.css"/g, 'href="assets/styles.min.css"')
    .replace(/src="\.\/src\/mobileAdapter\.js"/g, 'src="assets/mobileAdapter.min.js"')
    .replace(/src="src\/mobileAdapter\.js"/g, 'src="assets/mobileAdapter.min.js"')
    .replace(/src="src\/main\.js"/g, 'src="assets/main.min.js"')
    .replace(/src="\.\/src\/main\.js"/g, 'src="assets/main.min.js"');
}

function rewriteGalleryHtml(html) {
  return html.replace(/src="gallery\.js"/g, 'src="assets/gallery.min.js"');
}

async function build() {
  console.log('Cleaning dist/...');
  rmrf(DIST);
  mkdirp(path.join(DIST, 'assets'));

  console.log('Bundling JS...');
  await Promise.all([
    esbuild.build({
      entryPoints: [path.join(ROOT, 'src/main.js')],
      bundle: true,
      minify: true,
      format: 'esm',
      outfile: path.join(DIST, 'assets/main.min.js'),
      drop: ['console', 'debugger'],
      legalComments: 'none',
      target: ['es2018']
    }),
    esbuild.build({
      entryPoints: [path.join(ROOT, 'src/mobileAdapter.js')],
      bundle: true,
      minify: true,
      format: 'iife',
      outfile: path.join(DIST, 'assets/mobileAdapter.min.js'),
      drop: ['console', 'debugger'],
      legalComments: 'none',
      target: ['es2018']
    }),
    esbuild.build({
      entryPoints: [path.join(ROOT, 'gallery.js')],
      bundle: true,
      minify: true,
      format: 'iife',
      outfile: path.join(DIST, 'assets/gallery.min.js'),
      drop: ['console', 'debugger'],
      legalComments: 'none',
      target: ['es2018']
    })
  ]);

  // CSS: rewrite ../assets/ → same-folder paths (styles.min.css lives in dist/assets/)
  console.log('Minifying CSS...');
  let css = fs.readFileSync(path.join(ROOT, 'src/styles.css'), 'utf8');
  css = css.replace(/url\(\s*(['"]?)\.\.\/assets\//g, 'url($1');
  const cssOut = await esbuild.transform(css, {
    loader: 'css',
    minify: true,
    legalComments: 'none'
  });
  fs.writeFileSync(path.join(DIST, 'assets/styles.min.css'), cssOut.code);

  console.log('Copying assets...');
  copyDir(path.join(ROOT, 'assets'), path.join(DIST, 'assets'));
  fs.copyFileSync(
    path.join(ROOT, 'galleryData.json'),
    path.join(DIST, 'galleryData.json')
  );

  console.log('Writing HTML...');
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(DIST, 'index.html'), rewriteIndexHtml(indexHtml));

  const galleryHtml = fs.readFileSync(path.join(ROOT, 'gallery.html'), 'utf8');
  fs.writeFileSync(path.join(DIST, 'gallery.html'), rewriteGalleryHtml(galleryHtml));

  console.log('Build complete → dist/');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
