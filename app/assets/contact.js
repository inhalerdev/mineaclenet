(() => {
  const form = document.querySelector("[data-contact-form]");
  const picker = document.querySelector("[data-contact-player-picker]");
  const input = picker?.querySelector("[data-contact-player-input]");
  const uuidInput = picker?.querySelector("[data-contact-player-uuid]");
  const results = picker?.querySelector("[data-contact-player-results]");
  const selected = picker?.querySelector("[data-contact-player-selected]");
  const selectedHead = picker?.querySelector(
    "[data-contact-player-selected-head]",
  );
  const selectedName = picker?.querySelector(
    "[data-contact-player-selected-name]",
  );
  const clearButton = picker?.querySelector("[data-contact-player-clear]");

  if (
    !form ||
    !picker ||
    !input ||
    !uuidInput ||
    !results ||
    !selected ||
    !selectedHead ||
    !selectedName ||
    !clearButton
  ) {
    return;
  }

  let searchTimer = 0;
  let searchRequest = null;
  let searchRun = 0;
  let activeIndex = -1;

  const resultOptions = () =>
    Array.from(results.querySelectorAll(".contact-player-option"));

  const hideResults = () => {
    results.hidden = true;
    results.textContent = "";
    activeIndex = -1;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };

  const clearSelection = ({ focus = false } = {}) => {
    uuidInput.value = "";
    input.readOnly = false;
    input.setCustomValidity("");
    selected.hidden = true;
    selectedName.textContent = "";
    selectedHead.src = "";
    selectedHead.hidden = true;
    hideResults();

    if (focus) {
      input.value = "";
      input.focus();
    }
  };

  const selectPlayer = (player) => {
    const name = String(player.name || "").trim();
    const uuid = String(player.uuid || "").trim();

    if (!name || !uuid) {
      return;
    }

    input.value = name;
    input.readOnly = true;
    input.setCustomValidity("");
    uuidInput.value = uuid;
    selectedName.textContent = name;
    selected.hidden = false;

    const head = String(player.head || "").trim();
    selectedHead.hidden = !head;
    selectedHead.src = head;
    hideResults();
  };

  const renderEmpty = (message) => {
    results.textContent = "";
    const empty = document.createElement("p");

    empty.className = "contact-player-empty";
    empty.textContent = message;
    results.append(empty);
    results.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  const renderPlayers = (players) => {
    results.textContent = "";
    activeIndex = -1;

    players.forEach((player, index) => {
      const name = String(player.name || "").trim();
      const uuid = String(player.uuid || "").trim();

      if (!name || !uuid) {
        return;
      }

      const option = document.createElement("button");
      const head = document.createElement("span");
      const copy = document.createElement("span");
      const playerName = document.createElement("strong");
      const detail = document.createElement("small");
      const headUrl = String(player.head || "").trim();
      const displayName = String(player.display_name || name).trim();

      option.type = "button";
      option.id = `contact-player-option-${index}`;
      option.className = "contact-player-option";
      option.setAttribute("role", "option");
      option.dataset.index = String(index);

      head.className = "contact-player-option__head";

      if (headUrl) {
        const image = document.createElement("img");

        image.src = headUrl;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        image.draggable = false;
        head.append(image);
      } else {
        head.textContent = name.slice(0, 1).toUpperCase();
      }

      playerName.textContent = name;
      detail.textContent =
        displayName && displayName.toLowerCase() !== name.toLowerCase()
          ? displayName
          : "Mineacle player";
      copy.append(playerName, detail);
      option.append(head, copy);
      option.addEventListener("click", () => selectPlayer(player));
      results.append(option);
    });

    if (results.children.length === 0) {
      renderEmpty("No joined Mineacle players found");
      return;
    }

    results.hidden = false;
    input.setAttribute("aria-expanded", "true");
  };

  const searchPlayers = async (query) => {
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

      if (run !== searchRun) {
        return;
      }

      renderPlayers(Array.isArray(payload.players) ? payload.players : []);
    } catch (error) {
      if (error?.name !== "AbortError" && run === searchRun) {
        renderEmpty("Player search is temporarily unavailable");
      }
    } finally {
      if (searchRequest === controller) {
        searchRequest = null;
      }
    }
  };

  const setActiveOption = (nextIndex) => {
    const options = resultOptions();

    if (options.length === 0) {
      return;
    }

    activeIndex = (nextIndex + options.length) % options.length;

    options.forEach((option, index) => {
      const active = index === activeIndex;

      option.classList.toggle("is-active", active);
      option.setAttribute("aria-selected", active ? "true" : "false");
    });

    const activeOption = options[activeIndex];
    input.setAttribute("aria-activedescendant", activeOption.id);
    activeOption.scrollIntoView({ block: "nearest" });
  };

  input.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    uuidInput.value = "";
    selected.hidden = true;
    input.setCustomValidity("");
    const query = input.value.trim();

    if (query.length < 1) {
      searchRequest?.abort();
      hideResults();
      return;
    }

    searchTimer = window.setTimeout(() => searchPlayers(query), 150);
  });

  input.addEventListener("keydown", (event) => {
    if (results.hidden) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveOption(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveOption(activeIndex - 1);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      resultOptions()[activeIndex]?.click();
    } else if (event.key === "Escape") {
      hideResults();
    }
  });

  clearButton.addEventListener("click", () => clearSelection({ focus: true }));

  document.addEventListener("pointerdown", (event) => {
    if (!picker.contains(event.target)) {
      hideResults();
    }
  });

  form.addEventListener("submit", (event) => {
    if (!uuidInput.value.trim() || !input.readOnly) {
      event.preventDefault();
      input.setCustomValidity(
        "Choose your Mineacle player profile from the search results",
      );
      input.reportValidity();
    }
  });
})();
