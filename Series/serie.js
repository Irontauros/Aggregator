document.addEventListener("DOMContentLoaded", () => {
    console.log("Series page loaded.");

    const urlParams = new URLSearchParams(window.location.search);
    const seriesName = urlParams.get("name");

    if (!seriesName) {
        console.error("No series name found in the URL.");
        document.getElementById("video-list").innerHTML = "<p>No series selected.</p>";
        return;
    }

    console.log("Series Name:", seriesName);

    // ✅ Update the page title (tab title)
    document.title = `${seriesName} - Series`;

    // ✅ Correctly update the series name in `h2.category-title`
    const seriesTitleElement = document.querySelector(".category-title");
    if (seriesTitleElement) {
        seriesTitleElement.textContent = seriesName;
    } else {
        console.warn("⚠ No element found with .category-title to update.");
    }

    // Check if the password is authenticated (use sessionStorage instead of localStorage)
    const isAuthenticated = sessionStorage.getItem("passwordEntered") === "true";
    console.log("Password Authenticated (from sessionStorage):", isAuthenticated); // Debugging authentication status

    // Fetch the Ngrok URL dynamically
    fetch("/ngrok-url")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Error fetching Ngrok URL: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            const ngrokUrl = data.ngrokUrl;

            // Now fetch the video data using the dynamically fetched Ngrok URL
            fetch(`${ngrokUrl}/Data/videos.json`)
                .then((response) => response.json())
                .then((videos) => {
                    const normalizedSeriesName = seriesName.trim().toLowerCase().replace(/\s+/g, "");

                    // Filter videos by series name and authentication status
                    const filteredVideos = videos.filter(
                        (video) =>
                            video.series &&
                            video.series.some(
                                (series) =>
                                    series.toLowerCase().replace(/\s+/g, "") === normalizedSeriesName
                            ) &&
                            (!video.protected || isAuthenticated)
                    );

                    // Display videos or show a message if none are found
                    if (filteredVideos.length > 0) {
                        displayVideos(filteredVideos);
                    } else {
                        document.getElementById("video-list").innerHTML = "<p>No videos found for this series.</p>";
                    }
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

function displayVideos(videos) {
    const videoListElement = document.getElementById("video-list");
    videoListElement.innerHTML = ""; // Clear previous content

    // Display each video as a thumbnail box
    videos.forEach((video) => {
        const videoElement = document.createElement("div");
        videoElement.classList.add("actor-box");  // Use actor-box class for consistency

        videoElement.innerHTML = `
            <a href="${video.videoLink}" target="_blank">
                <div class="actor-thumbnail">  <!-- Use actor-thumbnail for styling -->
                    <img src="${video.thumbnailLink}" alt="${video.videoTitle}">
                </div>
                <p class="actor-title">${video.videoTitle}</p> <!-- Use actor-title for consistency -->
            </a>
        `;

        videoListElement.appendChild(videoElement);
    });
}
