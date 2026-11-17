// /Details/details.js

document.addEventListener("DOMContentLoaded", async () => {

  const container = document.getElementById("details");
  const pageTitle = document.getElementById("page-title");

  if (!container) return;

  const params = new URLSearchParams(window.location.search);

  const type = params.get("type");
  const name = params.get("name");

  if (!type || !name) {
    container.textContent = "Invalid page parameters.";
    return;
  }

  let allVideos = [];
  let filteredVideos = [];

  let currentLetter = "all";
  let currentSearch = "";
  let sortMode = "recent";
  const activeTheme = localStorage.getItem("activeTheme") || "";

  function matchesSearch(video) {
    if (!currentSearch) return true;

    const q = currentSearch.toLowerCase();

    if (q.startsWith("#")) {
      return video.categories?.some(c => c.toLowerCase().includes(q.slice(1)));
    }

    if (q.startsWith("@")) {
      return video.pornstarNames?.some(a => a.toLowerCase().includes(q.slice(1)));
    }

    if (q.startsWith("&")) {
      const n = q.slice(1);
      return (
        video.network?.toLowerCase().includes(n) ||
        video.studios?.toLowerCase().includes(n) ||
        video.series?.toLowerCase().includes(n)
      );
    }

    return (video.name || "").toLowerCase().includes(q);
  }

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

  try {

    // Extra context passed by entity.js so studio/series can be matched
    // by their FULL cascade, not just their own name — two studios (or
    // two series) can legitimately share a name if they belong to
    // different networks/studios.
    const studioContext = params.get("studio");   // only present for type=series
    const networkContext = params.get("network"); // present for type=studio and type=series

    const videosRes = await fetch("/videos/all");
    allVideos = await videosRes.json();

    if (!Array.isArray(allVideos)) throw new Error("Invalid videos format");

    const normalizedName = name.toLowerCase();
    const normalizedNetwork = networkContext?.toLowerCase() || null;
    const normalizedStudio = studioContext?.toLowerCase() || null;

    const filterMap = {
      actor: (video) =>
        video.pornstarNames?.some(n => n.toLowerCase() === normalizedName),

      category: (video) =>
        video.categories?.some(c => c.toLowerCase() === normalizedName),

      // Network names are already unique globally, so name alone is fine.
      network: (video) =>
        Array.isArray(video.network)
          ? video.network.some(n => n.toLowerCase() === normalizedName)
          : video.network?.toLowerCase() === normalizedName,

      // Studio: must match studio name AND the network it belongs to —
      // otherwise two same-named studios in different networks would
      // both show up.
      studio: (video) => {
        const studioVal = video.studio || video.studios;
        const matchesStudio = Array.isArray(studioVal)
          ? studioVal.some(s => s.toLowerCase() === normalizedName)
          : studioVal?.toLowerCase() === normalizedName;

        if (!matchesStudio) return false;
        if (!normalizedNetwork) return true; // no context given, fall back to name-only

        return video.network?.toLowerCase() === normalizedNetwork;
      },

      // Series: must match series name AND studio AND network — the
      // full cascade.
      series: (video) => {
        const seriesVal = video.series;
        const matchesSeries = Array.isArray(seriesVal)
          ? seriesVal.some(s => s.toLowerCase() === normalizedName)
          : seriesVal?.toLowerCase() === normalizedName;

        if (!matchesSeries) return false;

        if (normalizedStudio && video.studios?.toLowerCase() !== normalizedStudio) return false;
        if (normalizedNetwork && video.network?.toLowerCase() !== normalizedNetwork) return false;

        return true;
      },
    };

    const filterFunction = filterMap[type];

    if (!filterFunction) {
      container.textContent = "Unsupported details type.";
      return;
    }

    filteredVideos = allVideos.filter(filterFunction);

    if (pageTitle) pageTitle.textContent = name;
    document.title = name;

    if (!filteredVideos.length) {
      container.textContent = `No videos found for "${name}".`;
      return;
    }

    function applySort(list) {
      switch (sortMode) {
        case "recent":       return list.sort((a, b) => (b.id || 0) - (a.id || 0));
        case "oldest":       return list.sort((a, b) => (a.id || 0) - (b.id || 0));
        case "alpha":        return list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        case "alpha-reverse":return list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        default:             return list;
      }
    }

    function render(letter = "all") {
      currentLetter = letter;

      let list = [...filteredVideos];

      if (letter !== "all") {
        list = list.filter(video => video.name?.toUpperCase().startsWith(letter));
      }

      list = list.filter(matchesSearch);

      if (activeTheme) {
        list = list.filter(video => (video.theme || "") === activeTheme);
      }

      list = applySort(list);

      container.innerHTML = "";

      if (!list.length) {
        container.innerHTML = "<p>No videos found.</p>";
        return;
      }

      list.forEach(video => {
        const card = document.createElement("div");
        card.className = "card";

        card.dataset.id   = video.id;
        card.dataset.url  = video.url || "";
        card.dataset.item = JSON.stringify(video);

        card.innerHTML = `
          <div class="card-thumbnail">
            <img src="${video.thumbnail || ""}" alt="${video.name || ""}">
          </div>
          <div class="card-title">${video.name || ""}</div>
          ${buildStarsHTML(video.rating)}
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
        if (!filteredVideos.length) return;
        const random = filteredVideos[Math.floor(Math.random() * filteredVideos.length)];
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

    render();

  } catch (err) {
    console.error("Error loading videos:", err);
    container.textContent = "⚠ Failed to load videos. Try again later.";
  }
});