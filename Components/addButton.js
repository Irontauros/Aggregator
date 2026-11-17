let currentFormKey = null;
let currentType = null;

const routeMap = {
  video:     "videos",
  feature:   "features",
  short:     "shorts",
  website:   "websites",
  celebrity: "celebrities",
  actor:     "actors",
  hentai:    "hentai"
};

const pageMap = {
  short:     "/shorts/shorts.html",
  actor:     "/actors/actors.html",
  celebrity: "/celebrities/celebrities.html",
  website:   "/websites/websites.html",
  hentai:    "/hentai/hentai.html",
  feature:   "/features/features.html"
};

const THEME_TYPES = ["short", "hentai", "website", "feature"];
const RATING_TYPES = ["hentai"];
const MAX_BULK = 50;

let allThemes = [];
let themeDropdown = null;
let selectedRating = 0;
let ratingPicker = null;
let bulkMode = false;
let bulkAdded = false;

function createThemeDropdown(themes, onChange) {
  const wrapper = document.createElement("div");
  wrapper.id = "modal-theme";
  wrapper.className = "custom-sort";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "custom-sort-button";
  button.textContent = "No theme";

  const menu = document.createElement("div");
  menu.className = "custom-sort-menu";

  let value = "";

  function renderMenu() {
    menu.innerHTML = "";

    [{ value: "", label: "No theme" }, ...themes.map(t => ({ value: t, label: t }))]
      .forEach(opt => {
        const item = document.createElement("div");
        item.className = "custom-sort-item" + (opt.value === value ? " active" : "");
        item.textContent = opt.label;
        item.dataset.value = opt.value;

        item.onclick = () => {
          value = opt.value;
          button.textContent = opt.label || "No theme";

          menu.querySelectorAll(".custom-sort-item").forEach(i => i.classList.remove("active"));
          item.classList.add("active");
          menu.classList.remove("open");

          onChange?.(value);
        };

        menu.appendChild(item);
      });
  }

  button.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    menu.classList.toggle("open");
  };

  document.addEventListener("click", () => menu.classList.remove("open"));

  renderMenu();

  wrapper.appendChild(button);
  wrapper.appendChild(menu);

  return {
    element: wrapper,
    getValue: () => value,
    setValue(v) {
      value = v || "";
      button.textContent = value || "No theme";
      menu.querySelectorAll(".custom-sort-item").forEach(item => {
        item.classList.toggle("active", item.dataset.value === value);
      });
    }
  };
}

async function ensureThemeField(modal) {
  if (!themeDropdown) {
    try {
      allThemes = await fetch("/themes").then(r => r.json());
    } catch (err) {
      console.error("Could not load theme suggestions:", err);
      allThemes = [];
    }

    themeDropdown = createThemeDropdown(allThemes, value => {
      const raw = localStorage.getItem(currentFormKey);
      const draft = raw ? JSON.parse(raw) : {};
      draft.theme = value;
      localStorage.setItem(currentFormKey, JSON.stringify(draft));
    });
  }

  if (!modal.contains(themeDropdown.element)) {
    modal.querySelector("#modal-name")?.insertAdjacentElement("afterend", themeDropdown.element);
  }

  return themeDropdown;
}

function createStarPicker(onChange) {
  const wrapper = document.createElement("div");
  wrapper.className = "rating-picker";

  const empty = document.createElement("span");
  empty.className = "stars-empty";
  empty.textContent = "★★★★★";

  const filled = document.createElement("span");
  filled.className = "stars-filled";
  filled.textContent = "★★★★★";

  wrapper.appendChild(empty);
  wrapper.appendChild(filled);

  function setWidth(v) {
    filled.style.width = `${(v / 5) * 100}%`;
  }

  function valueFromEvent(e) {
    const rect = wrapper.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? rect.left;
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const slot = Math.ceil((x / rect.width) * 10);
    return Math.min(5, Math.max(0.5, slot / 2));
  }

  wrapper.addEventListener("pointermove", e => {
    setWidth(valueFromEvent(e));
  });

  wrapper.addEventListener("pointerleave", () => {
    setWidth(selectedRating);
  });

  wrapper.addEventListener("click", e => {
    const clicked = valueFromEvent(e);
    selectedRating = (clicked === selectedRating) ? 0 : clicked;
    setWidth(selectedRating);
    onChange?.(selectedRating);
  });

  setWidth(selectedRating);

  return {
    element: wrapper,
    setValue(v) {
      selectedRating = v || 0;
      setWidth(selectedRating);
    }
  };
}

