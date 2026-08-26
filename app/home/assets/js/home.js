(() => {
  "use strict";

  const playButton = document.querySelector("[data-copy-server]");
  const playLabel = playButton?.querySelector("[data-play-label]");
  const statusElement = document.querySelector("[data-home-status]");
  const statusLabel = document.querySelector("[data-home-status-label]");
  const video = document.querySelector(".home-promo-card__video");

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Continue to local fallback.
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

  playButton?.addEventListener("click", async () => {
    const address = playButton.dataset.serverAddress?.trim();

    if (!address || !playLabel) {
      return;
    }

    const copied = await copyText(address);

    playButton.classList.toggle("is-copy-error", !copied);
    playLabel.textContent = copied ? "Copied" : "Copy failed";

    window.setTimeout(() => {
      playButton.classList.remove("is-copy-error");
      playLabel.textContent = "Play";
    }, copied ? 1600 : 2200);
  });

  const setStatusUnavailable = () => {
    if (!statusElement || !statusLabel) {
      return;
    }

    statusElement.classList.remove("is-loading");
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

      const payload = await response.json();

      if (!payload || payload.checked === false) {
        setStatusUnavailable();
        return;
      }

      const players = Math.max(
        0,
        Math.floor(Number(payload.players_online) || 0),
      );

      statusElement.classList.remove("is-loading");
      statusLabel.textContent = `${players.toLocaleString()} Current Playing`;
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
      playback.catch(() => {});
    }
  };

  requestVideoPlayback();
  loadStatus();

  document.addEventListener(
    "pointerdown",
    requestVideoPlayback,
    { once: true, passive: true },
  );

  window.setInterval(() => {
    if (!document.hidden) {
      loadStatus();
    }
  }, 60_000);
})();
