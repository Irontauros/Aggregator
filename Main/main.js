document.addEventListener("DOMContentLoaded", () => {
    console.log("Main page loaded.");

    const passwordModal = document.getElementById("password-modal");
    const passwordInput = document.getElementById("password-input");
    const passwordSubmit = document.getElementById("password-submit");
    const passwordClose = document.getElementById("password-close");
    const passwordButton = document.getElementById("password-button");
    const errorMessage = document.getElementById("error-message");
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");

    const unprotectedVideosContainer = document.getElementById("unprotected-videos");
    const protectedVideosContainer = document.getElementById("protected-videos");

    let lastTouchEnd = 0;
    document.addEventListener("touchend", (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    });

    // --- Password Visibility Toggle ---
    const togglePassword = document.getElementById("togglePassword");
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
            passwordInput.setAttribute("type", type);
            togglePassword.textContent = type === "password" ? "👁" : "🙈";
        });
    }

    // Modal visibility
    passwordModal.style.display = "none";
    passwordButton.addEventListener("click", () => {
        passwordModal.style.display = "flex";
    });
    passwordClose.addEventListener("click", () => {
        passwordModal.style.display = "none";
    });

    // Unlock content function
    function unlockContent() {
        console.log("Unlocking content...");
        sessionStorage.setItem("passwordEntered", "true");
        fetchAndDisplayVideos();
        broadcastUnlock();
    }

    // Handle password submission and verification
    function handlePasswordSubmit() {
        const enteredPassword = passwordInput.value.trim();
        console.log("Password submitted:", enteredPassword);
    
        fetch("/check-password", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ password: enteredPassword }),
        })
        .then((response) => response.json())
        .then((data) => {
            // Clear the password input after submission
            passwordInput.value = ""; // This clears the password input field
    
            if (data.message === "Password is correct") {
                console.log("✔ Correct password entered. Unlocking content...");
                unlockContent();
                passwordModal.style.display = "none";
            } else {
                console.error("⚠ Incorrect password entered.");
                errorMessage.style.display = "block";
                errorMessage.textContent = "⚠ Incorrect password. Please try again.";
            }
        })
        .catch((error) => {
            console.error("⚠ Error while verifying password:", error);
            errorMessage.style.display = "block";
            errorMessage.textContent = "⚠ An error occurred. Please try again.";
        });
    }    

    passwordSubmit.addEventListener("click", handlePasswordSubmit);
    passwordInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            handlePasswordSubmit();
        }
    });

    // Fetch and display videos function (sorted by reverse ID order)
    function fetchAndDisplayVideos(searchQuery = "") {
        console.log("Fetching videos...");

        fetch("/ngrok-url")
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`⚠ Error fetching Ngrok URL: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                const ngrokUrl = data.ngrokUrl;
                fetch(`${ngrokUrl}/Data/videos.json`)
                    .then((response) => response.json())
                    .then((videos) => {
                        unprotectedVideosContainer.innerHTML = "";

                        // Sort videos by ID in descending order (latest videos first)
                        videos.sort((a, b) => b.id - a.id);

                        // Filter videos by search query
                        const filteredVideos = videos.filter((video) => filterVideo(video, searchQuery));

                        // Display videos
                        filteredVideos.forEach(({ videoLink, thumbnailLink, videoTitle, protected: isProtected }) => {
                            const videoElement = createVideoElement(videoLink, thumbnailLink, videoTitle);
                            if (sessionStorage.getItem("passwordEntered") || !isProtected) {
                                unprotectedVideosContainer.appendChild(videoElement);
                            }
                        });

                        // Show protected videos if unlocked
                        protectedVideosContainer.style.display = sessionStorage.getItem("passwordEntered") ? "block" : "none";
                    })
                    .catch((error) => {
                        console.error("⚠ Error fetching videos:", error);
                    });
            })
            .catch((error) => {
                console.error("⚠ Error fetching Ngrok URL:", error);
            });
    }

// Helper function to filter videos based on search query
// Helper function to filter videos based on search query
function filterVideo(video, searchQuery) {
    if (!searchQuery) return true;

    const { videoTitle, categories, pornstarNames } = video;
    
    // Search for categories with '#'
    if (searchQuery.startsWith("#")) {
        const categoryQuery = searchQuery.substring(1).toLowerCase();
        return categories.some((category) => category.toLowerCase().includes(categoryQuery));
    }
    
    // Search for actors with '@'
    if (searchQuery.startsWith("@")) {
        const actorQuery = searchQuery.substring(1).toLowerCase();
        return pornstarNames.some((actor) => actor.toLowerCase().includes(actorQuery));  // Check in pornstarNames array
    }
    
    // Default search for video title
    return videoTitle.toLowerCase().includes(searchQuery.toLowerCase());
}

    // Helper function to create video elements
    function createVideoElement(videoLink, thumbnailLink, videoTitle) {
        const videoElement = document.createElement("div");
        videoElement.classList.add("video-item");
        videoElement.innerHTML = `
            <a href="${videoLink}" target="_blank">
                <img src="${thumbnailLink}" alt="${videoTitle}" class="video-thumbnail">
                <p>${videoTitle}</p>
            </a>
        `;
        return videoElement;
    }

    // Broadcast unlock to other tabs/windows
    function broadcastUnlock() {
        console.log("Broadcasting unlock to other tabs/windows...");
        localStorage.setItem("unlockBroadcast", Date.now());
    }

    window.addEventListener("storage", (event) => {
        if (event.key === "unlockBroadcast") {
            console.log("Unlock broadcast received.");
            if (sessionStorage.getItem("passwordEntered")) {
                unlockContent();
            } else {
                protectedVideosContainer.style.display = "none";
            }
        }
    });

    // Check for previously entered password and initial load
    if (sessionStorage.getItem("passwordEntered")) {
        unlockContent();
    } else {
        protectedVideosContainer.style.display = "none";
    }

    // Search functionality
    searchButton.addEventListener("click", () => {
        const searchQuery = searchInput.value.trim();
        console.log("Search button clicked. Query:", searchQuery);
        fetchAndDisplayVideos(searchQuery);
    });
    searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            const searchQuery = searchInput.value.trim();
            console.log("Enter key pressed in search input. Query:", searchQuery);
            fetchAndDisplayVideos(searchQuery);
        }
    });

    // Initial fetch of videos
    fetchAndDisplayVideos();
});
