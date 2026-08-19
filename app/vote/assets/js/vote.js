(() => {
  'use strict';

  const formatRemaining = (seconds) => {
    const safe = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);

    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const update = () => {
    document.querySelectorAll('[data-vote-card]').forEach((card) => {
      if (!(card instanceof HTMLElement)) return;

      const output = card.querySelector('[data-vote-countdown]');
      const nextAt = Number(card.dataset.nextVoteAt || 0);

      if (!(output instanceof HTMLElement) || nextAt <= 0) return;

      const remaining = nextAt - Math.floor(Date.now() / 1000);

      if (remaining <= 0) {
        window.location.reload();
        return;
      }

      output.textContent = formatRemaining(remaining);
    });
  };

  update();
  window.setInterval(update, 30000);
})();
