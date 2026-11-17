// /Add/addVideo.js

document.addEventListener("DOMContentLoaded", async () => {

const form = document.getElementById("videoForm");

const categoriesList = document.getElementById("categories-list");
const pornstarsNamesContainer = document.getElementById("pornstars-names");

const categoriesSearchInput = document.getElementById("category-search");
const pornstarsCountInput = document.getElementById("pornstars-count");

const feedbackMessage = document.getElementById("feedback-message");
const resetButton = document.getElementById("reset-form-button");

const submitButton = document.getElementById("add-video-button");

const selectAllCategoriesBtn = document.getElementById("select-all-categories");
const clearAllCategoriesBtn = document.getElementById("clear-all-categories");
const autosaveIndicator = document.getElementById("autosave-indicator");

const sourceTiles = document.querySelectorAll(".source-tile");
const sourceSearchInput = document.getElementById("source-search");
const sourceList = document.getElementById("source-list");
const sourceContainer = document.getElementById("source-selection-container");

const toggleBtn = document.getElementById("toggle-form-type");

const toggleBulkBtn = document.getElementById("toggle-bulk-mode");
const singleVideoFields = document.getElementById("single-video-fields");
const bulkFields = document.getElementById("bulk-fields");
const bulkCountInput = document.getElementById("bulk-count");
const bulkLinksContainer = document.getElementById("bulk-links");
const videoLinkInput = document.getElementById("video-link");
const titleInput = document.getElementById("video-title");
const thumbnailInput = document.getElementById("thumbnail-link");
const linkPreviewStatus = document.getElementById("link-preview-status");

const params = new URLSearchParams(window.location.search);
const editId = params.get("edit");

// =========================================================
// STAR RATING PICKER — Letterboxd-style clickable stars, half-star
// precision. No number input: the value only ever lands on 0, 0.5,
// 1, 1.5 ... 5, since each star is split into two clickable halves.
// Clicking the currently-selected value again clears it back to 0.
// =========================================================
let selectedRating = 0;
let ratingPicker = null;

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

let ratingWrapper = document.getElementById("rating-field");

if (!ratingWrapper) {
  ratingWrapper = document.createElement("div");
  ratingWrapper.id = "rating-field";

  const label = document.createElement("label");
  label.textContent = "Rating:";

  ratingPicker = createStarPicker(() => saveState());

  ratingWrapper.appendChild(label);
  ratingWrapper.appendChild(ratingPicker.element);
}

// =========================================================
// THEME FIELD — custom dropdown (same look as the sort menu), not a
// native <select>, since <select> popups can't be styled (white
// flash on open, default blue hover) in most browsers.
// =========================================================
let themeWrapper = document.getElementById("theme-filter-field");
let allThemes = [];
let selectedTheme = "";

if (!themeWrapper) {
  themeWrapper = document.createElement("div");
  themeWrapper.id = "theme-filter-field";
  themeWrapper.className = "custom-sort";

  const themeButton = document.createElement("button");
  themeButton.type = "button";
  themeButton.className = "custom-sort-button";
  themeButton.textContent = "No theme";

  const themeMenu = document.createElement("div");
  themeMenu.className = "custom-sort-menu";

  themeButton.onclick = e => {
    e.preventDefault();
    e.stopPropagation();
    themeMenu.classList.toggle("open");
  };
  document.addEventListener("click", () => themeMenu.classList.remove("open"));

  themeWrapper.appendChild(themeButton);
  themeWrapper.appendChild(themeMenu);

  // Always right after the network/studio/series section (falls back
  // to right after the title if that section doesn't exist, e.g.
  // feature mode)
  if (sourceContainer) {
    sourceContainer.insertAdjacentElement("afterend", themeWrapper);
  } else if (titleInput) {
    titleInput.insertAdjacentElement("afterend", themeWrapper);
  }
}

// Rating field always sits right after the theme field
themeWrapper.insertAdjacentElement("afterend", ratingWrapper);

const themeButtonEl = themeWrapper.querySelector(".custom-sort-button");
const themeMenuEl = themeWrapper.querySelector(".custom-sort-menu");

function setTheme(value) {
  selectedTheme = value || "";
  if (themeButtonEl) themeButtonEl.textContent = selectedTheme || "No theme";
  themeMenuEl?.querySelectorAll(".custom-sort-item").forEach(item => {
    item.classList.toggle("active", item.dataset.value === selectedTheme);
  });
}

function renderThemeMenu() {
  if (!themeMenuEl) return;
  themeMenuEl.innerHTML = "";

  [{ value: "", label: "No theme" }, ...allThemes.map(t => ({ value: t, label: t }))]
    .forEach(opt => {
      const item = document.createElement("div");
      item.className = "custom-sort-item" + (opt.value === selectedTheme ? " active" : "");
      item.textContent = opt.label;
      item.dataset.value = opt.value;

      item.onclick = () => {
        setTheme(opt.value);
        themeMenuEl.classList.remove("open");
        saveState();
      };

      themeMenuEl.appendChild(item);
    });
}

// =========================================================
// FEATURE MODE — detect ?type=feature or ?feature=true
// =========================================================
let isFeatureMode = params.get("type") === "feature";

function applyFeatureMode() {
  if (isFeatureMode) {
    if (sourceContainer) sourceContainer.style.display = "none";
    submitButton.textContent = editId ? "Update Feature" : "Add Feature";
    toggleBtn.textContent = "Switch to Video";
    document.title = editId ? "Edit Feature" : "Add Feature";
  } else {
    if (sourceContainer) sourceContainer.style.display = "";
    submitButton.textContent = editId ? "Update Video" : "Add Video";
    toggleBtn.textContent = "Switch to Feature";
    document.title = editId ? "Edit Video" : "Add Video";
  }
}

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    isFeatureMode = !isFeatureMode;

    // Bulk-add only makes sense for videos, not features
    if (isFeatureMode && isBulkMode) {
      isBulkMode = false;
      applyBulkMode();
    }

    applyFeatureMode();
    if (toggleBulkBtn) toggleBulkBtn.style.display = (editId || isFeatureMode) ? "none" : "";
  });
}

