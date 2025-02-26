document.addEventListener("DOMContentLoaded", () => {
    console.log("Actor page loaded.");

    const urlParams = new URLSearchParams(window.location.search);
    const actorName = urlParams.get("name");

    if (!actorName) {
        console.error("No actor name found in the URL.");
        document.getElementById("video-list").innerHTML = "<p>No actor selected.</p>";
        return;
    }

    console.log("Actor Name:", actorName);

    // Update the page title to reflect the selected actor
    const actorTitle = document.querySelector(".actor-title");
    if (actorTitle) {
        actorTitle.textContent = actorName; // Set the actor name as the page title
    }

    // Check if the password is authenticated (use sessionStorage instead of localStorage)
    const isAuthenticated = sessionStorage.getItem("passwordEntered") === "true";
    console.log("Password Authenticated (from sessionStorage):", isAuthenticated); // Debugging authentication status

    // Fetch the Ngrok URL dynamically
    fetch("/ngrok-url")  // The endpoint to get the Ngrok URL (no need to hardcode localhost)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Error fetching Ngrok URL: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            const ngrokUrl = data.ngrokUrl;  // Retrieve the Ngrok URL dynamically

            // Now fetch the video data using the dynamically fetched Ngrok URL
            fetch(`${ngrokUrl}/Data/videos.json`)
                .then((response) => response.json())
                .then((videos) => {
                    const normalizedActorName = actorName.trim().toLowerCase().replace(/\s+/g, "");

                    // Filter videos by actor name and authentication status
                    const filteredVideos = videos.filter(
                        (video) =>
                            Array.isArray(video.pornstarNames) && // Ensure it's an array before calling .some()
                            video.pornstarNames.some(
                                (actor) =>
                                    actor.toLowerCase().replace(/\s+/g, "") === normalizedActorName
                            ) &&
                            (!video.protected || isAuthenticated)
                    );
                    

                    // Display videos or show a message if none are found
                    if (filteredVideos.length > 0) {
                        displayVideos(filteredVideos);
                    } else {
                        document.getElementById("video-list").innerHTML = "<p>No videos found for this actor.</p>";
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
        videoElement.classList.add("actor-box");

        videoElement.innerHTML = `
            <a href="${video.videoLink}" target="_blank">
                <div class="actor-thumbnail">
                    <img src="${video.thumbnailLink}" alt="${video.videoTitle}">
                </div>
                <p class="video-title">${video.videoTitle}</p>
            </a>
        `;

        videoListElement.appendChild(videoElement);
    });
}
