const express = require("express");
const path = require("path");

const { downloadImage } = require("../Extras/downloadImages");

const {
  getNextId,
  formatPersonName,
  deleteImageIfUnused,
  readJson,
  writeJson,
  existsByField,
  runSort
} = require("../Extras/helpers");

const router = express.Router();
const actorsFile = path.join(__dirname, "..", "data", "actors.json");

router.get("/", (_, res) => {
  const actors = readJson(actorsFile);
  const completeActors = actors.filter(a => a.thumbnail && a.thumbnail.trim() !== "");
  res.json(completeActors);
});

router.get("/incomplete", (_, res) => {
  const actors = readJson(actorsFile);
  const incompleteActors = actors.filter(a => !a.thumbnail || a.thumbnail.trim() === "");
  res.json(incompleteActors);
});

router.post("/", async (req, res) => {
  try {
    let { name, thumbnail } = req.body;

    if (!name) return res.status(400).send("Missing actor fields");

    name = formatPersonName(name.trim());

    const actors = readJson(actorsFile);

    if (existsByField(actors, "name", name)) {
      return res.status(409).send("Actor already exists");
    }

    let publicPath = "";

    if (thumbnail) {
      const imagesDir = path.join(__dirname, "..", "public", "images", "actors");
      publicPath = await downloadImage(thumbnail, imagesDir, name || "actor");
    }

    const newActor = {
      id: getNextId(actors),
      name,
      thumbnail: publicPath
    };

    actors.push(newActor);
    writeJson(actorsFile, actors);
    runSort("actors");

    res.status(201).send("Actor added");
  } catch (err) {
    console.error(err);
    res.status(500).send("Actor error");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const actorId = parseInt(req.params.id);
    let { name, thumbnail } = req.body;

    const actors = readJson(actorsFile);
    const index = actors.findIndex(a => a.id === actorId);

    if (index === -1) return res.status(404).send("Actor not found");

    if (name) {
      name = formatPersonName(name.trim());

      if (existsByField(actors, "name", name, actorId)) {
        return res.status(409).send("Actor with this name already exists");
      }

      actors[index].name = name;
    }

    if (thumbnail && thumbnail.startsWith("http")) {
      const oldThumbnail = actors[index].thumbnail;

      try {
        const imagesDir = path.join(__dirname, "..", "public", "images", "actors");
        actors[index].thumbnail = await downloadImage(thumbnail, imagesDir, name || "actor");

        if (actors[index].thumbnail !== oldThumbnail) {
          try {
            deleteImageIfUnused(oldThumbnail, actors);
          } catch (err) {
            console.error("deleteImageIfUnused failed for", oldThumbnail, "-", err.message);
          }
        }
      } catch (err) {
        console.error("Thumbnail download failed for actor", actorId, "-", err.message);
      }
    }

    writeJson(actorsFile, actors);
    runSort("actors");

    res.status(200).json(actors[index]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Update error");
  }
});

router.delete("/:id", (req, res) => {
  try {
    const actorId = parseInt(req.params.id);

    const actors = readJson(actorsFile);
    const toDelete = actors.find(a => a.id === actorId);
    const remaining = actors.filter(a => a.id !== actorId);

    if (actors.length === remaining.length) {
      return res.status(404).send("Actor not found");
    }

    writeJson(actorsFile, remaining);
    runSort("actors");

    if (toDelete) {
      try {
        deleteImageIfUnused(toDelete.thumbnail, remaining);
      } catch (err) {
        console.error("deleteImageIfUnused failed for", toDelete.thumbnail, "-", err.message);
      }
    }

    res.status(200).send("Actor deleted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Delete error");
  }
});

module.exports = router;