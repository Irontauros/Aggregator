document.addEventListener("DOMContentLoaded", () => {
    console.log("Category page loaded.");

    // Get the category name from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryName = urlParams.get("name");

    if (!categoryName) {
        console.error("No category name found in the URL.");
        document.getElementById("video-list").innerHTML = "<p>No category selected.</p>";
        return;
    }

    console.log("Category Name:", categoryName);

    // Update the page title to reflect the selected category
    const categoryTitle = document.querySelector(".category-title");
    if (categoryTitle) {
        categoryTitle.textContent = categoryName; // Set the category name as the page title
    }

    // Check if the password is authenticated (using sessionStorage for session-level auth)
    const isAuthenticated = sessionStorage.getItem("passwordEntered") === "true";
    console.log("Password Authenticated (from sessionStorage):", isAuthenticated);

    // Fetch the Ngrok URL dynamically
    fetch("/ngrok-url")  // The endpoint to get the Ngrok URL
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Error fetching Ngrok URL: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            const ngrokUrl = data.ngrokUrl;  // Retrieve the Ngrok URL dynamically

            // Fetch and display videos for the selected category
            fetch(`${ngrokUrl}/Data/videos.json`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Error fetching videos: ${response.status}`);
                    }
                    return response.json();
                })
                .then((videos) => {
                    console.log("Processing videos...");

                    // Filter videos by category
                    const normalizedCategoryName = categoryName.trim().toLowerCase().replace(/\s+/g, "");
                    const filteredVideos = videos.filter((video) => {
                        return video.categories && video.categories.some(
                            (category) => category.toLowerCase().replace(/\s+/g, "") === normalizedCategoryName
                        );
                    });

                    console.log("Filtered Videos for category:", filteredVideos);

                    const videoListElement = document.getElementById("video-list");
                    videoListElement.innerHTML = ""; // Clear previous content

                    // If no videos are found for the category
                    if (filteredVideos.length === 0) {
                        videoListElement.innerHTML = "<p>No videos found for this category.</p>";
                        return;
                    }

                    // Display videos
                    filteredVideos.forEach(({ videoLink, thumbnailLink, videoTitle, protected: isProtected }) => {
                        if (isAuthenticated || !isProtected) {
                            const videoElement = createVideoElement(videoLink, thumbnailLink, videoTitle);
                            videoListElement.appendChild(videoElement);
                        } else {
                            console.log("Video is protected and password is not entered.");
                        }
                    });
                })
                .catch((error) => {
                    console.error("Error fetching videos:", error);
                    document.getElementById("video-list").innerHTML =
                        "<p>Error loading videos. Please try again later.</p>";
                });
        })
        .catch((error) => {
            console.error("Error fetching Ngrok URL:", error);
            document.getElementById("video-list").innerHTML =
                "<p>Error loading Ngrok URL. Please try again later.</p>";
        });
});

function createVideoElement(videoLink, thumbnailLink, videoTitle) {
    const videoElement = document.createElement("div");
    videoElement.classList.add("actor-box");  // Same class as in actor.js to maintain styling

    videoElement.innerHTML = `
        <a href="${videoLink}" target="_blank">
            <div class="actor-thumbnail">
                <img src="${thumbnailLink}" alt="${videoTitle}">
            </div>
            <p class="video-title">${videoTitle}</p>
        </a>
    `;
    console.log("Created video element:", videoElement);
    return videoElement;
}