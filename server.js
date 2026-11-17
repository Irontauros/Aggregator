// Import Express framework
const express = require("express");

// Import path for file paths
const path = require("path");

// Enable cross-origin requests
const cors = require("cors");

const { startAutoBackup } = require("./Extras/db");

const app = express();
const PORT = 3000;

// ================== MIDDLEWARE ==================
app.use(express.json({ limit: "10mb" }));
app.use(cors());

// Block access to server-only folders/files before the static
// server below has a chance to serve them. Without this,
// express.static(__dirname) would expose /data/*.json (your actual
// data), /Extras, /Routes (server source code), server.js itself,
// package.json, and node_modules directly over HTTP to anyone with
// the URL — including through the public tunnel.
const BLOCKED_PATHS = [
  "/data",
  "/extras",
  "/routes",
  "/server.js",
  "/package.json",
  "/package-lock.json",
  "/node_modules",
  "/.git",
  "/.env"
];

app.use((req, res, next) => {
  const lowerPath = req.path.toLowerCase();

  const isBlocked = BLOCKED_PATHS.some(
    blocked => lowerPath === blocked || lowerPath.startsWith(blocked + "/")
  );

  if (isBlocked) {
    return res.status(404).send("Not found");
  }

  next();
});

app.use(express.static(path.join(__dirname)));
app.use("/images", express.static(path.join(__dirname, "public", "images")));

// ================== ROOT ==================
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "Main", "main.html"));
});

// ================== ROUTES ==================
const videosRouter = require("./Routes/videos");
const actorsRouter = require("./Routes/actors");
const featuresRouter = require("./Routes/features");
const websitesRouter = require("./Routes/websites");
const shortsRouter = require("./Routes/shorts");
const hentaiRouter = require("./Routes/hentai");
const celebritiesRouter = require("./Routes/celebrities");
const entitiesRouter = require("./Routes/entities");
const categoriesRouter = require("./Routes/categories");
const themesRouter = require("./Routes/themes");

app.use("/videos", videosRouter);
app.use("/actors", actorsRouter);
app.use("/features", featuresRouter);
app.use("/websites", websitesRouter);
app.use("/shorts", shortsRouter);
app.use("/hentai", hentaiRouter);
app.use("/celebrities", celebritiesRouter);
app.use("/entities", entitiesRouter);
app.use("/categories", categoriesRouter);
app.use("/themes", themesRouter);

// ================== START SERVER ==================
app.listen(PORT, "0.0.0.0", async () => {
  startAutoBackup();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});