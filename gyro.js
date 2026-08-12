(() => {
  const mobileLayout = window.matchMedia(
    "(max-width: 820px), (hover: none) and (pointer: coarse)"
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (
    !mobileLayout.matches ||
    reducedMotion.matches ||
    !("DeviceOrientationEvent" in window)
  ) return;

  const root = document.documentElement;
  const clamp = (value, minimum, maximum) =>
    Math.min(maximum, Math.max(minimum, value));

  let listening = false;
  let baseline = null;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let frame = 0;

  function orientedValues(event) {
    let beta = event.beta;
    let gamma = event.gamma;
    if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;

    const orientation = window.screen?.orientation?.angle ?? window.orientation ?? 0;
    if (orientation === 90) {
      [beta, gamma] = [gamma, -beta];
    } else if (orientation === -90 || orientation === 270) {
      [beta, gamma] = [-gamma, beta];
    } else if (orientation === 180) {
      beta = -beta;
      gamma = -gamma;
    }
    return { beta, gamma };
  }

  function render() {
    currentX += (targetX - currentX) * 0.1;
    currentY += (targetY - currentY) * 0.1;
    root.style.setProperty("--gyro-rx", `${currentX.toFixed(3)}deg`);
    root.style.setProperty("--gyro-ry", `${currentY.toFixed(3)}deg`);

    if (
      Math.abs(targetX - currentX) > 0.002 ||
      Math.abs(targetY - currentY) > 0.002
    ) {
      frame = requestAnimationFrame(render);
    } else {
      frame = 0;
    }
  }

  function handleOrientation(event) {
    const values = orientedValues(event);
    if (!values) return;

    if (!baseline) baseline = values;
    const deltaBeta = clamp(values.beta - baseline.beta, -28, 28);
    const deltaGamma = clamp(values.gamma - baseline.gamma, -28, 28);
    targetX = clamp(-deltaBeta * 0.12, -3.2, 3.2);
    targetY = clamp(deltaGamma * 0.14, -4, 4);
    root.classList.add("gyro-active");
    if (!frame) frame = requestAnimationFrame(render);
  }

  function beginListening() {
    if (listening) return;
    listening = true;
    window.addEventListener("deviceorientation", handleOrientation, { passive: true });
  }

  async function requestPermission() {
    try {
      const permission = await window.DeviceOrientationEvent.requestPermission();
      if (permission === "granted") beginListening();
    } catch (_) {
      // Permission can be declined without changing the static mobile layout.
    }
  }

  if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
    document.addEventListener("pointerdown", requestPermission, {
      once: true,
      passive: true
    });
  } else {
    beginListening();
  }
})();
