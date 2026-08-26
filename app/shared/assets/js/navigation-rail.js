(() => {
  "use strict";

  const rail = document.querySelector("[data-site-rail]");

  if (!rail) {
    return;
  }

  const playButton = rail.querySelector(
    "[data-rail-copy-server]",
  );

  const playLabel = rail.querySelector(
    "[data-rail-play-label]",
  );

  const statusElement = rail.querySelector(
    "[data-rail-status]",
  );

  const statusLabel = rail.querySelector(
    "[data-rail-status-label]",
  );

  let playResetTimer = 0;

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Continue to the local fallback.
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

    window.clearTimeout(playResetTimer);

    const copied = await copyText(address);

    playButton.classList.toggle(
      "is-copy-error",
      !copied,
    );

    playLabel.textContent = copied
      ? "Copied"
      : "Copy failed";

    playResetTimer = window.setTimeout(() => {
      playButton.classList.remove("is-copy-error");
      playLabel.textContent = "Play Mineacle";
    }, copied ? 1600 : 2200);
  });

  const setUnavailable = () => {
    if (!statusElement || !statusLabel) {
      return;
    }

    statusElement.classList.remove("is-loading");
    statusElement.classList.add("is-offline");
    statusLabel.textContent = "Status unavailable";
  };

  const applyStatus = (payload) => {
    if (
      !statusElement
      || !statusLabel
      || !payload
      || payload.checked === false
    ) {
      setUnavailable();
      return;
    }

    const online = Boolean(payload.online);

    const players = Math.max(
      0,
      Math.floor(Number(payload.players_online) || 0),
    );

    statusElement.classList.remove(
      "is-loading",
      "is-offline",
    );

    statusElement.classList.toggle(
      "is-offline",
      !online,
    );

    statusLabel.textContent = online
      ? `${players.toLocaleString()} Currently Playing`
      : "Server Offline";
  };

  const loadStatus = async () => {
    try {
      const response = await fetch(
        `/api/server-status.php?mode=home&t=${Date.now()}`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        setUnavailable();
        return;
      }

      applyStatus(await response.json());
    } catch {
      setUnavailable();
    }
  };

  loadStatus();

  window.setInterval(() => {
    if (!document.hidden) {
      loadStatus();
    }
  }, 60_000);
})();
