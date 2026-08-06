<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';
require_once __DIR__ . '/../shared/php/auth.php';

mineacle_auth_private_headers();

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$returnPath = mineacle_auth_safe_return_path($_GET['return'] ?? $_POST['return'] ?? '/', '/');

if (mineacle_auth_is_logged_in()) {
    header('Location: ' . $returnPath, true, 302);
    exit;
}

$error = '';
$notice = '';
$requestedMode = strtolower(trim((string) ($_GET['mode'] ?? '')));
$mode = $requestedMode === 'create' ? 'create' : 'login';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!mineacle_auth_verify_csrf($_POST['csrf'] ?? null)) {
        $error = 'Your session expired. Refresh the page and try again.';
    } else {
        $action = strtolower(trim((string) ($_POST['action'] ?? '')));

        if ($action === 'login') {
            $result = mineacle_auth_attempt_login($_POST['username'] ?? '', $_POST['password'] ?? '');

            if (($result['ok'] ?? false) === true) {
                header('Location: ' . $returnPath, true, 303);
                exit;
            }

            $error = (string) ($result['message'] ?? 'Login failed.');
            $mode = 'login';
        } elseif ($action === 'start_registration') {
            $result = mineacle_auth_start_registration($_POST['username'] ?? '');
            $mode = 'create';

            if (($result['ok'] ?? false) === true) {
                $notice = 'Verification command generated.';
            } else {
                $error = (string) ($result['message'] ?? 'Verification could not be started.');
            }
        } elseif ($action === 'complete_registration') {
            $result = mineacle_auth_complete_registration($_POST['password'] ?? '', $_POST['password_confirm'] ?? '');
            $mode = 'create';

            if (($result['ok'] ?? false) === true) {
                header('Location: ' . $returnPath, true, 303);
                exit;
            }

            $error = (string) ($result['message'] ?? 'Account creation failed.');
        } elseif ($action === 'cancel_registration') {
            mineacle_auth_cancel_registration();
            header('Location: /login?mode=create&return=' . rawurlencode($returnPath), true, 303);
            exit;
        }
    }
}

$registration = mineacle_auth_registration_state();

if (($registration['status'] ?? 'none') !== 'none') {
    $mode = 'create';
}

$assetVersion = (string) max(
    (int) (is_file(__DIR__ . '/assets/css/login.css') ? filemtime(__DIR__ . '/assets/css/login.css') : 1),
    (int) (is_file(__DIR__ . '/assets/js/login.js') ? filemtime(__DIR__ . '/assets/js/login.js') : 1)
);
$navigationCss = __DIR__ . '/../shared/assets/css/navigation.css';
$navigationJs = __DIR__ . '/../shared/assets/js/navigation.js';

