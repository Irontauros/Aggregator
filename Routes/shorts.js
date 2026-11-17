const express = require("express");
const path = require("path");

const { downloadImage } = require("../Extras/downloadImages");

const {
  getNextId,
  formatTitle,
  normalizeTheme,
  readJson,
  writeJson,
  existsByField,
  runSort,
  deleteImageIfUnused
} = require("../Extras/helpers");

const router = express.Router();
const shortsFile = path.join(__dirname, "..", "data", "shorts.json");

router.get("/", (_, res) => {
  const shorts = readJson(shortsFile);
  const complete = shorts.filter(s => s.thumbnail && s.thumbnail.trim() !== "");
  res.json(complete);
});

router.get("/incomplete", (_, res) => {
  const shorts = readJson(shortsFile);
  const incomplete = shorts.filter(s => !s.thumbnail || s.thumbnail.trim() === "");
  res.json(incomplete);
});

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const shorts = readJson(shortsFile);
  const short = shorts.find(s => s.id === id);

  if (!short) return res.status(404).send("Short not found");

  res.json(short);
});

router.post("/", async (req, res) => {
  try {
    let { name, thumbnail, url, theme } = req.body;

    if (!url) return res.status(400).send("URL is required");

    name = formatTitle(name?.trim() || "");
    url = url.trim();
    theme = normalizeTheme(theme);

    const shorts = readJson(shortsFile);

    if (existsByField(shorts, "name", name)) {
      return res.status(409).send("A short with this name already exists");
    }

    if (existsByField(shorts, "url", url)) {
      return res.status(409).send("This short URL already exists");
    }

    let publicPath = "";

    if (thumbnail) {
      const imagesDir = path.join(__dirname, "..", "public", "images", "shorts");
      publicPath = await downloadImage(thumbnail, imagesDir, name || "short");
    }

    const newShort = {
      id: getNextId(shorts),
      name,
      thumbnail: publicPath,
      url,
      theme
    };

    shorts.push(newShort);
    writeJson(shortsFile, shorts);
    runSort("shorts");

    res.status(201).send("Short added");
  } catch (err) {
    console.error(err);
    res.status(500).send("Short error");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let { name, thumbnail, url, theme } = req.body;

    if (!url) return res.status(400).send("URL is required");

    const shorts = readJson(shortsFile);
    const index = shorts.findIndex(s => s.id === id);

    if (index === -1) return res.status(404).send("Short not found");

    name = name ? formatTitle(name.trim()) : "";
    url = url.trim();
    theme = normalizeTheme(theme);

    if (name && existsByField(shorts, "name", name, id)) {
      return res.status(409).send("A short with this name already exists");
    }

    if (existsByField(shorts, "url", url, id)) {
      return res.status(409).send("This short URL already exists");
    }

    let publicPath = shorts[index].thumbnail;
    const oldThumbnail = shorts[index].thumbnail;

    if (thumbnail && thumbnail.startsWith("http")) {
      try {
        const imagesDir = path.join(__dirname, "..", "public", "images", "shorts");
        publicPath = await downloadImage(thumbnail, imagesDir, name || "short");
      } catch (err) {
        console.error("Thumbnail download failed for short", id, "-", err.message);
      }
    }

    shorts[index] = { ...shorts[index], name, thumbnail: publicPath, url, theme };

    writeJson(shortsFile, shorts);
    runSort("shorts");

    if (publicPath !== oldThumbnail) {
      try {
        deleteImageIfUnused(oldThumbnail, shorts);
      } catch (err) {
        console.error("deleteImageIfUnused failed for", oldThumbnail, "-", err.message);
      }
    }

    res.status(200).json(shorts[index]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Update error");
  }
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const shorts = readJson(shortsFile);
  const toDelete = shorts.find(s => s.id === id);
  const remaining = shorts.filter(s => s.id !== id);

  if (shorts.length === remaining.length) {
    return res.status(404).send("Short not found");
  }

  writeJson(shortsFile, remaining);
  runSort("shorts");

  if (toDelete) {
    try {
      deleteImageIfUnused(toDelete.thumbnail, remaining);
    } catch (err) {
      console.error("deleteImageIfUnused failed for", toDelete.thumbnail, "-", err.message);
    }
  }

  res.status(200).send("Short deleted");
});

module.exports = router;