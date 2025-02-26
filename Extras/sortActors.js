const fs = require('fs');
const path = require('path');

// Paths for actors.json and categories.json
const actorsPath = path.resolve(__dirname, '../Data/actors.json'); // Adjust as needed

// Function to capitalize the first letter of each word and trim extra spaces
function formatName(name) {
  return name
    .trim() // Remove any leading or trailing spaces
    .split(/\s+/) // Split by any whitespace (spaces, tabs, etc.)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize the first letter of each word
    .join(' '); // Join the words back with a single space
}

// Function to sort JSON file
function sortJsonFile(filePath, key) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading ${filePath}:`, err);
      return;
    }

    try {
      let jsonData = JSON.parse(data);

      if (!Array.isArray(jsonData)) {
        console.error(`Error: ${filePath} is not an array.`);
        return;
      }

      // Format and sort by the given key (name)
      jsonData.forEach(item => {
        if (item[key]) {
          item[key] = formatName(item[key]);
        }
      });

      // Sort the array by the formatted name
      jsonData.sort((a, b) => (a[key] || '').localeCompare(b[key] || ''));

      // Write the sorted and formatted data back to the file
      fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
        if (err) {
          console.error(`Error writing to ${filePath}:`, err);
          return;
        }
        console.log(`${filePath} has been sorted and formatted successfully!`);
      });
    } catch (parseError) {
      console.error(`Error parsing ${filePath}:`, parseError);
    }
  });
}

// Sort actors.json by "name"
sortJsonFile(actorsPath, 'name');
