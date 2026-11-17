// /Routes/entities.js

const express = require("express");
const path = require("path");
const { readJson, writeJson, getNextId, formatTitle, reindexEntities } = require("../Extras/helpers");

const router = express.Router();
const entitiesFile = path.join(__dirname, "..", "data", "entities.json");

// =========================================================
// GET ROUTES
// =========================================================

router.get("/", (_, res) => {
  const data = readJson(entitiesFile);
  res.json(data);
});

router.get("/networks", (_, res) => {
  const data = readJson(entitiesFile);
  res.json(data.networks || []);
});

router.get("/studios", (_, res) => {
  const data = readJson(entitiesFile);
  const studios = (data.networks || []).flatMap(n => n.studios || []);
  res.json(studios);
});

router.get("/series", (_, res) => {
  const data = readJson(entitiesFile);
  const series = (data.networks || [])
    .flatMap(n => n.studios || [])
    .flatMap(s => s.series || []);
  res.json(series);
});

// =========================================================
// ADD NETWORK
// =========================================================

router.post("/networks", (req, res) => {
  try {
    let { name } = req.body;

    if (!name) return res.status(400).send("Network name is required");

    name = formatTitle(name.trim());

    const data = readJson(entitiesFile);
    data.networks = data.networks || [];

    // Prevent duplicate names
    const exists = data.networks.some(n => n.name.toLowerCase() === name.toLowerCase());
    if (exists) return res.status(409).send("Network already exists");

    // Get next network ID
    const allNetworkIds = data.networks.map(n => n.id || 0);
    const newId = allNetworkIds.length ? Math.max(...allNetworkIds) + 1 : 1;

    const newNetwork = { id: newId, name, studios: [] };

    data.networks.push(newNetwork);
    data.networks.sort((a, b) => a.name.localeCompare(b.name));

    writeJson(entitiesFile, data);

    res.status(201).json(newNetwork);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding network");
  }
});

// =========================================================
// ADD STUDIO TO NETWORK
// =========================================================

router.post("/networks/:networkId/studios", (req, res) => {
  try {
    const networkId = parseInt(req.params.networkId);
    let { name } = req.body;

    if (!name) return res.status(400).send("Studio name is required");

    name = formatTitle(name.trim());

    const data = readJson(entitiesFile);
    const network = (data.networks || []).find(n => n.id === networkId);

    if (!network) return res.status(404).send("Network not found");

    network.studios = network.studios || [];

    // Prevent duplicate names within this network
    const exists = network.studios.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) return res.status(409).send("Studio already exists in this network");

    // Get next studio ID across ALL studios globally
    const allStudios = (data.networks || []).flatMap(n => n.studios || []);
    const newId = allStudios.length ? Math.max(...allStudios.map(s => s.id || 0)) + 1 : 1;

    const newStudio = { id: newId, name, series: [] };

    network.studios.push(newStudio);
    network.studios.sort((a, b) => a.name.localeCompare(b.name));

    writeJson(entitiesFile, data);

    res.status(201).json(newStudio);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding studio");
  }
});

// =========================================================
// ADD SERIES TO STUDIO
// =========================================================

router.post("/networks/:networkId/studios/:studioId/series", (req, res) => {
  try {
    const networkId = parseInt(req.params.networkId);
    const studioId  = parseInt(req.params.studioId);
    let { name } = req.body;

    if (!name) return res.status(400).send("Series name is required");

    name = formatTitle(name.trim());

    const data = readJson(entitiesFile);
    const network = (data.networks || []).find(n => n.id === networkId);
    if (!network) return res.status(404).send("Network not found");

    const studio = (network.studios || []).find(s => s.id === studioId);
    if (!studio) return res.status(404).send("Studio not found");

    studio.series = studio.series || [];

    // Prevent duplicate names within this studio
    const exists = studio.series.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) return res.status(409).send("Series already exists in this studio");

    // Get next series ID across ALL series globally
    const allSeries = (data.networks || [])
      .flatMap(n => n.studios || [])
      .flatMap(s => s.series || []);
    const newId = allSeries.length ? Math.max(...allSeries.map(s => s.id || 0)) + 1 : 1;

    const newSeries = { id: newId, name };

    studio.series.push(newSeries);
    studio.series.sort((a, b) => a.name.localeCompare(b.name));

    writeJson(entitiesFile, data);

    res.status(201).json(newSeries);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding series");
  }
});

// =========================================================
// UPDATE NETWORK
// =========================================================

