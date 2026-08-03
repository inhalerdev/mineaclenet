(() => {
  "use strict";

  const menu = document.querySelector("[data-player-menu]");
  const menuButton = menu?.querySelector(".player-menu__button");
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

  const setCopyFeedback = (button, label, copied, fallbackLabel) => {
    const previousTimer = resetTimers.get(button);

    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    label.textContent = copied ? "Copied" : "Copy Failed";
    button.classList.toggle("is-copied", copied);
    button.classList.toggle("is-copy-error", !copied);

    const timer = window.setTimeout(() => {
      label.textContent = fallbackLabel;
      button.classList.remove("is-copied", "is-copy-error");
      resetTimers.delete(button);
    }, copied ? 1800 : 2400);

    resetTimers.set(button, timer);
  };

  const bindCopyButton = (button, labelSelector, fallbackLabel) => {
    const label = button.querySelector(labelSelector);

    if (!(label instanceof HTMLElement)) {
      return;
    }

    button.addEventListener("click", async () => {
      const value = button.dataset.copyValue?.trim();
      const copied = value ? await copyText(value) : false;
      setCopyFeedback(button, label, copied, fallbackLabel);
    });
  };

  document.querySelectorAll("[data-player-copy-server]").forEach((button) => {
    bindCopyButton(button, "[data-player-copy-label]", "Play");
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
