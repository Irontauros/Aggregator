// /components/hentai.js

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("hentai");
  if (!container) return;

  let allItems = [];
  let currentLetter = "all";
  let currentSearch = "";
  let sortMode = localStorage.getItem("sort_hentai.html") || "alpha";
  const activeTheme = localStorage.getItem("activeTheme") || "";

  // =========================
  // STAR RATING DISPLAY
  // =========================
  function buildStarsHTML(rating) {
    const r = typeof rating === "number" ? rating : 0;
    const percent = (r / 5) * 100;

    return `
      <div class="rating-stars" title="${r} / 5">
        <span class="stars-empty">★★★★★</span>
        <span class="stars-filled" style="width: ${percent}%">★★★★★</span>
      </div>
    `;
  }

  // =========================
  // LOAD DATA
  // =========================
  async function loadData() {
    try {
      allItems = await (await fetch("/hentai")).json();
      render(currentLetter);
    } catch (err) {
      console.error("⚠ Error loading hentai:", err);
      container.innerHTML = "<p>⚠ Error loading hentai.</p>";
    }
  }

  // =========================
  // SORT SYSTEM (CLEAN + CONSISTENT)
  // =========================
  function sortList(list) {
    switch (sortMode) {
      case "alpha":
        return [...list].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );

      case "alpha-reverse":
        return [...list].sort((a, b) =>
          (b.name || "").localeCompare(a.name || "")
        );

      case "recent":
        return [...list].sort((a, b) =>
          (b.id || 0) - (a.id || 0)
        );

      case "oldest":
        return [...list].sort((a, b) =>
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
      allItems.filter(item =>
        (letter === "all" || item.name?.toUpperCase().startsWith(letter)) &&
        (!currentSearch || item.name?.toLowerCase().includes(currentSearch.toLowerCase())) &&
        (!activeTheme || (item.theme || "") === activeTheme)
      )
    );

    if (!list.length) {
      container.innerHTML = `<p>No hentai found for "${letter}".</p>`;
      return;
    }

    list.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <a href="${item.url || "#"}" target="_blank" rel="noopener noreferrer">
          <div class="card-thumbnail">
            <img src="${item.thumbnail || ""}" alt="${item.name || "Item"}">
          </div>
          <div class="card-title">
            ${item.name || "Untitled"}
          </div>
        </a>
        ${buildStarsHTML(item.rating)}
      `;

      container.appendChild(card);
    });
  }

  // =========================
  // EVENTS
  // =========================
  window.addEventListener("alphabet-change", (e) => {
    const { letter } = e.detail;

    if (letter === "random") {
      if (!allItems.length) return;

      const random =
        allItems[Math.floor(Math.random() * allItems.length)];

      if (random?.url) {
        window.open(random.url, "_blank", "noopener,noreferrer");
      }
    } else {
      render(letter);
    }
  });

  window.addEventListener("sort-change", (e) => {
    const mode = e.detail.mode;

    // only accept valid modes
    if (!["alpha", "alpha-reverse", "recent", "oldest"].includes(mode)) return;

    sortMode = mode;
    localStorage.setItem("sort_hentai.html", sortMode);
    render(currentLetter);
  });

  window.addEventListener("item-updated", (e) => {
    if (e.detail.type === "hentai") {
      loadData();
    }
  });

  window.addEventListener("search-change", (e) => {
    currentSearch = e.detail.query;
    render(currentLetter);
  });

  loadData();
});