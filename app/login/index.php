<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';
require_once __DIR__ . '/../shared/php/compact-footer.php';
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
$secondaryCss = __DIR__ . '/../shared/assets/css/secondary-pages.css';
$navigationJs = __DIR__ . '/../shared/assets/js/navigation.js';

mineacle_page_head('Login', [
    'meta_title' => 'Login | Mineacle',
    'meta_description' => 'Log in to Mineacle or verify your Minecraft account in game.',
    'canonical_url' => 'https://mineacle.net/login',
    'stylesheets' => [
        '/shared/assets/css/navigation.css?rev=' . rawurlencode((string) (is_file($navigationCss) ? filemtime($navigationCss) : 1)),
        '/shared/assets/css/secondary-pages.css?rev=' . rawurlencode((string) (is_file($secondaryCss) ? filemtime($secondaryCss) : 1)),
        '/login/assets/css/login.css?rev=' . rawurlencode($assetVersion),
    ],
    'body_class' => 'mineacle-auth-page',
    'external_fonts' => false,
    'theme_color' => '#111111',
    'robots' => 'noindex,nofollow',
]);
?>
<main class="auth-page">
    <section class="auth-layout" aria-labelledby="auth-title">
        <?php mineacle_site_navigation($site, ['current_key' => '']); ?>

        <div class="auth-stage">
            <section class="auth-card" data-auth-card>
                <div class="auth-card__heading">
                    <img class="auth-card__logo" src="/home/assets/images/static-logo.png" alt="" aria-hidden="true" draggable="false">
                    <h1 id="auth-title"><?php echo $mode === 'create' ? 'Create your account' : 'Welcome back'; ?></h1>
                    <p><?php echo $mode === 'create'
                        ? 'Verify your Minecraft account to get started'
                        : 'Sign in to vote and access your profile'; ?></p>
                </div>

                <nav class="auth-tabs" aria-label="Account options">
                    <a class="auth-tab<?php echo $mode === 'create' ? ' is-active' : ''; ?>" href="/login?mode=create&amp;return=<?php echo h(rawurlencode($returnPath)); ?>">Create Account</a>
                    <a class="auth-tab<?php echo $mode === 'login' ? ' is-active' : ''; ?>" href="/login?return=<?php echo h(rawurlencode($returnPath)); ?>">Sign In</a>
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
                            <input name="username" type="text" minlength="3" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" autocomplete="username" placeholder="YourUsername" required>
                        </label>

                        <label class="auth-field">
                            <span>Password</span>
                            <input name="password" type="password" minlength="10" maxlength="128" autocomplete="current-password" placeholder="••••••••••" required>
                        </label>

                        <button class="auth-primary" type="submit">Sign In</button>
                    </form>

                    <p class="auth-card__switch">Don’t have an account? <a href="/login?mode=create&amp;return=<?php echo h(rawurlencode($returnPath)); ?>">Create account</a></p>
                <?php else: ?>
                    <?php $status = (string) ($registration['status'] ?? 'none'); ?>

                    <ol class="auth-steps" aria-label="Account creation progress">
                        <li class="<?php echo $status === 'none' || $status === 'expired' ? 'is-active' : 'is-complete'; ?>"><span>1</span><strong>Username</strong></li>
                        <li class="<?php echo in_array($status, ['pending', 'unavailable'], true) ? 'is-active' : ($status === 'verified' ? 'is-complete' : ''); ?>"><span>2</span><strong>Verify In-Game</strong></li>
                        <li class="<?php echo $status === 'verified' ? 'is-active' : ''; ?>"><span>3</span><strong>Set Password</strong></li>
                    </ol>

                    <?php if ($status === 'none' || $status === 'expired'): ?>
                        <form class="auth-form" method="post" action="/login?mode=create">
                            <input type="hidden" name="csrf" value="<?php echo h(mineacle_auth_csrf_token()); ?>">
                            <input type="hidden" name="action" value="start_registration">
                            <input type="hidden" name="return" value="<?php echo h($returnPath); ?>">

                            <label class="auth-field">
                                <span>Minecraft Java username</span>
                                <input name="username" type="text" minlength="3" maxlength="16" pattern="[A-Za-z0-9_]{3,16}" autocomplete="username" placeholder="YourUsername" required>
                            </label>

                            <div class="auth-help">
                                <span aria-hidden="true">⌁</span>
                                <p>Enter your exact in-game username. You must have joined <strong>play.mineacle.net</strong> before verification.</p>
                            </div>

                            <?php if ($status === 'expired'): ?>
                                <p class="auth-form__note auth-form__note--warning">The previous code expired. Generate a new one below.</p>
                            <?php endif; ?>

                            <button class="auth-primary" type="submit">Generate Verification Code</button>
                        </form>
                    <?php elseif ($status === 'pending' || $status === 'unavailable'): ?>
                        <section class="verification" data-verification-poll data-status-url="/login/status.php">
                            <div class="verification__player">
                                <img src="<?php echo h(mineacle_auth_bust_url((string) $registration['uuid'], (string) $registration['username'], 256)); ?>" alt="" width="96" height="96" draggable="false">
                                <div>
                                    <span>Verifying player</span>
                                    <strong><?php echo h((string) $registration['username']); ?></strong>
                                </div>
                            </div>

                            <div class="verification__command">
                                <span>Your verification command</span>
                                <div>
                                    <code data-verification-command><?php echo h((string) $registration['command']); ?></code>
                                    <button type="button" data-copy-command>Copy</button>
                                </div>
                            </div>

                            <div class="verification__instructions">
                                <strong>How to verify:</strong>
                                <ol>
                                    <li>Join the server at <span>play.mineacle.net</span></li>
                                    <li>Open chat and run the command shown above</li>
                                    <li>Return here; verification completes automatically</li>
                                </ol>
                            </div>

                            <div class="verification__status" role="status" aria-live="polite">
                                <span class="verification__pulse" aria-hidden="true"></span>
                                <strong data-verification-status>Waiting for in-game verification…</strong>
                                <span data-verification-countdown data-expires-at="<?php echo h((string) $registration['expires_at']); ?>">--:--</span>
                            </div>

                            <form method="post" action="/login?mode=create">
                                <input type="hidden" name="csrf" value="<?php echo h(mineacle_auth_csrf_token()); ?>">
                                <input type="hidden" name="action" value="cancel_registration">
                                <input type="hidden" name="return" value="<?php echo h($returnPath); ?>">
                                <button class="auth-secondary" type="submit">Change username</button>
                            </form>
                        </section>
                    <?php elseif ($status === 'verified'): ?>
                        <section class="verification verification--complete">
                            <div class="verification__player">
                                <img src="<?php echo h(mineacle_auth_bust_url((string) $registration['uuid'], (string) $registration['username'], 256)); ?>" alt="" width="96" height="96" draggable="false">
                                <div>
                                    <span>Identity confirmed</span>
                                    <strong><?php echo h((string) $registration['username']); ?></strong>
                                </div>
                            </div>

                            <form class="auth-form" method="post" action="/login?mode=create">
                                <input type="hidden" name="csrf" value="<?php echo h(mineacle_auth_csrf_token()); ?>">
                                <input type="hidden" name="action" value="complete_registration">
                                <input type="hidden" name="return" value="<?php echo h($returnPath); ?>">

                                <label class="auth-field">
                                    <span>Choose a password</span>
                                    <input name="password" type="password" minlength="10" maxlength="128" autocomplete="new-password" placeholder="At least 10 characters" required>
                                </label>

                                <label class="auth-field">
                                    <span>Confirm password</span>
                                    <input name="password_confirm" type="password" minlength="10" maxlength="128" autocomplete="new-password" placeholder="••••••••••" required>
                                </label>

                                <button class="auth-primary" type="submit">Create Account &amp; Sign In</button>
                            </form>
                        </section>
                    <?php endif; ?>

                    <p class="auth-card__switch">Already have an account? <a href="/login?return=<?php echo h(rawurlencode($returnPath)); ?>">Sign in</a></p>
                <?php endif; ?>
            </section>
        </div>
    </section>

    <?php mineacle_compact_footer($site); ?>
</main>

<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation.js?rev=' . rawurlencode((string) (is_file($navigationJs) ? filemtime($navigationJs) : 1)),
        '/login/assets/js/login.js?rev=' . rawurlencode($assetVersion),
    ],
]); ?>
