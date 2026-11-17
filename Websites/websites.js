// /websites/websites.js

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("websites");
  if (!container) return;

  let allWebsites = [];
  let currentLetter = "all";
  let currentSearch = "";
  let sortMode = localStorage.getItem("sort_websites.html") || "alpha";
  const activeTheme = localStorage.getItem("activeTheme") || "";

  /* =========================
     LOAD DATA
  ========================= */
  async function loadData() {
    try {
      allWebsites = await (await fetch("/websites")).json();
      render(currentLetter);
    } catch (err) {
      console.error("⚠ Error loading websites:", err);
      container.innerHTML = "<p>⚠ Error loading websites.</p>";
    }
  }

  /* =========================
     SORT LOGIC (FIXED + CONSISTENT)
  ========================= */
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

  /* =========================
     RENDER
  ========================= */
  function render(letter = "all") {
    currentLetter = letter;
    container.innerHTML = "";

    const list = sortList(
      allWebsites.filter(site =>
        (letter === "all" || site.name?.toUpperCase().startsWith(letter)) &&
        (!currentSearch || site.name?.toLowerCase().includes(currentSearch.toLowerCase())) &&
        (!activeTheme || (site.theme || "") === activeTheme)
      )
    );

    if (!list.length) {
      container.innerHTML = `<p>No websites found for "${letter}".</p>`;
      return;
    }

    list.forEach(site => {
      const card = document.createElement("div");
      card.className = "card entity-card-text-only";

      card.innerHTML = `
        <a href="${site.url || "#"}" target="_blank" rel="noopener noreferrer">
          <div class="entity-card-title">${site.name || "Untitled"}</div>
        </a>
      `;

      container.appendChild(card);
    });
  }

  /* =========================
     EVENTS
  ========================= */
  window.addEventListener("alphabet-change", (e) => {
    const { letter } = e.detail;

    if (letter === "random") {
      if (!allWebsites.length) return;

      const random =
        allWebsites[Math.floor(Math.random() * allWebsites.length)];

      if (random?.url) {
        window.open(random.url, "_blank", "noopener,noreferrer");
      }
    } else {
      render(letter);
    }
  });

  window.addEventListener("sort-change", (e) => {
    const mode = e.detail.mode;

    if (!["alpha", "alpha-reverse", "recent", "oldest"].includes(mode)) return;

    sortMode = mode;
    localStorage.setItem("sort_websites.html", sortMode);
    render(currentLetter);
  });

  window.addEventListener("item-updated", (e) => {
    if (e.detail.type === "website") {
      loadData();
    }
  });

  window.addEventListener("search-change", (e) => {
    currentSearch = e.detail.query;
    render(currentLetter);
  });

  loadData();
});