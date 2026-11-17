const { sortCollection, SORT_CONFIG } = require("./helpers");

const ALL = [...Object.keys(SORT_CONFIG), "entities"];

const args = process.argv.slice(2).map(a => a.toLowerCase().replace(/^--/, ""));
const targets = args.length ? args.filter(a => ALL.includes(a)) : ALL;

console.log("🔍 sortAll running...");

targets.forEach(type => {
  try {
    const done = sortCollection(type);
    console.log(done ? `✅ Sorted ${type}` : `⏭️ Skipped ${type} (nothing stored yet)`);
  } catch (err) {
    console.error(`❌ Failed on ${type}`, err);
  }
});

console.log("✅ Done");