// /features/features.js

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("features");
  if (!container) return;

  let allFeatures = [];
  let currentLetter = "all";
  let currentSearch = "";
  let sortMode = localStorage.getItem("sort_features.html") || "alpha";
  const activeTheme = localStorage.getItem("activeTheme") || "";

  /* =========================
     STAR RATING DISPLAY
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
     FETCH DATA
  ========================= */
  try {
    const response = await fetch("/features");
    const rawFeatures = await response.json();

    if (!Array.isArray(rawFeatures)) {
      throw new Error("Invalid features format");
    }

    allFeatures = rawFeatures.map(f => ({
      id:           f.id,
      name:         f.name         ?? "",
      thumbnail:    f.thumbnail    ?? "",
      url:          f.url          ?? "",
      categories:   f.categories   ?? [],
      pornstarNames: f.pornstarNames ?? [],
      theme:        f.theme        ?? "",
      rating:       f.rating       ?? 0
    }));

  } catch (error) {
    console.error("Feature fetch error:", error);
    container.innerHTML = "<p>⚠ Error loading features.</p>";
    return;
  }

  /* =========================
     SORT
  ========================= */
  function sortList(list) {
    if (sortMode === "recent")       return [...list].sort((a, b) => b.id - a.id);
    if (sortMode === "oldest")       return [...list].sort((a, b) => a.id - b.id);
    if (sortMode === "alpha")        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sortMode === "alpha-reverse") return [...list].sort((a, b) => b.name.localeCompare(a.name));
    return list;
  }

  /* =========================
     SEARCH
     Supports: plain text (name), #category, @actor.
     No &network/&studio/&series here — features aren't tied to those.
  ========================= */
  function matchesSearch(f) {
    if (!currentSearch) return true;

    const q = currentSearch.toLowerCase();

    if (q.startsWith("#")) {
      return f.categories?.some(c => c.toLowerCase().includes(q.slice(1)));
    }

    if (q.startsWith("@")) {
      return f.pornstarNames?.some(a => a.toLowerCase().includes(q.slice(1)));
    }

    return (f.name || "").toLowerCase().includes(q);
  }

  /* =========================
     RENDER
  ========================= */
  function render(letter = "all") {
    currentLetter = letter;
    container.innerHTML = "";

    const list = sortList(
      allFeatures.filter(f => {
        const name = f.name?.trim() ?? "";
        return name
          && (letter === "all" || name.toUpperCase().startsWith(letter))
          && matchesSearch(f)
          && (!activeTheme || (f.theme || "") === activeTheme);
      })
    );

    if (!list.length) {
      container.innerHTML = "<p>No features found.</p>";
      return;
    }

    list.forEach(feature => {
      const card = document.createElement("div");
      card.className = "card";

      card.dataset.id   = feature.id;
      card.dataset.url  = feature.url;
      card.dataset.type = "feature";
      card.dataset.item = JSON.stringify(feature);
      card.dataset.edit = `/Add/addVideo.html?edit=${feature.id}&type=feature`;

      card.innerHTML = `
        <a href="${feature.url}" target="_blank" rel="noopener noreferrer">
          <div class="card-thumbnail portrait">
            <img src="${feature.thumbnail}" alt="${feature.name}">
          </div>
          <div class="card-title">
            ${feature.name}
          </div>
        </a>
        ${buildStarsHTML(feature.rating)}
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
      if (!allFeatures.length) return;
      const r = allFeatures[Math.floor(Math.random() * allFeatures.length)];
      if (r?.url) window.open(r.url, "_blank", "noopener,noreferrer");
    } else {
      render(letter);
    }
  });

  window.addEventListener("sort-change", (e) => {
    sortMode = e.detail.mode;
    localStorage.setItem("sort_features.html", sortMode);
    render(currentLetter);
  });

  window.addEventListener("search-change", (e) => {
    currentSearch = e.detail.query;
    render(currentLetter);
  });

  /* =========================
     INIT
  ========================= */
  render();
});