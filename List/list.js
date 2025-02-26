document.addEventListener("DOMContentLoaded", () => {
    console.log("List page loaded.");

    const videosContainer = document.querySelector(".videos-container");
    const alphabetFilterButtons = document.querySelectorAll(".alphabet-filter button");
    const randomButton = document.querySelector(".random-video-button");

    if (!videosContainer) {
        return;
    }

    let allVideos = [];

    function fetchAndDisplayVideos(filterLetter = "all") {
        console.log("Fetching videos...");

        fetch("/ngrok-url")
            .then((response) => response.json())
            .then((data) => {
                const ngrokUrl = data.ngrokUrl;

                fetch(`${ngrokUrl}/Data/videos.json`)
                    .then((response) => response.json())
                    .then((videos) => {
                        videosContainer.innerHTML = "";

                        const isAuthenticated = sessionStorage.getItem("passwordEntered") === "true";

                        const unprotectedVideos = videos.filter(
                            (video) => !video.protected && isMatchingLetter(video.videoTitle, filterLetter)
                        );
                        const protectedVideos = videos.filter(
                            (video) =>
                                video.protected &&
                                isAuthenticated &&
                                isMatchingLetter(video.videoTitle, filterLetter)
                        );

                        allVideos = [...unprotectedVideos, ...protectedVideos].sort((a, b) =>
                            a.videoTitle.localeCompare(b.videoTitle)
                        );

                        allVideos.forEach(({ videoTitle, videoLink, thumbnailLink, pornstarNames, series }) => {
                            const videoElement = createVideoElement(videoLink, thumbnailLink, videoTitle, pornstarNames, series);
                            videosContainer.appendChild(videoElement);
                        });
                    })
                    .catch((error) => {
                        console.error("Error fetching videos:", error);
                        videosContainer.innerHTML =
                            "<p>Error loading videos. Please try again later.</p>";
                    });
            })
            .catch((error) => {
                console.error("Error fetching Ngrok URL:", error);
                videosContainer.innerHTML = "<p>Error loading videos. Please try again later.</p>";
            });
    }

    function isMatchingLetter(title, letter) {
        if (letter === "all") return true;
        return title.toLowerCase().startsWith(letter.toLowerCase());
    }

    function createVideoElement(videoLink, thumbnailLink, videoTitle, pornstarNames, series) {
        const videoElement = document.createElement("div");
        videoElement.classList.add("video-box");
    
        // Ensure pornstarNames and series are properly formatted
        const actorsList = Array.isArray(pornstarNames) ? pornstarNames.join(", ") : (pornstarNames || "");
        const seriesList = Array.isArray(series) ? series.join(", ") : (series || "");
    
        // Create the final display text
        let displayText = videoTitle;
        if (actorsList) displayText += ` -- ${actorsList}`;
        if (seriesList) displayText += ` -- ${seriesList}`;
    
        videoElement.innerHTML = ` 
            <a href="${videoLink}" target="_blank">
                <img src="${thumbnailLink}" alt="${videoTitle}">
                <p>${displayText}</p>
            </a>
        `;
        return videoElement;
    }

    randomButton.addEventListener("click", () => {
        if (allVideos.length === 0) {
            alert("No videos available for random selection!");
            return;
        }

        const randomIndex = Math.floor(Math.random() * allVideos.length);
        const randomVideo = allVideos[randomIndex];
        window.open(randomVideo.videoLink, "_blank");
    });

    alphabetFilterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedLetter = button.getAttribute("data-letter").toLowerCase();
            fetchAndDisplayVideos(selectedLetter);
        });
    });

    fetchAndDisplayVideos();
});
