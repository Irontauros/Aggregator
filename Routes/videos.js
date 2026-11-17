const express = require("express");
const path = require("path");

const { downloadImage } = require("../Extras/downloadImages");
const { scrapeMetadata } = require("../Extras/scrapeMetadata");

const {
  getNextId,
  formatTitle,
  formatPersonName,
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

const videosFile = path.join(__dirname, "..", "data", "videos.json");
const actorsFile = path.join(__dirname, "..", "data", "actors.json");

function syncActors(pornstarNames = []) {
  if (!pornstarNames.length) return;

  const actors = readJson(actorsFile);
  const existingNames = new Set(actors.map(a => a.name.toLowerCase()));

  let changed = false;
  let nextId = getNextId(actors);

  pornstarNames.forEach(name => {
    if (!name || !name.trim()) return;

    const formatted = formatPersonName(name.trim());

    if (existingNames.has(formatted.toLowerCase())) return;

    actors.push({ id: nextId++, name: formatted, thumbnail: "" });
    existingNames.add(formatted.toLowerCase());
    changed = true;
  });

  if (changed) {
    writeJson(actorsFile, actors);
    runSort("actors");
  }
}

router.get("/", (_, res) => {
  const videos = readJson(videosFile);
  res.json(videos.filter(v => !isIncomplete(v)));
});

router.get("/all", (_, res) => {
  const videos = readJson(videosFile);
  res.json(videos);
});

router.get("/incomplete", (_, res) => {
  const videos = readJson(videosFile);
  res.json(videos.filter(v => isIncomplete(v)));
});

router.get("/preview", async (req, res) => {
  try {
    const url = (req.query.url || "").trim();
    if (!url) return res.status(400).send("URL is required");

    const scraped = await scrapeMetadata(url);
    res.json(scraped);
  } catch (err) {
    console.error("Preview error:", err);
    res.status(500).send("Preview error");
  }
});

router.get("/:id", (req, res) => {
  const videoId = parseInt(req.params.id);
  const videos = readJson(videosFile);
  const video = videos.find(v => v.id === videoId);

  if (!video) return res.status(404).send("Video not found");

  res.json(video);
});

function normalizeSource(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value.length ? value[0] : null;
  return value;
}

router.post("/", async (req, res) => {
  try {
    let {
      name,
      thumbnail,
      url,
      pornstarNames = [],
      categories = [],
      network,
      studios,
      series,
      theme,
      rating
    } = req.body;

    if (!url) return res.status(400).send("URL is required");

    url = url.trim();

    if (!name || !thumbnail) {
      const scraped = await scrapeMetadata(url);
      if (!name && scraped.title) name = scraped.title;
      if (!thumbnail && scraped.thumbnail) thumbnail = scraped.thumbnail;
    }

    name = formatTitle(name?.trim() || "");
    theme = normalizeTheme(theme);
    rating = normalizeRating(rating);

    const videos = readJson(videosFile);

    if (name && existsByField(videos, "name", name)) {
      return res.status(409).send("A video with this title already exists");
    }

    if (existsByField(videos, "url", url)) {
      return res.status(409).send("This video URL already exists");
    }

    network = normalizeSource(network);
    studios = normalizeSource(studios);
    series = normalizeSource(series);

    let publicPath = "";

    if (thumbnail) {
      try {
        const imagesDir = path.join(__dirname, "..", "public", "images", "videos");
        publicPath = await downloadImage(thumbnail, imagesDir, name || "video", url);
      } catch (err) {
        console.error("Thumbnail download failed for", url, "-", err.message);
        publicPath = "";
      }
    }

    const newVideo = {
      id: getNextId(videos),
      name,
      thumbnail: publicPath,
      url,
      pornstarNames,
      categories,
      network,
      studios,
      series,
      theme,
      rating
    };

    videos.push(newVideo);
    writeJson(videosFile, videos);
    runSort("videos");

    syncActors(pornstarNames);

    res.status(201).send("Video added");
  } catch (err) {
    console.error("Video error:", err);
    res.status(500).send("Video error");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);

    let {
      name,
      thumbnail,
      url,
      pornstarNames = [],
      categories = [],
      network,
      studios,
      series,
      theme,
      rating
    } = req.body;

    if (!url) return res.status(400).send("URL is required");

    const videos = readJson(videosFile);
    const index = videos.findIndex(v => v.id === videoId);

    if (index === -1) return res.status(404).send("Video not found");

    name = name ? formatTitle(name.trim()) : "";
    url = url.trim();
    theme = normalizeTheme(theme);
    rating = normalizeRating(rating);

    if (name && existsByField(videos, "name", name, videoId)) {
      return res.status(409).send("A video with this title already exists");
    }

    if (existsByField(videos, "url", url, videoId)) {
      return res.status(409).send("This video URL already exists");
    }

    network = normalizeSource(network);
    studios = normalizeSource(studios);
    series = normalizeSource(series);

    let publicPath = videos[index].thumbnail;
    const oldThumbnail = videos[index].thumbnail;

    if (thumbnail && thumbnail.startsWith("http")) {
      try {
        const imagesDir = path.join(__dirname, "..", "public", "images", "videos");
        publicPath = await downloadImage(thumbnail, imagesDir, name || "video", url);
      } catch (err) {
        console.error("Thumbnail download failed for", url, "-", err.message);
      }
    }

    videos[index] = {
      ...videos[index],
      name,
      thumbnail: publicPath,
      url,
      pornstarNames,
      categories,
      network,
      studios,
      series,
      theme,
      rating
    };

    writeJson(videosFile, videos);
    runSort("videos");

    if (publicPath !== oldThumbnail) {
      try {
        deleteImageIfUnused(oldThumbnail, videos);
      } catch (err) {
        console.error("deleteImageIfUnused failed for", oldThumbnail, "-", err.message);
      }
    }

    syncActors(pornstarNames);

    res.status(200).json(videos[index]);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).send("Update error");
  }
});

router.delete("/:id", (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const videos = readJson(videosFile);
    const toDelete = videos.find(v => v.id === videoId);
    const newVideos = videos.filter(v => v.id !== videoId);

    if (videos.length === newVideos.length) {
      return res.status(404).send("Video not found");
    }

    writeJson(videosFile, newVideos);
    runSort("videos");

    if (toDelete) {
      try {
        deleteImageIfUnused(toDelete.thumbnail, newVideos);
      } catch (err) {
        console.error("deleteImageIfUnused failed for", toDelete.thumbnail, "-", err.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).send("Delete error");
  }
});

module.exports = router;