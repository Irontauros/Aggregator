// /pages/categories.js

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.querySelector("#categories");
  if (!container) return;

  let allCategories = [];
  let allVideos = [];
  let countMap = {};
  let currentLetter = "all";
  let currentSearch = "";
  let sortMode = localStorage.getItem("sort_categories.html") || "alpha";
  const activeTheme = localStorage.getItem("activeTheme") || "";

  try {
    const [catRes, vidRes] = await Promise.all([
      fetch("/categories"),
      fetch("/videos")
    ]);

    allCategories = await catRes.json();
    allVideos = await vidRes.json();

    buildCounts();
  } catch {
    container.innerHTML = "<p>⚠ Error loading categories.</p>";
    return;
  }

  function buildCounts() {
    countMap = {};

    allVideos.forEach(v => {
      v.categories?.forEach(c => {
        const key = c.toLowerCase();
        countMap[key] = (countMap[key] || 0) + 1;
      });
    });
  }

  const countVideos = (name) =>
    countMap[name.toLowerCase()] || 0;

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

    const list = sortList(
      allCategories.filter(c =>
        (letter === "all" || c.name.toUpperCase().startsWith(letter)) &&
        (!currentSearch || c.name.toLowerCase().includes(currentSearch.toLowerCase())) &&
        (!activeTheme || (Array.isArray(c.theme) ? c.theme.includes(activeTheme) : c.theme === activeTheme))
      )
    );

    list.forEach(cat => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <a href="../details/details.html?name=${encodeURIComponent(cat.name)}&type=category">
          <div class="card-thumbnail">
            <img src="${cat.thumbnail}" alt="${cat.name}">
          </div>
          <div class="card-title">${cat.name}</div>
          <div class="card-count">${countVideos(cat.name)} video${countVideos(cat.name) === 1 ? "" : "s"}</div>
        </a>
      `;

      container.appendChild(card);
    });
  }

  window.addEventListener("alphabet-change", e => {
    const { letter } = e.detail;

    if (letter === "random") {
      const r = allCategories[Math.floor(Math.random() * allCategories.length)];
      if (r) {
        window.location.href =
          `../details/details.html?name=${encodeURIComponent(r.name)}&type=category`;
      }
    } else {
      render(letter);
    }
  });

  window.addEventListener("sort-change", (e) => {
    sortMode = e.detail.mode;
    localStorage.setItem("sort_categories.html", sortMode);
    render(currentLetter);
  });

  window.addEventListener("search-change", (e) => {
    currentSearch = e.detail.query;
    render(currentLetter);
  });

  render();
});