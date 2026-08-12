(() => {
  let handoff = null;
  const pageUrl = new URL(window.location.href);
  const fromMainUrl = pageUrl.searchParams.get("from") === "main";
  if (fromMainUrl) {
    pageUrl.searchParams.delete("from");
    try {
      window.history.replaceState(null, "", pageUrl.href);
    } catch (_) {
      // The query flag is harmless if a local browser does not allow replacement.
    }
  }
  try {
    handoff = JSON.parse(
      window.sessionStorage.getItem("barbarian-main-cursor") || "null"
    );
    window.sessionStorage.removeItem("barbarian-main-cursor");
  } catch (_) {
    // Some local-file privacy settings do not expose session storage.
  }

  const validHandoff = handoff && handoff.expires > Date.now();
  if (!validHandoff && !fromMainUrl) return;

  const root = document.documentElement;
  root.classList.add("from-main-transition");

  document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.createElement("div");
    overlay.className = "entry-transition";
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.add("entry-revealing");
        overlay.classList.add("is-revealing");
      });
    });

    window.setTimeout(() => {
      overlay.remove();
      root.classList.remove("from-main-transition", "entry-revealing");
    }, 720);
  }, { once: true });
})();
