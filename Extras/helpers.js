// Import filesystem module to read and write JSON files
const fs = require("fs");

// Import path module for building safe file paths
const path = require("path");

// Import the SQLite storage layer
const db = require("./db");


// Generate the next available ID based on the highest existing ID
function getNextId(array) {

  // If the array has items, find the highest ID and add 1
  return array.length
    ? Math.max(...array.map(obj => obj.id || 0)) + 1
    : 1;
}


// Format titles so main words are capitalized and small words remain lowercase
function formatTitle(name) {

  // Words that should stay lowercase unless they are the first word
  const smallWords = ["de", "da", "of", "the", "and", "in", "on", "at", "to", "for"];

  // Normalize title capitalization
  return name
    .toLowerCase()
    .split(" ")
    .map((word, index) => {

      // Keep small words lowercase if not the first word
      if (index !== 0 && smallWords.includes(word)) {
        return word;
      }

      // Capitalize the first letter of other words
      return word.charAt(0).toUpperCase() + word.slice(1);

    })
    .join(" ");
}


// Format a person's name (actors, celebrities): letters/numbers only,
// no leading/trailing space, single spaces between words, every word
// capitalized. Strips stray punctuation like a trailing comma that
// formatTitle alone wouldn't catch.
function formatPersonName(name) {

  if (!name) return "";

  return name
    // Drop anything that isn't a letter (any language), a digit, or a space
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    // Collapse any run of whitespace (including what punctuation removal left behind) into one space
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}


// Determine if a video is considered incomplete
function isIncomplete(video) {

  // A video is incomplete if it has no categories
  return !video.categories?.length;
}


// Collections that stay plain, hand-edited JSON files instead of
// living in the database
const FILE_ONLY = new Set(["themes"]);

// Read a dataset. The path still looks like data/videos.json so no
// route has to change, but the data now comes from the database
function readJson(filePath) {

  const name = db.collectionName(filePath);

  if (FILE_ONLY.has(name)) {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
  }

  const data = db.readCollection(name);

  // Unknown dataset behaves like a missing file did
  return data === null ? [] : data;
}

// Save a dataset. The whole write happens in one database
// transaction, so it either fully happens or doesn't happen at all
function writeJson(file, data) {

  const name = db.collectionName(file);

  if (FILE_ONLY.has(name)) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return;
  }

  db.writeCollection(name, data);
}


// Check if a specific value already exists in an array by field name
function existsByField(array, field, value, ignoreId = null) {

  // Normalize the value for case-insensitive comparison
  const normalized = value.toLowerCase();

  // Check if any item already contains this value
  return array.some(item =>
    item[field] &&
    item[field].toLowerCase() === normalized &&
    item.id !== ignoreId
  );
}


// Which key each dataset is sorted by, and whether ids are renumbered
// 1..N (true) or kept with only gaps repaired (false)
const SORT_CONFIG = {
  videos:      { key: "name", reindex: false },
  features:    { key: "name", reindex: false },
  actors:      { key: "name", reindex: true },
  websites:    { key: "name", reindex: true },
  shorts:      { key: "name", reindex: true },
  celebrities: { key: "name", reindex: true },
  hentai:      { key: "name", reindex: true },
  categories:  { key: "name", reindex: true }
};

// Compress ids while preserving their order. Only changes ids after gaps
function repairIdGaps(data) {

  const byId = [...data]
    .filter(item => Number.isInteger(item.id))
    .sort((a, b) => a.id - b.id);

  let expectedId = 1;

  for (const item of byId) {
    item.id = expectedId;
    expectedId++;
  }
}


// Sort one dataset alphabetically and fix its ids. Runs inside the
// request, so the data is already sorted when the response is sent
function sortCollection(type) {

  if (type === "entities") {
    if (!db.hasCollection("entities")) return false;

    const data = db.readCollection("entities");
    reindexEntities(data);
    db.writeCollection("entities", data);
    return true;
  }

  const config = SORT_CONFIG[type];

  if (!config || !db.hasCollection(type)) return false;

  const data = db.readCollection(type);
  if (!Array.isArray(data)) return false;

  data.sort((a, b) =>
    (a[config.key] || "")
      .toLowerCase()
      .localeCompare((b[config.key] || "").toLowerCase())
  );

  if (config.reindex) {
    data.forEach((item, index) => {
      item.id = index + 1;
    });
  } else {
    repairIdGaps(data);
  }

  db.writeCollection(type, data);
  return true;
}


// Same name the routes already call after every change
function runSort(type) {

  try {
    sortCollection(type);
  } catch (err) {
    console.error(`Sort failed for ${type}:`, err);
  }
}


// Normalize a theme value so "Horror" / "horror" / "HORROR" all end
// up stored identically: trims, collapses extra spaces, and applies
// the same Title Case as formatTitle. Empty/missing theme becomes
// null so it's easy to check with `if (item.theme)`.
function normalizeTheme(theme) {

  if (!theme || typeof theme !== "string") return null;

  const trimmed = theme.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;

  return formatTitle(trimmed);
}


// Normalize a star rating: rounds to the nearest half-star and clamps
// to the 0–5 range. Anything invalid (missing, NaN, negative, text)
// becomes 0 — "unrated", shown as 5 empty stars, never null/undefined
// so every item can always be sorted/displayed the same way.
function normalizeRating(value) {

  const num = Number(value);

  if (!Number.isFinite(num)) return 0;

  const rounded = Math.round(num * 2) / 2;

  return Math.min(5, Math.max(0, rounded));
}


// Delete a locally-downloaded thumbnail file, but only if no other
// item in the same dataset still points at that same path. Downloaded
// thumbnails always live under /public/images/... and are referenced
// in JSON as "/images/<folder>/<file>", so anything that doesn't
// start with "/images/" (empty, or an external URL that was never
// downloaded) is skipped — there's nothing local to remove.
function deleteImageIfUnused(thumbnailPath, remainingItems) {

  // Nothing to delete
  if (!thumbnailPath || typeof thumbnailPath !== "string") return;

  // Not a locally downloaded image — skip
  if (!thumbnailPath.startsWith("/images/")) return;

  // Another item still uses this exact image — keep the file
  const stillUsed = remainingItems.some(item => item.thumbnail === thumbnailPath);
  if (stillUsed) return;

  // Resolve "/images/actors/name.jpg" to the real file on disk
  const filePath = path.join(__dirname, "..", "public", thumbnailPath);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}


// Renumbers networks/studios/series sequentially in-place, based on
// the order they already sit in. Networks are numbered 1..N;
// studios and series each have their own id space that's global
// across all networks/studios (not restarted per-network). Shared
// by Routes/entities.js (after a delete) and Extras/sortAll.js (the
// standalone --entities pass), so both stay in sync automatically.
function reindexEntities(data) {

  data.networks = data.networks || [];

  let studioId = 1;
  let seriesId = 1;

  data.networks.forEach((network, networkIndex) => {
    network.id = networkIndex + 1;
    network.studios = network.studios || [];

    network.studios.forEach(studio => {
      studio.id = studioId++;
      studio.series = studio.series || [];

      studio.series.forEach(series => {
        series.id = seriesId++;
      });
    });
  });

  return data;
}


// Export all helper utilities so routes can use them
module.exports = {
  getNextId,
  formatTitle,
  formatPersonName,
  isIncomplete,
  readJson,
  writeJson,
  existsByField,
  runSort,
  sortCollection,
  SORT_CONFIG,
  deleteImageIfUnused,
  normalizeTheme,
  normalizeRating,
  reindexEntities
};