const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');
const axios = require('axios');
const { glob } = require('glob');

const QUALITY = 80;
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const GALLERY_DATA_PATH = path.join(__dirname, '..', 'galleryData.json');
const GALLERY_OUTPUT_DIR = path.join(ASSETS_DIR, 'gallery');

async function convertLocalImages() {
    console.log('--- Converting local assets ---');
    const images = await glob('assets/**/*.{png,jpg,jpeg}', { ignore: 'node_modules/**' });
    
    for (const imgPath of images) {
        const fullPath = path.join(__dirname, '..', imgPath);
        const relativeDir = path.dirname(imgPath);
        const fileName = path.basename(imgPath, path.extname(imgPath));
        const webpPath = path.join(__dirname, '..', relativeDir, `${fileName}.webp`);

        try {
            await sharp(fullPath)
                .webp({ quality: QUALITY })
                .toFile(webpPath);
            console.log(`Converted: ${imgPath} -> ${fileName}.webp`);
        } catch (err) {
            console.error(`Failed to convert ${imgPath}:`, err.message);
        }
    }
}

async function downloadAndConvertExternalImages() {
    console.log('\n--- Downloading and converting external images ---');
    if (!fs.existsSync(GALLERY_OUTPUT_DIR)) {
        fs.ensureDirSync(GALLERY_OUTPUT_DIR);
    }

    let galleryData = [];
    try {
        galleryData = await fs.readJson(GALLERY_DATA_PATH);
    } catch (err) {
        console.error('Failed to read galleryData.json:', err.message);
        return;
    }

    for (let i = 0; i < galleryData.length; i++) {
        const item = galleryData[i];
        if (item.url && item.url.startsWith('http')) {
            const fileName = `gallery_${i}`;
            const webpPath = path.join(GALLERY_OUTPUT_DIR, `${fileName}.webp`);
            const localUrl = `assets/gallery/${fileName}.webp`;

            try {
                console.log(`Downloading: ${item.url}`);
                const response = await axios({
                    url: item.url,
                    responseType: 'arraybuffer'
                });

                await sharp(Buffer.from(response.data))
                    .webp({ quality: QUALITY })
                    .toFile(webpPath);

                console.log(`Converted & Saved: ${localUrl}`);
                item.url = localUrl; // Update to local path
            } catch (err) {
                console.error(`Failed to process external image ${item.url}:`, err.message);
            }
        }
    }

    await fs.writeJson(GALLERY_DATA_PATH, galleryData, { spaces: 4 });
    console.log('Updated galleryData.json');
}

async function updateStylesAndMain() {
    console.log('\n--- Updating references in styles.css and main.js ---');
    
    // Update src/styles.css
    const stylesPath = path.join(__dirname, '..', 'src', 'styles.css');
    if (fs.existsSync(stylesPath)) {
        let styles = await fs.readFile(stylesPath, 'utf8');
        // Replace background image URL if it matches the external one
        const externalBg = 'https://i.ibb.co/2Y1f5Zg2/pokemon-wallpaper.jpg';
        const localBgPath = 'assets/pokemon-wallpaper.webp';
        
        if (styles.includes(externalBg)) {
            // First, download the background image
            const bgWebpPath = path.join(ASSETS_DIR, 'pokemon-wallpaper.webp');
            try {
                const response = await axios({ url: externalBg, responseType: 'arraybuffer' });
                await sharp(Buffer.from(response.data)).webp({ quality: QUALITY }).toFile(bgWebpPath);
                styles = styles.replace(externalBg, `../${localBgPath}`);
                console.log('Updated background image in styles.css');
            } catch (err) {
                console.error('Failed to download/convert background image:', err.message);
            }
        }
        
        // Also replace any .png/.jpg references in assets/ with .webp
        styles = styles.replace(/assets\/([\w\-\/]+)\.(png|jpg|jpeg)/g, 'assets/$1.webp');
        await fs.writeFile(stylesPath, styles);
    }

    // Update src/main.js
    const mainPath = path.join(__dirname, '..', 'src', 'main.js');
    if (fs.existsSync(mainPath)) {
        let main = await fs.readFile(mainPath, 'utf8');
        main = main.replace(/assets\/([\w\-\/]+)\.(png|jpg|jpeg)/g, 'assets/$1.webp');
        await fs.writeFile(mainPath, main);
        console.log('Updated image references in main.js');
    }
}

async function main() {
    try {
        await convertLocalImages();
        await downloadAndConvertExternalImages();
        await updateStylesAndMain();
        console.log('\nAll image processing complete!');
    } catch (err) {
        console.error('Script failed:', err);
    }
}

main();
