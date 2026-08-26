(() => {
  "use strict";

  const video = document.querySelector(
    ".home-promo-card__video",
  );

  if (!(video instanceof HTMLVideoElement)) {
    return;
  }

  const requestPlayback = () => {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playback = video.play();

    if (playback instanceof Promise) {
      playback.catch(() => {
        // Browser may wait for the first user gesture.
      });
    }
  };

  requestPlayback();

  video.addEventListener(
    "canplay",
    requestPlayback,
  );

  document.addEventListener(
    "pointerdown",
    requestPlayback,
    {
      once: true,
      passive: true,
    },
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (!document.hidden && video.paused) {
        requestPlayback();
      }
    },
  );
})();
