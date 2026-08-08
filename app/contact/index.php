<?php

declare(strict_types=1);

$directContactPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/contact'), PHP_URL_PATH);

if (in_array($directContactPath, ['/contact.php', '/contact/index.php'], true)) {
    header('Location: /contact', true, 301);
    exit;
}

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';
require_once __DIR__ . '/../shared/php/compact-footer.php';
require_once __DIR__ . '/../shared/php/auth.php';
require_once __DIR__ . '/../shared/php/stats-lib.php';

/*
 * Contact is account-only.
 *
 * Anyone who is not signed in is redirected to Login and returned to /contact
 * after a successful sign-in. A Mineacle account can only exist after the
 * Minecraft verification flow has completed, so the authenticated session is
 * the report identity.
 */
mineacle_auth_private_headers();
$authUser = mineacle_auth_require_login('/contact');

function mineacle_contact_uuid(string $value): string
{
    return strtolower((string) preg_replace('/[^a-f0-9]/i', '', $value));
}

function mineacle_contact_rate_limit(
    string $scope,
    int $cooldown = 60,
    int $maximum = 5,
    int $window = 3600
): ?string {
    $directory = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . 'mineacle-contact-limits';

    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        return null;
    }

    $path = $directory
        . DIRECTORY_SEPARATOR
        . hash('sha256', 'mineacle-contact-v2|' . $scope)
        . '.json';

    $handle = @fopen($path, 'c+');

    if ($handle === false || !flock($handle, LOCK_EX)) {
        if (is_resource($handle)) {
            fclose($handle);
        }

        return null;
    }

    $now = time();
    $raw = stream_get_contents($handle);
    $stored = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
    $timestamps = [];

    if (is_array($stored)) {
        foreach ($stored as $timestamp) {
            $value = (int) $timestamp;

            if ($value > $now - $window && $value <= $now) {
                $timestamps[] = $value;
            }
        }
    }

    sort($timestamps);
    $message = null;
    $lastSubmission = $timestamps !== [] ? (int) end($timestamps) : 0;

    if ($lastSubmission > 0 && $now - $lastSubmission < $cooldown) {
        $message = 'Please wait a minute before sending another report.';
    } elseif (count($timestamps) >= $maximum) {
        $message = 'Too many reports were sent recently. Please try again later.';
    } else {
        $timestamps[] = $now;

        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, (string) json_encode($timestamps));
        fflush($handle);
        @chmod($path, 0600);
    }

    flock($handle, LOCK_UN);
    fclose($handle);

    return $message;
}

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$contactConfig = is_array($config['contact'] ?? null) ? $config['contact'] : [];

$categories = [
    'bug' => 'Bug Report',
    'website' => 'Website Issue',
    'account' => 'Account Help',
    'store' => 'Store Support',
    'other' => 'Other Support',
];

$authUsername = trim((string) ($authUser['username'] ?? ''));
$authUuid = trim((string) ($authUser['uuid'] ?? ''));
$authUuidNormalized = mineacle_contact_uuid($authUuid);
$profile = null;
$profileHead = '';
$displayName = $authUsername !== '' ? $authUsername : 'Mineacle Player';

try {
    if ($authUsername !== '') {
        $profile = mineacle_stats_profile_by_username($authUsername);
    }
} catch (Throwable) {
    $profile = null;
}

if (is_array($profile)) {
    $profileUuid = mineacle_contact_uuid((string) ($profile['uuid'] ?? ''));

    /*
     * Only decorate the page with profile data when it belongs to the logged-in
     * account. Submission identity itself always comes from the authenticated
     * session, never a browser-editable field.
     */
    if ($profileUuid !== '' && hash_equals($authUuidNormalized, $profileUuid)) {
        $skin = is_array($profile['skin'] ?? null) ? $profile['skin'] : [];
        $profileHead = trim((string) ($skin['head'] ?? ''));
        $displayName = mineacle_stats_display_name($profile);
    }
}

$form = [
    'category' => 'bug',
    'email' => '',
    'subject' => '',
    'message' => '',
];

$errors = [];
$sent = !empty($_SESSION['mineacle_contact_success']);
unset($_SESSION['mineacle_contact_success']);

