(() => {
  "use strict";

  const CLEAN_LOCATION = "/leaderboards";
  const SEARCH_DELAY = 240;
  let requestController = null;
  let requestRun = 0;
  let searchTimer = 0;

  const leaderboardRoot = () => document.querySelector("[data-leaderboard-root]");

  const setStatus = (message) => {
    const status = document.querySelector("[data-leaderboard-status]");

    if (status) {
      status.textContent = message;
    }
  };

  const normalizeRankToken = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9+]/g, "");

  const canonicalRank = (keyValue, labelValue) => {
    const tokens = [
      normalizeRankToken(keyValue),
      normalizeRankToken(labelValue),
    ].filter(Boolean);

    const has = (...values) =>
      tokens.some((token) => values.includes(token));

    if (has("+", "plus", "mineacle+", "mineacleplus")) {
      return {
        key: "plus",
        label: "Mineacle +",
        color: "#ff55ff",
      };
    }

    if (has("admin", "administrator")) {
      return {
        key: "admin",
        label: "Admin",
        color: "#ff5555",
      };
    }

    if (has("media", "media+", "mediaplus", "creator", "contentcreator")) {
      return {
        key: "media",
        label: "Media +",
        color: "#55ffff",
      };
    }

    if (
      tokens.length === 0 ||
      has(
        "default",
        "member",
        "unranked",
        "none",
        "normal",
        "player",
        "user",
        "developer",
        "dev",
      )
    ) {
      return null;
    }

    return {
      key: normalizeRankToken(keyValue) || "custom",
      label: String(labelValue ?? "").trim(),
      color: "",
    };
  };

  const decorateRankedNames = (scope = document) => {
    scope.querySelectorAll(".mineacle-ranked-name").forEach((wrapper) => {
      if (!(wrapper instanceof HTMLElement)) {
        return;
      }

      const rankElement = wrapper.querySelector(
        ".mineacle-ranked-name__rank",
      );
      const rawKey = wrapper.dataset.rankKey ?? "";
      const rawLabel =
        wrapper.dataset.rankLabel ??
        (rankElement instanceof HTMLElement ? rankElement.textContent : "") ??
        "";
      const rank = canonicalRank(rawKey, rawLabel);

      wrapper.classList.remove(
        "is-rank-ready",
        "is-rank-plus",
        "is-rank-admin",
        "is-rank-media",
      );

      if (!rank) {
        rankElement?.remove();
        wrapper.classList.remove(
          "has-rank",
          "is-compact-rank",
          "is-plus-rank",
        );
        wrapper.removeAttribute("data-rank-key");
        wrapper.removeAttribute("data-rank-label");
        wrapper.style.removeProperty("--rank-color");
        return;
      }

      if (!(rankElement instanceof HTMLElement)) {
        return;
      }

      rankElement.textContent = rank.label;
      wrapper.dataset.rankKey = rank.key;
      wrapper.dataset.rankLabel = rank.label;

      if (rank.color !== "") {
        wrapper.style.setProperty("--rank-color", rank.color);
      }

      if (rank.key === "plus") {
        wrapper.classList.add("is-rank-plus");
      } else if (rank.key === "admin") {
        wrapper.classList.add("is-rank-admin");
      } else if (rank.key === "media") {
        wrapper.classList.add("is-rank-media");
      }

      wrapper.classList.add("is-rank-ready");
    });
  };

  const polishSearch = (scope, category) => {
    const input = scope.querySelector("[data-leaderboard-search]");

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    input.placeholder =
      category === "teams" ? "Search for a team" : "Search for a player";
    input.setAttribute(
      "aria-label",
      category === "teams"
        ? "Search team leaderboard"
        : "Search player leaderboard",
    );
  };

  const polishLeaderboard = (root) => {
    if (!(root instanceof HTMLElement)) {
      return;
    }

    decorateRankedNames(root);
    polishSearch(root, root.dataset.category ?? "players");
  };

  const normalizeRequestUrl = (value) => {
    const url = new URL(value, window.location.href);

    if (!/^\/leaderboards\/?$/i.test(url.pathname)) {
      return null;
    }

    return url;
  };

  const relativeRequestUrl = (value) => {
    const url = normalizeRequestUrl(value);

    return url ? `${url.pathname}${url.search}` : null;
  };

  const initialRequestUrl = relativeRequestUrl(window.location.href) ?? CLEAN_LOCATION;
  let currentRequestUrl = initialRequestUrl;

  window.history.replaceState(
    {
      mineacleLeaderboard: true,
      requestUrl: initialRequestUrl,
    },
    "",
    CLEAN_LOCATION,
  );

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  const writeHistory = (requestUrl, mode) => {
    if (mode === "none") {
      return;
    }

    const state = {
      mineacleLeaderboard: true,
      requestUrl,
    };

    if (mode === "push") {
      window.history.pushState(state, "", CLEAN_LOCATION);
      return;
    }

    window.history.replaceState(state, "", CLEAN_LOCATION);
  };

  const syncRootState = (currentRoot, nextRoot) => {
    ["category", "metric", "order", "search"].forEach((key) => {
      currentRoot.dataset[key] = nextRoot.dataset[key] ?? "";
    });
  };

  const swapLeaderboardContent = (currentRoot, nextRoot) => {
    const currentHeader = currentRoot.querySelector("[data-leaderboard-header]");
    const currentDynamic = currentRoot.querySelector("[data-leaderboard-dynamic]");
    const nextHeader = nextRoot.querySelector("[data-leaderboard-header]");
    const nextDynamic = nextRoot.querySelector("[data-leaderboard-dynamic]");

    if (
      !(currentHeader instanceof HTMLElement) ||
      !(currentDynamic instanceof HTMLElement) ||
      !(nextHeader instanceof HTMLElement) ||
      !(nextDynamic instanceof HTMLElement)
    ) {
      return false;
    }

    const currentSearch = currentHeader.querySelector("[data-leaderboard-search]");
    const searchHadFocus = currentSearch instanceof HTMLInputElement && document.activeElement === currentSearch;
    const selectionStart = searchHadFocus ? currentSearch.selectionStart : null;
    const selectionEnd = searchHadFocus ? currentSearch.selectionEnd : null;

    currentHeader.replaceWith(nextHeader);
    currentDynamic.replaceWith(nextDynamic);
    syncRootState(currentRoot, nextRoot);
    polishLeaderboard(currentRoot);

    const nextScrollRegion = nextDynamic.querySelector("[data-leaderboard-scroll]");

    if (nextScrollRegion instanceof HTMLElement) {
      nextScrollRegion.scrollTop = 0;
    }

    if (searchHadFocus) {
      const nextSearch = nextHeader.querySelector("[data-leaderboard-search]");

      if (nextSearch instanceof HTMLInputElement) {
        nextSearch.focus({ preventScroll: true });

        const maxSelection = nextSearch.value.length;
        const start = Math.min(selectionStart ?? maxSelection, maxSelection);
        const end = Math.min(selectionEnd ?? start, maxSelection);
        nextSearch.setSelectionRange(start, end);
      }
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nextDynamic.animate(
        [
          { opacity: 0.62, transform: "translateY(3px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 140,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        },
      );
    }

    return true;
  };

  const replaceLeaderboard = async (value, historyMode = "push") => {
    const currentRoot = leaderboardRoot();
    const targetUrl = normalizeRequestUrl(value);

    if (!(currentRoot instanceof HTMLElement) || !targetUrl) {
      return false;
    }

    const targetRequestUrl = `${targetUrl.pathname}${targetUrl.search}`;

    if (targetRequestUrl === currentRequestUrl) {
      writeHistory(targetRequestUrl, historyMode === "push" ? "none" : historyMode);
      return true;
    }

    requestController?.abort();

    const controller = new AbortController();
    const run = ++requestRun;
    requestController = controller;
    currentRoot.classList.add("is-updating");
    currentRoot.setAttribute("aria-busy", "true");
    setStatus("Updating leaderboard rankings");

    try {
      const response = await fetch(targetUrl.href, {
        headers: {
          Accept: "text/html",
          "X-Requested-With": "fetch",
        },
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });

      if (!response.ok) {
        setStatus("The leaderboard could not be updated. Please try again");
        return false;
      }

      const html = await response.text();

      if (run !== requestRun) {
        return null;
      }

      const nextDocument = new DOMParser().parseFromString(html, "text/html");
      const nextRoot = nextDocument.querySelector("[data-leaderboard-root]");

      if (!(nextRoot instanceof HTMLElement) || !swapLeaderboardContent(currentRoot, nextRoot)) {
        setStatus("The leaderboard could not be updated. Please try again");
        return false;
      }

      if (nextDocument.title) {
        document.title = nextDocument.title;
      }

      currentRequestUrl = targetRequestUrl;
      writeHistory(targetRequestUrl, historyMode);
      setStatus("Leaderboard rankings updated");

      return true;
    } catch (error) {
      if (error?.name === "AbortError") {
        return null;
      }

      setStatus("The leaderboard could not be updated. Please try again");
      return false;
    } finally {
      if (requestController === controller) {
        requestController = null;
        currentRoot.classList.remove("is-updating");
        currentRoot.removeAttribute("aria-busy");
      }
    }
  };

  const buildSearchUrl = (form) => {
    const data = new FormData(form);
    const params = new URLSearchParams();

    for (const [key, rawValue] of data.entries()) {
      const value = String(rawValue).trim();

      if (key !== "search" || value !== "") {
        params.set(key, value);
      }
    }

    const query = params.toString();

    return query ? `${CLEAN_LOCATION}?${query}` : CLEAN_LOCATION;
  };

  const runSearch = (form) => {
    window.clearTimeout(searchTimer);
    searchTimer = 0;
    void replaceLeaderboard(buildSearchUrl(form), "replace");
  };

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const control = event.target.closest("[data-leaderboard-request]");

    if (!(control instanceof HTMLButtonElement)) {
      return;
    }

    const requestUrl = control.dataset.leaderboardRequest;

    if (!requestUrl) {
      return;
    }

    const filter = control.closest("[data-leaderboard-filter]");

    if (filter instanceof HTMLDetailsElement) {
      filter.open = false;
    }

    void replaceLeaderboard(requestUrl, "push");
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement) || !form.matches("[data-leaderboard-search-form]")) {
      return;
    }

    event.preventDefault();
    runSearch(form);
  });

  document.addEventListener("input", (event) => {
    const input = event.target;

    if (!(input instanceof HTMLInputElement) || !input.matches("[data-leaderboard-search]")) {
      return;
    }

    if (event.isComposing) {
      return;
    }

    requestController?.abort();
    window.clearTimeout(searchTimer);

    const form = input.form;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    searchTimer = window.setTimeout(() => {
      runSearch(form);
    }, SEARCH_DELAY);
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;

    if (event.key === "Escape") {
      if (target instanceof HTMLInputElement && target.matches("[data-leaderboard-search]") && target.value !== "") {
        event.preventDefault();
        target.value = "";
        target.dispatchEvent(new Event("input", { bubbles: true }));
        return;
      }

      const openFilter = document.querySelector("[data-leaderboard-filter][open]");

      if (openFilter instanceof HTMLDetailsElement) {
        openFilter.open = false;
        openFilter.querySelector("summary")?.focus();
      }
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }

    document.querySelectorAll("[data-leaderboard-filter][open]").forEach((filter) => {
      if (filter instanceof HTMLDetailsElement && !filter.contains(event.target)) {
        filter.open = false;
      }
    });
  });

  window.addEventListener("popstate", (event) => {
    const requestUrl = relativeRequestUrl(event.state?.requestUrl ?? CLEAN_LOCATION) ?? CLEAN_LOCATION;

    void replaceLeaderboard(requestUrl, "none").then((loaded) => {
      if (loaded === false) {
        window.history.replaceState(
          {
            mineacleLeaderboard: true,
            requestUrl: currentRequestUrl,
          },
          "",
          CLEAN_LOCATION,
        );
      }
    });
  });

  const initialRoot = leaderboardRoot();

  if (initialRoot instanceof HTMLElement) {
    polishLeaderboard(initialRoot);
  }
})();
