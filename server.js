const ngrok = require('ngrok'); // Import ngrok package
const express = require("express");
const path = require("path");
const fs = require("fs");
const validator = require("validator");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { spawn } = require("child_process"); // Import spawn for executing the sorting script
const app = express();
const PORT = 3000;
const { exec } = require('child_process'); // Make sure exec is defined
const QRCode = require("qrcode");

const storedHashedPassword = "$2b$10$vGBWBezJEkNdgacV/VyVROBjX6blxkdLQRyDsbm30P4Kbn/QzjudW";

// Define the function to call the checkThumbnails.js script
function callCheckThumbnailsScript() {
    const scriptPath = 'C:/Users/Nitropc/Documents/Projects/Aggregator/Extras/checkThumbnails.js'; // Full absolute path
    const process = spawn("node", [scriptPath]);

    // Stream stdout to console in real-time
    process.stdout.on("data", (data) => {
        console.log(data.toString()); // Print output as it arrives
    });

    // Stream stderr to console
    process.stderr.on("data", (data) => {
        console.error(data.toString());
    });

    // Detect when the script is done
    process.on("close", (code) => {
        console.log("\nFinished checking links.\n");
    });
}

// Call the function when the server starts
callCheckThumbnailsScript();

// Middleware
app.use(express.json({ limit: "10mb" })); // Parse JSON with size limit
app.use(cors()); // Enable CORS

// Serve static files
app.use(express.static(path.join(__dirname))); // Serve root-level static files
app.use('/Main', express.static(path.join(__dirname, 'Main'))); // Serve Main static files
app.use('/Categories', express.static(path.join(__dirname, 'Categories'))); // Serve Categories static files
app.use('/Actors', express.static(path.join(__dirname, 'Actors'))); // Serve Actors static files
app.use('/AddVideo', express.static(path.join(__dirname, 'AddVideo'))); // Serve AddVideo static files

// File paths (Updated to reflect Data/ folder structure)
const dataFolder = path.join(__dirname, "Data"); // Path to the Data folder
const videosFile = path.join(dataFolder, "videos.json");
const categoriesFile = path.join(dataFolder, "categories.json");
const actorsFile = path.join(dataFolder, "actors.json");
const seriesFile = path.join(dataFolder, "series.json"); // Changed to series.json for series data

// Ensure JSON files exist
if (!fs.existsSync(videosFile)) fs.writeFileSync(videosFile, "[]", "utf8");
if (!fs.existsSync(categoriesFile)) fs.writeFileSync(categoriesFile, "[]", "utf8");
if (!fs.existsSync(actorsFile)) fs.writeFileSync(actorsFile, "[]", "utf8");
if (!fs.existsSync(seriesFile)) fs.writeFileSync(seriesFile, "[]", "utf8"); // Ensure series.json exists

// Log incoming requests
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Serve the homepage
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "Main", "main.html"));
});

// Serve category.html dynamically
app.get("/category.html", (req, res) => {
    res.sendFile(path.join(__dirname, "Categories", "category.html"));
});

// Serve actor.html dynamically
app.get("/actor.html", (req, res) => {
    res.sendFile(path.join(__dirname, "Actors", "actor.html"));
});

// Get all videos
app.get("/videos", (req, res) => {
    fs.readFile(videosFile, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading videos.json:", err);
            return res.status(500).send("Error loading video data.");
        }
        res.json(JSON.parse(data || "[]"));
    });
});

// Helper function to get the next available ID
function getNextAvailableVideoId() {
    return new Promise((resolve, reject) => {
        fs.readFile(videosFile, "utf8", (err, data) => {
            if (err) {
                reject("Error reading videos.json");
            } else {
                const videos = JSON.parse(data || "[]");
                const highestId = videos.reduce((max, video) => (video.id > max ? video.id : max), 0);
                resolve(highestId + 1);
            }
        });
    });
}

