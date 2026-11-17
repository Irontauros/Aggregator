// Import Express router
const express = require("express");

// Import path
const path = require("path");

// Import helper
const { readJson, writeJson, normalizeTheme } = require("../Extras/helpers");

// Create router
const router = express.Router();

// Categories JSON file
const categoriesFile = path.join(__dirname, "..", "data", "categories.json");


// Return all categories
router.get("/", (_, res) => {

  // Load categories
  const categories = readJson(categoriesFile);

  // Send categories
  res.json(categories);

});


// Set a category's theme(s). Categories are the ONLY type that can
// have more than one theme at once — everything else (videos, actors,
// shorts, etc.) stays single-theme. Categories still have no add/edit
// UI beyond this — this route only ever touches the `theme` field.
router.put("/:id/theme", (req, res) => {
  const id = parseInt(req.params.id);
  const { theme, themes } = req.body;

  const categories = readJson(categoriesFile);
  const category = categories.find(c => c.id === id);

  if (!category) return res.status(404).send("Category not found");

  // Accept either `themes: [...]` (preferred) or a single `theme`
  // string for convenience — both end up stored as an array.
  const rawList = Array.isArray(themes) ? themes : (theme != null ? [theme] : []);

  const normalized = [...new Set(
    rawList.map(t => normalizeTheme(t)).filter(Boolean)
  )];

  category.theme = normalized;

  writeJson(categoriesFile, categories);

  res.status(200).json(category);
});


// Export router
module.exports = router;