if (!isset($_SESSION['mineacle_contact_started_at'])) {
    $_SESSION['mineacle_contact_started_at'] = time();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($form as $key => $default) {
        $form[$key] = trim((string) ($_POST[$key] ?? $default));
    }

    $honeypot = trim((string) ($_POST['website'] ?? ''));
    $startedAt = (int) ($_SESSION['mineacle_contact_started_at'] ?? 0);

    if (!mineacle_auth_verify_csrf($_POST['csrf'] ?? null)) {
        $errors[] = 'Your form session expired. Refresh the page and try again.';
    }

    if ($honeypot !== '') {
        $errors[] = 'The report could not be submitted.';
    }

    if ($startedAt > 0 && time() - $startedAt < 2) {
        $errors[] = 'Please review the report before sending it.';
    }

    if (!isset($categories[$form['category']])) {
        $errors[] = 'Choose a valid report category.';
    }

    if (strlen($form['email']) > 254 || filter_var($form['email'], FILTER_VALIDATE_EMAIL) === false) {
        $errors[] = 'Enter a valid reply email address.';
    }

    if (strlen($form['subject']) < 4 || strlen($form['subject']) > 120) {
        $errors[] = 'Subject must be between 4 and 120 characters.';
    }

    if (strlen($form['message']) < 20 || strlen($form['message']) > 4000) {
        $errors[] = 'Report details must be between 20 and 4,000 characters.';
    }

    if ($authUsername === '' || strlen($authUuidNormalized) !== 32) {
        $errors[] = 'Your Mineacle account session is invalid. Sign in again and retry.';
    }

    $recipient = filter_var((string) ($contactConfig['recipient'] ?? ''), FILTER_VALIDATE_EMAIL);
    $fromEmail = filter_var((string) ($contactConfig['from_email'] ?? ''), FILTER_VALIDATE_EMAIL);

    if ($errors === [] && ($recipient === false || $fromEmail === false)) {
        $errors[] = 'Contact delivery is temporarily unavailable. Please try again later.';
    }

    if ($errors === []) {
        $accountLimit = mineacle_contact_rate_limit('account:' . $authUuidNormalized);

        if ($accountLimit !== null) {
            $errors[] = $accountLimit;
        }
    }

    if ($errors === []) {
        $ipLimit = mineacle_contact_rate_limit('ip:' . mineacle_auth_client_ip());

        if ($ipLimit !== null) {
            $errors[] = $ipLimit;
        }
    }

    if ($errors === [] && $recipient !== false && $fromEmail !== false) {
        $categoryLabel = $categories[$form['category']];
        $cleanSubject = (string) preg_replace('/[\r\n]+/', ' ', $form['subject']);
        $mailSubject = '[Mineacle] ' . $categoryLabel . ': ' . $cleanSubject;
        $mailBody = implode("\n", [
            'Category: ' . $categoryLabel,
            'Minecraft IGN: ' . $authUsername,
            'Display name: ' . $displayName,
            'Player UUID: ' . $authUuid,
            'Reply email: ' . $form['email'],
            'Submitted: ' . gmdate('Y-m-d H:i:s') . ' UTC',
            '',
            'Report:',
            $form['message'],
        ]);

        $headers = [
            'From: Mineacle Website <' . $fromEmail . '>',
            'Reply-To: ' . $form['email'],
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'X-Mailer: Mineacle Website',
        ];

        $delivered = @mail(
            (string) $recipient,
            $mailSubject,
            wordwrap($mailBody, 78),
            implode("\r\n", $headers)
        );

        if ($delivered) {
            $_SESSION['mineacle_contact_success'] = true;
            $_SESSION['mineacle_contact_started_at'] = time();

            header('Location: /contact', true, 303);
            exit;
        }

        $errors[] = 'The report could not be delivered. Please try again shortly.';
    }
}

$assetVersion = (string) (
    is_file(__DIR__ . '/assets/css/contact.css')
        ? (filemtime(__DIR__ . '/assets/css/contact.css') ?: 1)
        : 1
);

$siteCss = __DIR__ . '/../shared/assets/css/site.css';
$navigationCss = __DIR__ . '/../shared/assets/css/navigation.css';
$secondaryCss = __DIR__ . '/../shared/assets/css/secondary-pages.css';
$navigationJs = __DIR__ . '/../shared/assets/js/navigation.js';
$heroPath = __DIR__ . '/../leaderboards/assets/images/hero.webp';
$heroVersion = (string) (
    is_file($heroPath)
        ? (filemtime($heroPath) ?: $assetVersion)
        : $assetVersion
);