// =========================================================
// BULK MODE — add many videos at once, URL only
// =========================================================
let isBulkMode = false;

function applyBulkMode() {
  if (isBulkMode) {
    singleVideoFields.style.display = "none";
    bulkFields.style.display = "";
    videoLinkInput.required = false;
    submitButton.textContent = "Add All Videos";
    toggleBulkBtn.textContent = "Switch to Single";
  } else {
    singleVideoFields.style.display = "";
    bulkFields.style.display = "none";
    videoLinkInput.required = true;
    submitButton.textContent = editId ? "Update Video" : "Add Video";
    toggleBulkBtn.textContent = "Add in Bulk";
  }
}

if (toggleBulkBtn) {
  toggleBulkBtn.addEventListener("click", () => {
    isBulkMode = !isBulkMode;
    applyBulkMode();
    saveState();
  });
}

/* =========================
   BULK LINK INPUTS
========================= */
function createBulkLinkInput(value = "", i = 0) {
  const wrapper = document.createElement("div");
  wrapper.className = "actor-wrapper";

  const input = document.createElement("input");
  input.type = "url";
  input.className = "bulk-link-input";
  input.placeholder = `Video ${i + 1} link`;
  input.value = value;
  input.autocomplete = "off";

  input.addEventListener("input", saveState);

  wrapper.appendChild(input);
  bulkLinksContainer.appendChild(wrapper);
}

if (bulkCountInput) {
  bulkCountInput.addEventListener("input", e => {
    const count = parseInt(e.target.value, 10) || 0;
    const old = [...document.querySelectorAll(".bulk-link-input")].map(i => i.value);

    bulkLinksContainer.innerHTML = "";

    for (let i = 0; i < count; i++) {
      createBulkLinkInput(old[i] || "", i);
    }

    saveState();
  });
}

