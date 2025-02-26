document.addEventListener("DOMContentLoaded", async () => {
    console.log("Actors page loaded.");

    const actorsContainer = document.querySelector(".actors-container");
    const alphabetFilterButtons = document.querySelectorAll(".alphabet-filter button");
    const randomButton = document.getElementById("random-button");
    const addActorButton = document.getElementById("add-actor-button");
    const modal = document.getElementById("add-modal");
    const closeModal = document.getElementById("close-modal-button");
    const submitActorButton = document.getElementById("enter-modal-button");
    const actorNameInput = document.getElementById("name-in-modal");
    const actorImageInput = document.getElementById("image-in-modal");
    const feedbackMessage = document.getElementById("feedback-message");

    let allActors = [];
    let allVideos = [];
    let ngrokUrl = "";

    modal.style.display = "none";

    async function getNgrokUrl() {
        try {
            const response = await fetch("/ngrok-url");
            if (!response.ok) throw new Error(`Error fetching Ngrok URL: ${response.status}`);
            const data = await response.json();
            ngrokUrl = data.ngrokUrl || "";
            console.log("Fetched Ngrok URL:", ngrokUrl);
        } catch (error) {
            console.error("Error fetching Ngrok URL:", error);
            alert("Error fetching data. Please try again later.");
        }
    }

    async function fetchActors() {
        if (!ngrokUrl) return;
        try {
            const actorsResponse = await fetch(`${ngrokUrl}/actors`);
            if (!actorsResponse.ok) throw new Error("Error fetching actors");
            allActors = await actorsResponse.json();
            await fetchVideos(); 
        } catch (error) {
            console.error("Error fetching actors:", error);
            actorsContainer.innerHTML = "<p>Error loading actors. Please try again later.</p>";
        }
    }

    async function fetchVideos() {
        if (!ngrokUrl) return;
        try {
            const videosResponse = await fetch(`${ngrokUrl}/videos`);
            if (!videosResponse.ok) throw new Error("Error fetching videos");
            allVideos = await videosResponse.json(); 
            displayActors("all");
        } catch (error) {
            console.error("Error fetching videos:", error);
        }
    }

    async function countActorVideos(actorName) {
        if (!allVideos || !Array.isArray(allVideos)) {
            console.error("Error: Videos not loaded properly.");
            return 0;
        }

        return allVideos.filter(video =>
            Array.isArray(video.pornstarNames) &&
            video.pornstarNames.some(name => name.toLowerCase() === actorName.toLowerCase())
        ).length;
    }

    async function displayActors(filterLetter = "all") {
        actorsContainer.innerHTML = ""; 

        const filteredActors = allActors.filter(({ name }) =>
            filterLetter === "all" ? true : name.startsWith(filterLetter.toUpperCase())
        );

        if (filteredActors.length === 0) {
            actorsContainer.innerHTML = "<p>No actors found.</p>";
            return;
        }

        filteredActors.sort((a, b) => a.name.localeCompare(b.name));

        filteredActors.forEach(({ name, thumbnail }) => {
            const actorElement = document.createElement("div");
            actorElement.classList.add("actor-box");
            actorElement.innerHTML = `
                <a href="../actor.html?name=${encodeURIComponent(name)}">
                    <div class="actor-thumbnail">
                        <img src="${thumbnail}" alt="${name}" onerror="this.onerror=null; this.src='default-image.jpg';">
                    </div>
                    <div class="actor-name">${name} - 0</div>
                </a>
            `;
            actorsContainer.appendChild(actorElement);
        });

        const actorCounts = await Promise.all(filteredActors.map(actor => countActorVideos(actor.name)));

        const actorElements = actorsContainer.querySelectorAll('.actor-box');
        filteredActors.forEach(({ name }, index) => {
            const videoCount = actorCounts[index] || 0;
            const actorElement = actorElements[index];
            const actorNameElement = actorElement.querySelector('.actor-name');
            actorNameElement.textContent = `${name} - ${videoCount}`;
        });
    }

    alphabetFilterButtons.forEach(button => {
        button.addEventListener("click", function () {
            displayActors(this.dataset.letter);
        });
    });

    randomButton.addEventListener("click", function () {
        if (allActors.length === 0) return;
        const randomActor = allActors[Math.floor(Math.random() * allActors.length)];
        window.location.href = `../actor.html?name=${encodeURIComponent(randomActor.name)}`;
    });

    addActorButton.addEventListener("click", () => {
        modal.style.display = "flex";
    });

    closeModal.addEventListener("click", () => {
        modal.style.display = "none";
        feedbackMessage.innerHTML = "";
    });

    window.addEventListener("click", (event) => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });

    submitActorButton.addEventListener("click", async () => {
        await addActor();
    });

    async function addActor() {
        let name = actorNameInput.value.trim();
        const thumbnail = actorImageInput.value.trim();

        feedbackMessage.innerHTML = "";
        
        if (!name || !thumbnail) {
            feedbackMessage.innerHTML = '<span style="color: red;">⚠ Please enter both name and image URL.</span>';
            return;
        }

        const isDuplicate = allActors.some(actor => actor.name.toLowerCase() === name.toLowerCase());
        if (isDuplicate) {
            feedbackMessage.innerHTML = '<span style="color: red;">⚠ Actor already exists!</span>';
            return;
        }

        const newActor = { name, thumbnail };

        try {
            const response = await fetch(`${ngrokUrl}/actors`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newActor),
            });

            if (!response.ok) {
                feedbackMessage.innerHTML = '<span style="color: red;">⚠ Failed to add actor. Please try again.</span>';
                return;
            }

            allActors.push(newActor);
            displayActors("all");

            feedbackMessage.innerHTML = `<span style="color: green;">✔ Actor added successfully!</span>`;
            actorNameInput.value = "";
            actorImageInput.value = "";

        } catch (error) {
            console.error("Error adding actor:", error);
            feedbackMessage.innerHTML = '<span style="color: red;">⚠ Error adding actor. Please try again.</span>';
        }
    }

    window.addEventListener("keydown", (event) => {
        if (modal.style.display === "flex") {
            if (event.key === "Enter") {
                addActor();
            } else if (event.key === "Escape") {
                modal.style.display = "none";
                feedbackMessage.innerHTML = "";
            }
        }
    });

    await getNgrokUrl();
    await fetchActors();
});
