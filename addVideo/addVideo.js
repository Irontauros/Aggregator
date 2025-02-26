document.addEventListener("DOMContentLoaded", () => {
    console.log("Add Video page loaded.");

    const categoriesList = document.getElementById("categories-list");
    const seriesList = document.getElementById("series-list");
    const pornstarsNamesContainer = document.getElementById("pornstars-names");
    const categoriesSearchInput = document.getElementById("category-search");
    const seriesSearchInput = document.getElementById("series-search");
    const protectionToggle = document.getElementById("protection-toggle");
    const pornstarsCountInput = document.getElementById("pornstars-count");
    const feedbackMessage = document.getElementById("feedback-message");

    let allCategories = [];
    let selectedCategories = [];
    let allSeries = [];
    let selectedSeries = [];

    // 🔹 Toggle categories dropdown
    function toggleCategories() {
        categoriesList.classList.toggle("open");
    }
    window.toggleCategories = toggleCategories;

    // 🔹 Toggle series dropdown
    function toggleSeries() {
        seriesList.classList.toggle("open");
    }
    window.toggleSeries = toggleSeries;

    // 🔹 Fetch Ngrok URL
    function fetchNgrokUrl() {
        return fetch("/ngrok-url")
            .then(response => {
                if (!response.ok) throw new Error("Error fetching Ngrok URL");
                return response.json();
            })
            .then(data => data.ngrokUrl);
    }

    // 🔹 Fetch and display categories
    function fetchAndDisplayCategories() {
        console.log("Fetching categories...");
        fetchNgrokUrl()
            .then(ngrokUrl => fetch(`${ngrokUrl}/categories`))
            .then(response => response.json())
            .then(data => {
                const isPasswordEntered = sessionStorage.getItem("passwordEntered") === "true";
                allCategories = data;
                const filteredCategories = allCategories
                    .filter(category => isPasswordEntered || !category.protected)
                    .sort((a, b) => a.name.localeCompare(b.name));

                categoriesList.innerHTML = "";
                filteredCategories.forEach(category => {
                    const label = document.createElement("label");
                    label.innerHTML = `    
                        <input type="checkbox" name="categories" value="${category.name}" 
                            ${category.protected && !isPasswordEntered ? "disabled" : ""} 
                            ${selectedCategories.includes(category.name) ? "checked" : ""}>
                        ${category.name}
                    `;
                    categoriesList.appendChild(label);
                });
                console.log("Categories loaded:", filteredCategories);
            })
            .catch(error => {
                console.error("Error loading categories:", error);
                displayMessage("⚠ Error loading categories. Please try again.", "error");
            });
    }

    // 🔹 Fetch and display series
    function fetchAndDisplaySeries() {
        console.log("Fetching series...");
        fetchNgrokUrl()
            .then(ngrokUrl => fetch(`${ngrokUrl}/series`))
            .then(response => response.json())
            .then(data => {
                const isPasswordEntered = sessionStorage.getItem("passwordEntered") === "true";
                allSeries = data;
                seriesList.innerHTML = "";

                const filteredSeries = allSeries
                    .filter(series => isPasswordEntered || !series.protected)
                    .sort((a, b) => a.name.localeCompare(b.name));

                filteredSeries.forEach(series => {
                    const label = document.createElement("label");
                    label.innerHTML = `    
                        <input type="checkbox" name="series" value="${series.name}" 
                            ${selectedSeries.includes(series.name) ? "checked" : ""}>
                        ${series.name}
                    `;
                    seriesList.appendChild(label);
                });

                console.log("Series loaded:", filteredSeries);
            })
            .catch(error => {
                console.error("Error loading series:", error);
                displayMessage("⚠ Error loading series. Please try again.", "error");
            });
    }

    // 🔹 Ensure data is loaded when the page loads
    fetchAndDisplayCategories();
    fetchAndDisplaySeries();

    // 🔹 Update selectedCategories when checkboxes are changed
    categoriesList.addEventListener('change', function (e) {
        if (e.target.type === 'checkbox') {
            const categoryName = e.target.value;
            if (e.target.checked) {
                selectedCategories.push(categoryName);
            } else {
                selectedCategories = selectedCategories.filter(name => name !== categoryName);
            }
        }
        console.log("Selected categories:", selectedCategories); // Log to check
    });

    // 🔹 Update selectedSeries when checkboxes are changed
    seriesList.addEventListener('change', function (e) {
        if (e.target.type === 'checkbox') {
            const seriesName = e.target.value;
            if (e.target.checked) {
                selectedSeries.push(seriesName);
            } else {
                selectedSeries = selectedSeries.filter(name => name !== seriesName);
            }
        }
        console.log("Selected series:", selectedSeries); // Log to check
    });

    // 🔹 Filter categories dynamically
    function filterCategories(query) {
        const filteredCategories = allCategories.filter(category =>
            category.name.toLowerCase().includes(query.toLowerCase())
        );

        categoriesList.innerHTML = "";
        filteredCategories.forEach(category => {
            const label = document.createElement("label");
            label.innerHTML = `    
                <input type="checkbox" name="categories" value="${category.name}" 
                    ${selectedCategories.includes(category.name) ? "checked" : ""}>
                ${category.name}
            `;
            categoriesList.appendChild(label);
        });
    }

    // 🔹 Filter series dynamically
    function filterSeries(query) {
        const filteredSeries = allSeries.filter(series =>
            series.name.toLowerCase().includes(query.toLowerCase())
        );

        seriesList.innerHTML = "";
        filteredSeries.forEach(series => {
            const label = document.createElement("label");
            label.innerHTML = `    
                <input type="checkbox" name="series" value="${series.name}" 
                    ${selectedSeries.includes(series.name) ? "checked" : ""}>
                ${series.name}
            `;
            seriesList.appendChild(label);
        });
    }

    // 🔹 Add event listeners for search inputs
    categoriesSearchInput.addEventListener("input", function (e) {
        filterCategories(e.target.value);
    });

    seriesSearchInput.addEventListener("input", function (e) {
        filterSeries(e.target.value);
    });

    // 🔹 Handle pornstar count input and create name containers
    pornstarsCountInput.addEventListener("input", function (e) {
        const numberOfPornstars = parseInt(e.target.value, 10);
        pornstarsNamesContainer.innerHTML = ""; // Clear previous containers
        for (let i = 0; i < numberOfPornstars; i++) {
            const inputContainer = document.createElement("div");
            inputContainer.innerHTML = `    
                <label>Pornstar ${i + 1} Name:</label>
                <input type="text" name="pornstar-${i + 1}" placeholder="Enter pornstar name" />
            `;
            pornstarsNamesContainer.appendChild(inputContainer);
        }
    });

    // 🔹 Handle form submission
    document.getElementById("videoForm").addEventListener("submit", function (e) {
        e.preventDefault();
    
        const videoLinkInput = document.getElementById("video-link");
        const thumbnailLinkInput = document.getElementById("thumbnail-link");
        const videoTitleInput = document.getElementById("video-title");
    
        const videoLink = videoLinkInput.value.trim();
        const thumbnailLink = thumbnailLinkInput.value.trim();
        const videoTitle = videoTitleInput.value.trim();
    
        // Get pornstar names from dynamically created inputs
        const pornstarNames = [];
        const pornstarInputs = pornstarsNamesContainer.getElementsByTagName("input");
        for (let input of pornstarInputs) {
            if (input.value.trim()) {
                pornstarNames.push(input.value.trim());
            }
        }
    
        fetchNgrokUrl()
            .then(ngrokUrl => fetch(`${ngrokUrl}/videos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    videoLink,
                    thumbnailLink,
                    videoTitle,
                    categories: selectedCategories,
                    series: selectedSeries,
                    pornstarNames,
                    protected: protectionToggle.checked
                })
            }))
            .then(response => response.text())
            .then(text => {
                console.log("Server response:", text);
    
                if (text.includes("Video added successfully")) {
                    feedbackMessage.innerHTML = "<span style='color: green;'>✔ Video added successfully!</span>";
                    
                    // 🔹 Clear input fields and selections
                    videoLinkInput.value = "";
                    thumbnailLinkInput.value = "";
                    videoTitleInput.value = "";
                    pornstarsNamesContainer.innerHTML = ""; // Clear pornstar inputs
                    pornstarsCountInput.value = ""; // Reset count input
    
                    // Uncheck all selected checkboxes
                    selectedCategories = [];
                    selectedSeries = [];
                    document.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
                } else if (text.includes("title already exists")) {
                    feedbackMessage.innerHTML = "<span style='color: orange;'>⚠ Error: A video with this title already exists. No changes were made.</span>";
                } else if (text.includes("link already exists") || text.includes("URL already exists")) { 
                    feedbackMessage.innerHTML = "<span style='color: orange;'>⚠ Error: A video with this URL already exists. No changes were made.</span>";
                } else {
                    feedbackMessage.innerHTML = `<span style="color: red;">⚠ Error: Something went wrong. Please try again later.</span>`;
                }
            })
            .catch(error => {
                console.error("Error sending video data:", error);
                feedbackMessage.innerHTML = "<span style='color: red;'>⚠ Error sending video data. Please try again later.</span>";
            });
    });
    
});