/* =========================
   VIDEO LINK -> AUTO-FILL PREVIEW
   When a link is pasted/typed into the single-add Video Link field,
   ask the server to scrape the page's title/thumbnail and drop them
   into the form so the person can look, edit, or clear before
   submitting. Never overwrites a field the person already filled in.
   Bulk mode doesn't show these fields at all, so it's skipped there
   — the server backfills bulk videos on its own when they're saved.
========================= */
function setLinkPreviewStatus(text, state) {
  if (!linkPreviewStatus) return;

  linkPreviewStatus.textContent = text;
  linkPreviewStatus.classList.remove("status-loading", "status-success", "status-error");

  if (!text) {
    linkPreviewStatus.classList.remove("visible");
    return;
  }

  linkPreviewStatus.classList.add("visible", `status-${state}`);
}

async function fetchLinkPreview() {
  if (isBulkMode) return;

  const url = videoLinkInput.value.trim();

  if (!url) {
    titleInput.value = "";
    thumbnailInput.value = "";
    setLinkPreviewStatus("", null);
    return;
  }

  setLinkPreviewStatus("A obter título e imagem...", "loading");

  try {
    const res = await fetch(`/videos/preview?url=${encodeURIComponent(url)}`);

    if (!res.ok) {
      titleInput.value = "";
      thumbnailInput.value = "";
      setLinkPreviewStatus("Não foi possível obter dados do link.", "error");
      return;
    }

    const data = await res.json();

    // IMPORTANT:
    // The result belongs to the CURRENT URL, so replace the old
    // title/thumbnail instead of keeping data from the previous URL.
    titleInput.value = data.title || "";
    thumbnailInput.value = data.thumbnail || "";

    if (data.title || data.thumbnail) {
      setLinkPreviewStatus(
        "Título e/ou imagem preenchidos automaticamente.",
        "success"
      );
    } else {
      setLinkPreviewStatus(
        "Não foi encontrado título ou imagem neste link.",
        "error"
      );
    }

    saveState();

  } catch (err) {
    titleInput.value = "";
    thumbnailInput.value = "";
    setLinkPreviewStatus("Erro ao contactar o servidor.", "error");
  }
}

if (videoLinkInput) {
  videoLinkInput.addEventListener("blur", fetchLinkPreview);

  // Clear the status the moment the field is emptied, so a stale
  // success/error message doesn't linger for an empty input.
  videoLinkInput.addEventListener("input", () => {
    if (!videoLinkInput.value.trim()) setLinkPreviewStatus("", null);
  });
}

let allNetworks = [];
let allStudios = [];
let allSeries = [];
let allActors = [];

let selectedSource = { type: null, value: null };
let currentSourceItems = [];
let currentSourceType = null;
let seriesMap = {};
let studioMap = {};
let lastValidSource = { type: null, value: null };

// Holds categories pulled from localStorage until the category list
// has actually been fetched and rendered into the DOM.
let restoredCategories = [];

const STORAGE_KEY = "addVideoFormState";

/* =========================
   ACTOR DROPDOWN
========================= */
let dropdownEl = null;

// Classic edit-distance: how many single-character insertions,
// deletions, or substitutions turn `a` into `b`. Used to catch
// typos like "Reptylle" vs "Reptyle" that plain substring matching
// wouldn't flag.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function adaptiveThreshold(len) {
  return Math.min(3, Math.max(1, Math.floor(len * 0.22)));
}

function createDropdown() {
  const div = document.createElement("div");
  div.id = "actor-suggestions";
  div.style.position = "absolute";
  div.style.background = "#111";
  div.style.border = "1px solid #333";
  div.style.zIndex = "9999";
  div.style.maxHeight = "200px";
  div.style.overflowY = "auto";
  div.style.display = "none";
  document.body.appendChild(div);
  return div;
}

dropdownEl = createDropdown();

