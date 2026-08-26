(() => {
  "use strict";

  const playButton = document.querySelector(
    "[data-copy-server]",
  );

  const playLabel = playButton?.querySelector(
    "[data-play-label]",
  );

  const statusElement = document.querySelector(
    "[data-home-status]",
  );

  const statusLabel = document.querySelector(
    "[data-home-status-label]",
  );

  const video = document.querySelector(
    ".home-feature-card__video",
  );

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Fall through to the local copy method.
      }
    }

    const textArea = document.createElement("textarea");

    textArea.value = value;
    textArea.readOnly = true;
    textArea.tabIndex = -1;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";

    document.body.append(textArea);
    textArea.select();

    let copied;

    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }

    textArea.remove();

    return copied;
  };

  const resetPlayLabel = () => {
    if (!playButton || !playLabel) {
      return;
    }

    playButton.classList.remove("is-copy-error");
    playLabel.textContent = "Play Mineacle";
  };

  playButton?.addEventListener("click", async () => {
    const address = playButton.dataset.serverAddress?.trim();

    if (!address || !playLabel) {
      return;
    }

    const copied = await copyText(address);

    playButton.classList.toggle(
      "is-copy-error",
      !copied,
    );

    playLabel.textContent = copied
      ? "IP Copied"
      : "Copy Failed";

    window.setTimeout(resetPlayLabel, copied ? 1600 : 2200);
  });

  const normalizeStatus = (payload) => {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    return {
      online: Boolean(payload.online),
      players: Math.max(
        0,
        Math.floor(Number(payload.players_online) || 0),
      ),
      checked: payload.checked !== false,
    };
  };

  const setStatusUnavailable = () => {
    if (!statusElement || !statusLabel) {
      return;
    }

    statusElement.classList.remove(
      "is-loading",
      "is-online",
    );

    statusElement.classList.add("is-offline");
    statusLabel.textContent = "Status unavailable";
  };

  const loadStatus = async () => {
    if (!statusElement || !statusLabel) {
      return;
    }

    try {
      const response = await fetch(
        `/api/server-status.php?mode=home&t=${Date.now()}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        setStatusUnavailable();
        return;
      }

      const status = normalizeStatus(await response.json());

      if (!status?.checked) {
        setStatusUnavailable();
        return;
      }

      statusElement.classList.remove(
        "is-loading",
        "is-online",
        "is-offline",
      );

      statusElement.classList.add(
        status.online ? "is-online" : "is-offline",
      );

      statusLabel.textContent = status.online
        ? `${status.players} online`
        : "Server offline";
    } catch {
      setStatusUnavailable();
    }
  };

  const requestVideoPlayback = () => {
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playback = video.play();

    if (playback instanceof Promise) {
      playback.catch(() => {
        // Browser may wait for interaction.
      });
    }
  };

  if (video instanceof HTMLVideoElement) {
    video.addEventListener(
      "canplay",
      requestVideoPlayback,
    );

    document.addEventListener(
      "pointerdown",
      requestVideoPlayback,
      { once: true, passive: true },
    );

    requestVideoPlayback();
  }

  loadStatus();

  window.setInterval(() => {
    if (!document.hidden) {
      loadStatus();
    }
  }, 60_000);
})();