mineacle_page_head('Contact', [
    'meta_title' => 'Contact | Mineacle',
    'meta_description' => 'Contact Mineacle Studios, submit a verified bug report, or request account and store support.',
    'canonical_url' => 'https://mineacle.net/contact',
    'stylesheets' => [
        '/shared/assets/css/site.css?rev=' . rawurlencode((string) (is_file($siteCss) ? filemtime($siteCss) : 1)),
        '/shared/assets/css/navigation.css?rev=' . rawurlencode((string) (is_file($navigationCss) ? filemtime($navigationCss) : 1)),
        '/shared/assets/css/secondary-pages.css?rev=' . rawurlencode((string) (is_file($secondaryCss) ? filemtime($secondaryCss) : 1)),
        '/contact/assets/css/contact.css?rev=' . rawurlencode($assetVersion),
    ],
    'body_class' => 'secondary-page contact-page',
    'external_fonts' => false,
    'theme_color' => '#111111',
    'robots' => 'noindex,follow',
]);
?>
<main class="contact-site">
    <section class="contact-hero" aria-labelledby="contact-title">
        <img
            class="contact-hero__image"
            src="/leaderboards/assets/images/hero.webp?rev=<?php echo h(rawurlencode($heroVersion)); ?>"
            alt=""
            width="2048"
            height="911"
            draggable="false"
            aria-hidden="true"
        >

        <div class="contact-hero__surface">
            <?php mineacle_site_navigation($site, ['current_key' => '']); ?>

            <div class="contact-hero__copy">
                <span>Mineacle Support</span>
                <h1 id="contact-title">Contact</h1>
                <p>Send a verified report directly to Mineacle Studios. Your signed-in Minecraft account is attached automatically.</p>
            </div>

            <div class="contact-hero__account" aria-label="Signed-in Mineacle account">
                <div class="contact-account-head">
                    <?php if ($profileHead !== ''): ?>
                        <img src="<?php echo h($profileHead); ?>" alt="" aria-hidden="true" draggable="false">
                    <?php else: ?>
                        <span aria-hidden="true"><?php echo h(strtoupper(substr($displayName, 0, 1))); ?></span>
                    <?php endif; ?>
                </div>

                <div>
                    <small>Signed in as</small>
                    <strong><?php echo h($displayName); ?></strong>
                </div>

                <span class="contact-verified-badge">Verified</span>
            </div>
        </div>
    </section>

    <?php if ($sent): ?>
        <section class="contact-success" role="status">
            <div>
                <span>Report received</span>
                <h2>Sent to Mineacle Studios</h2>
                <p>Your report was submitted successfully. Keep an eye on your reply email if the team needs more information.</p>
            </div>
            <strong aria-hidden="true">✓</strong>
        </section>
    <?php endif; ?>

    <section class="contact-workspace" aria-label="Mineacle contact form">
        <aside class="contact-guide">
            <header>
                <span>Before you submit</span>
                <h2>Send a useful report</h2>
                <p>Clear reports are easier to reproduce, investigate, and resolve.</p>
            </header>

            <div class="contact-reward">
                <div>
                    <span>Useful reports may earn rewards</span>
                    <strong>Confirmed bug reports can receive an in-game reward within 72 hours.</strong>
                    <p>Rewards depend on report type, reproducibility, and player impact.</p>
                </div>

                <img
                    src="/shared/assets/images/footer/slime-static.webp?v=<?php echo h(rawurlencode(mineacle_page_asset_version())); ?>"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                >
            </div>

            <div class="contact-checklist">
                <h3>Include these details</h3>
                <ul>
                    <li>Exact command, page, world, or feature involved.</li>
                    <li>What happened and what you expected instead.</li>
                    <li>Enough detail for the team to reproduce the issue.</li>
                </ul>
            </div>

            <div class="contact-security-note">
                <span>Account attached automatically</span>
                <p>Reports are tied to your signed-in Mineacle account. Never include passwords, recovery codes, or payment details.</p>
            </div>
        </aside>

        <section class="contact-form-panel" aria-labelledby="contact-form-title">
            <header class="contact-form-heading">
                <div>
                    <span>Verified submission</span>
                    <h2 id="contact-form-title">Send a Report</h2>
                </div>
                <p><?php echo h($displayName); ?> will be attached to this report automatically.</p>
            </header>

            <?php if ($errors !== []): ?>
                <div class="contact-notice is-error" role="alert">
                    <strong>Check your report</strong>
                    <ul>
                        <?php foreach (array_unique($errors) as $error): ?>
                            <li><?php echo h($error); ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <form class="contact-form" action="/contact" method="post">
                <input type="hidden" name="csrf" value="<?php echo h(mineacle_auth_csrf_token()); ?>">

                <div class="contact-honeypot" aria-hidden="true">
                    <label for="website">Website</label>
                    <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
                </div>

                <div class="contact-form__row">
                    <label>
                        <span>Category</span>
                        <select name="category" required>
                            <?php foreach ($categories as $value => $label): ?>
                                <option value="<?php echo h($value); ?>"<?php echo $form['category'] === $value ? ' selected' : ''; ?>>
                                    <?php echo h($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </label>

                    <label>
                        <span>Reply email</span>
                        <input
                            name="email"
                            type="email"
                            maxlength="254"
                            autocomplete="email"
                            value="<?php echo h($form['email']); ?>"
                            placeholder="you@example.com"
                            required
                        >
                    </label>
                </div>

                <label>
                    <span>Subject</span>
                    <input
                        name="subject"
                        type="text"
                        minlength="4"
                        maxlength="120"
                        value="<?php echo h($form['subject']); ?>"
                        placeholder="Short summary of the issue"
                        required
                    >
                </label>

                <label>
                    <span>Report details</span>
                    <textarea
                        name="message"
                        minlength="20"
                        maxlength="4000"
                        rows="9"
                        placeholder="Explain what happened, what you expected, and how we can reproduce it."
                        required
                    ><?php echo h($form['message']); ?></textarea>
                </label>

                <div class="contact-form__footer">
                    <p>Submitting as <strong><?php echo h($displayName); ?></strong></p>
                    <button class="contact-submit" type="submit">Send Report</button>
                </div>
            </form>
        </section>
    </section>

    <?php mineacle_compact_footer($site); ?>
</main>

<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation.js?rev=' . rawurlencode((string) (is_file($navigationJs) ? filemtime($navigationJs) : 1)),
    ],
]); ?>
