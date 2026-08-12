(() => {
  const mobileViewport = window.matchMedia("(max-width: 820px)");
  if (!mobileViewport.matches) return;

  const pageMatch = window.location.pathname.match(/(?:^|\/)(\d{2}|Barbarian-Love)\.html$/i);
  if (!pageMatch) return;

  const current = pageMatch[1].toLowerCase() === "barbarian-love"
    ? "01"
    : pageMatch[1];
  const pages = Array.from({ length: 11 }, (_, index) => String(index + 1).padStart(2, "0"));
  const currentIndex = pages.indexOf(current);
  if (currentIndex < 0) return;

  const navigation = document.createElement("nav");
  navigation.className = "mobile-detail-navigation";
  navigation.setAttribute("aria-label", "Detail page navigation");

  const link = (className, href, label, text) => {
    const anchor = document.createElement("a");
    anchor.className = className;
    anchor.href = href;
    anchor.setAttribute("aria-label", label);
    anchor.textContent = text;
    anchor.addEventListener("pointerdown", () => anchor.classList.add("is-pressed"), { passive: true });
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
      anchor.addEventListener(type, () => anchor.classList.remove("is-pressed"), { passive: true });
    });
    return anchor;
  };

  const previous = pages[(currentIndex - 1 + pages.length) % pages.length];
  const next = pages[(currentIndex + 1) % pages.length];
  navigation.append(
    link("mobile-page-step mobile-page-previous", `${previous}.html`, `Previous page, ${previous}`, "‹"),
    link("mobile-page-step mobile-page-next", `${next}.html`, `Next page, ${next}`, "›"),
    link("mobile-page-main", "MAIN.html", "Return to main page", "MAIN")
  );
  document.body.appendChild(navigation);

  let prompt;
  let promptSeen = false;
  try {
    promptSeen = window.sessionStorage.getItem("love-receptor-mobile-touch-prompt") === "seen";
  } catch (_) {}
  if (promptSeen) return;

  try {
    window.sessionStorage.setItem("love-receptor-mobile-touch-prompt", "seen");
  } catch (_) {}

  prompt = document.createElement("span");
  prompt.className = "mobile-touch-prompt";
  prompt.setAttribute("aria-hidden", "true");
  document.body.appendChild(prompt);

  const positionPrompt = (guide) => {
    if (!prompt || !guide || !guide.atStart) return;
    prompt.style.left = `${guide.x}px`;
    prompt.style.top = `${guide.y}px`;
    const size = Math.max(34, Math.min(58, (guide.snapRadius || 42) * .72));
    prompt.style.width = `${size}px`;
    prompt.style.height = `${size}px`;
  };
  positionPrompt(window.__barbarianCursorGuide);
  window.addEventListener("barbarian:guidecursor", (event) => positionPrompt(event.detail));

  const inscription = document.querySelector(".inscription");
  const removePrompt = () => {
    if (!prompt) return;
    prompt.remove();
    prompt = null;
  };
  if (inscription) {
    inscription.addEventListener("touchstart", removePrompt, { passive: true, once: true });
    inscription.addEventListener("pointerdown", removePrompt, { passive: true, once: true });
  }
})();
