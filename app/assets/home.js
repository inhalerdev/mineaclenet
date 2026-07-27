(() => {
  const playButton = document.querySelector("#play-button");
  const playLabel = playButton?.querySelector(".play-label");
  const searchForm = document.querySelector("#player-search");
  const searchInput = document.querySelector("#site-search");
  const searchSuggestions = document.querySelector("#home-player-suggestions");
  const heroVideo = document.querySelector("#hero-video");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let resetTimer = 0;
  let clickSequence = 0;
  let totemBlob = null;
  let searchTimer = 0;
  let searchRequest = null;
  let searchRun = 0;
  let activeSuggestion = -1;

  const particlePalette = [
    "#30cf5c",
    "#5ee45f",
    "#a5f23b",
    "#d9f447",
    "#f4d84b",
  ];

  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

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

  const suggestionLinks = () => {
    return searchSuggestions
      ? Array.from(searchSuggestions.querySelectorAll(".search-suggestion"))
      : [];
  };

  const setSuggestionExpanded = (expanded) => {
    searchInput?.setAttribute("aria-expanded", expanded ? "true" : "false");

    if (!expanded) {
      searchInput?.removeAttribute("aria-activedescendant");
    }
  };

  const hideSuggestions = () => {
    if (!searchSuggestions) {
      return;
    }

    searchSuggestions.hidden = true;
    searchSuggestions.textContent = "";
    activeSuggestion = -1;
    setSuggestionExpanded(false);
  };

  const setActiveSuggestion = (nextIndex) => {
    const links = suggestionLinks();

    if (!searchInput || links.length === 0) {
      activeSuggestion = -1;
      return;
    }

    activeSuggestion = ((nextIndex % links.length) + links.length) % links.length;

    links.forEach((link, index) => {
      const active = index === activeSuggestion;
      link.classList.toggle("is-active", active);
      link.setAttribute("aria-selected", active ? "true" : "false");
    });

    const activeLink = links[activeSuggestion];
    searchInput.setAttribute("aria-activedescendant", activeLink.id);
    activeLink.scrollIntoView({ block: "nearest" });
  };

  const renderSuggestions = (players) => {
    if (!searchSuggestions || !Array.isArray(players) || players.length === 0) {
      hideSuggestions();
      return;
    }

    searchSuggestions.textContent = "";
    activeSuggestion = -1;

    players.slice(0, 8).forEach((player, index) => {
      const username =
        typeof player?.name === "string" ? player.name.trim() : "";

      if (!username) {
        return;
      }

      const displayName =
        typeof player.display_name === "string" &&
        player.display_name.trim() !== ""
          ? player.display_name.trim()
          : username;
      const link = document.createElement("a");
      const headUrl =
        typeof player.head === "string" ? player.head.trim() : "";
      const name = document.createElement("span");
      const action = document.createElement("span");

      link.className = "search-suggestion";
      link.id = `home-player-suggestion-${index}`;
      link.href = `/player/${encodeURIComponent(username)}`;
      link.setAttribute("role", "option");
      link.setAttribute("aria-selected", "false");

      if (headUrl) {
        const head = document.createElement("img");

        head.className = "search-suggestion__head";
        head.src = headUrl;
        head.alt = "";
        head.loading = "lazy";
        head.decoding = "async";
        head.draggable = false;
        head.setAttribute("aria-hidden", "true");
        head.addEventListener(
          "error",
          () => {
            head.remove();
          },
          { once: true },
        );
        link.append(head);
      }

      name.className = "search-suggestion__username";
      name.textContent = displayName;
      action.className = "search-suggestion__action";
      action.textContent = "View";
      link.append(name, action);
      searchSuggestions.append(link);
    });

    if (searchSuggestions.children.length === 0) {
      hideSuggestions();
      return;
    }

    searchSuggestions.hidden = false;
    setSuggestionExpanded(true);
  };

  const loadSuggestions = async (query) => {
    if (!searchSuggestions || !searchInput || query === "") {
      hideSuggestions();
      return;
    }

    searchRequest?.abort();
    const controller = new AbortController();
    const run = ++searchRun;
    searchRequest = controller;

    try {
      const response = await fetch(
        `/api/player-search.php?mode=suggest&q=${encodeURIComponent(query)}&limit=8`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (!response.ok || run !== searchRun) {
        return;
      }

      const payload = await response.json();

      if (
        run !== searchRun ||
        searchInput.value.trim() !== query
      ) {
        return;
      }

      renderSuggestions(payload?.success ? payload.players : []);
    } catch (error) {
      if (error?.name !== "AbortError") {
        hideSuggestions();
      }
    } finally {
      if (searchRequest === controller) {
        searchRequest = null;
      }
    }
  };

  const queueSuggestions = () => {
    if (!searchInput) {
      return;
    }

    window.clearTimeout(searchTimer);
    const query = searchInput.value.trim();

    if (!query) {
      searchRequest?.abort();
      hideSuggestions();
      return;
    }

    searchTimer = window.setTimeout(() => {
      loadSuggestions(query);
    }, 120);
  };

  searchInput?.addEventListener("input", queueSuggestions);
  searchInput?.addEventListener("focus", queueSuggestions);
  searchInput?.addEventListener("keydown", (event) => {
    const links = suggestionLinks();

    if (event.key === "ArrowDown" && links.length > 0) {
      event.preventDefault();
      setActiveSuggestion(activeSuggestion + 1);
    } else if (event.key === "ArrowUp" && links.length > 0) {
      event.preventDefault();
      setActiveSuggestion(activeSuggestion - 1);
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      links[activeSuggestion]?.click();
    } else if (event.key === "Escape") {
      hideSuggestions();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      searchSuggestions &&
      searchForm &&
      !searchForm.parentElement?.contains(event.target)
    ) {
      hideSuggestions();
    }
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
