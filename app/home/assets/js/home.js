(() => {
  "use strict";

  const videos = Array.from(
    document.querySelectorAll(".home-tile__video"),
  ).filter(
    (video) => video instanceof HTMLVideoElement,
  );

  const requestPlayback = (video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playback = video.play();

    if (playback instanceof Promise) {
      playback.catch(() => {
        // Some browsers wait for the first user gesture.
      });
    }
  };

  videos.forEach((video) => {
    requestPlayback(video);

    video.addEventListener("canplay", () => {
      requestPlayback(video);
    });
  });

  if (videos.length > 0) {
    document.addEventListener(
      "pointerdown",
      () => {
        videos.forEach(requestPlayback);
      },
      {
        once: true,
        passive: true,
      },
    );

    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) {
          return;
        }

        videos.forEach((video) => {
          if (video.paused) {
            requestPlayback(video);
          }
        });
      },
    );
  }

  const interactiveSelector = [
    "a",
    "button",
    "input",
    "select",
    "textarea",
    "summary",
    "[role='button']",
  ].join(",");

  document
    .querySelectorAll("[data-home-tile-link]")
    .forEach((tile) => {
      tile.addEventListener("click", (event) => {
        if (
          !(event.target instanceof Element)
          || event.target.closest(interactiveSelector)
        ) {
          return;
        }

        const href = tile.dataset.homeTileLink?.trim();

        if (!href || href === "#") {
          return;
        }

        if (tile.dataset.homeTileExternal === "true") {
          window.open(
            href,
            "_blank",
            "noopener,noreferrer",
          );
          return;
        }

        window.location.assign(href);
      });
    });
})();
