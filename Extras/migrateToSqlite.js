const fs = require("fs");
const path = require("path");
const { isDeepStrictEqual } = require("util");

const db = require("./db");

const force = process.argv.includes("--force");

const database = db.open();

const files = fs.existsSync(db.DATA_DIR)
  ? fs.readdirSync(db.DATA_DIR).filter(f => f.endsWith(".json") && f !== "themes.json")
  : [];

if (!files.length) {
  console.log("No JSON files found in data/ — nothing to migrate.");
  process.exit(0);
}

const results = [];
let problems = 0;

files.forEach(file => {
  const name = path.basename(file, ".json");
  const full = path.join(db.DATA_DIR, file);

  let parsed;

  try {
    const raw = fs.readFileSync(full, "utf8");
    parsed = JSON.parse(raw.trim() ? raw : "[]");
  } catch (err) {
    results.push({ name, status: "SKIPPED (invalid JSON: " + err.message + ")" });
    problems++;
    return;
  }

  const existing = db.readCollection(name, database);

  if (existing !== null && !force) {
    const existingCount = Array.isArray(existing) ? existing.length : Object.keys(existing).length;
    results.push({ name, status: `SKIPPED (already in database with ${existingCount} items — use --force to overwrite)` });
    return;
  }

  db.writeCollection(name, parsed, { database, skipShrinkGuard: true });

  const back = db.readCollection(name, database);
  const ok = isDeepStrictEqual(back, parsed);
  const count = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;

  if (!ok) problems++;

  results.push({ name, status: ok ? `OK (${count} items, identical)` : "MISMATCH — do not use" });
});

console.log("");
results.forEach(r => console.log(`${r.name.padEnd(14)} ${r.status}`));
console.log("");
console.log(`Database: ${db.DB_PATH}`);
console.log("Your JSON files were not changed or deleted.");

if (problems) {
  console.log(`\n${problems} problem(s) above — fix them before starting the server.`);
  process.exit(1);
}

console.log("\nAll good. You can start the server now.");