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
    const remaining = Math.max(
      0,
      Math.ceil((expiresAt - Date.now()) / 1000),
    );
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
  let requestInFlight = false;
  let pollTimer = 0;

  const setStatusText = (value) => {
    if (statusText instanceof HTMLElement) {
      statusText.textContent = value;
    }
  };

  const forceFreshReload = () => {
    /*
     * login/index.php and status.php both send no-store headers, so a normal
     * navigation reload performs a fresh server render without polluting the
     * public URL with cache-busting query parameters.
     */
    window.location.reload();
  };

  const schedulePoll = (delay = 1500) => {
    if (stopped) return;

    window.clearTimeout(pollTimer);
    pollTimer = window.setTimeout(poll, delay);
  };

  const poll = async () => {
    if (stopped || requestInFlight) return;

    /*
     * When the player switches to Minecraft this tab is normally hidden.
     * Background timers are aggressively throttled by browsers, so we do not
     * rely on setInterval. visibilitychange/focus/pageshow below trigger an
     * immediate check as soon as the player returns.
     */
    if (document.hidden) {
      schedulePoll(1000);
      return;
    }

    requestInFlight = true;

    try {
      const url = new URL(statusUrl, window.location.origin);
      url.searchParams.set('_poll', String(Date.now()));

      const response = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      /*
       * 503 is a valid JSON state from status.php when the verification
       * database is temporarily unavailable. Other non-2xx responses indicate
       * a routing/server problem and should retry instead of silently failing.
       */
      if (!response.ok && response.status !== 503) {
        throw new Error(`Verification status request failed: ${response.status}`);
      }

      const data = await response.json();
      const status = String(data?.status || 'none').toLowerCase();

      if (status === 'verified') {
        stopped = true;
        window.clearTimeout(pollTimer);
        setStatusText('Verified. Preparing password setup…');

        /*
         * Give the player one visible confirmation frame, then force the PHP
         * page to render the verified/password stage.
         */
        window.setTimeout(forceFreshReload, 250);
        return;
      }

      if (status === 'expired' || status === 'none') {
        stopped = true;
        window.clearTimeout(pollTimer);
        forceFreshReload();
        return;
      }

      if (status === 'unavailable') {
        setStatusText('Connection interrupted. Retrying…');
      } else {
        setStatusText('Waiting for in-game verification…');
      }
    } catch {
      setStatusText('Connection interrupted. Retrying…');
    } finally {
      requestInFlight = false;

      if (!stopped) {
        schedulePoll(1500);
      }
    }
  };

  /*
   * Do not depend only on background timers. Returning from Minecraft or
   * restoring the tab triggers an immediate verification check.
   */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !stopped) {
      schedulePoll(0);
    }
  });

  window.addEventListener('focus', () => {
    if (!stopped) {
      schedulePoll(0);
    }
  });

  window.addEventListener('pageshow', () => {
    if (!stopped) {
      schedulePoll(0);
    }
  });

  schedulePoll(0);
})();
