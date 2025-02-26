document.addEventListener("DOMContentLoaded", () => {
    console.log("Categories page loaded.");

    // Disable zoom gestures
    document.addEventListener("gesturestart", (event) => {
        event.preventDefault();
    });

    let lastTouchEnd = 0;
    document.addEventListener("touchend", (event) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    });

    const categoriesContainer = document.querySelector(".categories-container");
    const alphabetFilterButtons = document.querySelectorAll(".alphabet-filter button");
    const randomCategoryButton = document.querySelector(".random-category-button");

    if (!categoriesContainer) {
        return;
    }

    // Function to fetch and display categories with video count
    function fetchAndDisplayCategories(filterLetter = "all") {
        console.log("Fetching categories...");

        fetch("/ngrok-url")
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Error fetching Ngrok URL: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                const ngrokUrl = data.ngrokUrl;

                const categoryFetch = fetch(`${ngrokUrl}/Data/categories.json`).then((response) => {
                    if (!response.ok) {
                        throw new Error(`Error fetching categories: ${response.status}`);
                    }
                    return response.json();
                });

                const videoFetch = fetch(`${ngrokUrl}/Data/videos.json`).then((response) => {
                    if (!response.ok) {
                        throw new Error(`Error fetching videos: ${response.status}`);
                    }
                    return response.json();
                });

                Promise.all([categoryFetch, videoFetch])
                    .then(([categories, videos]) => {
                        categoriesContainer.innerHTML = "";

                        const videoCounts = {};
                        videos.forEach((video) => {
                            if (video.categories) {
                                video.categories.forEach((category) => {
                                    const normalizedCategory = category.trim().toLowerCase();
                                    videoCounts[normalizedCategory] = (videoCounts[normalizedCategory] || 0) + 1;
                                });
                            }
                        });

                        const unprotectedCategories = categories.filter(
                            (category) =>
                                !category.protected && isMatchingLetter(category.name, filterLetter)
                        );
                        const protectedCategories = categories.filter(
                            (category) =>
                                category.protected &&
                                sessionStorage.getItem("passwordEntered") &&
                                isMatchingLetter(category.name, filterLetter)
                        );

                        const allCategories = [...unprotectedCategories, ...protectedCategories].sort((a, b) =>
                            a.name.localeCompare(b.name)
                        );

                        allCategories.forEach(({ name, thumbnail, thumbnail2 }) => {
                            const normalizedCategory = name.trim().toLowerCase();
                            const videoCount = videoCounts[normalizedCategory] || 0;
                            const categoryThumbnail = thumbnail2 || thumbnail; // Use thumbnail2 if available, else fallback to thumbnail
                            const categoryElement = createCategoryElement(name, categoryThumbnail, videoCount);
                            categoriesContainer.appendChild(categoryElement);
                        });
                    })
                    .catch((error) => {
                        console.error("Error processing categories or videos:", error);
                        categoriesContainer.innerHTML = "<p><span style='color: red;'>⚠ Error loading categories. Please try again later.</span></p>";
                    });
            })
            .catch((error) => {
                console.error("Error fetching Ngrok URL:", error);
                categoriesContainer.innerHTML = "<p><span style='color: red;'>⚠ Error loading Ngrok URL. Please try again later.</span></p>";
            });
    }

    function isMatchingLetter(categoryName, letter) {
        if (letter === "all") return true;
        return categoryName.toLowerCase().startsWith(letter.toLowerCase());
    }

    function createCategoryElement(name, thumbnail, videoCount) {
        const categoryElement = document.createElement("div");
        categoryElement.classList.add("category-box");
        categoryElement.innerHTML = `
            <a href="../category.html?name=${encodeURIComponent(name)}">
                <div class="category-thumbnail">
                    <img src="${thumbnail}" alt="${name}">
                </div>
                <p>${name} - ${videoCount}</p>
            </a>
        `;
        return categoryElement;
    }

    alphabetFilterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedLetter = button.getAttribute("data-letter").toLowerCase();
            fetchAndDisplayCategories(selectedLetter);
        });
    });

    // Random Category Button Functionality
    if (randomCategoryButton) {
        randomCategoryButton.addEventListener("click", () => {
            console.log("Fetching random category...");
            fetch("/ngrok-url")
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`Error fetching Ngrok URL: ${response.status}`);
                    }
                    return response.json();
                })
                .then((data) => {
                    const ngrokUrl = data.ngrokUrl;

                    fetch(`${ngrokUrl}/Data/categories.json`)
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error(`Error fetching categories: ${response.status}`);
                            }
                            return response.json();
                        })
                        .then((categories) => {
                            const unprotectedCategories = categories.filter((category) => !category.protected);
                            const protectedCategories = categories.filter(
                                (category) => category.protected && sessionStorage.getItem("passwordEntered")
                            );

                            const allCategories = [...unprotectedCategories, ...protectedCategories];

                            if (allCategories.length === 0) {
                                alert("No categories available.");
                                return;
                            }

                            const randomIndex = Math.floor(Math.random() * allCategories.length);
                            const randomCategory = allCategories[randomIndex];

                            const randomCategoryName = encodeURIComponent(randomCategory.name);
                            window.location.href = `../category.html?name=${randomCategoryName}`;
                        })
                        .catch((error) => {
                            console.error("Error fetching categories:", error);
                            alert("<span style='color: red;'>⚠ Failed to fetch categories. Please try again later.</span>");
                        });
                })
                .catch((error) => {
                    console.error("Error fetching Ngrok URL:", error);
                    alert("<span style='color: red;'>⚠ Failed to fetch categories. Please try again later.</span>");
                });
        });
    }

    fetchAndDisplayCategories();
});
