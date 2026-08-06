(() => {
  'use strict';

  const copyButton = document.querySelector('[data-copy-command]');
  const command = document.querySelector('[data-verification-command]');

  if (copyButton instanceof HTMLButtonElement && command instanceof HTMLElement) {
    copyButton.addEventListener('click', async () => {
      const value = command.textContent?.trim() || '';

      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
        copyButton.textContent = 'Copied';
        window.setTimeout(() => {
          copyButton.textContent = 'Copy Command';
        }, 1600);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(command);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
  }

  const countdown = document.querySelector('[data-verification-countdown]');

  const updateCountdown = () => {
    if (!(countdown instanceof HTMLElement)) return;

    const expiresAt = Number(countdown.dataset.expiresAt || 0) * 1000;
    const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = String(remaining % 60).padStart(2, '0');
    countdown.textContent = `${minutes}:${seconds}`;

    if (remaining === 0) {
      window.location.reload();
    }
  };

  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  const pollRoot = document.querySelector('[data-verification-poll]');
  const statusText = document.querySelector('[data-verification-status]');

  if (!(pollRoot instanceof HTMLElement)) return;

  const statusUrl = pollRoot.dataset.statusUrl || '/login/status.php';
  let stopped = false;

  const poll = async () => {
    if (stopped || document.hidden) return;

    try {
      const response = await fetch(statusUrl, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();

      if (data.status === 'verified') {
        stopped = true;
        if (statusText instanceof HTMLElement) statusText.textContent = 'Verified. Preparing password setup…';
        window.setTimeout(() => window.location.reload(), 450);
        return;
      }

      if (data.status === 'expired' || data.status === 'none') {
        stopped = true;
        window.location.reload();
        return;
      }

      if (statusText instanceof HTMLElement && data.status === 'unavailable') {
        statusText.textContent = 'Connection interrupted. Retrying…';
      }
    } catch {
      if (statusText instanceof HTMLElement) statusText.textContent = 'Connection interrupted. Retrying…';
    }
  };

  window.setInterval(poll, 2000);
  poll();
})();