mineacle_page_head('Login', [
    'meta_title' => 'Login | Mineacle',
    'meta_description' => 'Log in to Mineacle or verify your Minecraft account in game.',
    'canonical_url' => 'https://mineacle.net/login',
    'stylesheets' => [
        '/shared/assets/css/navigation.css?rev=' . rawurlencode((string) (is_file($navigationCss) ? filemtime($navigationCss) : 1)),
        '/login/assets/css/login.css?rev=' . rawurlencode($assetVersion),
    ],
    'body_class' => 'mineacle-auth-page',
    'external_fonts' => false,
    'theme_color' => '#111111',
    'robots' => 'noindex,nofollow',
]);
?>
<main class="auth-page">
    <section class="auth-hero" aria-labelledby="auth-title">
        <div class="auth-hero__surface">
            <?php mineacle_site_navigation($site, ['current_key' => '']); ?>

            <div class="auth-shell">
                <section class="auth-card" data-auth-card>
                    <div class="auth-card__heading">
                        <span class="auth-card__eyebrow">Mineacle Account</span>
                        <h1 id="auth-title"><?php echo $mode === 'create' ? 'Create your account' : 'Welcome back'; ?></h1>
                        <p><?php echo $mode === 'create'
                            ? 'Link your website account to the Minecraft profile that has already joined Mineacle.'
                            : 'Use the Minecraft username and password attached to your verified profile.'; ?></p>
                    </div>

                    <nav class="auth-tabs" aria-label="Account options">
                        <a class="auth-tab<?php echo $mode === 'login' ? ' is-active' : ''; ?>" href="/login?return=<?php echo h(rawurlencode($returnPath)); ?>">Login</a>
                        <a class="auth-tab<?php echo $mode === 'create' ? ' is-active' : ''; ?>" href="/login?mode=create&amp;return=<?php echo h(rawurlencode($returnPath)); ?>">Create Account</a>
                    </nav>

                    <?php if ($error !== ''): ?>
                        <div class="auth-message auth-message--error" role="alert"><?php echo h($error); ?></div>
                    <?php elseif ($notice !== ''): ?>
                        <div class="auth-message auth-message--success" role="status"><?php echo h($notice); ?></div>
                    <?php endif; ?>

                    <?php if ($mode === 'login'): ?>
                        <form class="auth-form" method="post" action="/login">
                            <input type="hidden" name="csrf" value="<?php echo h(mineacle_auth_csrf_token()); ?>">
                            <input type="hidden" name="action" value="login">
                            <input type="hidden" name="return" value="<?php echo h($returnPath); ?>">

                            <label class="auth-field">
                                <span>Minecraft username</span>
                                <input name="username" type="text" minlength="3" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" autocomplete="username" required>
                            </label>

                            <label class="auth-field">
                                <span>Password</span>
                                <input name="password" type="password" minlength="10" maxlength="128" autocomplete="current-password" required>
                            </label>

                            <button class="auth-primary" type="submit">Login</button>
                            <p class="auth-form__note">No account yet? Verify the player you use in game before choosing a password.</p>
                        </form>
                    <?php else: ?>
                        <?php $status = (string) ($registration['status'] ?? 'none'); ?>
                        <ol class="auth-steps" aria-label="Account creation progress">
                            <li class="is-complete"><span>1</span><strong>Player</strong></li>
                            <li class="<?php echo in_array($status, ['pending', 'verified'], true) ? 'is-active' : ''; ?><?php echo $status === 'verified' ? ' is-complete' : ''; ?>"><span>2</span><strong>Verify</strong></li>
                            <li class="<?php echo $status === 'verified' ? 'is-active' : ''; ?>"><span>3</span><strong>Password</strong></li>
                        </ol>

                        <?php if ($status === 'none' || $status === 'expired'): ?>
                            <form class="auth-form" method="post" action="/login?mode=create">
                                <input type="hidden" name="csrf" value="<?php echo h(mineacle_auth_csrf_token()); ?>">
                                <input type="hidden" name="action" value="start_registration">
                                <input type="hidden" name="return" value="<?php echo h($returnPath); ?>">

                                <label class="auth-field">
                                    <span>Exact Minecraft username</span>
                                    <input name="username" type="text" minlength="3" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" autocomplete="username" required>
                                </label>

                                <?php if ($status === 'expired'): ?>
                                    <p class="auth-form__note auth-form__note--warning">The previous code expired. Generate a new one below.</p>
                                <?php endif; ?>

                                <button class="auth-primary" type="submit">Generate Verification Code</button>
                                <p class="auth-form__note">The username must already exist in Mineacle’s player database.</p>
                            </form>
                        <?php elseif ($status === 'pending' || $status === 'unavailable'): ?>
                            <section class="verification" data-verification-poll data-status-url="/login/status.php">
                                <div class="verification__player">
                                    <img src="<?php echo h(mineacle_auth_bust_url((string) $registration['uuid'], (string) $registration['username'], 256)); ?>" alt="" width="128" height="128" draggable="false">
                                    <div>
                                        <span>Verifying player</span>
                                        <strong><?php echo h((string) $registration['username']); ?></strong>
                                    </div>
                                </div>

                                <div class="verification__command">
                                    <span>Run this command while connected to Mineacle</span>
                                    <code data-verification-command><?php echo h((string) $registration['command']); ?></code>
                                    <button type="button" data-copy-command>Copy Command</button>
                                </div>

                                <div class="verification__status" role="status" aria-live="polite">
                                    <span class="verification__pulse" aria-hidden="true"></span>
                                    <span data-verification-status>Waiting for in-game verification…</span>
                                </div>

                                <p class="auth-form__note">This code expires in <strong data-verification-countdown data-expires-at="<?php echo h((string) $registration['expires_at']); ?>">10:00</strong>. The command only works for this Minecraft UUID.</p>

                                <form method="post" action="/login?mode=create">
                                    <input type="hidden" name="csrf" value="<?php echo h(mineacle_auth_csrf_token()); ?>">
                                    <input type="hidden" name="action" value="cancel_registration">
                                    <input type="hidden" name="return" value="<?php echo h($returnPath); ?>">
                                    <button class="auth-secondary" type="submit">Use Another Player</button>
                                </form>
                            </section>
                        <?php elseif ($status === 'verified'): ?>
                            <section class="verification verification--complete">
                                <div class="verification__player">
                                    <img src="<?php echo h(mineacle_auth_bust_url((string) $registration['uuid'], (string) $registration['username'], 256)); ?>" alt="" width="128" height="128" draggable="false">
                                    <div>
                                        <span>Verified in game</span>
                                        <strong><?php echo h((string) $registration['username']); ?></strong>
                                    </div>
                                </div>

                                <form class="auth-form" method="post" action="/login?mode=create">
                                    <input type="hidden" name="csrf" value="<?php echo h(mineacle_auth_csrf_token()); ?>">
                                    <input type="hidden" name="action" value="complete_registration">
                                    <input type="hidden" name="return" value="<?php echo h($returnPath); ?>">

                                    <label class="auth-field">
                                        <span>Create password</span>
                                        <input name="password" type="password" minlength="10" maxlength="128" autocomplete="new-password" required>
                                    </label>

                                    <label class="auth-field">
                                        <span>Confirm password</span>
                                        <input name="password_confirm" type="password" minlength="10" maxlength="128" autocomplete="new-password" required>
                                    </label>

                                    <button class="auth-primary" type="submit">Create Account</button>
                                    <p class="auth-form__note">Use at least 10 characters. Your password is stored as a one-way hash.</p>
                                </form>
                            </section>
                        <?php endif; ?>
                    <?php endif; ?>
                </section>

                <aside class="auth-context" aria-label="Why verify in game">
                    <span class="auth-context__label">Verified access</span>
                    <h2>Your website profile is your Minecraft profile.</h2>
                    <p>In-game verification prevents another person from registering your username. Once linked, the same account unlocks voting and future player-only tools.</p>
                    <div class="auth-context__command"><span>Server command</span><strong>/verify CODE</strong></div>
                </aside>
            </div>
        </div>
    </section>
</main>
<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation.js?rev=' . rawurlencode((string) (is_file($navigationJs) ? filemtime($navigationJs) : 1)),
        '/login/assets/js/login.js?rev=' . rawurlencode($assetVersion),
    ],
]); ?>