router.put("/networks/:networkId", (req, res) => {
  try {
    const networkId = parseInt(req.params.networkId);
    let { name } = req.body;

    if (!name) return res.status(400).send("Network name is required");

    name = formatTitle(name.trim());

    const data = readJson(entitiesFile);
    const network = (data.networks || []).find(n => n.id === networkId);
    if (!network) return res.status(404).send("Network not found");

    // Prevent duplicate names
    const exists = data.networks.some(n =>
      n.name.toLowerCase() === name.toLowerCase() && n.id !== networkId
    );
    if (exists) return res.status(409).send("Network name already exists");

    network.name = name;

    data.networks.sort((a, b) => a.name.localeCompare(b.name));

    writeJson(entitiesFile, data);

    res.status(200).json(network);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating network");
  }
});

// =========================================================
// UPDATE STUDIO
// =========================================================

router.put("/studios/:studioId", (req, res) => {
  try {
    const studioId = parseInt(req.params.studioId);
    let { name } = req.body;

    if (!name) return res.status(400).send("Studio name is required");

    name = formatTitle(name.trim());

    const data = readJson(entitiesFile);

    let foundStudio = null;
    let foundNetwork = null;

    for (const network of data.networks || []) {
      const studio = (network.studios || []).find(s => s.id === studioId);
      if (studio) {
        foundStudio  = studio;
        foundNetwork = network;
        break;
      }
    }

    if (!foundStudio) return res.status(404).send("Studio not found");

    // Prevent duplicate names within same network
    const exists = foundNetwork.studios.some(s =>
      s.name.toLowerCase() === name.toLowerCase() && s.id !== studioId
    );
    if (exists) return res.status(409).send("Studio name already exists in this network");

    foundStudio.name = name;

    foundNetwork.studios.sort((a, b) => a.name.localeCompare(b.name));

    writeJson(entitiesFile, data);

    res.status(200).json(foundStudio);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating studio");
  }
});

// =========================================================
// UPDATE SERIES
// =========================================================

router.put("/series/:seriesId", (req, res) => {
  try {
    const seriesId = parseInt(req.params.seriesId);
    let { name } = req.body;

    if (!name) return res.status(400).send("Series name is required");

    name = formatTitle(name.trim());

    const data = readJson(entitiesFile);

    let foundSeries = null;
    let foundStudio = null;

    for (const network of data.networks || []) {
      for (const studio of network.studios || []) {
        const series = (studio.series || []).find(s => s.id === seriesId);
        if (series) {
          foundSeries = series;
          foundStudio = studio;
          break;
        }
      }
      if (foundSeries) break;
    }

    if (!foundSeries) return res.status(404).send("Series not found");

    // Prevent duplicate names within same studio
    const exists = foundStudio.series.some(s =>
      s.name.toLowerCase() === name.toLowerCase() && s.id !== seriesId
    );
    if (exists) return res.status(409).send("Series name already exists in this studio");

    foundSeries.name = name;

    foundStudio.series.sort((a, b) => a.name.localeCompare(b.name));

    writeJson(entitiesFile, data);

    res.status(200).json(foundSeries);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating series");
  }
});

// =========================================================
// DELETE NETWORK
// =========================================================

router.delete("/networks/:networkId", (req, res) => {
  try {
    const networkId = parseInt(req.params.networkId);

    const data = readJson(entitiesFile);
    const index = (data.networks || []).findIndex(n => n.id === networkId);

    if (index === -1) return res.status(404).send("Network not found");

    const [deleted] = data.networks.splice(index, 1);

    reindexEntities(data);
    writeJson(entitiesFile, data);

    res.status(200).send("Network deleted");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting network");
  }
});

// =========================================================
// DELETE STUDIO
// =========================================================

router.delete("/studios/:studioId", (req, res) => {
  try {
    const studioId = parseInt(req.params.studioId);

    const data = readJson(entitiesFile);

    let deletedStudio = null;

    for (const network of data.networks || []) {
      const index = (network.studios || []).findIndex(s => s.id === studioId);
      if (index !== -1) {
        [deletedStudio] = network.studios.splice(index, 1);
        break;
      }
    }

    if (!deletedStudio) return res.status(404).send("Studio not found");

    reindexEntities(data);
    writeJson(entitiesFile, data);

    res.status(200).send("Studio deleted");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting studio");
  }
});

// =========================================================
// DELETE SERIES
// =========================================================

router.delete("/series/:seriesId", (req, res) => {
  try {
    const seriesId = parseInt(req.params.seriesId);

    const data = readJson(entitiesFile);

    let deletedSeries = null;

    for (const network of data.networks || []) {
      for (const studio of network.studios || []) {
        const index = (studio.series || []).findIndex(s => s.id === seriesId);
        if (index !== -1) {
          [deletedSeries] = studio.series.splice(index, 1);
          break;
        }
      }
      if (deletedSeries) break;
    }

    if (!deletedSeries) return res.status(404).send("Series not found");

    reindexEntities(data);
    writeJson(entitiesFile, data);

    res.status(200).send("Series deleted");

  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting series");
  }
});

module.exports = router;