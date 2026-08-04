(() => {
  "use strict";

  let requestController = null;
  let requestRun = 0;
  let currentUrl = `${window.location.pathname}${window.location.search}`;

  const leaderboardRoot = () => document.querySelector("[data-leaderboard-root]");

  const setStatus = (message) => {
    const status = document.querySelector("[data-leaderboard-status]");

    if (status) {
      status.textContent = message;
    }
  };

  const normalizeUrl = (value) => {
    const url = new URL(value, window.location.href);

    return /^\/leaderboards\/?$/i.test(url.pathname) ? url : null;
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

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        nextRoot.animate(
          [
            { opacity: 0.72, transform: "translateY(5px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 150,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          },
        );
      }

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

    const link = event.target.closest("[data-leaderboard-link]");

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

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
      return;
    }

    await replaceLeaderboard(link.href, true);
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
