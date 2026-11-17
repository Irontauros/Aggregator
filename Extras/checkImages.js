const fs = require("fs");
const path = require("path");

const { readJson } = require("./helpers");

const DATA_DIR = path.join(__dirname, "..", "data");
const IMAGES_DIR = path.join(__dirname, "..", "public", "images");

const ENTITIES = [
  { file: "videos.json", folder: "videos" },
  { file: "actors.json", folder: "actors" },
  { file: "celebrities.json", folder: "celebrities" },
  { file: "features.json", folder: "features" },
  { file: "hentai.json", folder: "hentai" },
  { file: "shorts.json", folder: "shorts" }
];

function collectReferencedImages() {
  const referenced = new Set();

  ENTITIES.forEach(({ file }) => {
    const items = readJson(path.join(DATA_DIR, file));

    items.forEach(item => {
      if (item.thumbnail && item.thumbnail.startsWith("/images/")) {
        referenced.add(item.thumbnail);
      }
    });
  });

  return referenced;
}

function findOrphans() {
  const referenced = collectReferencedImages();
  const orphans = [];

  ENTITIES.forEach(({ folder }) => {
    const folderPath = path.join(IMAGES_DIR, folder);
    if (!fs.existsSync(folderPath)) return;

    const files = fs.readdirSync(folderPath);

    files.forEach(file => {
      const publicPath = `/images/${folder}/${file}`;

      if (!referenced.has(publicPath)) {
        const fullPath = path.join(folderPath, file);
        const stats = fs.statSync(fullPath);
        orphans.push({ publicPath, fullPath, sizeKB: stats.size / 1024 });
      }
    });
  });

  return orphans;
}

const orphans = findOrphans();

if (!orphans.length) {
  console.log("No orphaned images found.");
} else {
  console.log(`Found ${orphans.length} orphaned image(s):\n`);

  orphans.forEach(o => {
    console.log(`${o.sizeKB.toFixed(1)} KB  ${o.fullPath}`);
  });

  const totalMB = orphans.reduce((sum, o) => sum + o.sizeKB, 0) / 1024;
  console.log(`\nTotal: ${totalMB.toFixed(2)} MB across ${orphans.length} file(s).`);
}