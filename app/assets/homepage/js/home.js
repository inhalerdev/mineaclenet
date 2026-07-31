(() => {
  "use strict";

  const menu = document.querySelector("[data-home-menu]");
  const menuButton = menu?.querySelector(".home-menu__button");
  const dialog = document.querySelector("[data-join-dialog]");
  const openHelpButton = document.querySelector("[data-open-join-help]");
  const closeHelpButton = document.querySelector("[data-close-join-help]");
  const resetTimers = new WeakMap();

  const copyText = async (value) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Use the local fallback when clipboard permission is unavailable.
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

  const setCopyFeedback = (button, copied) => {
    const label = button.querySelector("[data-play-label]");

    if (!label) {
      return;
    }

    const previousTimer = resetTimers.get(button);

    if (previousTimer) {
      window.clearTimeout(previousTimer);
    }

    if (!button.dataset.defaultLabel) {
      button.dataset.defaultLabel = label.textContent?.trim() || "Play";
    }

    label.textContent = copied ? "Copied" : "Copy failed";
    button.classList.toggle("is-copied", copied);

    const timer = window.setTimeout(() => {
      label.textContent = button.dataset.defaultLabel || "Play";
      button.classList.remove("is-copied");
      resetTimers.delete(button);
    }, copied ? 1800 : 2400);

    resetTimers.set(button, timer);
  };

  document.querySelectorAll("[data-copy-server]").forEach((button) => {
    button.addEventListener("click", async () => {
      const serverAddress = button.dataset.serverAddress?.trim();

      if (!serverAddress) {
        setCopyFeedback(button, false);
        return;
      }

      const copied = await copyText(serverAddress);
      setCopyFeedback(button, copied);
    });
  });

  const openJoinDialog = () => {
    if (!(dialog instanceof HTMLElement)) {
      return;
    }

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      return;
    }

    dialog.setAttribute("open", "");
  };

  const closeJoinDialog = () => {
    if (!(dialog instanceof HTMLElement)) {
      return;
    }

    if (typeof dialog.close === "function") {
      dialog.close();
      return;
    }

    dialog.removeAttribute("open");
  };

  openHelpButton?.addEventListener("click", openJoinDialog);
  closeHelpButton?.addEventListener("click", closeJoinDialog);

  dialog?.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeJoinDialog();
    }
  });

  menu?.addEventListener("toggle", () => {
    if (!menuButton) {
      return;
    }

    menuButton.setAttribute(
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
