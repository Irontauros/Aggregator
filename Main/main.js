// /Main/main.js

document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");
  const videosContainer = document.getElementById("videos");

  if (!videosContainer) return;

  let allVideos = [];
  let currentSearch = "";
  let currentLetter = "all";

  let sortMode = localStorage.getItem("sort_main.html") || "recent";

  /* =========================
     FETCH DATA
  ========================= */
  try {
    allVideos = await (await fetch("/videos")).json();
  } catch (err) {
    console.error("Failed to load videos:", err);
    videosContainer.innerHTML = "<p>Error loading data</p>";
    return;
  }

  /* =========================
     STAR RATING DISPLAY
     Two stacked rows of 5 stars: a dim empty row underneath, and a
     themed filled row clipped to (rating / 5) * 100% width. Handles
     half-stars smoothly without needing a half-star glyph.
  ========================= */
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

  /* =========================
     CREATE CARD
  ========================= */
  function createVideo(video) {
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = video.id;
    if (video.url) card.dataset.url = video.url;

    card.innerHTML = `
      <div class="card-thumbnail">
        <img src="${video.thumbnail || ""}" alt="${video.name || ""}">
      </div>
      <div class="card-title">${video.name || "Untitled"}</div>
      ${buildStarsHTML(video.rating)}
    `;

    return card;
  }

  /* =========================
     MATCH HELPER
     Handles both string and array values
  ========================= */
  function matchField(value, query) {
    if (!value) return false;
    if (Array.isArray(value)) {
      return value.some(v => v?.toLowerCase().includes(query));
    }
    return value.toLowerCase().includes(query);
  }

  /* =========================
     FILTER LOGIC
  ========================= */
  function filterVideo(video) {
    if (!currentSearch) return true;

    const q = currentSearch.toLowerCase();

    if (q.startsWith("#")) {
      return matchField(video.categories, q.slice(1));
    }

    if (q.startsWith("@")) {
      return matchField(video.pornstarNames, q.slice(1));
    }

    if (q.startsWith("&")) {
      const n = q.slice(1);
      return (
        matchField(video.network, n) ||
        matchField(video.studios, n) ||
        matchField(video.series, n)
      );
    }

    return video.name?.toLowerCase().includes(q);
  }

  /* =========================
     THEME FILTER
     Set by the buttons header.js renders on this page. Reads fresh
     from localStorage each render, so clicking a button (which
     dispatches "theme-change") always reflects the latest choice.
  ========================= */
  function matchesTheme(video) {
    const activeTheme = localStorage.getItem("activeTheme") || "";
    if (!activeTheme) return true;
    return (video.theme || "") === activeTheme;
  }

  /* =========================
     SORT ENGINE
  ========================= */
  function applySort(list) {
    switch (sortMode) {
      case "recent":       return list.sort((a, b) => b.id - a.id);
      case "oldest":       return list.sort((a, b) => a.id - b.id);
      case "alpha":        return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      case "alpha-reverse":return list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
      case "rating":        return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case "rating-reverse":return list.sort((a, b) => (a.rating || 0) - (b.rating || 0));
      default:             return list;
    }
  }

  /* =========================
     RENDER
  ========================= */
  function render(letter = "all") {
    let filtered = allVideos.filter(filterVideo).filter(matchesTheme);

    if (letter !== "all") {
      filtered = filtered.filter(v => v.name?.toUpperCase().startsWith(letter));
    }

    filtered = applySort(filtered);

    videosContainer.innerHTML = "";

    if (!filtered.length) {
      videosContainer.innerHTML = "<p>No videos found</p>";
      return;
    }

    filtered.forEach(v => videosContainer.appendChild(createVideo(v)));
  }

  /* =========================
     SEARCH
  ========================= */
  function doSearch() {
    currentSearch = searchInput.value.trim();
    render(currentLetter);
  }

  searchButton?.addEventListener("click", doSearch);
  searchInput?.addEventListener("keydown", e => {
    if (e.key === "Enter") doSearch();
  });

  /* =========================
     EVENTS
  ========================= */
  window.addEventListener("sort-change", e => {
    sortMode = e.detail.mode;
    localStorage.setItem("sort_main.html", sortMode);
    render(currentLetter);
  });

  window.addEventListener("alphabet-change", e => {
    const { letter } = e.detail;

    if (letter === "random") {
      const r = allVideos[Math.floor(Math.random() * allVideos.length)];
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
      return;
    }

    currentLetter = letter;
    render(letter);
  });

  // Dispatched by header.js when a theme button is clicked — re-render
  // immediately without a page reload.
  window.addEventListener("theme-change", () => {
    render(currentLetter);
  });

  /* =========================
     INIT
  ========================= */
  render();
});