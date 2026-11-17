// /Components/searchBar.js

document.addEventListener("DOMContentLoaded", async () => {
  const slot = document.getElementById("search-slot");
  if (!slot) return; // page doesn't want a search bar

  const page = location.pathname.split("/").pop() || "";

  const placeholders = {
    "features.html": "Search features, #categories, @actors",
    "details.html": "Search videos, #categories, @actors, &series, &networks, &studios"
  };

  const placeholder = placeholders[page] || "Search by name";

  const html = await fetch("/Components/searchBar.html").then(r => r.text());
  slot.innerHTML = html;

  const input = slot.querySelector("#search-input");
  const button = slot.querySelector("#search-button");

  input.placeholder = placeholder;

  function doSearch() {
    window.dispatchEvent(new CustomEvent("search-change", {
      detail: { query: input.value.trim() }
    }));
  }

  button?.addEventListener("click", doSearch);
  input?.addEventListener("keydown", e => {
    if (e.key === "Enter") doSearch();
  });
});