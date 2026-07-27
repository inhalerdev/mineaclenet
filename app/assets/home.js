(() => {
  const playButton = document.querySelector("#play-button");
  const playLabel = playButton?.querySelector(".play-label");
  const searchForm = document.querySelector("#player-search");
  const searchInput = document.querySelector("#site-search");
  const heroVideo = document.querySelector("#hero-video");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let resetTimer = 0;
  let clickSequence = 0;
  let totemBlob = null;

  const particlePalette = [
    "#30cf5c",
    "#5ee45f",
    "#a5f23b",
    "#d9f447",
    "#f4d84b",
  ];

  fetch("/assets/home/totem.gif", { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to preload the totem animation.");
      }

      return response.blob();
    })
    .then((blob) => {
      totemBlob = blob;
    })
    .catch(() => {});

  const createTotem = (sequence) => {
    const totem = document.createElement("img");
    const objectUrl = totemBlob ? URL.createObjectURL(totemBlob) : "";
    const animationUrl =
      objectUrl ||
      `/assets/home/totem.gif?burst=${sequence}-${performance.now()}`;

    totem.className = "copy-burst__totem";
    totem.src = animationUrl;
    totem.alt = "";
    totem.draggable = false;
    totem.decoding = "async";
    totem.setAttribute("aria-hidden", "true");

    if (objectUrl) {
      totem.dataset.objectUrl = objectUrl;
    }

    totem.addEventListener(
      "error",
      () => {
        totem.src = "/assets/home/totem-of-undying.webp";
      },
      { once: true },
    );

    return totem;
  };

  const getBurstOrigin = (button, event) => {
    const rect = button.getBoundingClientRect();
    const isPointerClick =
      event.detail > 0 &&
      Number.isFinite(event.clientX) &&
      Number.isFinite(event.clientY);

    return {
      x: isPointerClick ? event.clientX : rect.left + rect.width / 2,
      y: isPointerClick ? event.clientY : rect.top + rect.height / 2,
    };
  };

  const spawnCopyBurst = ({ x: originX, y: originY }, sequence) => {
    if (reduceMotion.matches) {
      return;
    }

    const burst = document.createElement("div");
    const shock = document.createElement("span");

    burst.className = "copy-burst";
    burst.setAttribute("aria-hidden", "true");
    burst.style.setProperty("--origin-x", `${originX}px`);
    burst.style.setProperty("--origin-y", `${originY}px`);

    shock.className = "copy-burst__shock";
    burst.append(shock, createTotem(sequence));

    for (let index = 0; index < 30; index += 1) {
      const particle = document.createElement("span");
      const angle = ((index * 137.5 + 12) * Math.PI) / 180;
      const distance = 34 + (index % 7) * 7;
      const horizontalBias = index % 2 === 0 ? -9 : 5;
      const x = Math.cos(angle) * distance + horizontalBias;
      const y = Math.sin(angle) * distance * 0.58 + 10;
      const fall = 18 + (index % 5) * 5;
      const rotation = index % 2 === 0 ? 90 + index * 8 : -90 - index * 7;
      const size = 3 + (index % 4);

      particle.className = "copy-burst__particle";
      particle.style.setProperty(
        "--particle-color",
        particlePalette[index % particlePalette.length],
      );
      particle.style.setProperty("--particle-size", `${size}px`);
      particle.style.setProperty(
        "--particle-offset",
        `${(size * 0.55).toFixed(2)}px`,
      );
      particle.style.setProperty(
        "--particle-stack",
        `${(size * 0.7).toFixed(2)}px`,
      );
      particle.style.setProperty(
        "--particle-glow",
        `${(size * 1.6).toFixed(2)}px`,
      );
      particle.style.setProperty(
        "--particle-glow-large",
        `${(size * 1.8).toFixed(2)}px`,
      );
      particle.style.setProperty("--particle-x", `${x.toFixed(2)}px`);
      particle.style.setProperty("--particle-y", `${y.toFixed(2)}px`);
      particle.style.setProperty(
        "--particle-mid-x",
        `${(x * 0.76).toFixed(2)}px`,
      );
      particle.style.setProperty(
        "--particle-mid-y",
        `${(y * 0.76).toFixed(2)}px`,
      );
      particle.style.setProperty("--particle-fall", `${fall}px`);
      particle.style.setProperty("--particle-rotation", `${rotation}deg`);
      particle.style.setProperty(
        "--particle-mid-rotation",
        `${(rotation * 0.7).toFixed(2)}deg`,
      );
      particle.style.setProperty(
        "--particle-delay",
        `${35 + (index % 6) * 22}ms`,
      );
      particle.style.setProperty(
        "--particle-duration",
        `${760 + (index % 5) * 75}ms`,
      );
      burst.append(particle);
    }

    document.body.append(burst);
    window.setTimeout(() => {
      const totem = burst.querySelector(".copy-burst__totem");
      const objectUrl = totem?.dataset.objectUrl;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      burst.remove();
    }, 1600);
  };

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Fall through for browsers where clipboard permission is unavailable.
      }
    }

    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    document.body.append(textArea);
    textArea.select();

    let copied = false;

    try {
      copied = document.execCommand("copy");
    } finally {
      textArea.remove();
    }

    return copied;
  };

  playButton?.addEventListener("click", (event) => {
    const value = playButton.dataset.copyValue;
    const sequence = ++clickSequence;
    const burstOrigin = getBurstOrigin(playButton, event);

    window.clearTimeout(resetTimer);
    spawnCopyBurst(burstOrigin, sequence);

    if (!value) {
      return;
    }

    copyText(value)
      .then((copied) => {
        if (!copied || sequence !== clickSequence) {
          return;
        }

        playButton.classList.remove("is-copied");
        void playButton.offsetWidth;
        playButton.classList.add("is-copied");
        playLabel.textContent = "COPIED";

        resetTimer = window.setTimeout(() => {
          playButton.classList.remove("is-copied");
          playLabel.textContent = "PLAY";
        }, 1800);
      })
      .catch(() => {});
  });

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = searchInput?.value.trim();

    if (!username) {
      searchInput?.focus();
      return;
    }

    window.location.assign(`/player/${encodeURIComponent(username)}`);
  });

  const syncHeroMotion = () => {
    if (!heroVideo) {
      return;
    }

    // The homepage hero must never produce audio, even if the source has a track.
    heroVideo.defaultMuted = true;
    heroVideo.muted = true;
    heroVideo.volume = 0;

    if (reduceMotion.matches) {
      heroVideo.pause();
      heroVideo.currentTime = 0;
      return;
    }

    heroVideo.play().catch(() => {});
  };

  reduceMotion.addEventListener?.("change", syncHeroMotion);
  syncHeroMotion();
})();
