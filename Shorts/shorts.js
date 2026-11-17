// /shorts/shorts.js

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("shorts");
  if (!container) return;

  let allShorts = [];
  let currentLetter = "all";
  let currentSearch = "";
  let sortMode = localStorage.getItem("sort_shorts.html") || "alpha";
  const activeTheme = localStorage.getItem("activeTheme") || "";

  /* =========================
     LOAD DATA
  ========================= */
  async function loadData() {
    try {
      allShorts = await (await fetch("/shorts")).json();
      render(currentLetter);
    } catch (err) {
      console.error("⚠ Error loading shorts:", err);
      container.innerHTML = "<p>⚠ Error loading shorts.</p>";
    }
  }

  /* =========================
     SORT LOGIC
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
        return [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
      case "oldest":
        return [...list].sort((a, b) => (a.id || 0) - (b.id || 0));
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
      allShorts.filter(short =>
        (letter === "all" || short.name?.toUpperCase().startsWith(letter)) &&
        (!currentSearch || short.name?.toLowerCase().includes(currentSearch.toLowerCase())) &&
        (!activeTheme || (short.theme || "") === activeTheme)
      )
    );

    if (!list.length) {
      container.innerHTML = `<p>No shorts found.</p>`;
      return;
    }

    list.forEach(short => {
      const card = document.createElement("div");
      card.className = "card";

      // Required for editSystem to handle clicks
      card.dataset.id = short.id;
      card.dataset.url = short.url || "";
      card.dataset.item = JSON.stringify(short);

      card.innerHTML = `
        <div class="card-thumbnail">
          <img src="${short.thumbnail || ""}" alt="${short.name || "Short"}">
        </div>
        <div class="card-title">${short.name || "Untitled"}</div>
      `;

      container.appendChild(card);
    });
  }

  /* =========================
     EVENTS
  ========================= */
  window.addEventListener("alphabet-change", e => {
    const { letter } = e.detail;

    if (letter === "random") {
      if (!allShorts.length) return;
      const random = allShorts[Math.floor(Math.random() * allShorts.length)];
      if (random?.url) window.open(random.url, "_blank", "noopener,noreferrer");
    } else {
      render(letter);
    }
  });

  window.addEventListener("sort-change", e => {
    const mode = e.detail.mode;
    if (!["alpha", "alpha-reverse", "recent", "oldest"].includes(mode)) return;
    sortMode = mode;
    localStorage.setItem("sort_shorts.html", sortMode);
    render(currentLetter);
  });

  window.addEventListener("item-updated", e => {
    if (e.detail.type === "short") loadData();
  });

  window.addEventListener("search-change", (e) => {
    currentSearch = e.detail.query;
    render(currentLetter);
  });

  loadData();
});