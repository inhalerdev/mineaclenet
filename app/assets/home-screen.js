(() => {
  "use strict";

  const searchRoot = document.querySelector("[data-home-player-search]");
  const searchForm = document.querySelector("[data-home-player-search-form]");
  const searchInput = document.querySelector("[data-home-player-search-input]");
  const searchResults = document.querySelector("[data-home-player-search-results]");
  const copyButton = document.querySelector("[data-home-copy-ip]");
  const serverStatus = document.querySelector("[data-home-server-status]");
  const serverCount = document.querySelector("[data-home-server-count]");
  const liveStatus = document.querySelector("[data-home-live-status]");

  const searchCache = new Map();
  const searchDelayMs = 130;
  const minimumQueryLength = 1;
  let searchTimer = 0;
  let searchController = null;
  let searchSequence = 0;
  let activeOptionIndex = -1;
  let renderedOptions = [];

  const announce = (message) => {
    if (liveStatus) {
      liveStatus.textContent = message;
    }
  };

  const playerUrl = (name) => `/player/${encodeURIComponent(name)}`;

  const hideResults = () => {
    window.clearTimeout(searchTimer);
    searchTimer = 0;

    if (searchController) {
      searchController.abort();
      searchController = null;
    }

    searchSequence += 1;
    activeOptionIndex = -1;
    renderedOptions = [];

    if (searchResults) {
      searchResults.hidden = true;
      searchResults.replaceChildren();
    }

    if (searchInput) {
      searchInput.setAttribute("aria-expanded", "false");
      searchInput.removeAttribute("aria-activedescendant");
    }
  };

  const showMessage = (message) => {
    if (!searchResults || !searchInput) {
      return;
    }

    const row = document.createElement("p");
    row.className = "home-search-message";
    row.textContent = message;
    searchResults.replaceChildren(row);
    searchResults.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    activeOptionIndex = -1;
    renderedOptions = [];
  };

  const rankColor = (value) => {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color : "#ff55ff";
  };

  const resultMeta = (player) => {
    if (player.online) {
      const world = String(player.world_name || "").trim();
      return world ? `Online · ${world}` : "Online now";
    }

    const playtime = String(player.playtime_label || "").trim();
    return playtime || "Open player stats";
  };

  const setActiveOption = (nextIndex) => {
    if (!searchInput || renderedOptions.length === 0) {
      return;
    }

    activeOptionIndex = (nextIndex + renderedOptions.length) % renderedOptions.length;

    renderedOptions.forEach((option, index) => {
      const active = index === activeOptionIndex;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-selected", active ? "true" : "false");

      if (active) {
        searchInput.setAttribute("aria-activedescendant", option.id);
        option.scrollIntoView({ block: "nearest" });
      }
    });
  };

  const renderPlayers = (players) => {
    if (!searchResults || !searchInput) {
      return;
    }

    const validPlayers = Array.isArray(players)
      ? players.filter((player) => String(player && player.name || "").trim() !== "").slice(0, 6)
      : [];

    if (validPlayers.length === 0) {
      showMessage("No matching player found");
      return;
    }

    const fragment = document.createDocumentFragment();
    renderedOptions = validPlayers.map((player, index) => {
      const username = String(player.name).trim();
      const displayName = String(player.display_name || username).trim() || username;
      const option = document.createElement("a");
      const headUrl = String(player.skin && player.skin.head || "").trim();
      const copy = document.createElement("span");
      const name = document.createElement("span");
      const meta = document.createElement("span");
      const action = document.createElement("span");

      option.id = `homePlayerOption${index}`;
      option.className = "home-search-option";
      option.href = playerUrl(username);
      option.role = "option";
      option.setAttribute("aria-selected", "false");

      if (headUrl !== "") {
        const head = document.createElement("img");
        head.className = "home-search-head";
        head.src = headUrl;
        head.alt = "";
        head.width = 38;
        head.height = 38;
        head.decoding = "async";
        head.draggable = false;
        option.append(head);
      } else {
        const head = document.createElement("span");
        head.className = "home-search-head";
        head.setAttribute("aria-hidden", "true");
        option.append(head);
      }

      copy.className = "home-search-copy";
      name.className = "home-search-name";

      const label = String(player.rank_label || "").trim();
      if (label !== "") {
        const rank = document.createElement("span");
        rank.className = "home-search-rank";
        rank.style.setProperty("--rank-color", rankColor(player.rank_color));
        rank.textContent = label;
        name.append(rank);
      }

      name.append(document.createTextNode(displayName));
      meta.className = "home-search-meta";
      meta.textContent = resultMeta(player);
      action.className = "home-search-open";
      action.textContent = "View";
      copy.append(name, meta);
      option.append(copy, action);

      option.addEventListener("pointermove", () => {
        activeOptionIndex = index;
        renderedOptions.forEach((item, itemIndex) => {
          item.classList.toggle("is-active", itemIndex === index);
          item.setAttribute("aria-selected", itemIndex === index ? "true" : "false");
        });
      });

      fragment.append(option);
      return option;
    });

    activeOptionIndex = -1;
    searchResults.replaceChildren(fragment);
    searchResults.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
  };

  const fetchPlayers = async (query) => {
    const normalizedQuery = query.toLocaleLowerCase();

    if (searchCache.has(normalizedQuery)) {
      renderPlayers(searchCache.get(normalizedQuery));
      return;
    }

    if (searchController) {
      searchController.abort();
    }

    const controller = new AbortController();
    const sequence = searchSequence + 1;
    searchController = controller;
    searchSequence = sequence;

    try {
      const response = await fetch(`/api/player-search.php?q=${encodeURIComponent(query)}&limit=6`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });

      if (!response.ok) {
        showMessage("Player search is unavailable");
        return;
      }

      const payload = await response.json();

      if (sequence !== searchSequence) {
        return;
      }

      const players = Array.isArray(payload.players) ? payload.players : [];
      searchCache.set(normalizedQuery, players);

      if (searchCache.size > 24) {
        searchCache.delete(searchCache.keys().next().value);
      }

      renderPlayers(players);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      showMessage("Player search is unavailable");
    } finally {
      if (searchController === controller) {
        searchController = null;
      }
    }
  };

  const queueSearch = () => {
    if (!searchInput) {
      return;
    }

    const query = searchInput.value.trim();
    window.clearTimeout(searchTimer);

    if (query.length < minimumQueryLength) {
      hideResults();
      return;
    }

    searchTimer = window.setTimeout(() => {
      fetchPlayers(query);
    }, searchDelayMs);
  };

  const submitSearch = (event) => {
    if (!searchInput) {
      return;
    }

    const activeOption = renderedOptions[activeOptionIndex];

    if (activeOption instanceof HTMLAnchorElement) {
      event.preventDefault();
      window.location.assign(activeOption.href);
      return;
    }

    const query = searchInput.value.trim();

    if (query === "") {
      event.preventDefault();
      hideResults();
      searchInput.focus();
      return;
    }

    event.preventDefault();
    window.location.assign(playerUrl(query));
  };

  if (searchInput && searchForm) {
    searchInput.addEventListener("input", queueSearch);
    searchInput.addEventListener("focus", () => {
      if (searchInput.value.trim().length >= minimumQueryLength) {
        queueSearch();
      }
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveOption(activeOptionIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveOption(activeOptionIndex - 1);
      } else if (event.key === "Escape") {
        hideResults();
      }
    });

    searchForm.addEventListener("submit", submitSearch);
  }

  document.addEventListener("pointerdown", (event) => {
    if (!searchRoot || searchRoot.contains(event.target)) {
      return;
    }

    hideResults();
  });

  const copyTextFallback = (value) => {
    if (typeof document.execCommand !== "function") {
      return false;
    }

    const textArea = document.createElement("textarea");
    textArea.value = value;
    textArea.readOnly = true;
    textArea.style.position = "fixed";
    textArea.style.left = "-10000px";
    document.body.append(textArea);
    textArea.select();
    try {
      return document.execCommand("copy");
    } finally {
      textArea.remove();
    }
  };

  const copyServerIp = async () => {
    if (!(copyButton instanceof HTMLButtonElement)) {
      return;
    }

    const ip = copyButton.dataset.serverIp || "mineacle.net";
    const label = copyButton.querySelector("[data-home-copy-label]");
    const defaultLabel = copyButton.dataset.defaultLabel || "Play Now";
    const copiedLabel = copyButton.dataset.copiedLabel || "IP Copied";
    let copied;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(ip);
        copied = true;
      } else {
        copied = copyTextFallback(ip);
      }
    } catch {
      copied = copyTextFallback(ip);
    }

    copyButton.classList.toggle("is-copied", copied);

    if (label) {
      label.textContent = copied ? copiedLabel : ip;
    }

    announce(copied ? `Copied ${ip}` : `Server IP: ${ip}`);

    window.setTimeout(() => {
      copyButton.classList.remove("is-copied");

      if (label) {
        label.textContent = defaultLabel;
      }
    }, 1800);
  };

  if (copyButton) {
    copyButton.addEventListener("click", copyServerIp);
  }

  const setServerStatus = (online, count) => {
    if (!serverStatus || !serverCount) {
      return;
    }

    serverStatus.classList.remove("is-loading", "is-online", "is-offline");
    serverStatus.classList.add(online ? "is-online" : "is-offline");
    serverCount.textContent = online
      ? `${count.toLocaleString()} Online Players`
      : "Server Offline";
  };

  const loadServerStatus = async () => {
    if (!serverStatus || !serverCount) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3500);

    try {
      const response = await fetch("/api/server-status.php", {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });

      if (!response.ok) {
        setServerStatus(false, 0);
        return;
      }

      const payload = await response.json();
      const players = payload && typeof payload.players === "object" ? payload.players : {};
      const rawCount = payload.players_online ?? payload.online_players ?? players.online ?? 0;
      const count = Number.isFinite(Number(rawCount)) ? Math.max(0, Math.floor(Number(rawCount))) : 0;
      setServerStatus(Boolean(payload.online), count);
    } catch {
      setServerStatus(false, 0);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  window.setTimeout(loadServerStatus, 0);
})();
