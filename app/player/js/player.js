(() => {
  "use strict";

  const menu = document.querySelector("[data-player-menu]");
  const menuButton = menu?.querySelector(".home-menu__button");
  const serverStatus = document.querySelector("#home-server-status");
  const serverStatusCount = document.querySelector(
    "#home-server-status-count",
  );
  const resetTimers = new WeakMap();

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Fall through to the local copy fallback.
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

  const fallbackText = (fallbackLabel) => {
    if (typeof fallbackLabel === "function") {
      return fallbackLabel();
    }

    return fallbackLabel;
  };

  const setCopyFeedback = (button, label, copied, fallbackLabel) => {
    const previousTimer = resetTimers.get(button);

    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    label.textContent = copied ? "Copied" : "Copy Failed";
    button.classList.toggle("is-copied", copied);
    button.classList.toggle("is-copy-error", !copied);

    const timer = window.setTimeout(() => {
      button.classList.remove("is-copied", "is-copy-error");
      label.textContent = fallbackText(fallbackLabel);
      resetTimers.delete(button);
    }, copied ? 1800 : 2400);

    resetTimers.set(button, timer);
  };

  const bindCopyButton = (button, labelSelector, fallbackLabel) => {
    const label = button.querySelector(labelSelector);

    if (!(label instanceof HTMLElement)) {
      return null;
    }

    button.addEventListener("click", async () => {
      const value = button.dataset.copyValue?.trim();
      const copied = value ? await copyText(value) : false;
      setCopyFeedback(button, label, copied, fallbackLabel);
    });

    return label;
  };

  document.querySelectorAll("[data-player-copy-server]").forEach((button) => {
    let hovered = false;
    let focused = false;
    let label = null;

    const livePlayLabel = () => {
      if (!hovered && !focused) {
        return "Play";
      }

      if (!serverStatus?.classList.contains("is-online")) {
        return "Play";
      }

      const rawCount = serverStatusCount?.textContent
        ?.replaceAll(",", "")
        .trim();

      if (!rawCount || !/^\d+$/.test(rawCount)) {
        return "Play";
      }

      const count = Number(rawCount);

      if (!Number.isSafeInteger(count) || count < 0) {
        return "Play";
      }

      return `Play ${count.toLocaleString()}`;
    };

    const renderIdleLabel = () => {
      if (
        !(label instanceof HTMLElement) ||
        button.classList.contains("is-copied") ||
        button.classList.contains("is-copy-error")
      ) {
        return;
      }

      label.textContent = livePlayLabel();
    };

    label = bindCopyButton(
      button,
      "[data-player-copy-label]",
      livePlayLabel,
    );

    button.addEventListener("pointerenter", () => {
      hovered = true;
      renderIdleLabel();
    });

    button.addEventListener("pointerleave", () => {
      hovered = false;
      renderIdleLabel();
    });

    button.addEventListener("focus", () => {
      focused = true;
      renderIdleLabel();
    });

    button.addEventListener("blur", () => {
      focused = false;
      renderIdleLabel();
    });

    if (label instanceof HTMLElement) {
      const observer = new MutationObserver(renderIdleLabel);

      if (serverStatusCount) {
        observer.observe(serverStatusCount, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      }

      if (serverStatus) {
        observer.observe(serverStatus, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    }
  });

  document.querySelectorAll("[data-copy-profile]").forEach((button) => {
    bindCopyButton(button, "[data-profile-copy-label]", "Copy Profile");
  });

  menu?.addEventListener("toggle", () => {
    menuButton?.setAttribute(
      "aria-label",
      menu.open ? "Close navigation menu" : "Open navigation menu",
    );
  });

  menu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.open = false;
    });
  });

  document.addEventListener("pointerdown", (event) => {
    if (menu?.open && !menu.contains(event.target)) {
      menu.open = false;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu?.open) {
      menu.open = false;
      menuButton?.focus();
    }
  });
})();
