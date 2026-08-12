(() => {
  const tiles = Array.from(document.querySelectorAll(".tile[href]"));
  const pageLinks = Array.from(document.querySelectorAll(".pages a[href]:not(.active)"));
  if (!tiles.length) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let transitioning = false;

  function rememberCursorHandoff() {
    try {
      window.sessionStorage.setItem(
        "barbarian-main-cursor",
        JSON.stringify({ expires: Date.now() + 4000 })
      );
    } catch (_) {
      // The transition still works when storage is unavailable on local files.
    }
  }

  function beginTransition(event, selectedTile = event.currentTarget) {
    const isTouch = event.type === "touchend" || event.pointerType === "touch";
    if (
      transitioning ||
      event.defaultPrevented ||
      (!isTouch && event.button !== 0) ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const tile = selectedTile;
    const card = tile.querySelector(".card");
    const sourceImage = tile.querySelector("img");
    if (!card || !sourceImage) return;

    event.preventDefault();
    transitioning = true;

    const destinationUrl = new URL(tile.href, window.location.href);
    destinationUrl.searchParams.set("from", "main");
    const destination = destinationUrl.href;
    const rect = card.getBoundingClientRect();
    const overlay = document.createElement("div");
    const expandingBox = document.createElement("div");
    const artwork = document.createElement("img");
    const dot = document.createElement("span");

    overlay.className = "main-transition";
    overlay.setAttribute("aria-hidden", "true");
    expandingBox.className = "main-transition-box";
    artwork.className = "main-transition-art";
    artwork.src = sourceImage.currentSrc || sourceImage.src;
    artwork.alt = "";
    dot.className = "main-transition-dot";

    expandingBox.style.setProperty("--transition-left", `${rect.left}px`);
    expandingBox.style.setProperty("--transition-top", `${rect.top}px`);
    expandingBox.style.setProperty("--transition-width", `${rect.width}px`);
    expandingBox.style.setProperty("--transition-height", `${rect.height}px`);

    expandingBox.appendChild(artwork);
    overlay.append(expandingBox, dot);
    document.body.appendChild(overlay);
    document.body.classList.add("is-transitioning");
    tile.style.visibility = "hidden";

    rememberCursorHandoff();
    const navigationDelay = reducedMotion.matches ? 220 : (isTouch ? 820 : 1620);
    window.setTimeout(() => window.location.assign(destination), navigationDelay);
  }

  tiles.forEach((tile) => {
    tile.addEventListener("click", beginTransition);
    tile.addEventListener("touchend", beginTransition, { passive: false });
  });
  pageLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const requested = new URL(link.href, window.location.href).pathname;
      const tile = tiles.find((candidate) =>
        new URL(candidate.href, window.location.href).pathname === requested
      );
      if (tile) beginTransition(event, tile);
    });
  });
})();