function ensureRatingField(modal) {
  let ratingWrapper = modal.querySelector("#modal-rating-field");

  if (!ratingWrapper) {
    ratingWrapper = document.createElement("div");
    ratingWrapper.id = "modal-rating-field";

    const label = document.createElement("label");
    label.textContent = "Rating:";

    ratingPicker = createStarPicker(() => {
      const raw = localStorage.getItem(currentFormKey);
      const draft = raw ? JSON.parse(raw) : {};
      draft.rating = selectedRating;
      localStorage.setItem(currentFormKey, JSON.stringify(draft));
    });

    ratingWrapper.appendChild(label);
    ratingWrapper.appendChild(ratingPicker.element);

    const themeFieldEl = modal.querySelector("#modal-theme");
    const nameFieldEl = modal.querySelector("#modal-name");
    (themeFieldEl || nameFieldEl)?.insertAdjacentElement("afterend", ratingWrapper);
  }

  return ratingWrapper;
}

function setFeedback(modal, text, isError) {
  const el = modal.querySelector("#feedback-message");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = isError ? "#ff5555" : "#00ff88";
  el.style.whiteSpace = "pre-line";
}

function renderBulkInputs(modal, count) {
  const container = modal.querySelector("#modal-bulk-names");
  if (!container) return;

  const target = Math.min(Math.max(count || 0, 0), MAX_BULK);

  while (container.children.length > target) {
    container.removeChild(container.lastChild);
  }

  while (container.children.length < target) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "modal-bulk-name";
    input.autocomplete = "off";
    input.placeholder = `Name ${container.children.length + 1}`;
    container.appendChild(input);
  }
}

