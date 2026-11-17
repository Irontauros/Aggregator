// Extras/db.js
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DATA_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DATA_DIR, "aggregator.sqlite");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

const KNOWN_COLLECTIONS = [
  "videos", "actors", "features", "websites", "shorts",
  "hentai", "celebrities", "categories", "entities"
];

const KEEP_DAILY = 5;
const KEEP_SAFETY = 5;
const SHRINK_MIN_ITEMS = 10;

let db = null;

function open() {
  if (db) return db;

  fs.mkdirSync(DATA_DIR, { recursive: true });

  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      name TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      collection TEXT NOT NULL,
      pos INTEGER NOT NULL,
      id INTEGER,
      name TEXT,
      data TEXT NOT NULL,
      PRIMARY KEY (collection, pos)
    );

    CREATE INDEX IF NOT EXISTS items_by_id ON items (collection, id);
  `);

  return db;
}

function getDb() {
  const database = open();

  const count = database.prepare("SELECT COUNT(*) AS c FROM collections").get().c;

  if (count === 0) {
    const leftover = KNOWN_COLLECTIONS.filter(name => {
      const file = path.join(DATA_DIR, `${name}.json`);
      if (!fs.existsSync(file)) return false;
      return fs.readFileSync(file, "utf8").trim().length > 2;
    });

    if (leftover.length) {
      throw new Error(
        `The database is empty but these JSON files exist: ${leftover.join(", ")}. ` +
        `Run "node Extras/migrateToSqlite.js" first.`
      );
    }
  }

  return database;
}

function collectionName(filePath) {
  return path.basename(filePath, ".json");
}

function hasCollection(name) {
  return !!getDb().prepare("SELECT 1 FROM collections WHERE name = ?").get(name);
}

function readCollection(name, database = getDb()) {
  const meta = database.prepare("SELECT kind FROM collections WHERE name = ?").get(name);
  if (!meta) return null;

  const rows = database
    .prepare("SELECT data FROM items WHERE collection = ? ORDER BY pos")
    .all(name);

  if (meta.kind === "object") {
    return rows.length ? JSON.parse(rows[0].data) : {};
  }

  return rows.map(row => JSON.parse(row.data));
}

function countItems(name, database) {
  const meta = database.prepare("SELECT kind FROM collections WHERE name = ?").get(name);
  if (!meta || meta.kind !== "array") return 0;
  return database.prepare("SELECT COUNT(*) AS c FROM items WHERE collection = ?").get(name).c;
}

function writeCollection(name, data, options = {}) {
  const database = options.database || getDb();
  const isArray = Array.isArray(data);

  if (!options.skipShrinkGuard && isArray) {
    const before = countItems(name, database);
    if (before >= SHRINK_MIN_ITEMS && data.length < before / 2) {
      try {
        snapshot(`safety-${name}`, KEEP_SAFETY, database);
        console.warn(`⚠️ ${name} went from ${before} to ${data.length} items — safety backup saved.`);
      } catch (err) {
        console.error("Safety backup failed:", err.message);
      }
    }
  }

  const insert = database.prepare(
    "INSERT INTO items (collection, pos, id, name, data) VALUES (?, ?, ?, ?, ?)"
  );

  const run = database.transaction(() => {
    database.prepare("DELETE FROM items WHERE collection = ?").run(name);

    if (isArray) {
      data.forEach((item, pos) => {
        const id = item && Number.isInteger(item.id) ? item.id : null;
        const itemName = item && typeof item.name === "string" ? item.name : null;
        insert.run(name, pos, id, itemName, JSON.stringify(item));
      });
    } else {
      insert.run(name, 0, null, null, JSON.stringify(data));
    }

    database
      .prepare(`
        INSERT INTO collections (name, kind, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET kind = excluded.kind, updated_at = excluded.updated_at
      `)
      .run(name, isArray ? "array" : "object", new Date().toISOString());
  });

  run();
}

function stamp(date = new Date()) {
  const p = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function stampWithTime(date = new Date()) {
  const p = n => String(n).padStart(2, "0");
  return `${stamp(date)}_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`;
}

function prune(prefix, keep) {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith(".sqlite"))
    .sort()
    .reverse();

  files.slice(keep).forEach(f => {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    } catch (err) {
      console.error("Could not remove old backup", f, err.message);
    }
  });
}

function snapshot(label, keep, database = getDb()) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const target = path.join(BACKUP_DIR, `${label}_${stampWithTime()}.sqlite`);
  database.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);

  prune(`${label}_`, keep);

  return target;
}

function backupIfNeeded() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const today = stamp();
  const already = fs.readdirSync(BACKUP_DIR).some(f => f.startsWith(`daily_${today}`));

  if (already) return null;

  const file = snapshot("daily", KEEP_DAILY);
  console.log(`💾 Database backup saved: ${file}`);
  return file;
}

function startAutoBackup() {
  getDb();

  try {
    backupIfNeeded();
  } catch (err) {
    console.error("Backup failed:", err.message);
  }

  const timer = setInterval(() => {
    try {
      backupIfNeeded();
    } catch (err) {
      console.error("Backup failed:", err.message);
    }
  }, 6 * 60 * 60 * 1000);

  timer.unref();
}

module.exports = {
  DATA_DIR,
  DB_PATH,
  BACKUP_DIR,
  KNOWN_COLLECTIONS,
  open,
  getDb,
  collectionName,
  hasCollection,
  readCollection,
  writeCollection,
  snapshot,
  backupIfNeeded,
  startAutoBackup
};