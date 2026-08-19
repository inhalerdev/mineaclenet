(() => {
  "use strict";

  const resetTimers = new WeakMap();

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Use the local fallback below.
      }
    }

    const textArea = document.createElement("textarea");
    const activeElement = document.activeElement;

    textArea.value = value;
    textArea.readOnly = true;
    textArea.tabIndex = -1;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();

    let copied = false;

    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      textArea.remove();

      if (activeElement instanceof HTMLElement) {
        activeElement.focus({ preventScroll: true });
      }
    }

    return copied;
  };

  document.querySelectorAll("[data-copy-profile]").forEach((button) => {
    const label = button.querySelector("[data-profile-copy-label]");

    if (!(label instanceof HTMLElement)) {
      return;
    }

    button.addEventListener("click", async () => {
      const previousTimer = resetTimers.get(button);

      if (previousTimer) {
        window.clearTimeout(previousTimer);
      }

      const value = button.dataset.copyValue?.trim() ?? "";
      const copied = value !== "" && await copyText(value);

      label.textContent = copied ? "Copied" : "Copy Failed";
      button.classList.toggle("is-copied", copied);
      button.classList.toggle("is-copy-error", !copied);

      const timer = window.setTimeout(() => {
        button.classList.remove("is-copied", "is-copy-error");
        label.textContent = "Copy Link";
        resetTimers.delete(button);
      }, copied ? 1600 : 2200);

      resetTimers.set(button, timer);
    });
  });

  /*
   * Following is only available to authenticated viewers.
   *
   * The shared navigation renders a real logout form only when a Mineacle
   * account is signed in. Use that server-rendered state instead of treating
   * browser storage itself as authentication.
   */
  const accountForm = document.querySelector(".site-navigation__account-form");
  const logoutButton = accountForm?.querySelector(
    'button[aria-label^="Log out "]',
  );
  const logoutLabel = logoutButton?.getAttribute("aria-label")?.trim() ?? "";
  const viewerKey = logoutLabel
    .replace(/^Log out\s+/i, "")
    .trim()
    .toLowerCase();
  const viewerIsLoggedIn =
    accountForm instanceof HTMLFormElement && viewerKey !== "";

  document.querySelectorAll("[data-follow-profile]").forEach((button) => {
    const label = button.querySelector("[data-follow-label]");
    const playerKey = button.dataset.followKey?.trim().toLowerCase() ?? "";

    if (!(button instanceof HTMLButtonElement) ||
        !(label instanceof HTMLElement) ||
        playerKey === "") {
      return;
    }

    /*
     * Remove the old anonymous/unscoped key introduced by the earlier player
     * page. It must never be allowed to make a logged-out or different account
     * appear to follow a player.
     */
    const legacyStorageKey = `mineacle:followed-player:${playerKey}`;

    try {
      window.localStorage.removeItem(legacyStorageKey);
    } catch {
      // Storage may be unavailable; no follow state is needed anonymously.
    }

    if (!viewerIsLoggedIn) {
      button.hidden = true;
      button.setAttribute("aria-hidden", "true");
      button.tabIndex = -1;
      return;
    }

    /*
     * Follow state is namespaced to the signed-in Mineacle account. A different
     * account using the same browser therefore gets an independent state.
     */
    const storageKey =
      `mineacle:followed-player:${encodeURIComponent(viewerKey)}:${playerKey}`;
    let following = false;

    try {
      following = window.localStorage.getItem(storageKey) === "1";
    } catch {
      following = false;
    }

    const render = () => {
      button.classList.toggle("is-following", following);
      button.setAttribute("aria-pressed", following ? "true" : "false");
      label.textContent = following ? "Following" : "Follow";
    };

    button.addEventListener("click", () => {
      following = !following;

      try {
        if (following) {
          window.localStorage.setItem(storageKey, "1");
        } else {
          window.localStorage.removeItem(storageKey);
        }
      } catch {
        // Keep only current-tab state if storage is unavailable.
      }

      render();
    });

    render();
  });


  /*
   * Canonical public rank display.
   *
   * Core/DB rows can contain legacy or presentation-oriented values such as
   * "+", "Mineacle+", "ADMIN", "Member", or an old Developer rank. The
   * profile page exposes only the public labels that Mineacle currently uses:
   *
   *   Mineacle+ -> Mineacle +
   *   Admin     -> Admin
   *   Default   -> no badge
   *   Dev       -> no badge (retired)
   */
  const normalizeRankToken = (value) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9+]/g, "");

  const playerRankBadge = document.querySelector(".profile-rank-badge");

  if (playerRankBadge instanceof HTMLElement) {
    const token = normalizeRankToken(playerRankBadge.textContent);
    const plusRanks = new Set(["+", "plus", "mineacle+", "mineacleplus"]);
    const adminRanks = new Set(["admin", "administrator"]);
    const mediaRanks = new Set(["media", "media+", "mediaplus", "creator", "contentcreator"]);
    const hiddenRanks = new Set([
      "",
      "default",
      "member",
      "unranked",
      "none",
      "normal",
      "player",
      "user",
      "developer",
      "dev",
    ]);

    playerRankBadge.classList.remove(
      "is-rank-plus",
      "is-rank-admin",
      "is-rank-media",
      "is-rank-ready",
    );

    if (plusRanks.has(token)) {
      playerRankBadge.textContent = "Mineacle +";
      playerRankBadge.classList.add("is-rank-plus", "is-rank-ready");
    } else if (adminRanks.has(token)) {
      playerRankBadge.textContent = "Admin";
      playerRankBadge.classList.add("is-rank-admin", "is-rank-ready");
    } else if (mediaRanks.has(token)) {
      playerRankBadge.textContent = "Media +";
      playerRankBadge.classList.add("is-rank-media", "is-rank-ready");
    } else if (hiddenRanks.has(token)) {
      playerRankBadge.remove();
    } else {
      /*
       * Unknown future/custom ranks are left readable instead of being
       * silently discarded. They do not inherit Mineacle+/Admin colors.
       */
      playerRankBadge.classList.add("is-rank-ready");
    }
  }

  /*
   * The server rank label can legitimately be "Unranked". That word is much
   * wider than a numeric rank, so mark the state and remove the meaningless
   * fake progress bar rather than allowing the text to escape the hero.
   */
  const globalRank = document.querySelector(".profile-global-rank");
  const globalRankValue = globalRank?.querySelector(":scope > strong");
  const globalRankCaption = globalRank?.querySelector(":scope > small");
  const globalRankProgress = globalRank?.querySelector(":scope > div");

  if (
    globalRank instanceof HTMLElement &&
    globalRankValue instanceof HTMLElement &&
    globalRankValue.textContent?.trim().toLowerCase() === "unranked"
  ) {
    globalRank.classList.add("is-unranked");

    if (globalRankCaption instanceof HTMLElement) {
      globalRankCaption.textContent = "Not yet ranked";
    }

    if (globalRankProgress instanceof HTMLElement) {
      globalRankProgress.setAttribute("aria-hidden", "true");
    }
  }
})();