function applyBulkMode(modal, on) {
  bulkMode = on;

  const nameInput = modal.querySelector("#modal-name");
  const bulkBox = modal.querySelector("#modal-bulk");
  const toggle = modal.querySelector("#modal-bulk-toggle");
  const enterBtn = modal.querySelector("#enter-modal-button");
  const eLabel = capitalize(modal.dataset.entityType || "network");

  if (nameInput) nameInput.style.display = on ? "none" : "";
  if (bulkBox) bulkBox.style.display = on ? "flex" : "none";
  if (toggle) toggle.textContent = on ? "Add One" : "Add in Bulk";
  if (enterBtn) enterBtn.textContent = on ? `Add All ${eLabel}` : `Add ${eLabel}`;

  setFeedback(modal, "");
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

async function loadModalHTML() {
  const slot = document.getElementById("add-item-slot");
  if (!slot) return;

  try {
    slot.innerHTML = await fetch("/components/addButton.html").then(r => r.text());
    bindModalButtons();
  } catch (err) {
    console.error("Failed to load AddButton modal:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadModalHTML);

async function openModal(type, mode = "add", data = null) {
  if (!type) return;

  currentType = type;
  currentFormKey = `addModalForm-${type}`;
  bulkAdded = false;

  const modal      = document.getElementById("add-modal");
  const title      = document.getElementById("modal-title");
  const nameInput  = document.getElementById("modal-name");
  const thumbInput = document.getElementById("modal-thumbnail");
  const linkInput  = document.getElementById("modal-link");
  const enterBtn   = document.getElementById("enter-modal-button");
  const bulkToggle = document.getElementById("modal-bulk-toggle");

  if (!modal || !title || !nameInput || !thumbInput || !enterBtn) {
    console.error("Modal elements missing");
    return;
  }

  if (linkInput) {
    linkInput.style.display = ["website", "short", "celebrity", "hentai"].includes(type)
      ? "block"
      : "none";
  }

  thumbInput.style.display = ["entity", "website"].includes(type) ? "none" : "";

  const showTheme = THEME_TYPES.includes(type);
  const dropdown = showTheme ? await ensureThemeField(modal) : themeDropdown;
  const themeEl = modal.querySelector("#modal-theme");
  if (themeEl) themeEl.style.display = showTheme ? "" : "none";

  const showRating = RATING_TYPES.includes(type);
  const ratingWrapper = showRating ? ensureRatingField(modal) : modal.querySelector("#modal-rating-field");
  if (ratingWrapper) ratingWrapper.style.display = showRating ? "" : "none";

  const canBulk = type === "entity" && mode !== "update";
  if (bulkToggle) bulkToggle.style.display = canBulk ? "" : "none";

  if (mode === "update" && data) {
    nameInput.value  = data.name      || "";
    thumbInput.value = data.thumbnail || "";
    if (linkInput) linkInput.value = data.url || "";
    if (showTheme && dropdown) dropdown.setValue(data.theme || "");
    if (showRating && ratingPicker) ratingPicker.setValue(data.rating || 0);

    const label = type === "entity"
      ? (data.entityType || "network")
      : type;

    title.textContent = `Update ${capitalize(label)}`;
    enterBtn.textContent = "Update";
    modal.dataset.updateId = data.id;
    modal.dataset.entityType = data.entityType || "";
    modal.dataset.networkId  = data.networkId  || "";
    modal.dataset.studioId   = data.studioId   || "";

  } else {
    const saved = JSON.parse(localStorage.getItem(currentFormKey) || "{}");
    nameInput.value  = saved.name      || "";
    thumbInput.value = saved.thumbnail || "";
    if (linkInput) linkInput.value = saved.url || "";
    if (showTheme && dropdown) dropdown.setValue(saved.theme || "");
    if (showRating && ratingPicker) ratingPicker.setValue(saved.rating || 0);

    if (type === "entity") {
      const params     = new URLSearchParams(location.search);
      const entityType = params.get("type")      || "network";
      const networkId  = params.get("networkId") || "";
      const studioId   = params.get("studioId")  || "";

      const eLabel = capitalize(entityType);
      title.textContent    = `Add ${eLabel}`;
      enterBtn.textContent = `Add ${eLabel}`;

      modal.dataset.entityType = entityType;
      modal.dataset.networkId  = networkId;
      modal.dataset.studioId   = studioId;
    } else {
      title.textContent    = `Add ${capitalize(type)}`;
      enterBtn.textContent = "Add";
    }

    delete modal.dataset.updateId;
  }

  const countInput = modal.querySelector("#modal-bulk-count");
  const namesBox = modal.querySelector("#modal-bulk-names");
  if (countInput) countInput.value = "";
  if (namesBox) namesBox.innerHTML = "";
  applyBulkMode(modal, false);

  modal.style.display = "flex";
}

function buildEntityEndpoint(modal, isUpdate) {
  const entityType = modal.dataset.entityType || "network";
  const networkId  = modal.dataset.networkId;
  const studioId   = modal.dataset.studioId;
  const updateId   = modal.dataset.updateId;

  if (isUpdate) {
    if (entityType === "network") return { method: "PUT", url: `/entities/networks/${updateId}` };
    if (entityType === "studio")  return { method: "PUT", url: `/entities/studios/${updateId}` };
    if (entityType === "series")  return { method: "PUT", url: `/entities/series/${updateId}` };
  } else {
    if (entityType === "network") return { method: "POST", url: `/entities/networks` };
    if (entityType === "studio")  return { method: "POST", url: `/entities/networks/${networkId}/studios` };
    if (entityType === "series")  return { method: "POST", url: `/entities/networks/${networkId}/studios/${studioId}/series` };
  }

  return null;
}

async function submitBulk(modal) {
  const enterBtn = modal.querySelector("#enter-modal-button");
  const inputs = [...modal.querySelectorAll("#modal-bulk-names .modal-bulk-name")];

  const seen = new Set();
  const items = [];

  inputs.forEach(input => {
    const name = input.value.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ input, name });
  });

  if (!items.length) {
    setFeedback(modal, "Enter at least one name", true);
    return;
  }

  const built = buildEntityEndpoint(modal, false);
  if (!built) {
    setFeedback(modal, "Could not determine endpoint", true);
    return;
  }

  enterBtn.disabled = true;

  const failures = [];
  let added = 0;

  for (let i = 0; i < items.length; i++) {
    const { input, name } = items[i];
    setFeedback(modal, `Adding ${i + 1} of ${items.length}...`, false);

    try {
      const res = await fetch(built.url, {
        method: built.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });

      if (res.ok) {
        added++;
        bulkAdded = true;
        input.remove();
      } else {
        const text = await res.text();
        failures.push(`${name}: ${text}`);
      }
    } catch (err) {
      console.error("Bulk entity error:", err);
      failures.push(`${name}: network error`);
    }
  }

  enterBtn.disabled = false;

  const remaining = modal.querySelectorAll("#modal-bulk-names .modal-bulk-name");
  const countInput = modal.querySelector("#modal-bulk-count");
  if (countInput) countInput.value = remaining.length || "";

  if (!failures.length) {
    modal.style.display = "none";
    location.reload();
    return;
  }

  setFeedback(
    modal,
    `Added ${added}, failed ${failures.length}. The failed ones are still in the list.\n${failures.join("\n")}`,
    true
  );
}

function bindModalButtons() {
  const modal = document.getElementById("add-modal");
  if (!modal) return;

  const closeBtn   = modal.querySelector("#close-modal-button");
  const resetBtn   = modal.querySelector("#reset-modal-button");
  const enterBtn   = modal.querySelector("#enter-modal-button");
  const nameInput  = modal.querySelector("#modal-name");
  const thumbInput = modal.querySelector("#modal-thumbnail");
  const linkInput  = modal.querySelector("#modal-link");
  const bulkToggle = modal.querySelector("#modal-bulk-toggle");
  const bulkCount  = modal.querySelector("#modal-bulk-count");

  bulkToggle?.addEventListener("click", () => {
    applyBulkMode(modal, !bulkMode);
  });

  bulkCount?.addEventListener("input", () => {
    renderBulkInputs(modal, parseInt(bulkCount.value, 10));
  });

  closeBtn?.addEventListener("click", () => {
    modal.style.display = "none";
    if (bulkAdded) location.reload();
  });

  resetBtn?.addEventListener("click", () => {
    if (bulkMode) {
      if (bulkCount) bulkCount.value = "";
      const namesBox = modal.querySelector("#modal-bulk-names");
      if (namesBox) namesBox.innerHTML = "";
      setFeedback(modal, "");
      return;
    }

    nameInput.value  = "";
    thumbInput.value = "";
    if (linkInput) linkInput.value = "";
    themeDropdown?.setValue("");
    if (ratingPicker) ratingPicker.setValue(0);
    localStorage.removeItem(currentFormKey);
  });

  enterBtn?.addEventListener("click", async () => {
    if (bulkMode) {
      await submitBulk(modal);
      return;
    }

    const isUpdate    = !!modal.dataset.updateId;
    const isEntity    = currentType === "entity";
    const noThumbnail = isEntity || currentType === "website";

    const payload = {
      name: nameInput.value.trim()
    };

    if (!noThumbnail) {
      payload.thumbnail = thumbInput.value.trim();
    }

    if (THEME_TYPES.includes(currentType) && themeDropdown) {
      payload.theme = themeDropdown.getValue();
    }

    if (RATING_TYPES.includes(currentType)) {
      payload.rating = selectedRating || 0;
    }

    if (!isEntity) {
      payload.url           = linkInput?.value.trim();
      payload.categories    = [];
      payload.pornstarNames = [];
      payload.network       = [];
      payload.studios       = [];
      payload.series        = [];
    }

    let method, endpoint;

    if (isEntity) {
      const built = buildEntityEndpoint(modal, isUpdate);
      if (!built) {
        alert("Could not determine endpoint");
        return;
      }
      method   = built.method;
      endpoint = built.url;
    } else {
      method   = isUpdate ? "PUT" : "POST";
      endpoint = `/${routeMap[currentType] || currentType}${isUpdate ? "/" + modal.dataset.updateId : ""}`;
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const text = await res.text();
        alert(`Error: ${text}`);
        return;
      }

      localStorage.removeItem(currentFormKey);
      modal.style.display = "none";

      if (isEntity) {
        location.reload();
        return;
      }

      window.dispatchEvent(new CustomEvent("item-updated", {
        detail: { type: currentType }
      }));

      if (isUpdate && pageMap[currentType]) {
        window.location.href = pageMap[currentType];
      }

    } catch (err) {
      console.error("Modal submit error:", err);
    }
  });

  function saveDraft() {
    if (bulkMode) return;

    const draft = {
      name:      nameInput.value,
      thumbnail: thumbInput.value,
      url:       linkInput?.value || "",
      theme:     themeDropdown?.getValue() || "",
      rating:    RATING_TYPES.includes(currentType) ? (selectedRating || 0) : undefined
    };
    localStorage.setItem(currentFormKey, JSON.stringify(draft));
  }

  [nameInput, thumbInput, linkInput].forEach(input => {
    input?.addEventListener("input", saveDraft);
  });
}

window.addEventListener("open-add-modal", e => {
  const { type, mode, data } = e.detail || {};
  const slot = document.getElementById("add-item-slot");

  if (!slot || slot.innerHTML.trim() === "") {
    loadModalHTML().then(() => openModal(type, mode, data));
  } else {
    openModal(type, mode, data);
  }
});

document.addEventListener("click", e => {
  const btn = e.target.closest("#addButton");
  if (!btn) return;
  openModal(btn.dataset.type, "add");
});