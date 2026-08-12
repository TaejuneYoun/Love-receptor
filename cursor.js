(() => {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!finePointer.matches) return;

  const cursor = document.createElement("div");
  cursor.className = "custom-cursor";
  cursor.setAttribute("aria-hidden", "true");

  const shape = document.createElement("span");
  shape.className = "custom-cursor-shape";
  cursor.appendChild(shape);

  const label = document.createElement("span");
  label.className = "custom-cursor-label";
  cursor.appendChild(label);
  document.body.appendChild(cursor);

  let pointer = { x: -100, y: -100, visible: false, target: null };
  let guide = window.__barbarianCursorGuide || null;

  function menuLabel(target) {
    const item = target instanceof Element
      ? target.closest(".pages a, .language button")
      : null;
    return item ? item.textContent.trim() : "";
  }

  function render() {
    if (!pointer.visible) return;
    const text = menuLabel(pointer.target);
    const canSnap = guide && !text && !guide.complete;
    const distance = canSnap
      ? Math.hypot(pointer.x - guide.x, pointer.y - guide.y)
      : Infinity;
    const snapToStart = canSnap && guide.atStart && distance <= guide.snapRadius;
    const useGuide = snapToStart;
    const x = useGuide ? guide.x : pointer.x;
    const y = useGuide ? guide.y : pointer.y;

    cursor.classList.toggle("snapped", snapToStart);
    cursor.classList.remove("locked");
    cursor.classList.toggle("has-label", Boolean(text));
    label.textContent = text;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function showAt(event) {
    if (event.pointerType === "touch") return;
    pointer = {
      x: event.clientX,
      y: event.clientY,
      visible: true,
      target: event.target
    };
    cursor.classList.add("visible");
    document.body.classList.add("custom-cursor-enabled");
    render();
  }

  function hide() {
    pointer.visible = false;
    cursor.classList.remove("visible");
    document.body.classList.remove("custom-cursor-enabled");
  }

  window.addEventListener("barbarian:guidecursor", (event) => {
    guide = event.detail;
    render();
  });
  window.addEventListener("pointermove", showAt, { passive: true });
  document.addEventListener("mouseleave", hide);
  window.addEventListener("blur", hide);
})();
