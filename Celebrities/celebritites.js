document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("celebrities");
  if (!container) return;

  let allCelebrities = [];
  let currentLetter = "all";
  let currentSearch = "";
  let sortMode = localStorage.getItem("sort_celebrities.html") || "alpha";

  // =========================
  // LOAD DATA
  // =========================
  async function loadData() {
    try {
      allCelebrities = await (await fetch("/celebrities")).json();
      render(currentLetter);
    } catch (err) {
      console.error("⚠ Error loading celebrities:", err);
      container.innerHTML = "<p>⚠ Error loading celebrities.</p>";
    }
  }

  // =========================
  // SORT LOGIC (IMPROVED)
  // =========================
  function sortList(list) {
    switch (sortMode) {
      case "alpha":
        return list.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );

      case "alpha-reverse":
        return list.sort((a, b) =>
          (b.name || "").localeCompare(a.name || "")
        );

      case "recent":
        // assumes higher id = newer
        return list.sort((a, b) =>
          (b.id || 0) - (a.id || 0)
        );

      case "oldest":
        return list.sort((a, b) =>
          (a.id || 0) - (b.id || 0)
        );

      default:
        return list;
    }
  }

  // =========================
  // RENDER
  // =========================
  function render(letter = "all") {
    currentLetter = letter;

    container.innerHTML = "";

    const list = sortList(
      allCelebrities.filter(c =>
        (letter === "all" || c.name?.toUpperCase().startsWith(letter)) &&
        (!currentSearch || c.name?.toLowerCase().includes(currentSearch.toLowerCase()))
      )
    );

    list.forEach(celebrity => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <a href="${celebrity.url || '#'}" target="_blank" rel="noopener noreferrer">
          <div class="card-thumbnail">
            <img src="${celebrity.thumbnail || ''}" 
                 alt="${celebrity.name || 'Celebrity'}">
          </div>
          <div class="card-title">
            ${celebrity.name || "Untitled"}
          </div>
        </a>
      `;

      container.appendChild(card);
    });

    if (!list.length) {
      container.innerHTML = `<p>No celebrities found for "${letter}".</p>`;
    }
  }

  // =========================
  // EVENTS
  // =========================
  window.addEventListener("alphabet-change", (e) => {
    const { letter } = e.detail;

    if (letter === "random") {
      if (!allCelebrities.length) return;

      const random =
        allCelebrities[Math.floor(Math.random() * allCelebrities.length)];

      if (random?.url) {
        window.open(random.url, "_blank");
      }
    } else {
      render(letter);
    }
  });

  window.addEventListener("sort-change", (e) => {
    const mode = e.detail.mode;

    // ignore invalid modes if header ever sends weird ones
    if (!["alpha", "alpha-reverse", "recent", "oldest"].includes(mode)) return;

    sortMode = mode;
    localStorage.setItem("sort_celebrities.html", sortMode);
    render(currentLetter);
  });

  window.addEventListener("item-updated", (e) => {
    if (e.detail.type === "celebrity") {
      loadData();
    }
  });

  window.addEventListener("search-change", (e) => {
    currentSearch = e.detail.query;
    render(currentLetter);
  });

  // Initial load
  loadData();
});