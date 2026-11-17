const fs = require("fs");
const path = require("path");

const db = require("./db");

const outDir = path.join(db.DATA_DIR, "export-" + new Date().toISOString().slice(0, 10));
fs.mkdirSync(outDir, { recursive: true });

const database = db.open();

const names = database.prepare("SELECT name FROM collections ORDER BY name").all().map(r => r.name);

names.forEach(name => {
  const data = db.readCollection(name, database);
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(data, null, 2));
  const count = Array.isArray(data) ? data.length : 1;
  console.log(`${name.padEnd(14)} ${count} items`);
});

console.log(`\nExported to ${outDir}`);