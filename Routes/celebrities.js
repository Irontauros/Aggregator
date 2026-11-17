const express = require("express");
const path = require("path");

const { downloadImage } = require("../Extras/downloadImages");

const {
  getNextId,
  formatTitle,
  readJson,
  writeJson,
  existsByField,
  runSort,
  deleteImageIfUnused
} = require("../Extras/helpers");

const router = express.Router();
const celebritiesFile = path.join(__dirname, "..", "data", "celebrities.json");

router.get("/", (_, res) => {
  const celebrities = readJson(celebritiesFile);
  const complete = celebrities.filter(c => c.thumbnail && c.thumbnail.trim() !== "");
  res.json(complete);
});

router.get("/incomplete", (_, res) => {
  const celebrities = readJson(celebritiesFile);
  const incomplete = celebrities.filter(c => !c.thumbnail || c.thumbnail.trim() === "");
  res.json(incomplete);
});

router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const celebrities = readJson(celebritiesFile);
  const celeb = celebrities.find(c => c.id === id);

  if (!celeb) return res.status(404).send("Celebrity not found");

  res.json(celeb);
});

router.post("/", async (req, res) => {
  try {
    let { name, thumbnail, url } = req.body;

    if (!url) return res.status(400).send("URL is required");

    name = formatTitle(name.trim());
    url = url.trim();

    const celebrities = readJson(celebritiesFile);

    if (existsByField(celebrities, "name", name)) {
      return res.status(409).send("A celebrity with this name already exists");
    }

    if (existsByField(celebrities, "url", url)) {
      return res.status(409).send("This celebrity URL already exists");
    }

    let publicPath = "";

    if (thumbnail) {
      const imagesDir = path.join(__dirname, "..", "public", "images", "celebrities");
      publicPath = await downloadImage(thumbnail, imagesDir, name || "celebrity");
    }

    const newCelebrity = {
      id: getNextId(celebrities),
      name,
      thumbnail: publicPath,
      url
    };

    celebrities.push(newCelebrity);
    writeJson(celebritiesFile, celebrities);
    runSort("celebrities");

    res.status(201).send("Celebrity added");
  } catch (err) {
    console.error(err);
    res.status(500).send("Celebrity error");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let { name, thumbnail, url } = req.body;

    if (!url) return res.status(400).send("URL is required");

    const celebrities = readJson(celebritiesFile);
    const index = celebrities.findIndex(c => c.id === id);

    if (index === -1) return res.status(404).send("Celebrity not found");

    name = name ? formatTitle(name.trim()) : "";
    url = url.trim();

    if (name && existsByField(celebrities, "name", name, id)) {
      return res.status(409).send("A celebrity with this name already exists");
    }

    if (existsByField(celebrities, "url", url, id)) {
      return res.status(409).send("This celebrity URL already exists");
    }

    let publicPath = celebrities[index].thumbnail;
    const oldThumbnail = celebrities[index].thumbnail;

    if (thumbnail && thumbnail.startsWith("http")) {
      try {
        const imagesDir = path.join(__dirname, "..", "public", "images", "celebrities");
        publicPath = await downloadImage(thumbnail, imagesDir, name || "celebrity");
      } catch (err) {
        console.error("Thumbnail download failed for celebrity", id, "-", err.message);
      }
    }

    celebrities[index] = { ...celebrities[index], name, thumbnail: publicPath, url };

    writeJson(celebritiesFile, celebrities);
    runSort("celebrities");

    if (publicPath !== oldThumbnail) {
      try {
        deleteImageIfUnused(oldThumbnail, celebrities);
      } catch (err) {
        console.error("deleteImageIfUnused failed for", oldThumbnail, "-", err.message);
      }
    }

    res.status(200).json(celebrities[index]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Update error");
  }
});

router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const celebrities = readJson(celebritiesFile);
  const toDelete = celebrities.find(c => c.id === id);
  const remaining = celebrities.filter(c => c.id !== id);

  if (celebrities.length === remaining.length) {
    return res.status(404).send("Celebrity not found");
  }

  writeJson(celebritiesFile, remaining);
  runSort("celebrities");

  if (toDelete) {
    try {
      deleteImageIfUnused(toDelete.thumbnail, remaining);
    } catch (err) {
      console.error("deleteImageIfUnused failed for", toDelete.thumbnail, "-", err.message);
    }
  }

  res.status(200).send("Celebrity deleted");
});

module.exports = router;