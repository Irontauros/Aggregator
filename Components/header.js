// /Components/header.js

document.addEventListener("DOMContentLoaded", async () => {
  // =========================================================
  // THEME COLOR — runs on every page (not just Main), since the
  // theme choice persists via localStorage and every page's accent
  // color should reflect it. "All" (no theme picked) keeps the
  // original purple. Every CSS rule that used to hardcode #df4ec8
  // now reads var(--accent, #df4ec8) instead, so this is the only
  // place the actual color values live.
  // =========================================================
  const THEME_COLORS = {
    "":         { accent: "#a239ff", hover: "#b866ff" }, // All — bold green
    "Straight": { accent: "#1aab57", hover: "#40be6e" }, // real purple, less pink
    "Gay":      { accent: "#1e9eff", hover: "#4dc4ff" }, // real blue
    "Lesbian":  { accent: "#ff2fa6", hover: "#ff5cbb" }, // real pink, less magenta
    "Trans":    { accent: "#ffd400", hover: "#ffe14d" }  // real yellow
  };

  // Fetched once, up front, so both the color application below AND
  // the Main-page dropdown (further down) agree on the same list and
  // the same default — this used to fetch/decide the default only
  // inside the dropdown code, which ran AFTER the color was already
  // applied using the stale/missing localStorage value (showing green
  // on first load, correcting only on refresh).
  let allThemesList = [];
  try {
    allThemesList = await fetch("/themes").then(r => r.json());
  } catch (err) {
    console.error("Could not load themes:", err);
  }

  let activeThemeForColor = localStorage.getItem("activeTheme");
  if (
    (activeThemeForColor === null || (activeThemeForColor && !allThemesList.includes(activeThemeForColor)))
    && allThemesList.length
  ) {
    // No saved choice yet (or a stale one) — default to the first
    // theme in the list, not "All".
    activeThemeForColor = allThemesList[0];
    localStorage.setItem("activeTheme", activeThemeForColor);
  }
  activeThemeForColor = activeThemeForColor || "";

  const colors = THEME_COLORS[activeThemeForColor] || THEME_COLORS[""];

  document.documentElement.style.setProperty("--accent", colors.accent);
  document.documentElement.style.setProperty("--accent-hover", colors.hover);

  window.addEventListener("theme-change", e => {
    const c = THEME_COLORS[e.detail.theme] || THEME_COLORS[""];
    document.documentElement.style.setProperty("--accent", c.accent);
    document.documentElement.style.setProperty("--accent-hover", c.hover);
  });

  const slot = document.getElementById("header-slot");
  if (!slot) return;

  const page = location.pathname.split("/").pop() || "main.html";
  const pageKey = page.replace(".html", "");

  const params = new URLSearchParams(location.search);
  const entityType = params.get("type");

  const html = await fetch("/components/header.html").then(r => r.text());
  slot.innerHTML = html;

  window.dispatchEvent(new Event("header-loaded"));

  const titleEl = slot.querySelector("#page-title");

  const titleMap = {
    "main.html":        "Home",
    "categories.html":  "Categories",
    "actors.html":      "Pornstars",
    "shorts.html":      "Shorts",
    "celebrities.html": "Celebrities",
    "websites.html":    "Websites",
    "features.html":    "Features",
    "hentai.html":      "Hentai",
    "addVideo.html":    "Add Video",
    "incomplete.html":  "Incomplete"
  };

  let title = titleMap[page] || "";

  const entityName = params.get("name");

  // Which pages ever show the alphabet filter / sort controls.
  // Defined here (instead of only later, near the sort-mode code)
  // so the alphabet-filter visibility check below can use it too.
  const SIMPLE_PAGES = ["shorts", "websites", "celebrities", "features", "hentai", "details"];
  const FULL_PAGES   = ["main", "categories", "actors", "entity", "incomplete"];
  const ALPHABET_PAGES = [...SIMPLE_PAGES, ...FULL_PAGES];

  if (page === "details.html" && entityName) {
    title = decodeURIComponent(entityName);
  } else if (page === "entity.html" && entityType) {
    title = entityType.charAt(0).toUpperCase() + entityType.slice(1);
  }

  // =========================================================
  // PAGE COUNTS
  // =========================================================
  if (page === "incomplete.html") {
    const type = params.get("type") || "videos";

    try {
      const res = await fetch(`/${type}/incomplete`);
      const data = await res.json();

      if (Array.isArray(data)) {
        title += ` - ${data.length}`;
      }
    } catch (err) {
      console.error("Could not load page count:", err);
    }
  }

  if (titleEl) {
    titleEl.textContent = title;
    document.title = title;
  }

  slot.querySelectorAll("nav a").forEach(link => {
    let linkPage = link.getAttribute("href")?.split("/").pop() || "main.html";
    if (linkPage === "index.html") linkPage = "main.html";
    if (linkPage === page) link.style.display = "none";
  });

  const addBtn    = slot.querySelector("#addButton");
  const editBtn   = slot.querySelector("#editButton");
  const updateBtn = slot.querySelector("#updateButton");
  const deleteBtn = slot.querySelector("#deleteButton");

  const hide = el => el && (el.style.display = "none");
  const show = el => el && (el.style.display = "inline-flex");

  // Hide everything by default
  hide(addBtn);
  hide(editBtn);
  hide(updateBtn);
  hide(deleteBtn);

  // =========================================================
  // EDIT BUTTON — main, features, incomplete only
  // =========================================================
  const EDIT_BTN_PAGES = [
    "main.html",
    "features.html",
    "incomplete.html",
    "entity.html"  
  ];

  if (EDIT_BTN_PAGES.includes(page) && editBtn) {
    show(editBtn);
    editBtn.textContent = "Edit";
  }

  // =========================================================
  // DELETE BUTTON — direct delete, no edit mode first
  // =========================================================
  const DELETE_BTN_PAGES = [
    "features.html",
    "shorts.html",
    "websites.html",
    "celebrities.html",
    "hentai.html",
    "incomplete.html",
    "details.html"
  ];

  if (DELETE_BTN_PAGES.includes(page) && deleteBtn) {
    show(deleteBtn);
    deleteBtn.textContent = "Delete";
  }

  // =========================================================
  // UPDATE BUTTON — only if incomplete items exist
  // =========================================================
  const incompleteTypeMap = {
    "main.html":        "videos",
    "shorts.html":      "shorts",
    "actors.html":      "actors",
    "websites.html":    "websites",
    "celebrities.html": "celebrities",
    "hentai.html":      "hentai",
    "features.html":    "features"
  };

  const incompleteType = incompleteTypeMap[page];

  if (incompleteType && updateBtn) {
    // Fire-and-forget: nothing else in this function needs to wait
    // on this request, and blocking here was delaying (and, combined
    // with the old data-attribute check, breaking) the alphabet filter.
    (async () => {
      try {
        const res  = await fetch(`/${incompleteType}/incomplete`);
        const data = await res.json();

        if (Array.isArray(data) && data.length > 0) {
          show(updateBtn);
          updateBtn.textContent = "Update";
          updateBtn.onclick = () => {
            window.location.href = `/incomplete/incomplete.html?type=${incompleteType}`;
          };
        }
      } catch (err) {
        console.error("Could not check incomplete for", incompleteType, err);
      }
    })();
  }

  // =========================================================
  // ADD BUTTON — modal-based pages
  // =========================================================
  const addMap = {
    actors:      "actor",
    shorts:      "short",
    celebrities: "celebrity",
    websites:    "website",
    hentai:      "hentai"
  };

  const labels = {
    actors:      "Add Pornstar",
    shorts:      "Add Short",
    celebrities: "Add Celebrity",
    websites:    "Add Website",
    hentai:      "Add Hentai"
  };

  if (addMap[pageKey] && addBtn) {
    show(addBtn);
    addBtn.textContent = labels[pageKey];
    addBtn.dataset.type = addMap[pageKey];
  }

  // =========================================================
  // ADD BUTTON — entity page (context-aware)
  // =========================================================
  if (pageKey === "entity" && addBtn) {
    const eType = params.get("type") || "network";
    const eLabel = eType.charAt(0).toUpperCase() + eType.slice(1);
    addBtn.textContent = `Add ${eLabel}`;
    addBtn.dataset.type = "entity";
    show(addBtn);
  }

  // =========================================================
  // ALPHABET FILTER
  // =========================================================
  const alphabet = slot.querySelector("#alphabet-filter");

  if (!alphabet) return;

  // Decided purely by page name — no dependency on whether some
  // other script has finished rendering and tagging its container
  // yet, which is what caused the filter to flash and disappear.
  alphabet.style.display = ALPHABET_PAGES.includes(pageKey) ? "" : "none";

  document.addEventListener("click", e => {
    const btn = e.target.closest("#alphabet-filter button");
    if (!btn) return;
    if (!btn.dataset.letter) return;

    alphabet.querySelectorAll("button[data-letter]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    window.dispatchEvent(new CustomEvent("alphabet-change", {
      detail: { letter: btn.dataset.letter }
    }));
  });

  // =========================================================
  // SORT MODE SYSTEM
  // =========================================================
  const isSimple = SIMPLE_PAGES.includes(pageKey);
  const isFull   = FULL_PAGES.includes(pageKey);

  const SORT_KEY = `sort_${page}`;
  let sortMode = localStorage.getItem(SORT_KEY);

  // =========================
  // SIMPLE MODE
  // =========================
  if (isSimple && alphabet) {
    const existing = alphabet.querySelector(".simple-sort-toggle");
    if (existing) existing.remove();

    const states = ["alpha", "alpha-reverse"];

    if (!sortMode || !states.includes(sortMode)) {
      sortMode = "alpha";
      localStorage.setItem(SORT_KEY, sortMode);
    }

    const btn = document.createElement("button");
    btn.className = "simple-sort-toggle";

    const labelMap = {
      alpha:           "A → Z",
      "alpha-reverse": "Z → A"
    };

    function update() {
      btn.textContent = labelMap[sortMode];
    }

    btn.onclick = () => {
      sortMode = sortMode === "alpha" ? "alpha-reverse" : "alpha";
      localStorage.setItem(SORT_KEY, sortMode);
      update();
      window.dispatchEvent(new CustomEvent("sort-change", { detail: { mode: sortMode } }));

      setTimeout(() => {
        const activeLetter = document.querySelector("#alphabet-filter button.active")?.dataset.letter;
        if (activeLetter) {
          window.dispatchEvent(new CustomEvent("alphabet-change", {
            detail: { letter: activeLetter }
          }));
        }
      }, 50);
    };

    update();
    alphabet.appendChild(btn);
  }

  // =========================
  // FULL MODE
  // =========================
  if (isFull && alphabet) {
    const existing = alphabet.querySelector(".custom-sort");
    if (existing) existing.remove();

    const isMainPage = pageKey === "main";
    const useRecentLabels = isMainPage || pageKey === "incomplete";

    const options = useRecentLabels
      ? [
          { value: "recent",        label: "Recent" },
          { value: "oldest",        label: "Oldest" },
          { value: "alpha",         label: "A → Z"  },
          { value: "alpha-reverse", label: "Z → A"  },
          ...(isMainPage
            ? [
                { value: "rating",        label: "Top Rated" },
                { value: "rating-reverse", label: "Lowest Rated" }
              ]
            : [])
        ]
      : [
          { value: "alpha",         label: "A → Z"  },
          { value: "alpha-reverse", label: "Z → A"  },
          { value: "recent",        label: "Higher"  },
          { value: "oldest",        label: "Lower"   }
        ];

    if (!sortMode || !options.some(o => o.value === sortMode)) {
      sortMode = useRecentLabels ? "recent" : "alpha";
      localStorage.setItem(SORT_KEY, sortMode);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "custom-sort";

    const button = document.createElement("button");
    button.className = "custom-sort-button";

    const menu = document.createElement("div");
    menu.className = "custom-sort-menu";

    function getLabel(val) {
      return options.find(o => o.value === val)?.label || "Sort";
    }

    function updateButton() {
      button.textContent = getLabel(sortMode);
    }

    updateButton();

    options.forEach(opt => {
      const item = document.createElement("div");
      item.className = "custom-sort-item";
      item.textContent = opt.label;

      if (opt.value === sortMode) item.classList.add("active");

      item.onclick = () => {
        sortMode = opt.value;
        localStorage.setItem(SORT_KEY, sortMode);
        updateButton();

        menu.querySelectorAll(".custom-sort-item")
          .forEach(i => i.classList.remove("active"));

        item.classList.add("active");
        menu.classList.remove("open");

        window.dispatchEvent(new CustomEvent("sort-change", { detail: { mode: sortMode } }));
      };

      menu.appendChild(item);
    });

    button.onclick = e => {
      e.stopPropagation();
      menu.classList.toggle("open");
    };

    document.addEventListener("click", () => menu.classList.remove("open"));

    wrapper.appendChild(button);
    wrapper.appendChild(menu);
    alphabet.appendChild(wrapper);
  }

  // =========================================================
  // SYNC UI — button labels based on active mode
  // =========================================================
  function syncUI() {
    const container =
      document.getElementById("videos")      ||
      document.getElementById("shorts")      ||
      document.getElementById("actors")      ||
      document.getElementById("websites")    ||
      document.getElementById("celebrities") ||
      document.getElementById("hentai")      ||
      document.getElementById("entities")    || 
      document.getElementById("details")     ||
      document.getElementById("incomplete");

    const mode = container?.dataset.mode || "view";

    if (editBtn)   editBtn.textContent   = "Edit";
    if (deleteBtn) deleteBtn.textContent = "Delete";

    if (EDIT_BTN_PAGES.includes(page)) {
      if (mode === "edit") {
        if (editBtn)   editBtn.textContent = "Cancel";
        if (deleteBtn) show(deleteBtn);
      } else if (mode === "delete") {
        if (deleteBtn) {
          show(deleteBtn);
          deleteBtn.textContent = "Cancel Delete";
        }
      } else {
        if (!DELETE_BTN_PAGES.includes(page)) {
          if (deleteBtn) hide(deleteBtn);
        }
      }
    }

    if (DELETE_BTN_PAGES.includes(page)) {
      if (mode === "delete") {
        if (deleteBtn) {
          show(deleteBtn);
          deleteBtn.textContent = "Cancel Delete";
        }
      } else {
        if (deleteBtn) {
          show(deleteBtn);
          deleteBtn.textContent = "Delete";
        }
      }
    }
  }

  window.addEventListener("mode-change", syncUI);

  syncUI();
  setTimeout(syncUI, 50);

  // =========================================================
  // THEME FILTER — buttons only exist on the Main page. Picking one
  // saves it to localStorage; every other affected page reads that
  // value on its own load (see each page's own script) — no page
  // navigation needed to switch, but pages you're not currently on
  // don't live-update, only the next time you load them.
  // =========================================================
  if (pageKey === "main") {
    if (allThemesList.length) {
      let activeTheme = activeThemeForColor;
      const themes = allThemesList;

      const options = [...themes, ""]; // themes first, "All" last

        const wrapper = document.createElement("div");
        wrapper.id = "theme-filter";
        wrapper.className = "custom-sort";
        wrapper.style.gridColumn = "1";
        wrapper.style.justifySelf = "start";

        const button = document.createElement("button");
        button.className = "custom-sort-button";

        const menu = document.createElement("div");
        menu.className = "custom-sort-menu";

        function label(t) { return t || "All"; }
        function updateButton() { button.textContent = label(activeTheme); }

        options.forEach(t => {
          const item = document.createElement("div");
          item.className = "custom-sort-item" + (t === activeTheme ? " active" : "");
          item.textContent = label(t);

          item.onclick = () => {
            activeTheme = t;
            localStorage.setItem("activeTheme", activeTheme);
            updateButton();

            menu.querySelectorAll(".custom-sort-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            menu.classList.remove("open");

            window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme: activeTheme } }));
          };

          menu.appendChild(item);
        });

        button.onclick = e => {
          e.stopPropagation();
          menu.classList.toggle("open");
        };

        document.addEventListener("click", () => menu.classList.remove("open"));

        updateButton();
        wrapper.appendChild(button);
        wrapper.appendChild(menu);

        // Same grid row as the title/buttons (top-left corner, mirroring
        // the Edit/Update buttons which sit top-right).
        const headerContainer = slot.querySelector(".header-container");
        if (headerContainer) {
          headerContainer.insertBefore(wrapper, headerContainer.firstChild);
        } else {
          slot.appendChild(wrapper);
        }
    }
  }
});