function showActorSuggestions(input) {
  const rect = input.getBoundingClientRect();
  const raw = input.value.trim();
  const value = raw.toLowerCase();

  if (!value) {
    dropdownEl.style.display = "none";
    return;
  }

  const typedWords = value.split(/\s+/).filter(w => w.length > 2);

  const scored = allActors
    .map(actor => {
      const name = actor.name || "";
      const nameLower = name.toLowerCase();
      let score = 0;
      let tag = "";

      if (nameLower === value) {
        score = 100;
      } else if (nameLower.startsWith(value)) {
        score = 90;
      } else if (nameLower.includes(value)) {
        score = 80;
      } else {
        const dist = levenshtein(nameLower, value);
        const threshold = adaptiveThreshold(Math.min(nameLower.length, value.length));

        if (dist <= threshold) {
          score = 70 - dist;
          tag = " (similar spelling?)";
        } else {
          // Shares a full first or last name word even if the rest
          // is very different — this is the "all the Johns show up"
          // behavior so you can eyeball whether one is your typo.
          const nameWords = nameLower.split(/\s+/);
          const sharesWord = typedWords.some(w => nameWords.includes(w));
          if (sharesWord) {
            score = 40;
            tag = " (same name?)";
          }
        }
      }

      return { actor, score, tag };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  if (!scored.length) {
    dropdownEl.style.display = "none";
    return;
  }

  dropdownEl.innerHTML = "";

  scored.forEach(({ actor, tag }) => {
    const item = document.createElement("div");
    item.textContent = actor.name + tag;
    item.style.padding = "6px";
    item.style.cursor = "pointer";

    item.onclick = () => {
      input.value = actor.name;
      dropdownEl.style.display = "none";
      saveState();
    };

    dropdownEl.appendChild(item);
  });

  dropdownEl.style.top = rect.bottom + window.scrollY + "px";
  dropdownEl.style.left = rect.left + window.scrollX + "px";
  dropdownEl.style.width = rect.width + "px";
  dropdownEl.style.display = "block";
}

document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("actor-input")) return;
  showActorSuggestions(e.target);
});

document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("actor-input")) {
    dropdownEl.style.display = "none";
  }
});

/* =========================
   AUTOSAVE INDICATOR
========================= */
let autosaveHideTimer = null;

function flashAutosaveIndicator() {
  if (!autosaveIndicator) return;

  autosaveIndicator.textContent = "Draft saved";
  autosaveIndicator.classList.add("visible");

  clearTimeout(autosaveHideTimer);
  autosaveHideTimer = setTimeout(() => {
    autosaveIndicator.classList.remove("visible");
  }, 1500);
}

/* =========================
   THUMBNAIL VALIDATION
========================= */
// Tries to actually load the URL as an image before we submit, so we
// can tell the user specifically "this isn't an image" instead of a
// generic save error coming back from the server later.
function validateImageUrl(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(true); // thumbnail is optional
      return;
    }

    const img = new Image();
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    }, 6000);

    img.onload = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(true);
      }
    };

    img.onerror = () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(false);
      }
    };

    img.src = url;
  });
}

/* =========================
   STATE
========================= */
function saveState() {
  const state = {
    title: document.getElementById("video-title")?.value || "",
    url: document.getElementById("video-link")?.value || "",
    thumbnail: document.getElementById("thumbnail-link")?.value || "",
    theme: selectedTheme || "",
    rating: selectedRating || 0,
    count: pornstarsCountInput?.value || "",
    actors: [...document.querySelectorAll(".actor-input")].map(i => i.value),
    categories: [...document.querySelectorAll('input[name="categories"]:checked')].map(c => c.value),
    source: selectedSource,
    isBulkMode,
    bulkCount: bulkCountInput?.value || "",
    bulkLinks: [...document.querySelectorAll(".bulk-link-input")].map(i => i.value)
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  flashAutosaveIndicator();
}

// Restores everything that CAN be restored immediately (plain inputs,
// actor fields). Categories and source are stashed for later, because
// their DOM doesn't exist yet — it's built after fetchCategories()/
// fetchEntities() resolve. See applyRestoredCategories/applyRestoredSource.
function restoreState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  const state = JSON.parse(raw);

  document.getElementById("video-title").value = state.title || "";
  document.getElementById("video-link").value = state.url || "";
  document.getElementById("thumbnail-link").value = state.thumbnail || "";
  if (themeWrapper) setTheme(state.theme || "");
  if (ratingPicker) ratingPicker.setValue(state.rating || 0);
  pornstarsCountInput.value = state.count || "";

  if (state.actors?.length) {
    pornstarsNamesContainer.innerHTML = "";
    state.actors.forEach((a, i) => createActorInput(a, i));
  }

  restoredCategories = state.categories || [];
  selectedSource = state.source || { type: null, value: null };

  isBulkMode = !!state.isBulkMode;
  bulkCountInput.value = state.bulkCount || "";
  if (state.bulkLinks?.length) {
    bulkLinksContainer.innerHTML = "";
    state.bulkLinks.forEach((l, i) => createBulkLinkInput(l, i));
  }
  applyBulkMode();
}

