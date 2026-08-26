(() => {
  "use strict";

  const video = document.querySelector(
    ".home-promo-card__video",
  );

  const searchShell = document.querySelector(
    "[data-home-player-search]",
  );

  const searchForm = searchShell?.querySelector(
    ".home-player-search",
  );

  const searchInput = searchShell?.querySelector(
    "[data-home-search-input]",
  );

  const searchResults = searchShell?.querySelector(
    "[data-home-search-results]",
  );

  let searchTimer = 0;
  let searchRequest = null;
  let activeIndex = -1;
  let suggestions = [];

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
        // Browser may wait for a user gesture.
      });
    }
  };

  const playerUrl = (username) => (
    `/player/${encodeURIComponent(username)}`
  );

  const closeSuggestions = () => {
    if (!searchResults) {
      return;
    }

    searchResults.hidden = true;
    searchResults.replaceChildren();
    suggestions = [];
    activeIndex = -1;
  };

  const setActiveSuggestion = (index) => {
    if (!searchResults || suggestions.length === 0) {
      return;
    }

    activeIndex = Math.max(
      0,
      Math.min(index, suggestions.length - 1),
    );

    const rows = searchResults.querySelectorAll(
      ".home-search-result",
    );

    rows.forEach((row, rowIndex) => {
      row.classList.toggle(
        "is-active",
        rowIndex === activeIndex,
      );
    });

    rows[activeIndex]?.scrollIntoView({
      block: "nearest",
    });
  };

  const openPlayer = (player) => {
    const username = String(
      player?.username || player?.display_name || "",
    ).trim();

    if (!username) {
      return;
    }

    window.location.assign(playerUrl(username));
  };

  const renderSuggestions = (players) => {
    if (!searchResults) {
      return;
    }

    suggestions = Array.isArray(players)
      ? players.slice(0, 8)
      : [];

    activeIndex = -1;
    searchResults.replaceChildren();

    if (suggestions.length === 0) {
      searchResults.hidden = true;
      return;
    }

    const fragment = document.createDocumentFragment();

    suggestions.forEach((player, index) => {
      const username = String(
        player?.username || "",
      ).trim();

      const displayName = String(
        player?.display_name || username,
      ).trim();

      if (!username) {
        return;
      }

      const row = document.createElement("button");
      row.type = "button";
      row.className = "home-search-result";
      row.dataset.index = String(index);

      const name = document.createElement("strong");
      name.textContent = displayName || username;

      row.append(name);

      if (
        displayName
        && displayName.toLowerCase()
          !== username.toLowerCase()
      ) {
        const accountName = document.createElement("small");
        accountName.textContent = username;
        row.append(accountName);
      }

      row.addEventListener("click", () => {
        openPlayer(player);
      });

      fragment.append(row);
    });

    searchResults.append(fragment);
    searchResults.hidden = false;
  };

  const searchPlayers = async (query) => {
    searchRequest?.abort();

    if (query.length < 1) {
      closeSuggestions();
      return;
    }

    const controller = new AbortController();
    searchRequest = controller;

    try {
      const response = await fetch(
        `/api/player-search.php?mode=suggest&limit=8&q=${encodeURIComponent(query)}`,
        {
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        closeSuggestions();
        return;
      }

      const payload = await response.json();

      if (
        searchInput
        && searchInput.value.trim() === query
      ) {
        renderSuggestions(payload?.players || []);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        closeSuggestions();
      }
    } finally {
      if (searchRequest === controller) {
        searchRequest = null;
      }
    }
  };

  searchInput?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);

    const query = searchInput.value.trim();

    if (!query) {
      closeSuggestions();
      return;
    }

    searchTimer = window.setTimeout(() => {
      searchPlayers(query);
    }, 140);
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (
      searchResults?.hidden
      || suggestions.length === 0
    ) {
      if (event.key === "Escape") {
        closeSuggestions();
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveSuggestion(
        activeIndex < suggestions.length - 1
          ? activeIndex + 1
          : 0,
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveSuggestion(
        activeIndex > 0
          ? activeIndex - 1
          : suggestions.length - 1,
      );

      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      openPlayer(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeSuggestions();
    }
  });

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = searchInput?.value.trim() || "";

    if (!query) {
      searchInput?.focus();
      return;
    }

    if (activeIndex >= 0 && suggestions[activeIndex]) {
      openPlayer(suggestions[activeIndex]);
      return;
    }

    window.location.assign(playerUrl(query));
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      searchShell
      && !searchShell.contains(event.target)
    ) {
      closeSuggestions();
    }
  });

  if (video instanceof HTMLVideoElement) {
    video.addEventListener(
      "canplay",
      requestVideoPlayback,
    );

    document.addEventListener(
      "pointerdown",
      requestVideoPlayback,
      {
        once: true,
        passive: true,
      },
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (!document.hidden && video.paused) {
          requestVideoPlayback();
        }
      },
    );

    requestVideoPlayback();
  }
})();
