const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../Data/videos.json'); // Adjust as needed

// Function to capitalize the first letter of each word and trim extra spaces
function formatTitle(title) {
  return title
    .trim() // Remove any leading or trailing spaces
    .split(/\s+/) // Split by any whitespace (spaces, tabs, etc.)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
    .join(' '); // Join the words back with a single space
}

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    let jsonData = JSON.parse(data);

    if (!Array.isArray(jsonData)) {
      console.error('Error: File content is not an array.');
      return;
    }

    // Format the video titles
    jsonData.forEach(video => {
      if (video.videoTitle) {
        video.videoTitle = formatTitle(video.videoTitle);
      }
    });

    // Sort videos alphabetically by title (case-insensitive)
    jsonData.sort((a, b) => a.videoTitle.localeCompare(b.videoTitle, undefined, { sensitivity: 'base' }));

    // Write the sorted and formatted JSON back to the file
    fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error('Error writing to file:', err);
        return;
      }
      console.log('Videos sorted and titles formatted successfully!');
    });

  } catch (parseError) {
    console.error('Error parsing JSON data:', parseError);
  }
});