function applyRestoredCategories() {
  if (!restoredCategories.length) return;
  document.querySelectorAll('input[name="categories"]').forEach(cb => {
    cb.checked = restoredCategories.includes(cb.value);
  });
}

function applyRestoredSource() {
  if (!selectedSource?.type) return;

  const tile = document.querySelector(`.source-tile[data-type="${selectedSource.type}"]`);
  if (tile) {
    sourceTiles.forEach(t => t.classList.remove("active"));
    tile.classList.add("active");
  }

  // renderSource -> renderSourceList already checks the right box
  // as long as selectedSource is set before it runs.
  renderSource(selectedSource.type);
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

if (!editId) restoreState();

/* =========================
   ACTOR INPUTS
========================= */
function createActorInput(value = "", i = 0) {
  const wrapper = document.createElement("div");
  wrapper.className = "actor-wrapper";

  const input = document.createElement("input");
  input.className = "actor-input";
  input.placeholder = `Actor ${i + 1}`;
  input.value = value;

  input.addEventListener("focus", () => showActorSuggestions(input));

  wrapper.appendChild(input);
  pornstarsNamesContainer.appendChild(wrapper);
}

pornstarsCountInput.addEventListener("input", e => {
  const count = parseInt(e.target.value, 10) || 0;
  const old = [...document.querySelectorAll(".actor-input")].map(i => i.value);

  pornstarsNamesContainer.innerHTML = "";

  for (let i = 0; i < count; i++) {
    createActorInput(old[i] || "", i);
  }

  saveState();
});

/* =========================
   FETCH DATA
========================= */
async function fetchCategories() {
  const r = await fetch("/categories");
  const data = await r.json();

  categoriesList.innerHTML = "";

  data.sort((a,b)=>a.name.localeCompare(b.name))
    .forEach(c => {
      const label = document.createElement("label");
      label.className = "dropdown-option";

      label.innerHTML =
        `<input type="checkbox" name="categories" value="${c.name}"> ${c.name}`;

      categoriesList.appendChild(label);
    });
}

async function fetchEntities() {
  const r = await fetch("/entities");
  const data = await r.json();

  const n = new Set();
  const s = new Set();
  const se = new Set();

  seriesMap = {};
  studioMap = {};

  data.networks?.forEach(net => {
    if (net.name) n.add(net.name);

    net.studios?.forEach(st => {
      if (st.name) s.add(st.name);

      studioMap[st.name] = {
        network: net.name
      };

      st.series?.forEach(sr => {
        if (sr.name) se.add(sr.name);

        seriesMap[sr.name] = {
          studio: st.name,
          network: net.name
        };
      });
    });
  });

  allNetworks = [...n].sort();
  allStudios = [...s].sort();
  allSeries = [...se].sort();
}

function resolveSource(source) {
  if (!source?.type || !source.value) return {};

  const result = {};

  if (source.type === "network") {
    result.network = source.value;
  }

  if (source.type === "studio") {
    const rel = studioMap[source.value];
    result.studios = source.value;
    if (rel?.network) result.network = rel.network;
  }

  if (source.type === "series") {
    const rel = seriesMap[source.value];
    result.series = source.value;
    if (rel?.studio) result.studios = rel.studio;
    if (rel?.network) result.network = rel.network;
  }

  return result;
}

async function fetchActors() {
  const r = await fetch("/actors");
  allActors = await r.json();
}

async function fetchThemes() {
  try {
    allThemes = await (await fetch("/themes")).json();
  } catch (err) {
    console.error("Could not load themes:", err);
    allThemes = [];
  }

  renderThemeMenu();
}

/* =========================
   CATEGORY SEARCH + PERSIST
========================= */
categoriesSearchInput.addEventListener("input", () => {
  const val = categoriesSearchInput.value.toLowerCase();

  document.querySelectorAll("#categories-list label").forEach(label => {
    label.style.display = label.textContent.toLowerCase().includes(val)
      ? ""
      : "none";
  });
});

// Category boxes are created dynamically, so we delegate the change
// listener onto the (static) parent container instead of attaching
// one per checkbox.
categoriesList.addEventListener("change", (e) => {
  if (e.target.name === "categories") saveState();
});

// Only acts on the categories currently visible under the search
// filter — e.g. search "anal", then "select all" only selects matches.
function getVisibleCategoryCheckboxes() {
  return [...document.querySelectorAll("#categories-list label")]
    .filter(label => label.style.display !== "none")
    .map(label => label.querySelector('input[name="categories"]'))
    .filter(Boolean);
}

if (selectAllCategoriesBtn) {
  selectAllCategoriesBtn.addEventListener("click", () => {
    getVisibleCategoryCheckboxes().forEach(cb => { cb.checked = true; });
    saveState();
  });
}

if (clearAllCategoriesBtn) {
  clearAllCategoriesBtn.addEventListener("click", () => {
    getVisibleCategoryCheckboxes().forEach(cb => { cb.checked = false; });
    saveState();
  });
}

/* =========================
   SOURCE SYSTEM
========================= */
function renderSource(type) {
  currentSourceType = type;
  sourceSearchInput.style.display = "block";
  sourceList.style.display = "block";
  if (type === "network") currentSourceItems = allNetworks;
  if (type === "studio") currentSourceItems = allStudios;
  if (type === "series") currentSourceItems = allSeries;

  renderSourceList(currentSourceItems);
}

function renderSourceList(list) {
  sourceList.innerHTML = "";

  list.forEach(item => {
    const label = document.createElement("label");
    label.className = "dropdown-option";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = item;

    cb.checked =
      selectedSource.type === currentSourceType &&
      selectedSource.value === item;

    cb.onchange = () => {
      if (cb.checked) {
        document
          .querySelectorAll("#source-list input[type='checkbox']")
          .forEach(x => {
            if (x !== cb) x.checked = false;
          });

        selectedSource = {
          type: currentSourceType,
          value: item
        };

        lastValidSource = selectedSource;
      } else {
        selectedSource = { type: null, value: null };
      }

      saveState();
    };

    label.appendChild(cb);
    label.append(" " + item);

    sourceList.appendChild(label);
  });
}

/* =========================
   SOURCE SEARCH
========================= */
sourceSearchInput.addEventListener("input", () => {
  const val = sourceSearchInput.value.toLowerCase();

  const filtered = currentSourceItems.filter(item =>
    item.toLowerCase().includes(val)
  );

  renderSourceList(filtered);
});

/* =========================
   TILE CLICK
========================= */
sourceTiles.forEach(tile => {
  tile.addEventListener("click", () => {
    const type = tile.dataset.type;

    sourceTiles.forEach(t => t.classList.remove("active"));
    tile.classList.add("active");

    selectedSource = { type, value: null };

    renderSource(type);
    saveState();
  });
});

/* =========================
   BLOCK ENTER
========================= */
form.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.tagName === "INPUT") {
    e.preventDefault();
  }
});

