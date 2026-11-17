// /incomplete/incomplete.js

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("incomplete");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const type = params.get("type") || "videos";

  let items = [];
  let currentLetter = "all";
  let currentSearch = "";
  const SORT_KEY = "sort_incomplete.html";
  const VALID_SORTS = ["alpha", "alpha-reverse", "recent", "oldest"];

  let sortMode = "recent";

  try {
    const saved = localStorage.getItem(SORT_KEY);
    if (VALID_SORTS.includes(saved)) sortMode = saved;
  } catch (err) {}


  // =========================
  // SEARCH
  // Full search (name, #category, @actor, &network/studio/series) only
  // makes sense when browsing incomplete VIDEOS — other types (actors,
  // shorts, etc.) are simpler objects, so they just match by name.
  // =========================
  function matchesSearch(item) {
    if (!currentSearch) return true;

    const q = currentSearch.toLowerCase();

    if (type === "videos") {
      if (q.startsWith("#")) {
        return item.categories?.some(c => c.toLowerCase().includes(q.slice(1)));
      }
      if (q.startsWith("@")) {
        return item.pornstarNames?.some(a => a.toLowerCase().includes(q.slice(1)));
      }
      if (q.startsWith("&")) {
        const n = q.slice(1);
        return (
          item.network?.toLowerCase().includes(n) ||
          item.studios?.toLowerCase().includes(n) ||
          item.series?.toLowerCase().includes(n)
        );
      }
    }

    return (item.name || "").toLowerCase().includes(q);
  }

  // =========================
  // LOAD DATA
  // =========================
  async function loadData() {
    try {
      const res = await fetch(`/${type}/incomplete`);
      items = await res.json();

      if (!Array.isArray(items)) throw new Error("Invalid format");

      render();
    } catch (err) {
      console.error("Failed loading incomplete:", err);
      container.innerHTML = "<p>⚠ Error loading incomplete items.</p>";
    }
  }

  // =========================
  // SORT
  // =========================
  function sortList(list) {
    switch (sortMode) {
      case "alpha":
        return [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "alpha-reverse":
        return [...list].sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      case "recent":
        return [...list].sort((a, b) => (b.id || 0) - (a.id || 0));
      case "oldest":
        return [...list].sort((a, b) => (a.id || 0) - (b.id || 0));
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
      items.filter(item =>
        (letter === "all" || item.name?.toUpperCase().startsWith(letter)) &&
        matchesSearch(item)
      )
    );

    if (!list.length) {
      container.innerHTML = "<p>No incomplete items found.</p>";
      return;
    }

    list.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";

      card.dataset.id   = item.id;
      card.dataset.url  = item.url || "";
      card.dataset.item = JSON.stringify(item);

      card.innerHTML = `
        <div class="card-thumbnail">
          <img src="${item.thumbnail || ""}" alt="${item.name || ""}">
        </div>
        <div class="card-title">${item.name || ""}</div>
      `;

      container.appendChild(card);
    });
  }

  // =========================
  // EVENTS
  // =========================
  window.addEventListener("alphabet-change", e => {
    const { letter } = e.detail;

    if (letter === "random") {
      if (!items.length) return;
      const random = items[Math.floor(Math.random() * items.length)];
      if (random?.url) window.open(random.url, "_blank", "noopener,noreferrer");
    } else {
      render(letter);
    }
  });

  window.addEventListener("sort-change", e => {
    const mode = e.detail.mode;
    if (!["alpha", "alpha-reverse", "recent", "oldest"].includes(mode)) return;
    sortMode = mode;
    render(currentLetter);
  });

  window.addEventListener("search-change", e => {
    currentSearch = e.detail.query;
    render(currentLetter);
  });

  // =========================
  // INIT
  // =========================
  loadData();
});