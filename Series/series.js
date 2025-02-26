document.addEventListener("DOMContentLoaded", () => {
    console.log("Series page loaded.");

    const seriesContainer = document.querySelector(".series-container");
    const alphabetFilterButtons = document.querySelectorAll(".alphabet-filter button");
    const randomSeriesButton = document.querySelector(".random-series-button");
    const addSeriesButton = document.getElementById("add-series-button");
    const addSeriesModal = document.getElementById("add-modal");
    const closeModalButton = document.getElementById("close-modal-button");
    const enterModalButton = document.getElementById("enter-modal-button");
    const seriesNameInput = document.getElementById("name-in-modal");
    const seriesImageInput = document.getElementById("image-in-modal");
    const modalOverlay = document.getElementById("modal-overlay");
    const feedbackMessage = document.getElementById("feedback-message");
    const protectionToggle = document.getElementById("protection-toggle");

    let lastTouchEnd = 0;

    document.addEventListener("touchend", (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    });

    if (!seriesContainer) return;

    // Ensure modal is hidden when page loads
    addSeriesModal.style.display = "none";
    modalOverlay.style.display = "none";

    function fetchAndDisplaySeries(filterLetter = "all") {
        console.log(`Fetching series... (Filter: ${filterLetter})`);

        fetch("/ngrok-url")
            .then(response => {
                if (!response.ok) throw new Error(`Error fetching Ngrok URL: ${response.status}`);
                return response.json();
            })
            .then(data => {
                const ngrokUrl = data.ngrokUrl;

                return Promise.all([
                    fetch(`${ngrokUrl}/Data/series.json`).then(res => res.json()),
                    fetch(`${ngrokUrl}/Data/videos.json`).then(res => res.json())
                ]);
            })
            .then(([series, videos]) => {
                seriesContainer.innerHTML = "";
                const videoCounts = {};

                videos.forEach(video => {
                    if (video.series) {
                        video.series.forEach(series => {
                            const normalizedSeries = series.trim().toLowerCase();
                            videoCounts[normalizedSeries] = (videoCounts[normalizedSeries] || 0) + 1;
                        });
                    }
                });

                const unprotectedSeries = series.filter(s => !s.protected && isMatchingLetter(s.name, filterLetter));
                const protectedSeries = series.filter(s => s.protected && sessionStorage.getItem("passwordEntered") && isMatchingLetter(s.name, filterLetter));

                const allSeries = [...unprotectedSeries, ...protectedSeries].sort((a, b) => a.name.localeCompare(b.name));

                if (randomSeriesButton) {
                    randomSeriesButton.dataset.series = JSON.stringify(allSeries);
                }

                allSeries.forEach(({ name, thumbnail }) => {
                    const normalizedSeries = name.trim().toLowerCase();
                    const videoCount = videoCounts[normalizedSeries] || 0;
                    const seriesElement = createSeriesElement(name, thumbnail, videoCount);
                    seriesContainer.appendChild(seriesElement);
                });
            })
            .catch(error => {
                console.error("Error fetching data:", error);
                seriesContainer.innerHTML = "<p><span style='color: red;'>⚠ Error loading series. Please try again later.</span></p>";
            });
    }

    function isMatchingLetter(seriesName, letter) {
        if (letter === "all") return true;
        return seriesName.toLowerCase().startsWith(letter.toLowerCase());
    }

    function createSeriesElement(name, thumbnail, videoCount) {
        const seriesElement = document.createElement("div");
        seriesElement.classList.add("series-box");
        seriesElement.innerHTML = `
            <a href="serie.html?name=${encodeURIComponent(name)}">
                <div class="series-thumbnail">
                    <img src="${thumbnail}" alt="${name}" 
                         style="width: 100%; height: 100%; object-fit: contain;">
                </div>
                <p>${name} - ${videoCount}</p>
            </a>
        `;
        return seriesElement;
    }

    alphabetFilterButtons.forEach(button => {
        button.addEventListener("click", () => {
            const selectedLetter = button.getAttribute("data-letter").toLowerCase();
            fetchAndDisplaySeries(selectedLetter);
        });
    });

    if (randomSeriesButton) {
        randomSeriesButton.addEventListener("click", () => {

            const storedSeries = JSON.parse(randomSeriesButton.dataset.series || "[]");

            if (storedSeries.length === 0) {
                console.warn("No series available to select randomly.");
                return;
            }

            const randomIndex = Math.floor(Math.random() * storedSeries.length);
            const randomSeries = storedSeries[randomIndex];

            if (randomSeries) {
                window.location.href = `serie.html?name=${encodeURIComponent(randomSeries.name)}`;
            }
        });
    }

    if (addSeriesButton) {
        addSeriesButton.addEventListener("click", () => {
            addSeriesModal.style.display = "flex";
            modalOverlay.style.display = "block";
        });
    }

    function closeModal() {
        addSeriesModal.style.display = "none";
        modalOverlay.style.display = "none";
    }

    if (closeModalButton) {
        closeModalButton.addEventListener("click", closeModal);
    }

    if (modalOverlay) {
        modalOverlay.addEventListener("click", closeModal);
    }

    function saveSeries() {
        const seriesName = seriesNameInput.value.trim();
        const seriesImage = seriesImageInput.value.trim();
        const isProtected = protectionToggle.checked;

        if (!seriesName || !seriesImage) {
            feedbackMessage.innerHTML = "<span style='color: red;'>⚠ Please provide both name and thumbnail link.</span>";
            return;
        }

        fetch("/api/add-series", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                name: seriesName, 
                thumbnail: seriesImage,
                protected: isProtected
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                feedbackMessage.innerHTML = `<span style='color: red;'>⚠ ${data.error}</span>`;
                return;
            }

            feedbackMessage.innerHTML = "<span style='color: green;'>✔ Series added successfully!</span>";

            setTimeout(() => {
                closeModal();
                fetchAndDisplaySeries();
            }, 1000);

            seriesNameInput.value = "";
            seriesImageInput.value = "";
        })
        .catch(error => {
            console.error("Error saving series:", error);
            feedbackMessage.innerHTML = "<span style='color: red;'>⚠ Error saving series. Please try again.</span>";
        });
    }

    if (enterModalButton) {
        enterModalButton.addEventListener("click", saveSeries);
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal();
        } else if (event.key === "Enter" && addSeriesModal.style.display === "flex") {
            saveSeries();
        }
    });

    fetchAndDisplaySeries();
});
