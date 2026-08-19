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
