(() => {
  "use strict";

  const header = document.querySelector("[data-site-header]");

  if (!header) {
    return;
  }

  const searchShell = header.querySelector(
    "[data-site-player-search]",
  );

  const searchForm = searchShell?.querySelector(
    ".site-header__search",
  );

  const searchInput = searchShell?.querySelector(
    "[data-site-search-input]",
  );

  const searchResults = searchShell?.querySelector(
    "[data-site-search-results]",
  );

  let searchTimer = 0;
  let searchRequest = null;
  let activeIndex = -1;
  let suggestions = [];

  const playerUrl = (username) => (
    `/player/${encodeURIComponent(username)}`
  );

  const normalizedUsername = (player) => String(
    player?.username || "",
  ).trim();

  const normalizedNickname = (player) => {
    const username = normalizedUsername(player);

    const nickname = String(
      player?.nickname || "",
    ).trim();

    if (
      !nickname
      || nickname.toLowerCase() === username.toLowerCase()
    ) {
      return "";
    }

    return nickname;
  };

  const shortUuid = (uuid) => {
    const compact = String(uuid || "")
      .replace(/[^a-fA-F0-9]/g, "")
      .toLowerCase();

    if (compact.length < 8) {
      return "";
    }

    return `${compact.slice(0, 8)}…`;
  };

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
      ".site-header__search-result",
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
    const username = normalizedUsername(player);

    if (!username) {
      return;
    }

    window.location.assign(playerUrl(username));
  };

  const buildSuggestion = (player, index) => {
    const username = normalizedUsername(player);

    if (!username) {
      return null;
    }

    const nickname = normalizedNickname(player);
    const uuid = shortUuid(player?.uuid);

    const row = document.createElement("button");
    row.type = "button";
    row.className = "site-header__search-result";
    row.dataset.index = String(index);

    const head = document.createElement("span");
    head.className = "site-header__search-head";

    const headUrl = String(player?.head || "").trim();

    if (
      headUrl.startsWith("/")
      || headUrl.startsWith("https://")
    ) {
      const image = document.createElement("img");
      image.src = headUrl;
      image.alt = "";
      image.decoding = "async";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      head.append(image);
    }

    const copy = document.createElement("span");
    copy.className = "site-header__search-result-copy";

    const primary = document.createElement("span");
    primary.className = "site-header__search-result-primary";

    const displayName = document.createElement("strong");
    displayName.textContent = nickname || username;
    primary.append(displayName);

    if (nickname) {
      const nicknameLabel = document.createElement("span");
      nicknameLabel.className = "site-header__search-nickname";
      nicknameLabel.textContent = "Nickname";
      primary.append(nicknameLabel);
    }

    const secondary = document.createElement("span");
    secondary.className = "site-header__search-result-secondary";

    if (nickname) {
      const realUsername = document.createElement("span");
      realUsername.textContent = username;
      secondary.append(realUsername);
    }

    if (uuid) {
      const uuidText = document.createElement("span");
      uuidText.textContent = `UUID ${uuid}`;
      secondary.append(uuidText);
    }

    if (!nickname && !uuid) {
      const accountText = document.createElement("span");
      accountText.textContent = "Minecraft player";
      secondary.append(accountText);
    }

    copy.append(primary, secondary);
    row.append(head, copy);

    row.addEventListener("click", () => {
      openPlayer(player);
    });

    return row;
  };

  const renderSuggestions = (players) => {
    if (!searchResults) {
      return;
    }

    suggestions = Array.isArray(players)
      ? players
          .filter((player) => normalizedUsername(player))
          .slice(0, 8)
      : [];

    activeIndex = -1;
    searchResults.replaceChildren();

    if (suggestions.length === 0) {
      searchResults.hidden = true;
      return;
    }

    const fragment = document.createDocumentFragment();

    suggestions.forEach((player, index) => {
      const row = buildSuggestion(player, index);

      if (row) {
        fragment.append(row);
      }
    });

    searchResults.append(fragment);
    searchResults.hidden = false;
  };

  const searchPlayers = async (query) => {
    searchRequest?.abort();

    if (!query) {
      closeSuggestions();
      return;
    }

    const controller = new AbortController();
    searchRequest = controller;

    try {
      const response = await fetch(
        `/api/player-identity-search.php?q=${encodeURIComponent(query)}`,
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

    const query = searchInput.value
      .trim()
      .slice(0, 40);

    if (!query) {
      closeSuggestions();
      return;
    }

    searchTimer = window.setTimeout(() => {
      searchPlayers(query);
    }, 160);
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

    const query = searchInput?.value
      .trim()
      .slice(0, 40) || "";

    if (!query) {
      searchInput?.focus();
      return;
    }

    if (
      activeIndex >= 0
      && suggestions[activeIndex]
    ) {
      openPlayer(suggestions[activeIndex]);
      return;
    }

    /*
     * Do not construct a profile URL from an arbitrary nickname/UUID.
     * Resolve it through the identity endpoint first.
     */
    searchPlayers(query).then(() => {
      const exact = suggestions.find((player) => {
        const username = normalizedUsername(player);
        const nickname = normalizedNickname(player);
        const compactUuid = String(player?.uuid || "")
          .replace(/[^a-fA-F0-9]/g, "")
          .toLowerCase();

        const compactQuery = query
          .replace(/[^a-fA-F0-9]/g, "")
          .toLowerCase();

        return (
          username.toLowerCase() === query.toLowerCase()
          || nickname.toLowerCase() === query.toLowerCase()
          || (
            compactQuery.length >= 8
            && compactUuid.startsWith(compactQuery)
          )
        );
      });

      if (exact) {
        openPlayer(exact);
      }
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (
      searchShell
      && !searchShell.contains(event.target)
    ) {
      closeSuggestions();
    }
  });
})();
