(() => {
  "use strict";

  const menu = document.querySelector("[data-home-menu]");
  const menuButton = menu?.querySelector(".home-menu__button");
  const dialog = document.querySelector("[data-join-dialog]");
  const openHelpButton = document.querySelector("[data-open-join-help]");
  const closeHelpButton = document.querySelector("[data-close-join-help]");
  const hero = document.querySelector("[data-home-hero]");
  const heroVideo = document.querySelector("[data-home-hero-video]");
  const heroSource = document.querySelector("[data-home-hero-source]");
  const resetTimers = new WeakMap();

  const useHeroFallback = () => {
    hero?.classList.add("is-video-fallback");

    if (heroVideo instanceof HTMLVideoElement) {
      heroVideo.pause();
    }
  };

  const useHeroVideo = () => {
    hero?.classList.remove("is-video-fallback");
  };

  const requestHeroPlayback = () => {
    if (!(heroVideo instanceof HTMLVideoElement)) {
      return;
    }

    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.playsInline = true;

    const playback = heroVideo.play();

    if (playback instanceof Promise) {
      playback.catch(() => {
        // Some browsers defer autoplay until the page is visible or receives input.
      });
    }
  };

  if (heroVideo instanceof HTMLVideoElement) {
    heroVideo.addEventListener("loadeddata", () => {
      useHeroVideo();
      requestHeroPlayback();
    }, { once: true });
    heroVideo.addEventListener("canplay", requestHeroPlayback);
    heroVideo.addEventListener("playing", useHeroVideo);
    heroVideo.addEventListener("error", useHeroFallback, { once: true });

    heroSource?.addEventListener("error", useHeroFallback, { once: true });

    if (heroVideo.error) {
      useHeroFallback();
    } else {
      heroVideo.load();
      requestHeroPlayback();
    }

    window.addEventListener("pageshow", requestHeroPlayback);
    document.addEventListener("pointerdown", requestHeroPlayback, { once: true, passive: true });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && heroVideo.paused) {
        requestHeroPlayback();
      }
    });
  }

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
