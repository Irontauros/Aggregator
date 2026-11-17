const express = require("express");
const path = require("path");
const { downloadImage } = require("../Extras/downloadImages");
const {
  getNextId,
  formatTitle,
  normalizeTheme,
  normalizeRating,
  isIncomplete,
  readJson,
  writeJson,
  existsByField,
  runSort,
  deleteImageIfUnused
} = require("../Extras/helpers");
const router = express.Router();
const featuresFile = path.join(__dirname, "..", "data", "features.json");
router.get("/", (_, res) => {
  const features = readJson(featuresFile);
  res.json(features.filter(f => !isIncomplete(f)));
});
router.get("/incomplete", (_, res) => {
  const features = readJson(featuresFile);
  res.json(features.filter(f => isIncomplete(f)));
});
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const features = readJson(featuresFile);
  const feature = features.find(f => f.id === id);
  if (!feature) return res.status(404).send("Feature not found");
  res.json(feature);
});
router.post("/", async (req, res) => {
  try {
    let { name, thumbnail, url, pornstarNames = [], categories = [], theme, rating } = req.body;
    if (!url) return res.status(400).send("URL is required");
    name = formatTitle(name?.trim() || "");
    url = url.trim();
    theme = normalizeTheme(theme);
    rating = normalizeRating(rating);
    const features = readJson(featuresFile);
    if (existsByField(features, "url", url)) {
      return res.status(409).send("Feature URL exists");
    }
    let publicPath = thumbnail;
    if (thumbnail) {
      try {
        const imagesDir = path.join(__dirname, "..", "public", "images", "features");
        publicPath = await downloadImage(thumbnail, imagesDir, name);
      } catch (err) {
        console.error("Feature thumbnail download failed:", err);
      }
    }
    const newFeature = {
      id: getNextId(features),
      name,
      thumbnail: publicPath,
      url,
      pornstarNames,
      categories,
      theme,
      rating
    };
    features.push(newFeature);
    writeJson(featuresFile, features);
    runSort("features");
    res.status(201).send("Feature added");
  } catch (err) {
    console.error(err);
    res.status(500).send("Feature error");
  }
});
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let { name, thumbnail, url, pornstarNames = [], categories = [], theme, rating } = req.body;
    if (!url) return res.status(400).send("URL is required");
    const features = readJson(featuresFile);
    const index = features.findIndex(f => f.id === id);
    if (index === -1) return res.status(404).send("Feature not found");
    name = name ? formatTitle(name.trim()) : "";
    url = url.trim();
    theme = normalizeTheme(theme);
    rating = normalizeRating(rating);
    if (existsByField(features, "url", url, id)) {
      return res.status(409).send("Feature URL exists");
    }
    let publicPath = features[index].thumbnail;
    const oldThumbnail = features[index].thumbnail;
    if (thumbnail && thumbnail.startsWith("http")) {
      try {
        const imagesDir = path.join(__dirname, "..", "public", "images", "features");
        publicPath = await downloadImage(thumbnail, imagesDir, name);
      } catch (err) {
        console.error("Thumbnail download failed for feature", id, "-", err.message);
      }
    }
    features[index] = {
      ...features[index],
      name,
      thumbnail: publicPath,
      url,
      pornstarNames,
      categories,
      theme,
      rating
    };
    writeJson(featuresFile, features);
    runSort("features");
    if (publicPath !== oldThumbnail) {
      try {
        deleteImageIfUnused(oldThumbnail, features);
      } catch (err) {
        console.error("deleteImageIfUnused failed for", oldThumbnail, "-", err.message);
      }
    }
    res.status(200).json(features[index]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Update error");
  }
});
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const features = readJson(featuresFile);
  const toDelete = features.find(f => f.id === id);
  const remaining = features.filter(f => f.id !== id);
  if (features.length === remaining.length) {
    return res.status(404).send("Feature not found");
  }
  writeJson(featuresFile, remaining);
  runSort("features");
  if (toDelete) {
    try {
      deleteImageIfUnused(toDelete.thumbnail, remaining);
    } catch (err) {
      console.error("deleteImageIfUnused failed for", toDelete.thumbnail, "-", err.message);
    }
  }
  res.status(200).send("Feature deleted");
});
module.exports = router;