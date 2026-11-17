// /Components/editSystem.js

window.addEventListener("header-loaded", () => {

  function getContainer() {
    return document.getElementById("videos")      ||
           document.getElementById("shorts")      ||
           document.getElementById("actors")      ||
           document.getElementById("websites")    ||
           document.getElementById("celebrities") ||
           document.getElementById("hentai")      ||
           document.getElementById("features")    ||
           document.getElementById("entities")    ||
           document.getElementById("details")     ||
           document.getElementById("incomplete");
  }

  function setMode(container, mode) {
    if (!container) return;

    container.dataset.mode = mode;

    const cards = container.querySelectorAll(".card");

    cards.forEach(card => {
      card.classList.remove("edit-mode", "delete-mode");
      if (mode === "edit")   card.classList.add("edit-mode");
      if (mode === "delete") card.classList.add("delete-mode");
    });

    window.dispatchEvent(new CustomEvent("mode-change", {
      detail: { mode }
    }));
  }

  const typeMap = {
    videos:      "video",
    shorts:      "short",
    actors:      "actor",
    websites:    "website",
    celebrities: "celebrity",
    hentai:      "hentai",
    features:    "feature"
  };

  const deleteRouteMap = {
    videos:      "videos",
    shorts:      "shorts",
    websites:    "websites",
    celebrities: "celebrities",
    hentai:      "hentai",
    features:    "features",
    details:     "videos",
    incomplete:  "videos",
    actors:      "actors"
  };

  // =========================
  // CARD CLICK HANDLER
  // =========================
  document.addEventListener("click", async e => {
    const card = e.target.closest(".card");
    if (!card) return;

    const container = getContainer();
    if (!container) return;

    const mode = container.dataset.mode || "view";
    const id   = card.dataset.id;

    if (!id) return;

    // =========================
    // DELETE MODE
    // =========================
    if (mode === "delete") {
      const ok = confirm("Delete this item?");
      if (!ok) return;

      let route;
      if (container.id === "incomplete") {
        const params = new URLSearchParams(location.search);
        const incompleteType = params.get("type") || "videos";
        route = incompleteType;
      } else {
        route = deleteRouteMap[container.id];
      }

      if (!route) return;

      try {
        const res = await fetch(`/${route}/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Delete failed");
        location.reload();
      } catch (err) {
        console.error(err);
        alert("Delete failed");
      }
      return;
    }

    // =========================
    // EDIT MODE
    // =========================
    if (mode === "edit") {
      let rawType;
      if (container.id === "incomplete") {
        const params = new URLSearchParams(location.search);
        rawType = params.get("type") || "";
      } else {
        rawType = container.id;
      }

      if (rawType === "videos") {
        window.location.href = `/addVideo/addVideo.html?edit=${id}`;
        return;
      }

      if (rawType === "features") {
        window.location.href = `/addVideo/addVideo.html?edit=${id}&type=feature`;
        return;
      }

      // =========================
      // ENTITY EDIT
      // =========================
      if (rawType === "entities") {
        let item = {};
        try {
          item = JSON.parse(card.dataset.item || "{}");
        } catch {
          item = { id };
        }

        window.dispatchEvent(new CustomEvent("open-add-modal", {
          detail: {
            type: "entity",
            mode: "update",
            data: {
              ...item,
              id,
              entityType: card.dataset.entityType || "",
              networkId:  card.dataset.networkId  || "",
              studioId:   card.dataset.studioId   || ""
            }
          }
        }));
        return;
      }

      const modalType = typeMap[rawType];
      if (!modalType) {
        console.error("Unknown type for modal:", rawType);
        return;
      }

      let item = {};
      try {
        item = JSON.parse(card.dataset.item || "{}");
      } catch {
        item = { id };
      }

      window.dispatchEvent(new CustomEvent("open-add-modal", {
        detail: { type: modalType, mode: "update", data: { ...item, id } }
      }));
      return;
    }

    // =========================
    // VIEW MODE — entities navigate, don't open URL
    // =========================
    if (container.id === "entities") return;

    const url = card.dataset.url;
    if (url) window.open(url, "_blank");
  });

  // =========================
  // EDIT BUTTON
  // =========================
  document.addEventListener("click", e => {
    const btn = e.target.closest("#editButton");
    if (!btn) return;

    const container = getContainer();
    if (!container) return;

    const newMode = container.dataset.mode === "edit" ? "view" : "edit";
    setMode(container, newMode);
  });

  // =========================
  // DELETE BUTTON
  // =========================
  document.addEventListener("click", e => {
    const btn = e.target.closest("#deleteButton");
    if (!btn) return;

    const container = getContainer();
    if (!container) return;

    const newMode = container.dataset.mode === "delete" ? "view" : "delete";
    setMode(container, newMode);
  });

  // =========================
  // INIT STATE
  // =========================
  const container = getContainer();
  if (container) container.dataset.mode = "view";
});