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

  const link = (className, href, label, iconName) => {
    const anchor = document.createElement("a");
    anchor.className = className;
    anchor.href = href;
    anchor.setAttribute("aria-label", label);
    const icon = document.createElement("span");
    icon.className = `mobile-nav-icon mobile-nav-icon-${iconName}`;
    icon.setAttribute("aria-hidden", "true");
    anchor.appendChild(icon);
    anchor.addEventListener("pointerdown", () => anchor.classList.add("is-pressed"), { passive: true });
    ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
      anchor.addEventListener(type, () => anchor.classList.remove("is-pressed"), { passive: true });
    });
    return anchor;
  };

  const previous = pages[(currentIndex - 1 + pages.length) % pages.length];
  const next = pages[(currentIndex + 1) % pages.length];
  navigation.append(
    link("mobile-page-step mobile-page-previous", `${previous}.html`, `Previous page, ${previous}`, "previous"),
    link("mobile-page-main", "MAIN.html", "Return to main page", "close"),
    link("mobile-page-step mobile-page-next", `${next}.html`, `Next page, ${next}`, "next")
  );
  document.body.appendChild(navigation);

  const copyright = document.createElement("footer");
  copyright.className = "mobile-detail-footer";
  copyright.append("© 2026 ");
  const author = document.createElement("a");
  author.href = "https://www.instagram.com/taejun____e/";
  author.target = "_blank";
  author.rel = "noopener noreferrer";
  author.textContent = "Taejune Youn";
  copyright.append(author, ". All rights reserved.");
  document.body.appendChild(copyright);

  const inscription = document.querySelector(".inscription");
  const directionLayer = inscription?.querySelector(".direction-markers");
  const positionDirectionArrows = () => {
    if (!directionLayer) return;
    directionLayer.querySelectorAll("span").forEach((marker) => {
      marker.classList.toggle("mobile-direction-forward", marker.textContent === "→");
      marker.classList.toggle("mobile-direction-backward", marker.textContent === "←");
      marker.classList.toggle("mobile-direction-down", marker.textContent === "↓");
    });
  };
  positionDirectionArrows();
  if (directionLayer) {
    new MutationObserver(positionDirectionArrows).observe(directionLayer, { childList: true });
  }

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
