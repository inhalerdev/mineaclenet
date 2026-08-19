(() => {
  "use strict";

  const form = document.querySelector("[data-contact-form]");
  const submitButton = form?.querySelector("[data-contact-submit]");
  const submitLabel = form?.querySelector("[data-contact-submit-label]");

  if (
    !(form instanceof HTMLFormElement) ||
    !(submitButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  let submitting = false;
  let lastPointer = null;

  const particleColors = [
    "#55ff55",
    "#8fd43f",
    "#a8d83e",
    "#d5d83f",
    "#f2dc4b",
    "#d8bd3d",
    "#6abf38",
  ];

  const randomBetween = (minimum, maximum) =>
    minimum + Math.random() * (maximum - minimum);

  const submissionOrigin = () => {
    if (lastPointer) {
      return lastPointer;
    }

    const rect = submitButton.getBoundingClientRect();

    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  };

  const createParticle = (overlay, origin, index) => {
    const particle = document.createElement("i");
    const angle = randomBetween(-Math.PI * 0.92, -Math.PI * 0.08);
    const burstDistance = randomBetween(42, 126);
    const burstX = Math.cos(angle) * burstDistance;
    const burstY = Math.sin(angle) * burstDistance;
    const drift = randomBetween(-42, 42);
    const fallY = randomBetween(150, 310);
    const size = Math.round(randomBetween(5, 12));
    const life = Math.round(randomBetween(980, 1540));
    const delay = Math.round(randomBetween(0, 190));
    const rotation = randomBetween(120, 560);

    particle.className = "contact-submit-particle";

    if (index % 4 === 0) {
      particle.classList.add("is-diamond");
    } else if (index % 5 === 0) {
      particle.classList.add("is-orb");
    }

    particle.style.setProperty("--burst-x", `${origin.x}px`);
    particle.style.setProperty("--burst-y", `${origin.y}px`);
    particle.style.setProperty(
      "--particle-color",
      particleColors[index % particleColors.length],
    );
    particle.style.setProperty("--particle-size", `${size}px`);
    particle.style.setProperty("--particle-delay", `${delay}ms`);
    particle.style.setProperty("--particle-life", `${life}ms`);
    particle.style.setProperty("--particle-burst-x", `${burstX.toFixed(1)}px`);
    particle.style.setProperty("--particle-burst-y", `${burstY.toFixed(1)}px`);
    particle.style.setProperty(
      "--particle-fall-x",
      `${(burstX + drift).toFixed(1)}px`,
    );
    particle.style.setProperty(
      "--particle-fall-y",
      `${fallY.toFixed(1)}px`,
    );
    particle.style.setProperty(
      "--particle-rotation-mid",
      `${(rotation * 0.42).toFixed(0)}deg`,
    );
    particle.style.setProperty(
      "--particle-rotation-end",
      `${rotation.toFixed(0)}deg`,
    );

    overlay.append(particle);
  };

  const playSubmitBurst = (origin) => {
    const existing = document.querySelector(".contact-submit-burst");
    existing?.remove();

    const overlay = document.createElement("div");
    const image = document.createElement("img");
    const baseSource =
      form.dataset.totemSrc?.trim() || "/home/assets/images/totem.gif";
    const separator = baseSource.includes("?") ? "&" : "?";

    overlay.className = "contact-submit-burst";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.setProperty("--burst-x", `${origin.x}px`);
    overlay.style.setProperty("--burst-y", `${origin.y}px`);

    /*
     * A timestamp forces the GIF to begin from frame one on every legitimate
     * submit rather than resuming a cached animation.
     */
    image.className = "contact-submit-burst__totem";
    image.src = `${baseSource}${separator}pop=${Date.now()}`;
    image.alt = "";
    image.draggable = false;

    image.addEventListener(
      "error",
      () => {
        image.remove();
      },
      { once: true },
    );

    overlay.append(image);

    for (let index = 0; index < 34; index += 1) {
      createParticle(overlay, origin, index);
    }

    document.body.append(overlay);

    window.setTimeout(() => {
      overlay.remove();
    }, 1900);
  };

  /*
   * Save the exact point inside the button that was pressed. We only render
   * after the form's submit event fires, so invalid forms do not get a false
   * success/pop animation.
   */
  submitButton.addEventListener("pointerdown", (event) => {
    lastPointer = {
      x: event.clientX,
      y: event.clientY,
    };
  });

  submitButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      lastPointer = null;
    }
  });

  form.addEventListener("submit", (event) => {
    if (submitting) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    submitting = true;

    const origin = submissionOrigin();

    submitButton.disabled = true;
    submitButton.setAttribute("aria-disabled", "true");

    if (submitLabel instanceof HTMLElement) {
      submitLabel.textContent = "Sending…";
    }

    playSubmitBurst(origin);

    /*
     * Keep the interaction responsive, but leave enough time for the totem
     * pop and first particle burst to register before navigation.
     */
    window.setTimeout(() => {
      HTMLFormElement.prototype.submit.call(form);
    }, 1050);
  });
})();