/* =========================
   RESET BUTTON
========================= */
if (resetButton) {
  resetButton.addEventListener("click", () => {
    document.getElementById("video-title").value = "";
    document.getElementById("video-link").value = "";
    document.getElementById("thumbnail-link").value = "";
    if (themeWrapper) setTheme("");
    if (ratingPicker) ratingPicker.setValue(0);
    pornstarsCountInput.value = "";
    pornstarsNamesContainer.innerHTML = "";

    document.querySelectorAll('input[name="categories"]').forEach(cb => cb.checked = false);
    categoriesSearchInput.value = "";
    document.querySelectorAll("#categories-list label").forEach(l => l.style.display = "");

    selectedSource = { type: null, value: null };
    lastValidSource = { type: null, value: null };
    currentSourceItems = [];
    currentSourceType = null;

    sourceTiles.forEach(t => t.classList.remove("active"));
    sourceSearchInput.value = "";
    sourceSearchInput.style.display = "none";
    sourceList.style.display = "none";
    sourceList.innerHTML = "";

    bulkCountInput.value = "";
    bulkLinksContainer.innerHTML = "";
    isBulkMode = false;
    applyBulkMode();

    feedbackMessage.textContent = "";
    feedbackMessage.classList.remove("feedback-success", "feedback-error");

    submitButton.disabled = false;

    clearState();
  });
}

