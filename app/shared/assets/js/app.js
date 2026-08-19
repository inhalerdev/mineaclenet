(() => {
    const rail = document.querySelector('[data-mobile-menu]');
    const scrim = document.querySelector('[data-menu-scrim]');
    const openMenu = document.querySelector('[data-menu-open]');
    const closeMenu = document.querySelector('[data-menu-close]');
    const loginDialog = document.querySelector('[data-login-dialog]');

    const setMenu = (open) => {
        if (!rail || !scrim) return;
        rail.classList.toggle('is-open', open);
        scrim.classList.toggle('is-open', open);
        document.documentElement.style.overflow = open ? 'hidden' : '';
    };

    openMenu?.addEventListener('click', () => setMenu(true));
    closeMenu?.addEventListener('click', () => setMenu(false));
    scrim?.addEventListener('click', () => setMenu(false));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setMenu(false);
    });

    document.querySelectorAll('[data-login-open]').forEach((button) => {
        button.addEventListener('click', () => {
            if (loginDialog?.showModal) {
                loginDialog.showModal();
                requestAnimationFrame(() => loginDialog.querySelector('input')?.focus());
            }
        });
    });

    document.querySelectorAll('[data-login-close]').forEach((button) => {
        button.addEventListener('click', () => loginDialog?.close());
    });

    loginDialog?.addEventListener('click', (event) => {
        const rect = loginDialog.getBoundingClientRect();
        const outside =
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom;

        if (outside) loginDialog.close();
    });

    document.querySelectorAll('[data-player-search]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            const input = form.querySelector('[data-player-search-input]');
            const username = input?.value.trim() || '';

            if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
                event.preventDefault();
                input?.setCustomValidity('Enter a valid Minecraft username');
                input?.reportValidity();
                return;
            }

            input?.setCustomValidity('');
            event.preventDefault();
            window.location.assign(`/player/${encodeURIComponent(username)}`);
        });
    });

    document.querySelectorAll('[data-player-search-input]').forEach((input) => {
        input.addEventListener('input', () => input.setCustomValidity(''));
    });

    document.querySelectorAll('[data-copy-server]').forEach((button) => {
        button.addEventListener('click', async () => {
            const address = button.getAttribute('data-copy-server') || '';
            const label = button.querySelector('[data-copy-label]');
            const original = label?.textContent || 'Play now';

            try {
                await navigator.clipboard.writeText(address);
                button.classList.add('is-copied');
                if (label) label.textContent = 'IP copied';

                window.setTimeout(() => {
                    button.classList.remove('is-copied');
                    if (label) label.textContent = original;
                }, 1800);
            } catch {
                window.prompt('Copy the server address:', address);
            }
        });
    });
})();
