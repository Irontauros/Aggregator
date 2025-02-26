const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Paths to the files
const categoriesFile = path.join(__dirname, '..', 'Data', 'categories.json');
const actorsFile = path.join(__dirname, '..', 'Data', 'actors.json');
const fallbackFile = path.join(__dirname, '..', 'Data', 'fallBack.json');

// Helper function to check if a link is valid
async function checkLink(url) {
    try {
        const response = await axios.head(url); // Only check the header to avoid unnecessary data transfer
        return response.status !== 404; // If status is 404, it's invalid
    } catch (error) {
        return false; // If there’s an error, we consider the link as broken
    }
}

// Function to update the categories and actors files
async function updateFile(filePath, isActor = false) {
    try {
        // Read fallback thumbnail URL from fallBack.json
        const fallbackData = fs.readFileSync(fallbackFile, 'utf8');
        const fallbackJson = JSON.parse(fallbackData);
        const fallbackThumbnail = fallbackJson.fallbackThumbnail;

        const data = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(data || "[]");

        let changesMade = false; // Track if changes are made

        for (let i = 0; i < jsonData.length; i++) {
            let item = jsonData[i];

            // Check the 'thumbnail' link
            if (item.thumbnail && !(await checkLink(item.thumbnail))) {
                item.thumbnail2 = fallbackThumbnail;
                console.log(`Changed link for ${isActor ? 'actor' : 'category'}: ${item.name || 'Unknown'} on line ${i + 1}`);
                changesMade = true;
            }

            // Also check 'thumbnail2' for categories (or 'actorThumbnail' for actors)
            if (item.thumbnail2 && !(await checkLink(item.thumbnail2))) {
                item.thumbnail2 = fallbackThumbnail;
                console.log(`Changed link for ${isActor ? 'actor' : 'category'}: ${item.name || 'Unknown'} on line ${i + 1}`);
                changesMade = true;
            }

            // Handle actor specific field (if any)
            if (isActor && item.actorThumbnail && !(await checkLink(item.actorThumbnail))) {
                item.actorThumbnail2 = fallbackThumbnail;
                console.log(`Changed actor link for ${item.name || 'Unknown'} on line ${i + 1}`);
                changesMade = true;
            }
        }

        // If any changes were made, write updated data back to the file
        if (changesMade) {
            fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
        }

    } catch (error) {
        console.error(`Error updating ${isActor ? 'actors' : 'categories'} file:`, error);
    }
}

// Run the update function for both files
async function updateAll() {
    console.log('\nStarted checking links...\n');
    await updateFile(categoriesFile, false); // Update categories file
    await updateFile(actorsFile, true); // Update actors file
    console.log('\nFinished checking links.\n');
}

// Run the function to update both files
updateAll();
