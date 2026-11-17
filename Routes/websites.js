const express = require("express");
const path = require("path");
const {
  getNextId,
  formatTitle,
  normalizeTheme,
  readJson,
  writeJson,
  existsByField,
  runSort
} = require("../Extras/helpers");
const router = express.Router();
const websitesFile = path.join(__dirname, "..", "data", "websites.json");
router.get("/", (_, res) => {
  const websites = readJson(websitesFile);
  res.json(websites);
});
router.get("/incomplete", (_, res) => {
  res.json([]);
});
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const websites = readJson(websitesFile);
  const site = websites.find(w => w.id === id);
  if (!site) return res.status(404).send("Website not found");
  res.json(site);
});
router.post("/", async (req, res) => {
  try {
    let { name = "", url = "", theme } = req.body;
    if (!url) return res.status(400).send("URL is required");
    name = formatTitle(name.trim());
    url = url.trim();
    theme = normalizeTheme(theme);
    const websites = readJson(websitesFile);
    if (existsByField(websites, "url", url)) {
      return res.status(409).send("Website URL exists");
    }
    const newWebsite = {
      id: getNextId(websites),
      name,
      url,
      theme
    };
    websites.push(newWebsite);
    writeJson(websitesFile, websites);
    runSort("websites");
    res.status(201).send("Website added");
  } catch (err) {
    console.error("Website POST error:", err);
    res.status(500).send("Website error");
  }
});
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let { name, url, theme } = req.body;
    if (!name || !url) return res.status(400).send("Missing website fields");
    const websites = readJson(websitesFile);
    const index = websites.findIndex(w => w.id === id);
    if (index === -1) return res.status(404).send("Website not found");
    name = formatTitle(name.trim());
    url = url.trim();
    theme = normalizeTheme(theme);
    if (existsByField(websites, "name", name, id)) {
      return res.status(409).send("Website name exists");
    }
    if (existsByField(websites, "url", url, id)) {
      return res.status(409).send("Website URL exists");
    }
    websites[index] = { ...websites[index], name, url, theme };
    writeJson(websitesFile, websites);
    runSort("websites");
    res.status(200).json(websites[index]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Update error");
  }
});
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const websites = readJson(websitesFile);
  const index = websites.findIndex(w => w.id === id);
  if (index === -1) return res.status(404).send("Website not found");
  websites.splice(index, 1);
  writeJson(websitesFile, websites);
  runSort("websites");
  res.status(200).send("Website deleted");
});
module.exports = router;