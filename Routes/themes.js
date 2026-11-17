// /Routes/themes.js
//
// Themes are a small, fixed list defined by hand in Data/themes.json
// (currently: Horror, Comedy, Drama, Romance). Edit that file directly
// to add/remove/rename a theme — there's no management UI for this,
// on purpose, since the list is short and rarely changes.

const express = require("express");
const path = require("path");
const { readJson } = require("../Extras/helpers");

const router = express.Router();
const themesFile = path.join(__dirname, "..", "data", "themes.json");

router.get("/", (_, res) => {
  const themes = readJson(themesFile);
  res.json(Array.isArray(themes) ? themes : []);
});

module.exports = router;