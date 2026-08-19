(() => {
  "use strict";

  const hero = document.querySelector("[data-home-hero]");
  const heroVideo = document.querySelector("[data-home-hero-video]");
  const heroSource = document.querySelector("[data-home-hero-source]");
  const playButton = document.querySelector(".home-play[data-copy-server]");
  const playLabel = playButton?.querySelector("[data-play-label]");

  const resetTimers = new WeakMap();

  let onlineCount = 0;
  let serverOnline = false;
  let statusResolved = false;
  let statusRequestActive = false;

  const useHeroFallback = () => {
    hero?.classList.add("is-video-fallback");

    if (heroVideo instanceof HTMLVideoElement) {
      heroVideo.pause();
    }
  };

  const useHeroVideo = () => {
    hero?.classList.remove("is-video-fallback");
  };

  const requestHeroPlayback = () => {
    if (!(heroVideo instanceof HTMLVideoElement)) {
      return;
    }

    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.playsInline = true;

    const playback = heroVideo.play();

    if (playback instanceof Promise) {
      playback.catch(() => {
        // Autoplay can wait for visibility or the first user gesture.
      });
    }
  };

  if (heroVideo instanceof HTMLVideoElement) {
    heroVideo.addEventListener(
      "loadeddata",
      () => {
        useHeroVideo();
        requestHeroPlayback();
      },
      { once: true },
    );

    heroVideo.addEventListener("canplay", requestHeroPlayback);
    heroVideo.addEventListener("playing", useHeroVideo);
    heroVideo.addEventListener("error", useHeroFallback, { once: true });
    heroSource?.addEventListener("error", useHeroFallback, { once: true });

    if (heroVideo.error) {
      useHeroFallback();
    } else {
      requestHeroPlayback();
    }

    window.addEventListener("pageshow", requestHeroPlayback);

    document.addEventListener(
      "pointerdown",
      requestHeroPlayback,
      { once: true, passive: true },
    );

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && heroVideo.paused) {
        requestHeroPlayback();
      }
    });
  }

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Continue to fallback.
      }
    }

    const textArea = document.createElement("textarea");
    const activeElement = document.activeElement;

    textArea.value = value;
    textArea.readOnly = true;
    textArea.tabIndex = -1;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";

    document.body.append(textArea);
    textArea.select();

    let copied = false;

    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      textArea.remove();

      if (activeElement instanceof HTMLElement) {
        activeElement.focus({ preventScroll: true });
      }
    }

    return copied;
  };

  const formatCompactCount = (value) => {
    const count = Math.max(0, Math.floor(Number(value) || 0));

    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(count < 10_000_000 ? 1 : 0).replace(/\.0$/, "")}M`;
    }

    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(count < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
    }

    return String(count);
  };

  const playIsActive = () =>
    Boolean(
      playButton?.matches(":hover")
      || document.activeElement === playButton
    );

  const syncPlayLabel = () => {
    if (!(playButton instanceof HTMLButtonElement) || !playLabel) {
      return;
    }

    if (playButton.classList.contains("has-copy-feedback")) {
      return;
    }

    const defaultLabel = playButton.dataset.defaultLabel || "Play";
    const previewStatus = playIsActive();

    playButton.classList.toggle("is-status-preview", previewStatus);

    if (!previewStatus) {
      playLabel.textContent = defaultLabel;
      return;
    }

    if (!statusResolved) {
      playLabel.textContent = "… ONLINE";
      return;
    }

    playLabel.textContent = serverOnline
      ? `${formatCompactCount(onlineCount)} ONLINE`
      : "OFFLINE";
  };

  playButton?.addEventListener("pointerenter", syncPlayLabel);
  playButton?.addEventListener("pointerleave", syncPlayLabel);
  playButton?.addEventListener("focus", syncPlayLabel);
  playButton?.addEventListener("blur", syncPlayLabel);

  const setCopyFeedback = (button, copied) => {
    const label = button.querySelector("[data-play-label]");

    if (!label) {
      return;
    }

    const oldTimer = resetTimers.get(button);

    if (oldTimer) {
      window.clearTimeout(oldTimer);
    }

    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = label.textContent?.trim() || "Play";
    }

    button.classList.remove("is-status-preview");
    button.classList.add("has-copy-feedback");
    button.classList.toggle("is-copy-error", !copied);

    label.textContent = copied ? "Copied" : "Copy failed";

    const timer = window.setTimeout(
      () => {
        button.classList.remove(
          "has-copy-feedback",
          "is-copy-error"
        );

        resetTimers.delete(button);

        if (button === playButton) {
          syncPlayLabel();
        } else {
          label.textContent = button.dataset.defaultLabel || "Play";
        }
      },
      copied ? 1800 : 2400,
    );

    resetTimers.set(button, timer);
  };

  document.querySelectorAll("[data-copy-server]").forEach((button) => {
    button.addEventListener("click", async () => {
      const serverAddress = button.dataset.serverAddress?.trim();

      if (!serverAddress) {
        setCopyFeedback(button, false);
        return;
      }

      setCopyFeedback(
        button,
        await copyText(serverAddress),
      );
    });
  });

  const statusServerIp =
    playButton?.dataset.serverAddress?.trim()
    || "mineacle.net";

  const statusCacheKey =
    `mineacle:home-status:${statusServerIp}`;

  const statusCacheMaxAge = 60_000;

  const statusNumber = (value) => {
    const number = Number(value);

    return Number.isFinite(number) && number > 0
      ? Math.floor(number)
      : 0;
  };

  const normalizeStatus = (payload) => {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const players =
      payload.players && typeof payload.players === "object"
        ? payload.players
        : {};

    return {
      online: Boolean(payload.online),
      onlineCount: statusNumber(
        payload.players_online
        ?? payload.online_players
        ?? players.online,
      ),
      checked: payload.checked !== false,
    };
  };

  const applyServerStatus = (status) => {
    if (!status) {
      return;
    }

    statusResolved = true;
    serverOnline = Boolean(status.online);
    onlineCount = serverOnline
      ? status.onlineCount
      : 0;

    playButton?.setAttribute(
      "aria-label",
      status.online
        ? `Copy the Mineacle server address. ${onlineCount} online.`
        : "Copy the Mineacle server address. Server offline.",
    );

    syncPlayLabel();
  };

  const readStatusCache = () => {
    try {
      const cached = JSON.parse(
        localStorage.getItem(statusCacheKey) || "null",
      );

      if (
        !cached
        || Date.now() - cached.updatedAt > statusCacheMaxAge
      ) {
        return null;
      }

      return {
        online: Boolean(cached.online),
        onlineCount: statusNumber(cached.onlineCount),
      };
    } catch {
      return null;
    }
  };

  const writeStatusCache = (status) => {
    try {
      localStorage.setItem(
        statusCacheKey,
        JSON.stringify({
          online: status.online,
          onlineCount: status.onlineCount,
          updatedAt: Date.now(),
        }),
      );
    } catch {
      // Storage can be unavailable in restricted/private browsing.
    }
  };

  const fetchStatus = async (url, timeout = 4200) => {
    const controller = new AbortController();

    const timer = window.setTimeout(
      () => controller.abort(),
      timeout,
    );

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      return response.ok
        ? await response.json()
        : null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  };

  const loadServerStatus = async () => {
    if (!playButton || statusRequestActive) {
      return;
    }

    statusRequestActive = true;

    try {
      const payload = await fetchStatus(
        `/api/server-status.php?mode=home&t=${Date.now()}`,
      );

      const status = normalizeStatus(payload);

      if (status?.checked) {
        applyServerStatus(status);
        writeStatusCache(status);
      }
    } finally {
      statusRequestActive = false;
    }
  };

  const cachedStatus = readStatusCache();

  if (cachedStatus) {
    applyServerStatus(cachedStatus);
  }

  syncPlayLabel();
  loadServerStatus();

  window.setInterval(() => {
    if (!document.hidden) {
      loadServerStatus();
    }
  }, 60_000);
})();
