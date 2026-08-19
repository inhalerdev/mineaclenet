<?php

declare(strict_types=1);

function render_login_dialog(): void
{
    if (current_player()) {
        return;
    }
    ?>
    <dialog class="login-dialog" data-login-dialog>
        <button class="dialog-close" type="button" data-login-close aria-label="Close login">×</button>
        <div class="dialog-kicker">PLAYER ACCESS</div>
        <h2>Connect your player</h2>
        <p>Use your Minecraft username to personalize this prototype. Production authentication will verify ownership through the game server.</p>

        <form class="login-form" action="/login" method="post" novalidate>
            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
            <input type="hidden" name="return" value="<?= e((string) ($_SERVER['REQUEST_URI'] ?? '/')) ?>">
            <label for="login-username">Minecraft username</label>
            <input
                id="login-username"
                name="username"
                type="text"
                minlength="3"
                maxlength="16"
                pattern="[A-Za-z0-9_]{3,16}"
                autocomplete="username"
                placeholder="Your username"
                required
            >
            <button class="button button-accent" type="submit">Continue</button>
        </form>
    </dialog>
    <?php
}

function render_page_end(array $extraJs = []): void
{
    ?>
    </main>
</div>
<div class="mobile-scrim" data-menu-scrim></div>
<?php render_login_dialog(); ?>
<?php foreach ($extraJs as $script): ?>
    <script src="<?= e($script) ?>"></script>
<?php endforeach; ?>
</body>
</html>
<?php
}