// Add a new video
app.post("/videos", async (req, res) => {
    const { videoLink, thumbnailLink, videoTitle, pornstarNames, categories, protected: isProtected, id, series = [] } = req.body;

    const videoId = id || await getNextAvailableVideoId();
    const trimmedVideoLink = videoLink.trim().toLowerCase(); // Normalize for comparison
    const trimmedVideoTitle = videoTitle.trim().toLowerCase(); // Normalize for comparison (for title duplicates)

    fs.readFile(videosFile, "utf8", (err, data) => {
        if (err) {
            console.error("Error loading videos:", err);
            return res.status(500).send("Error loading Videos");
        }

        const videos = JSON.parse(data || "[]");

        // Check if video URL already exists
        const videoExists = videos.some((video) => video.videoLink.trim().toLowerCase() === trimmedVideoLink);
        if (videoExists) {
            return res.status(409).send("⚠ Video with this URL already exists. No changes were made.");
        }

        // Check if video title already exists
        const titleExists = videos.some((video) => video.videoTitle.trim().toLowerCase() === trimmedVideoTitle);
        if (titleExists) {
            return res.status(409).send("⚠ Video with this title already exists. No changes were made.");
        }

        const newVideo = {
            videoLink,
            thumbnailLink: thumbnailLink || "",
            videoTitle: videoTitle || "",
            pornstarNames: pornstarNames || [],
            categories: categories || [],
            series: series,
            protected: isProtected || false,
            id: videoId,
        };

        videos.push(newVideo);

        fs.writeFile(videosFile, JSON.stringify(videos, null, 2), "utf8", (err) => {
            if (err) {
                console.error("Error saving video:", err);
                return res.status(500).send("Error saving video");
            }

            // Sort videos (if needed)
            const sortProcess = spawn("node", [path.join(__dirname, "Extras", "SortVideos.js")]);

            sortProcess.on("close", (code) => {
                if (code === 0) {
                    console.log("Video added successfully!");
                    return res.status(201).send("✔ Video added successfully!");
                } else {
                    console.error("Error ordering the videos");
                    return res.status(500).send("Error ordering the videos");
                }
            });
        });
    });
});



// Get all categories
app.get("/categories", (req, res) => {
    fs.readFile(categoriesFile, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading categories.json:", err);
            return res.status(500).send("Error loading categories.");
        }
        res.json(JSON.parse(data || "[]"));
    });
});

// Get all series
app.get("/series", (req, res) => {
    fs.readFile(seriesFile, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading series.json:", err);
            return res.status(500).send("Error loading series.");
        }
        res.json(JSON.parse(data || "[]"));
    });
});

// Get all actors
app.get("/actors", (req, res) => {
    fs.readFile(actorsFile, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading actors.json:", err);
            return res.status(500).send("Error loading actors.");
        }
        res.json(JSON.parse(data || "[]"));
    });
});

// Add a new actor and trigger sorting
app.post("/actors", (req, res) => {
    const { name, thumbnail } = req.body;

    if (!name) {
        return res.status(400).send("Actor name is required.");
    }

    fs.readFile(actorsFile, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading actors.json:", err);
            return res.status(500).send("Error loading actors.");
        }

        const actors = JSON.parse(data || "[]");
        const trimmedName = name.trim().toLowerCase();

        if (actors.some((actor) => actor.name.trim().toLowerCase() === trimmedName)) { 
         return res.status(400).send("Actor already exists.");
        }

        const newActor = {
            name,
            thumbnail: thumbnail || "",
        };

        actors.push(newActor);

        fs.writeFile(actorsFile, JSON.stringify(actors, null, 2), "utf8", (err) => {
            if (err) {
                console.error("Error writing to actors.json:", err);
                return res.status(500).send("Error saving actor.");
            }
            console.log("Actor added successfully:", newActor);

            // Trigger sorting after actor is added
            const sortProcess = spawn("node", [path.join(__dirname, "Extras", "sortActors.js")]);

            sortProcess.on("close", (code) => {
                if (code === 0) {
                    console.log("✅ Actor list sorted successfully.");
                } else {
                    console.error("❌ Error sorting actors. Exit code:", code);
                }
            });

            res.status(201).send("Actor added successfully.");
        });
    });
});

