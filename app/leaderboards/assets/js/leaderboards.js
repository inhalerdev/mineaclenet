(() => {
  "use strict";

  let requestController = null;
  let requestRun = 0;
  let currentUrl = `${window.location.pathname}${window.location.search}`;

  const leaderboardRoot = () => document.querySelector("[data-leaderboard-root]");
  const filterMenu = () => document.querySelector("[data-leaderboard-filter]");
  const placementNav = () => document.querySelector("[data-leaderboard-placement-nav]");

  const selectPlacement = (button) => {
    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      return;
    }

    const root = leaderboardRoot();
    const nav = placementNav();

    if (!(root instanceof HTMLElement) || !(nav instanceof HTMLElement)) {
      return;
    }

    nav.querySelectorAll("[data-leaderboard-placement]").forEach((control) => {
      const active = control === button;
      control.classList.toggle("is-active", active);
      control.setAttribute("aria-pressed", active ? "true" : "false");
    });

    root.querySelectorAll(".leaderboard-row.is-placement-focus").forEach((row) => {
      row.classList.remove("is-placement-focus");
    });

    const scrollRegion = root.querySelector("[data-leaderboard-scroll]");

    if (!(scrollRegion instanceof HTMLElement)) {
      return;
    }

    const placement = button.dataset.leaderboardPlacement || "all";
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

    if (placement === "all") {
      scrollRegion.scrollTo({ top: 0, behavior });
      return;
    }

    const target = root.querySelector(`[data-leaderboard-rank="${placement}"]`);

    if (!(target instanceof HTMLElement)) {
      return;
    }

    target.classList.add("is-placement-focus");
    const centeredTop = Math.max(
      0,
      target.offsetTop - (scrollRegion.clientHeight - target.offsetHeight) / 2,
    );
    scrollRegion.scrollTo({ top: centeredTop, behavior });
  };

  const setStatus = (message) => {
    const status = document.querySelector("[data-leaderboard-status]");

    if (status) {
      status.textContent = message;
    }
  };

  const normalizeUrl = (value) => {
    const url = new URL(value, window.location.href);

    if (!/^\/leaderboards\/?$/i.test(url.pathname)) {
      return null;
    }

    return url;
  };

  const replaceLeaderboard = async (value, pushHistory = true) => {
    const currentRoot = leaderboardRoot();
    const targetUrl = normalizeUrl(value);

    if (!(currentRoot instanceof HTMLElement) || !targetUrl) {
      return false;
    }

    requestController?.abort();

    const controller = new AbortController();
    const run = ++requestRun;
    requestController = controller;
    currentRoot.classList.add("is-loading");
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

      if (!(nextRoot instanceof HTMLElement)) {
        setStatus("The leaderboard could not be updated. Please try again");
        return false;
      }

      currentRoot.replaceWith(nextRoot);

      if (nextDocument.title) {
        document.title = nextDocument.title;
      }

      const relativeUrl = `${targetUrl.pathname}${targetUrl.search}`;

      if (pushHistory && relativeUrl !== currentUrl) {
        window.history.pushState({ mineacleLeaderboard: true }, "", relativeUrl);
      }

      currentUrl = relativeUrl;
      setStatus("Leaderboard rankings updated");

      const scrollRegion = nextRoot.querySelector("[data-leaderboard-scroll]");

      if (scrollRegion instanceof HTMLElement) {
        scrollRegion.scrollTop = 0;
      }

      window.requestAnimationFrame(() => {
        nextRoot.animate(
          [
            { opacity: 0.7, transform: "translateY(5px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 150,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          },
        );
      });

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
      }

      const activeRoot = leaderboardRoot();

      if (activeRoot instanceof HTMLElement) {
        activeRoot.classList.remove("is-loading");
        activeRoot.removeAttribute("aria-busy");
      }
    }
  };

  document.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const placementButton = event.target.closest("[data-leaderboard-placement]");

    if (placementButton instanceof HTMLButtonElement) {
      selectPlacement(placementButton);
      return;
    }

    const link = event.target.closest("[data-leaderboard-link]");

    if (link instanceof HTMLAnchorElement) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank"
      ) {
        return;
      }

      event.preventDefault();

      if (link.getAttribute("aria-current") === "page") {
        filterMenu()?.removeAttribute("open");
        return;
      }

      filterMenu()?.removeAttribute("open");
      await replaceLeaderboard(link.href, true);
      return;
    }

    const currentFilter = filterMenu();

    if (currentFilter?.open && !currentFilter.contains(event.target)) {
      currentFilter.open = false;
    }

  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    const currentFilter = filterMenu();

    if (currentFilter?.open) {
      currentFilter.open = false;
      currentFilter.querySelector("summary")?.focus();
    }
  });

  if ("scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }

  window.addEventListener("popstate", async () => {
    const loaded = await replaceLeaderboard(window.location.href, false);

    if (loaded === false) {
      window.history.replaceState({ mineacleLeaderboard: true }, "", currentUrl);
    }
  });
})();
