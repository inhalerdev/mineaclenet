(() => {
  "use strict";

  const dialog = document.querySelector("[data-join-dialog]");
  const openHelpButton = document.querySelector("[data-open-join-help]");
  const closeHelpButton = document.querySelector("[data-close-join-help]");
  const hero = document.querySelector("[data-home-hero]");
  const heroVideo = document.querySelector("[data-home-hero-video]");
  const heroSource = document.querySelector("[data-home-hero-source]");
  const primaryPlayButton = document.querySelector(
    ".home-action--play[data-copy-server]",
  );
  const primaryPlayLabel = primaryPlayButton?.querySelector("[data-play-label]");
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
        // Some browsers defer autoplay until the page is visible or receives input.
      });
    }
  };

  if (heroVideo instanceof HTMLVideoElement) {
    heroVideo.addEventListener("loadeddata", () => {
      useHeroVideo();
      requestHeroPlayback();
    }, { once: true });
    heroVideo.addEventListener("canplay", requestHeroPlayback);
    heroVideo.addEventListener("playing", useHeroVideo);
    heroVideo.addEventListener("error", useHeroFallback, { once: true });

    heroSource?.addEventListener("error", useHeroFallback, { once: true });

    if (heroVideo.error) {
      useHeroFallback();
    } else {
      heroVideo.load();
      requestHeroPlayback();
    }

    window.addEventListener("pageshow", requestHeroPlayback);
    document.addEventListener("pointerdown", requestHeroPlayback, { once: true, passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && heroVideo.paused) {
        requestHeroPlayback();
      }
    });
  }

  const formatCompactCount = (value) => {
    const count = Math.max(0, Math.floor(Number(value) || 0));
    const units = [
      { threshold: 1_000_000_000, divisor: 1_000_000_000, suffix: "B" },
      { threshold: 1_000_000, divisor: 1_000_000, suffix: "M" },
      { threshold: 1_000, divisor: 1_000, suffix: "K" },
    ];

    for (const unit of units) {
      if (count < unit.threshold) {
        continue;
      }

      const compact = count / unit.divisor;
      const decimals = compact < 10 && !Number.isInteger(compact) ? 1 : 0;

      return `${compact.toFixed(decimals).replace(/\.0$/, "")}${unit.suffix}`;
    }

    return String(count);
  };

  const primaryPlayIsActive = () => {
    return Boolean(
      primaryPlayButton?.matches(":hover") ||
        document.activeElement === primaryPlayButton,
    );
  };

  const syncPrimaryPlayLabel = () => {
    if (!(primaryPlayButton instanceof HTMLButtonElement) || !primaryPlayLabel) {
      return;
    }

    if (primaryPlayButton.classList.contains("has-copy-feedback")) {
      return;
    }

    const showStatus = primaryPlayIsActive();
    const defaultLabel = primaryPlayButton.dataset.defaultLabel || "Play";

    primaryPlayButton.classList.toggle("is-status-preview", showStatus);

    if (!showStatus) {
      primaryPlayLabel.textContent = defaultLabel;
      return;
    }

    if (!statusResolved) {
      primaryPlayLabel.textContent = "… ONLINE";
      return;
    }

    primaryPlayLabel.textContent = serverOnline
      ? `${formatCompactCount(onlineCount)} ONLINE`
      : "OFFLINE";
  };

  primaryPlayButton?.addEventListener("pointerenter", syncPrimaryPlayLabel);
  primaryPlayButton?.addEventListener("pointerleave", syncPrimaryPlayLabel);
  primaryPlayButton?.addEventListener("focus", syncPrimaryPlayLabel);
  primaryPlayButton?.addEventListener("blur", syncPrimaryPlayLabel);

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Use the local fallback when clipboard permission is unavailable.
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

  const setCopyFeedback = (button, copied) => {
    const label = button.querySelector("[data-play-label]");

    if (!label) {
      return;
    }

    const previousTimer = resetTimers.get(button);

    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = label.textContent?.trim() || "Play";
    }

    button.classList.remove("is-status-preview");
    label.textContent = copied ? "Copied" : "Copy failed";
    button.classList.add("has-copy-feedback");
    button.classList.toggle("is-copied", copied);
    button.classList.toggle("is-copy-error", !copied);

    const timer = window.setTimeout(() => {
      button.classList.remove("has-copy-feedback", "is-copied", "is-copy-error");
      resetTimers.delete(button);

      if (button === primaryPlayButton) {
        syncPrimaryPlayLabel();
      } else {
        label.textContent = button.dataset.defaultLabel || "Play";
      }
    }, copied ? 1800 : 2400);

    resetTimers.set(button, timer);
  };

  document.querySelectorAll("[data-copy-server]").forEach((button) => {
    button.addEventListener("click", async () => {
      const serverAddress = button.dataset.serverAddress?.trim();

      if (!serverAddress) {
        setCopyFeedback(button, false);
        return;
      }

      const copied = await copyText(serverAddress);
      setCopyFeedback(button, copied);
    });
  });


  const statusServerIp =
    primaryPlayButton?.dataset.serverAddress?.trim() || "mineacle.net";
  const statusCacheKey = `mineacle:home-status:${statusServerIp}`;
  const statusCacheMaxAge = 15000;

  const statusNumber = (value) => {
    const number = Number(value);

    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
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
        payload.players_online ?? payload.online_players ?? players.online,
      ),
      checked: payload.checked !== false,
      source: typeof payload.source === "string" ? payload.source : "",
    };
  };

  const applyServerStatus = (status) => {
    if (!status) {
      return;
    }

    statusResolved = true;
    serverOnline = Boolean(status.online);
    onlineCount = serverOnline ? status.onlineCount : 0;
    primaryPlayButton?.setAttribute(
      "aria-label",
      status.online
        ? `Copy the Mineacle server address. ${onlineCount} online.`
        : "Copy the Mineacle server address. Server offline.",
    );
    syncPrimaryPlayLabel();
  };

  const readStatusCache = () => {
    try {
      const cached = JSON.parse(
        window.localStorage.getItem(statusCacheKey) || "null",
      );

      if (!cached || Date.now() - cached.updatedAt > statusCacheMaxAge) {
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
      window.localStorage.setItem(
        statusCacheKey,
        JSON.stringify({
          online: status.online,
          onlineCount: status.onlineCount,
          updatedAt: Date.now(),
        }),
      );
    } catch {
      // Storage may be unavailable in private or restricted browsing.
    }
  };

  const fetchStatus = async (url, timeout = 4200) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      return response.ok ? await response.json() : null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  };

  const loadExternalStatus = async () => {
    const encodedIp = encodeURIComponent(statusServerIp);
    const providers = [
      `https://api.mcsrvstat.us/3/${encodedIp}`,
      `https://api.mcstatus.io/v2/status/java/${encodedIp}`,
    ];
    let confirmedOffline = null;

    for (const provider of providers) {
      const payload = await fetchStatus(`${provider}?t=${Date.now()}`, 2600);
      const status = normalizeStatus(payload);

      if (!status) {
        continue;
      }

      if (status.online) {
        return status;
      }

      confirmedOffline ??= status;
    }

    return confirmedOffline;
  };

  const loadServerStatus = async () => {
    if (!primaryPlayButton || statusRequestActive) {
      return;
    }

    statusRequestActive = true;

    try {
      const localPayload = await fetchStatus(
        `/api/server-status.php?mode=home&t=${Date.now()}`,
      );
      const localStatus = normalizeStatus(localPayload);
      let status = localStatus?.checked ? localStatus : null;

      if (!status) {
        const externalStatus = await loadExternalStatus();

        if (externalStatus) {
          status = {
            ...externalStatus,
            onlineCount:
              localStatus?.source === "web_profiles"
                ? localStatus.onlineCount
                : externalStatus.onlineCount,
          };
        }
      }

      if (status) {
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

  syncPrimaryPlayLabel();
  loadServerStatus();
  window.setInterval(() => {
    if (!document.hidden) {
      loadServerStatus();
    }
  }, 15000);
  window.addEventListener("focus", loadServerStatus);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadServerStatus();
    }
  });

  const openJoinDialog = () => {
    if (!(dialog instanceof HTMLElement)) {
      return;
    }

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      return;
    }

    dialog.setAttribute("open", "");
  };

  const closeJoinDialog = () => {
    if (!(dialog instanceof HTMLElement)) {
      return;
    }

    if (typeof dialog.close === "function") {
      dialog.close();
      return;
    }

    dialog.removeAttribute("open");
  };

  openHelpButton?.addEventListener("click", openJoinDialog);
  closeHelpButton?.addEventListener("click", closeJoinDialog);

  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeJoinDialog();
    }
  });

})();
