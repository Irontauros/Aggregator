const express = require("express");
const path = require("path");
const { downloadImage } = require("../Extras/downloadImages");
const {
  getNextId,
  formatTitle,
  normalizeTheme,
  normalizeRating,
  readJson,
  writeJson,
  existsByField,
  runSort,
  deleteImageIfUnused
} = require("../Extras/helpers");
const router = express.Router();
const hentaiFile = path.join(__dirname, "..", "data", "hentai.json");
router.get("/", (_, res) => {
  const hentai = readJson(hentaiFile);
  const complete = hentai.filter(h => h.thumbnail && h.thumbnail.trim() !== "");
  res.json(complete);
});
router.get("/incomplete", (_, res) => {
  const hentai = readJson(hentaiFile);
  const incomplete = hentai.filter(h => !h.thumbnail || h.thumbnail.trim() === "");
  res.json(incomplete);
});
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const hentai = readJson(hentaiFile);
  const item = hentai.find(h => h.id === id);
  if (!item) return res.status(404).send("Item not found");
  res.json(item);
});
router.post("/", async (req, res) => {
  try {
    let { name, thumbnail, url, theme, rating } = req.body;
    if (!url) return res.status(400).send("URL is required");
    name = formatTitle(name?.trim() || "");
    url = url.trim();
    theme = normalizeTheme(theme);
    rating = normalizeRating(rating);
    const hentai = readJson(hentaiFile);
    if (existsByField(hentai, "name", name)) {
      return res.status(409).send("Name already exists");
    }
    if (existsByField(hentai, "url", url)) {
      return res.status(409).send("URL already exists");
    }
    let publicPath = "";
    if (thumbnail) {
      const imagesDir = path.join(__dirname, "..", "public", "images", "hentai");
      publicPath = await downloadImage(thumbnail, imagesDir, name || "hentai");
    }
    const newItem = {
      id: getNextId(hentai),
      name,
      thumbnail: publicPath,
      url,
      theme,
      rating
    };
    hentai.push(newItem);
    writeJson(hentaiFile, hentai);
    runSort("hentai");
    res.status(201).send("Hentai added");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let { name, thumbnail, url, theme, rating } = req.body;
    if (!url) return res.status(400).send("URL is required");
    const hentai = readJson(hentaiFile);
    const index = hentai.findIndex(h => h.id === id);
    if (index === -1) return res.status(404).send("Item not found");
    name = name ? formatTitle(name.trim()) : "";
    url = url.trim();
    theme = normalizeTheme(theme);
    rating = normalizeRating(rating);
    if (name && existsByField(hentai, "name", name, id)) {
      return res.status(409).send("Name already exists");
    }
    if (existsByField(hentai, "url", url, id)) {
      return res.status(409).send("URL already exists");
    }
    let publicPath = hentai[index].thumbnail;
    const oldThumbnail = hentai[index].thumbnail;
    if (thumbnail && thumbnail.startsWith("http")) {
      try {
        const imagesDir = path.join(__dirname, "..", "public", "images", "hentai");
        publicPath = await downloadImage(thumbnail, imagesDir, name || "hentai");
      } catch (err) {
        console.error("Thumbnail download failed for hentai", id, "-", err.message);
      }
    }
    hentai[index] = { ...hentai[index], name, thumbnail: publicPath, url, theme, rating };
    writeJson(hentaiFile, hentai);
    runSort("hentai");
    if (publicPath !== oldThumbnail) {
      try {
        deleteImageIfUnused(oldThumbnail, hentai);
      } catch (err) {
        console.error("deleteImageIfUnused failed for", oldThumbnail, "-", err.message);
      }
    }
    res.status(200).json(hentai[index]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Update error");
  }
});
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const hentai = readJson(hentaiFile);
  const toDelete = hentai.find(h => h.id === id);
  const remaining = hentai.filter(h => h.id !== id);
  if (hentai.length === remaining.length) {
    return res.status(404).send("Hentai not found");
  }
  writeJson(hentaiFile, remaining);
  runSort("hentai");
  if (toDelete) {
    try {
      deleteImageIfUnused(toDelete.thumbnail, remaining);
    } catch (err) {
      console.error("deleteImageIfUnused failed for", toDelete.thumbnail, "-", err.message);
    }
  }
  res.status(200).send("Hentai deleted");
});
module.exports = router;