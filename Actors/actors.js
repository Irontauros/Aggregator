// /pages/actors.js

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector("#actors");
  if (!container) return;

  let allActors = [];
  let allVideos = [];
  let videoCountMap = {};
  let currentLetter = "all";
  let currentQuery = "";
  let sortMode = localStorage.getItem("sort_actors.html") || "alpha";

  async function loadData() {
    try {
      const [actorsRes, videosRes] = await Promise.all([
        fetch("/actors"),
        fetch("/videos/all")
      ]);

      allActors = await actorsRes.json();
      allVideos = await videosRes.json();

      buildCounts();
      render(currentLetter);
    } catch {
      container.innerHTML = "<p>⚠ Error loading data.</p>";
    }
  }

  function buildCounts() {
    videoCountMap = {};

    allVideos.forEach(v => {
      v.pornstarNames?.forEach(name => {
        const key = name.toLowerCase();
        videoCountMap[key] = (videoCountMap[key] || 0) + 1;
      });
    });
  }

  const countVideos = (name) =>
    videoCountMap[name.toLowerCase()] || 0;

  function sortList(list) {
    switch (sortMode) {
      case "count":
      case "recent": // fallback
        return list.sort((a, b) =>
          countVideos(b.name) - countVideos(a.name)
        );

      case "count-reverse":
      case "oldest": // fallback
        return list.sort((a, b) =>
          countVideos(a.name) - countVideos(b.name)
        );

      case "alpha":
        return list.sort((a, b) =>
          a.name.localeCompare(b.name)
        );

      case "alpha-reverse":
        return list.sort((a, b) =>
          b.name.localeCompare(a.name)
        );

      default:
        return list;
    }
  }

  function render(letter = "all") {
    currentLetter = letter;
    container.innerHTML = "";

    const query = currentQuery.toLowerCase();

    const list = sortList(
      allActors.filter(a => {
        const matchesLetter =
          letter === "all" || a.name.toUpperCase().startsWith(letter);

        const matchesQuery =
          !query || a.name.toLowerCase().includes(query);

        return matchesLetter && matchesQuery;
      })
    );

    list.forEach(actor => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <a href="../details/details.html?name=${encodeURIComponent(actor.name)}&type=actor">
          <div class="card-thumbnail portrait">
            <img src="${actor.thumbnail}" alt="${actor.name}" />
          </div>
          <div class="card-title">${actor.name}</div>
          <div class="card-count">${countVideos(actor.name)} video${countVideos(actor.name) === 1 ? "" : "s"}</div>
        </a>
      `;

      container.appendChild(card);
    });
  }

  window.addEventListener("alphabet-change", (e) => {
    const { letter } = e.detail;

    if (letter === "random") {
      const r = allActors[Math.floor(Math.random() * allActors.length)];
      if (r) {
        window.location.href =
          `../details/details.html?name=${encodeURIComponent(r.name)}&type=actor`;
      }
    } else {
      render(letter);
    }
  });

  window.addEventListener("sort-change", (e) => {
    sortMode = e.detail.mode;
    localStorage.setItem("sort_actors.html", sortMode);
    render(currentLetter);
  });

  window.addEventListener("search-change", (e) => {
    currentQuery = e.detail.query || "";
    render(currentLetter);
  });

  loadData();
});