/* =========================
   SUBMIT
========================= */
function showFeedback(message, type) {
  feedbackMessage.textContent = message;
  feedbackMessage.classList.remove("feedback-success", "feedback-error");
  if (type) feedbackMessage.classList.add(type);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (isBulkMode) {
    await submitBulk();
    return;
  }

  submitButton.disabled = true;

  const thumbnailUrl = document.getElementById("thumbnail-link")?.value || "";

  if (thumbnailUrl) {
    showFeedback("Checking thumbnail...", null);

    const isValidImage = await validateImageUrl(thumbnailUrl);

    if (!isValidImage) {
      showFeedback("The thumbnail link doesn't look like a valid image.", "feedback-error");
      submitButton.disabled = false;
      return;
    }
  }

  const payload = {
    name: document.getElementById("video-title")?.value || "",
    url: document.getElementById("video-link")?.value || "",
    thumbnail: thumbnailUrl,
    theme: selectedTheme || "",
    rating: selectedRating || 0,
    categories: [...document.querySelectorAll('input[name="categories"]:checked')].map(c => c.value),
    pornstarNames: [...document.querySelectorAll(".actor-input")]
      .map(i => i.value)
      .filter(Boolean)
  };

  // Only resolve source if NOT feature mode
  if (!isFeatureMode && selectedSource?.type && selectedSource?.value) {
    const resolved = resolveSource(selectedSource);
    if (resolved.network !== undefined) payload.network = resolved.network;
    if (resolved.studios !== undefined) payload.studios = resolved.studios;
    if (resolved.series !== undefined) payload.series = resolved.series;
  }

  const endpoint = isFeatureMode
    ? (editId ? `/features/${editId}` : "/features")
    : (editId ? `/videos/${editId}` : "/videos");

  try {
    const res = await fetch(endpoint, {
      method: editId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      // Try to pull a real reason out of the server's response
      // instead of a generic "failed" message. Our routes send
      // plain text (res.send("...")), not JSON, so try JSON first
      // (in case that ever changes) and fall back to plain text.
      let serverMessage = "";
      try {
        const errData = await res.json();
        serverMessage = errData?.message || errData?.error || "";
      } catch (_) {
        try {
          serverMessage = await res.text();
        } catch (_) {
          // response body wasn't readable — nothing more we can extract
        }
      }

      throw new Error(serverMessage || `The server rejected the request (code ${res.status}).`);
    }

    clearState();

    showFeedback(editId ? "Updated!" : "Added!", "feedback-success");

    setTimeout(() => {
      if (isFeatureMode) {
        window.location.href = "/features/features.html";
      } else if (editId && (!payload.categories || payload.categories.length === 0)) {
        window.location.href = "/incomplete/incomplete.html?type=videos";
      } else {
        window.location.href = "/Main/main.html";
      }
    }, 300);

  } catch (err) {
    console.error(err);

    if (err instanceof TypeError) {
      // fetch() throws a plain TypeError when it can't reach the
      // server at all (offline, CORS, DNS, server down, etc.)
      showFeedback("Could not reach the server. Check your connection and try again.", "feedback-error");
    } else {
      showFeedback(err.message || "Error saving.", "feedback-error");
    }

    submitButton.disabled = false;
  }
});

