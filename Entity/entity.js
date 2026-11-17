// /entities/entities.js

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("entities");
  if (!container) return;

  const params = new URLSearchParams(location.search);
  const type = params.get("type");
  const networkId = params.get("networkId");
  const studioId = params.get("studioId");

  const VALID_TYPES = ["network", "studio", "series"];
  if (!VALID_TYPES.includes(type)) {
    container.textContent = "⚠ Invalid entity type";
    return;
  }

  let data, allVideos;
  let countMap = {};
  let currentLetter = "all";
  let currentSearch = "";
  let sortMode = localStorage.getItem("sort_entity.html") || "alpha";

  try {
    const [entitiesRes, videosRes] = await Promise.all([
      fetch("/entities"),
      fetch("/videos/all")
    ]);

    data = await entitiesRes.json();
    allVideos = await videosRes.json();

    buildCounts();
  } catch {
    container.textContent = "⚠ Failed to load data";
    return;
  }

  const networks = data.networks || [];
  const allStudios = networks.flatMap(n => n.studios || []);

  function resolveEntities() {
    if (type === "network") return networks;

    if (type === "studio") {
      if (!networkId) return allStudios;
      const net = networks.find(n => String(n.id) === String(networkId));
      return net?.studios || [];
    }

    if (type === "series") {
      if (studioId) {
        const studio = allStudios.find(s => String(s.id) === String(studioId));
        return studio?.series || [];
      }

      if (networkId) {
        const net = networks.find(n => String(n.id) === String(networkId));
        return net ? net.studios.flatMap(s => s.series || []) : [];
      }

      return allStudios.flatMap(s => s.series || []);
    }

    return [];
  }

  const entities = resolveEntities();

  // =========================
  // COUNT
  // =========================
  function buildCounts() {
    countMap = {};

    allVideos.forEach(v => {
      let value = v[type];

      if (!value) {
        if (type === "studio")  value = v.studio || v.studios;
        if (type === "network") value = v.network;
        if (type === "series")  value = v.series;
      }

      if (!value) return;

      if (Array.isArray(value)) {
        value.forEach(val => {
          const key = val.toLowerCase();
          countMap[key] = (countMap[key] || 0) + 1;
        });
      } else {
        const key = value.toLowerCase();
        countMap[key] = (countMap[key] || 0) + 1;
      }
    });
  }

  const countVideos = (name) => countMap[name.toLowerCase()] || 0;

  // =========================
  // SORT
  // =========================
  function sortList(list) {
    const arr = [...list];

    switch (sortMode) {
      case "count":
      case "recent":
        return arr.sort((a, b) => countVideos(b.name) - countVideos(a.name));
      case "count-reverse":
      case "oldest":
        return arr.sort((a, b) => countVideos(a.name) - countVideos(b.name));
      case "alpha":
        return arr.sort((a, b) => a.name.localeCompare(b.name));
      case "alpha-reverse":
        return arr.sort((a, b) => b.name.localeCompare(a.name));
      default:
        return arr;
    }
  }

  // =========================
  // RENDER
  // =========================
  function render(letter = "all") {
    currentLetter = letter;
    container.innerHTML = "";

    let list = sortList(
      entities.filter(e =>
        (letter === "all" || e.name.toUpperCase().startsWith(letter)) &&
        (!currentSearch || e.name.toLowerCase().includes(currentSearch.toLowerCase()))
      )
    );

    if (
      letter === "all" &&
      (
        (type === "studio" && networkId) ||
        (type === "series" && studioId)
      )
    ) {
      list = [{ id: "all", name: "All Videos" }, ...list];
    }

    list.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";

      if (item.id === "all") {
        card.classList.add("all-videos-card");
        card.innerHTML = `<div class="all-videos-button">VIEW ALL VIDEOS</div>`;
      } else {
        // ✅ dataset attributes for edit system
        card.dataset.id         = item.id;
        card.dataset.entityType = type;
        card.dataset.networkId  = networkId || "";
        card.dataset.studioId   = studioId  || "";
        card.dataset.item       = JSON.stringify(item);

        card.classList.add("entity-card-text-only");

        const count = countVideos(item.name);
        const eyebrowLabel = { network: "Network", studio: "Studio", series: "Series" }[type] || "";

        card.innerHTML = `
          <div class="entity-card-eyebrow">${eyebrowLabel}</div>
          <div class="entity-card-rule"></div>
          <div class="entity-card-title">${item.name}</div>
          <div class="card-count">${count} video${count === 1 ? "" : "s"}</div>
        `;
      }

      card.addEventListener("click", () => {
        // ✅ block navigation in edit mode
        const mode = container.dataset.mode || "view";
        if (mode === "edit" || mode === "delete") return;

        if (item.id === "all") {
          if (type === "studio" && networkId) {
            const net = networks.find(n => String(n.id) === String(networkId));
            if (net) {
              location.href =
                `../Details/details.html?type=network&name=${encodeURIComponent(net.name)}`;
            }
          }

          if (type === "series" && studioId) {
            const studio = allStudios.find(s => String(s.id) === String(studioId));
            const net = networks.find(n => String(n.id) === String(networkId));
            if (studio) {
              location.href =
                `../Details/details.html?type=studio&name=${encodeURIComponent(studio.name)}&network=${encodeURIComponent(net?.name || "")}`;
            }
          }
          return;
        }

        if (type === "network") {
          location.href = `entity.html?type=studio&networkId=${item.id}`;
        } else if (type === "studio") {
          location.href = `entity.html?type=series&networkId=${networkId}&studioId=${item.id}`;
        } else {
          const studio = allStudios.find(s => String(s.id) === String(studioId));
          const net = networks.find(n => String(n.id) === String(networkId));
          location.href =
            `../Details/details.html?type=series&name=${encodeURIComponent(item.name)}&studio=${encodeURIComponent(studio?.name || "")}&network=${encodeURIComponent(net?.name || "")}`;
        }
      });

      container.appendChild(card);
    });

    if (!list.length) {
      container.innerHTML = `<p>No results found.</p>`;
    }
  }

  // =========================
  // EVENTS
  // =========================
  window.addEventListener("alphabet-change", e => {
    if (e.detail.letter === "random" && entities.length) {
      const r = entities[Math.floor(Math.random() * entities.length)];

      if (type === "network") {
        location.href = `entity.html?type=studio&networkId=${r.id}`;
      } else if (type === "studio") {
        location.href = `entity.html?type=series&networkId=${networkId}&studioId=${r.id}`;
      } else {
        const studio = allStudios.find(s => String(s.id) === String(studioId));
        const net = networks.find(n => String(n.id) === String(networkId));
        location.href =
          `../Details/details.html?type=series&name=${encodeURIComponent(r.name)}&studio=${encodeURIComponent(studio?.name || "")}&network=${encodeURIComponent(net?.name || "")}`;
      }
    } else {
      render(e.detail.letter);
    }
  });

  window.addEventListener("sort-change", (e) => {
    sortMode = e.detail.mode;
    localStorage.setItem("sort_entity.html", sortMode);
    render(currentLetter);
  });

  window.addEventListener("search-change", (e) => {
    currentSearch = e.detail.query;
    render(currentLetter);
  });

  render();
});