// Add a new series and sort the JSON file
app.post("/api/add-series", (req, res) => {
    console.log("Received body:", req.body); // Debugging log

    const { name, thumbnail, protected: isProtected } = req.body; // Get the protected field too

    if (!name || !thumbnail) {
        return res.status(400).json({ error: "Series name and thumbnail are required." });
    }

    fs.readFile(seriesFile, "utf8", (err, data) => {
        if (err) {
            console.error("Error reading series.json:", err);
            return res.status(500).json({ error: "Error loading series data." });
        }

        const series = JSON.parse(data || "[]");

        // Prevent duplicate series
        if (series.some((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase())) {
            return res.status(400).json({ error: "Series already exists." });
        }

        const newSeries = { 
            name, 
            thumbnail, 
            protected: isProtected === true // Default to false if not provided
        };

        series.push(newSeries);

        fs.writeFile(seriesFile, JSON.stringify(series, null, 2), "utf8", (err) => {
            if (err) {
                console.error("Error writing to series.json:", err);
                return res.status(500).json({ error: "Error saving series." });
            }
            
            console.log("✅ Series added successfully:", newSeries);

            // === ✅ Call the sorting script after adding the series ===
            const sortProcess = spawn("node", [path.join(__dirname, "Extras", "sortSeries.js")]);

            sortProcess.on("close", (code) => {
                if (code === 0) {
                    console.log("✅ Series list sorted successfully.");
                    res.status(201).json({ message: "Series added & sorted successfully!", series: newSeries });
                } else {
                    console.error("❌ Error sorting series. Exit code:", code);
                    res.status(500).json({ error: "Series added, but sorting failed." });
                }
            });
        });
    });
});


// Password validation
app.post("/check-password", (req, res) => {
    const { password } = req.body;

    bcrypt.compare(password, storedHashedPassword, (err, result) => {
        if (err) {
            console.error("Error comparing password:", err);
            return res.status(500).json({ message: "Server error" });
        }
        if (result) {
            return res.status(200).json({ message: "Password is correct" });
        } else {
            return res.status(403).json({ message: "Incorrect password" });
        }
    });
});

// Function to start Ngrok and get the URL
async function startNgrok() {
    try {
        const url = await ngrok.connect(PORT);
        console.log(`Ngrok tunnel started at: ${url}`);

        // Generate and display QR Code in the terminal
        QRCode.toString(url, { type: "terminal", small: true }, (err, qrCode) => {
            if (err) {
                console.error("❌ Error generating QR code:", err);
                return;
            }
            console.log("\n📌 Scan this QR Code to access the server:\n");
            console.log(qrCode);
        });
        
        // Serve the Ngrok URL via an endpoint
        app.get("/ngrok-url", (req, res) => {
            res.json({ ngrokUrl: url });
        });

        // Dynamically inject the Ngrok URL into JavaScript files when requested
        app.get('/Aggregator/**/*.js', async (req, res) => {
            const jsFilePath = path.join(__dirname, req.path);  // Get the requested JavaScript file path

            // Read the JS file, inject the Ngrok URL, and send it
            fs.readFile(jsFilePath, 'utf8', (err, jsContent) => {
                if (err) {
                    console.error(`Error reading file ${req.path}:`, err);
                    return res.status(500).send("Error reading JavaScript file.");
                }

                // Replace placeholder with Ngrok URL
                jsContent = jsContent.replace('<!--NGROK_URL-->', url);

                // Serve the updated JavaScript content
                res.setHeader("Content-Type", "application/javascript");
                res.send(jsContent);
            });
        });
    } catch (error) {
        console.error("Error starting Ngrok:", error);
    }
}

// Start the ngrok tunnel
startNgrok();

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