/* =========================
   BULK SUBMIT
========================= */
// Posts each link as its own bare-URL video, one at a time (sequential,
// so duplicate-URL/title checks on the server — which read the file
// fresh per request — stay reliable). Links that fail stay in the
// fields, already-added ones are cleared, so retrying only resubmits
// what didn't go through. Title/thumbnail aren't sent — the server
// scrapes them from the URL itself when saving.
async function submitBulk() {
  const linkInputs = [...document.querySelectorAll(".bulk-link-input")];
  const links = linkInputs.map(i => i.value.trim());
  const nonEmpty = links.filter(Boolean);

  if (!nonEmpty.length) {
    showFeedback("Add at least one video link.", "feedback-error");
    return;
  }

  submitButton.disabled = true;

  let added = 0;
  const failed = [];

  for (let i = 0; i < links.length; i++) {
    const url = links[i];
    if (!url) continue;

    showFeedback(`Adding video ${i + 1} of ${links.length}...`, null);

    try {
      const res = await fetch("/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        let serverMessage = "";
        try {
          const errData = await res.json();
          serverMessage = errData?.message || errData?.error || "";
        } catch (_) {
          try { serverMessage = await res.text(); } catch (_) {}
        }
        failed.push({ url, reason: serverMessage || `code ${res.status}` });
      } else {
        added++;
        links[i] = ""; // clear so it isn't resubmitted on retry
      }
    } catch (err) {
      failed.push({ url, reason: "Could not reach the server" });
    }
  }

  // Re-render only the links that still need attention (failed +
  // whatever was already blank), so a retry only touches those.
  const remaining = links.filter(Boolean);
  bulkLinksContainer.innerHTML = "";
  remaining.forEach((l, i) => createBulkLinkInput(l, i));
  bulkCountInput.value = remaining.length || "";

  saveState();

  if (!failed.length) {
    clearState();
    showFeedback(`Added ${added} video${added === 1 ? "" : "s"}!`, "feedback-success");
    setTimeout(() => {
      window.location.href = "/Main/main.html";
    }, 600);
  } else {
    const summary =
      `Added ${added} of ${nonEmpty.length}. ${failed.length} failed:\n` +
      failed.map(f => `${f.url} — ${f.reason}`).join("\n");
    showFeedback(summary, "feedback-error");
  }

  submitButton.disabled = false;
}

/* =========================
   INIT
========================= */
await Promise.all([
  fetchCategories(),
  fetchEntities(),
  fetchActors(),
  fetchThemes()
]);

// Now that the category checkboxes and network/studio/series data
// actually exist, apply whatever was restored from localStorage.
if (!editId) {
  applyRestoredCategories();
  applyRestoredSource();
}

// Apply feature mode UI on load
applyFeatureMode();

// Bulk-add only makes sense when creating new videos (not editing,
// not in feature mode)
if (toggleBulkBtn) toggleBulkBtn.style.display = (editId || isFeatureMode) ? "none" : "";

// Always set the button's initial text/state, even on a fresh
// browser with no saved localStorage draft (restoreState() only
// calls this when there IS saved state to restore).
applyBulkMode();

async function loadEditVideo() {
  if (!editId) return;

  const endpoint = isFeatureMode ? `/features/${editId}` : `/videos/${editId}`;
  const res = await fetch(endpoint);
  if (!res.ok) return;

  const v = await res.json();

  document.getElementById("video-title").value = v.name || "";
  document.getElementById("video-link").value = v.url || "";
  document.getElementById("thumbnail-link").value = v.thumbnail || "";
  if (themeWrapper) setTheme(v.theme || "");
  if (ratingPicker) ratingPicker.setValue(v.rating || 0);

  if (v.pornstarNames?.length) {
    pornstarsCountInput.value = v.pornstarNames.length;
    pornstarsNamesContainer.innerHTML = "";
    v.pornstarNames.forEach((n, i) => createActorInput(n, i));
  }

  setTimeout(() => {
    document.querySelectorAll('input[name="categories"]').forEach(cb => {
      cb.checked = v.categories?.includes(cb.value);
    });
  }, 0);

  // Only load source if not feature mode
  if (!isFeatureMode) {
    if (v.network) selectedSource = { type: "network", value: v.network };
    if (v.studios) selectedSource = { type: "studio", value: v.studios };
    if (v.series)  selectedSource = { type: "series",  value: v.series  };

    if (selectedSource.type) {
      const tile = document.querySelector(`.source-tile[data-type="${selectedSource.type}"]`);
      if (tile) {
        sourceTiles.forEach(t => t.classList.remove("active"));
        tile.classList.add("active");
      }
      renderSource(selectedSource.type);
    }
  }
}

await loadEditVideo();

});