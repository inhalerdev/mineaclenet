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
require_once __DIR__ . '/../shared/php/stats-lib.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function mineacle_contact_uuid(string $value): string
{
    return strtolower((string) preg_replace('/[^a-f0-9]/i', '', $value));
}

function mineacle_contact_rate_limit(string $scope, int $cooldown = 60, int $maximum = 5, int $window = 3600): ?string
{
    $directory = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'mineacle-contact-limits';

    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) {
        return null;
    }

    $path = $directory . DIRECTORY_SEPARATOR . hash('sha256', 'mineacle-contact-v1|' . $scope) . '.json';
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

$form = [
    'player_name' => '',
    'player_uuid' => '',
    'category' => 'bug',
    'email' => '',
    'subject' => '',
    'message' => '',
];

$errors = [];
$sent = false;
$selectedPlayer = null;

if (!isset($_SESSION['mineacle_contact_token']) || !is_string($_SESSION['mineacle_contact_token'])) {
    $_SESSION['mineacle_contact_token'] = bin2hex(random_bytes(24));
    $_SESSION['mineacle_contact_started_at'] = time();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($form as $key => $default) {
        $form[$key] = trim((string) ($_POST[$key] ?? $default));
    }

    $submittedToken = (string) ($_POST['contact_token'] ?? '');
    $honeypot = trim((string) ($_POST['website'] ?? ''));
    $startedAt = (int) ($_SESSION['mineacle_contact_started_at'] ?? 0);
    $lastSubmission = (int) ($_SESSION['mineacle_contact_last_submission'] ?? 0);

    if (!hash_equals((string) $_SESSION['mineacle_contact_token'], $submittedToken)) {
        $errors[] = 'Your form session expired. Refresh the page and try again.';
    }

    if ($honeypot !== '') {
        $errors[] = 'The report could not be submitted.';
    }

    if ($startedAt > 0 && time() - $startedAt < 2) {
        $errors[] = 'Please review the report before sending it.';
    }

    if ($lastSubmission > 0 && time() - $lastSubmission < 60) {
        $errors[] = 'Please wait a minute before sending another report.';
    }

    if (!isset($categories[$form['category']])) {
        $errors[] = 'Choose a valid report category.';
    }

    $validPlayerName = preg_match('/^[A-Za-z0-9_]{1,16}$/', $form['player_name']) === 1;
    $submittedUuid = mineacle_contact_uuid($form['player_uuid']);

    if (!$validPlayerName || strlen($submittedUuid) !== 32) {
        $errors[] = 'Select your Mineacle player profile from the search results.';
    } else {
        $profile = null;
        $profileLookupFailed = false;

        try {
            $profile = mineacle_stats_profile_by_username($form['player_name']);
        } catch (Throwable) {
            $profileLookupFailed = true;
            $errors[] = 'Player verification is temporarily unavailable. Please try again later.';
        }

        if (!$profileLookupFailed && $profile === null) {
            $errors[] = 'That player has not joined Mineacle.';
        } elseif (is_array($profile)) {
            $profileUuid = mineacle_contact_uuid((string) ($profile['uuid'] ?? ''));

            if (strlen($profileUuid) !== 32 || !hash_equals($profileUuid, $submittedUuid)) {
                $errors[] = 'Select your Mineacle player profile from the search results.';
            } else {
                $skin = is_array($profile['skin'] ?? null) ? $profile['skin'] : [];
                $form['player_name'] = mineacle_stats_username($profile);
                $form['player_uuid'] = $profileUuid;
                $selectedPlayer = [
                    'name' => $form['player_name'],
                    'display_name' => mineacle_stats_display_name($profile),
                    'uuid' => $profileUuid,
                    'head' => trim((string) ($skin['head'] ?? '')),
                ];
            }
        }
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

    if ($errors === [] && is_array($selectedPlayer)) {
        $recipient = filter_var((string) ($contactConfig['recipient'] ?? ''), FILTER_VALIDATE_EMAIL);
        $fromEmail = filter_var((string) ($contactConfig['from_email'] ?? ''), FILTER_VALIDATE_EMAIL);

        if ($recipient === false || $fromEmail === false) {
            $errors[] = 'Bug reporting is not configured yet. Please try again later.';
        }
    }

    if ($errors === [] && is_array($selectedPlayer)) {
        $remoteAddress = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        $limitMessage = mineacle_contact_rate_limit('ip:' . $remoteAddress);

        if ($limitMessage !== null) {
            $errors[] = $limitMessage;
        }
    }

    if ($errors === [] && is_array($selectedPlayer)) {
        $recipient = filter_var((string) ($contactConfig['recipient'] ?? ''), FILTER_VALIDATE_EMAIL);
        $fromEmail = filter_var((string) ($contactConfig['from_email'] ?? ''), FILTER_VALIDATE_EMAIL);

        if ($recipient !== false && $fromEmail !== false) {
            $categoryLabel = $categories[$form['category']];
            $cleanSubject = (string) preg_replace('/[\r\n]+/', ' ', $form['subject']);
            $mailSubject = '[Mineacle] ' . $categoryLabel . ': ' . $cleanSubject;
            $mailBody = implode("\n", [
                'Category: ' . $categoryLabel,
                'Minecraft IGN: ' . $selectedPlayer['name'],
                'Display name: ' . $selectedPlayer['display_name'],
                'Player UUID: ' . $selectedPlayer['uuid'],
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

            $sent = @mail(
                (string) $recipient,
                $mailSubject,
                wordwrap($mailBody, 78),
                implode("\r\n", $headers)
            );

            if ($sent) {
                $_SESSION['mineacle_contact_last_submission'] = time();
                $_SESSION['mineacle_contact_token'] = bin2hex(random_bytes(24));
                $_SESSION['mineacle_contact_started_at'] = time();
                $form = [
                    'player_name' => '',
                    'player_uuid' => '',
                    'category' => 'bug',
                    'email' => '',
                    'subject' => '',
                    'message' => '',
                ];
                $selectedPlayer = null;
            } else {
                $errors[] = 'The report could not be delivered. Please try again shortly.';
            }
        }
    }
}

$assetVersion = (string) max(
    (int) (is_file(__DIR__ . '/assets/css/contact.css') ? filemtime(__DIR__ . '/assets/css/contact.css') : 1),
    (int) (is_file(__DIR__ . '/assets/js/contact.js') ? filemtime(__DIR__ . '/assets/js/contact.js') : 1)
);

$siteCss = __DIR__ . '/../shared/assets/css/site.css';
$navigationCss = __DIR__ . '/../shared/assets/css/navigation.css';
$secondaryCss = __DIR__ . '/../shared/assets/css/secondary-pages.css';
$navigationJs = __DIR__ . '/../shared/assets/js/navigation.js';

mineacle_page_head('Contact', [
    'meta_title' => 'Contact | Mineacle',
    'meta_description' => 'Contact Mineacle Studios, report a bug, or request account and store support.',
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
]);
?>
<main class="contact-site">
    <section class="contact-hero" aria-labelledby="contact-title">
        <div class="contact-hero__surface">
            <?php mineacle_site_navigation($site, ['current_key' => '']); ?>

            <div class="contact-hero__copy">
                <span>Mineacle Support</span>
                <h1 id="contact-title">Contact Us</h1>
                <p>Connect a verified Mineacle profile and give the team the details needed to investigate quickly.</p>
            </div>
        </div>
    </section>

    <section class="contact-layout" aria-label="Mineacle contact form">
        <section class="contact-intro">
            <div class="contact-intro__copy">
                <span class="contact-intro__eyebrow">Before you submit</span>
                <h2>Send a useful report</h2>
                <p>Verified reports give us the exact player context needed to reproduce account, website, store, and gameplay issues.</p>
            </div>

            <div class="contact-reward">
                <div>
                    <strong>Verified reports earn rewards</strong>
                    <p>Confirmed bug reports can receive an in-game reward within 72 hours. Rewards scale with the report type, reproducibility, and player impact.</p>
                </div>
                <img src="/shared/assets/images/footer/slime-static.webp?v=<?php echo h(rawurlencode(mineacle_page_asset_version())); ?>" alt="" aria-hidden="true" draggable="false">
            </div>

            <div class="contact-guidance-block">
                <h2>Include these details</h2>
                <ul class="contact-guidance">
                    <li>Include the exact command, page, or world involved.</li>
                    <li>Explain what happened and what you expected.</li>
                    <li>Never include passwords, recovery codes, or payment details.</li>
                </ul>
            </div>
        </section>

        <section class="contact-form-panel" aria-label="Contact form">
            <header class="contact-form-heading">
                <h2>Send a Report</h2>
                <p>Every report must be attached to a player who has joined Mineacle.</p>
            </header>

            <?php if ($sent): ?>
                <div class="contact-notice is-success" role="status">
                    <strong>Report sent</strong>
                    <span>Mineacle Studios received your message.</span>
                </div>
            <?php elseif ($errors !== []): ?>
                <div class="contact-notice is-error" role="alert">
                    <strong>Check your report</strong>
                    <ul>
                        <?php foreach (array_unique($errors) as $error): ?>
                            <li><?php echo h($error); ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <form class="contact-form" action="/contact" method="post" data-contact-form>
                <input type="hidden" name="contact_token" value="<?php echo h((string) $_SESSION['mineacle_contact_token']); ?>">
                <input type="hidden" name="player_uuid" value="<?php echo h($form['player_uuid']); ?>" data-contact-player-uuid>

                <div class="contact-honeypot" aria-hidden="true">
                    <label for="website">Website</label>
                    <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
                </div>

                <div class="contact-player-field" data-contact-player-picker>
                    <label for="contact-player"><span>In-game name</span></label>

                    <div class="contact-player-input">
                        <img src="/shared/assets/images/search/user.png" alt="" aria-hidden="true" draggable="false">
                        <input
                            id="contact-player"
                            name="player_name"
                            type="text"
                            maxlength="16"
                            autocomplete="off"
                            autocapitalize="none"
                            spellcheck="false"
                            placeholder="Search your Mineacle profile"
                            value="<?php echo h($form['player_name']); ?>"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded="false"
                            aria-controls="contact-player-results"
                            data-contact-player-input
                            <?php echo is_array($selectedPlayer) ? 'readonly' : ''; ?>
                            required
                        >
                    </div>

                    <div class="contact-player-results" id="contact-player-results" role="listbox" data-contact-player-results hidden></div>

                    <div class="contact-player-selected" data-contact-player-selected<?php echo is_array($selectedPlayer) ? '' : ' hidden'; ?>>
                        <span class="contact-player-selected__head">
                            <?php if (is_array($selectedPlayer) && $selectedPlayer['head'] !== ''): ?>
                                <img src="<?php echo h((string) $selectedPlayer['head']); ?>" alt="" aria-hidden="true" draggable="false" data-contact-player-selected-head>
                            <?php else: ?>
                                <img src="" alt="" aria-hidden="true" draggable="false" data-contact-player-selected-head hidden>
                            <?php endif; ?>
                        </span>

                        <span>
                            <strong data-contact-player-selected-name><?php echo is_array($selectedPlayer) ? h((string) $selectedPlayer['name']) : ''; ?></strong>
                            <span>Verified Mineacle player</span>
                        </span>

                        <button type="button" data-contact-player-clear>Change</button>
                    </div>

                    <p>Select a profile from the results. Only players who have joined Mineacle can send a report.</p>
                </div>

                <div class="contact-form__row">
                    <label>
                        <span>Category</span>
                        <select name="category" required>
                            <?php foreach ($categories as $value => $label): ?>
                                <option value="<?php echo h($value); ?>"<?php echo $form['category'] === $value ? ' selected' : ''; ?>><?php echo h($label); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>

                    <label>
                        <span>Reply email</span>
                        <input name="email" type="email" maxlength="254" autocomplete="email" value="<?php echo h($form['email']); ?>" placeholder="you@example.com" required>
                    </label>
                </div>

                <label>
                    <span>Subject</span>
                    <input name="subject" type="text" minlength="4" maxlength="120" value="<?php echo h($form['subject']); ?>" placeholder="Short summary" required>
                </label>

                <label>
                    <span>Report details</span>
                    <textarea name="message" minlength="20" maxlength="4000" rows="8" placeholder="What happened, what did you expect, and how can we reproduce it?" required><?php echo h($form['message']); ?></textarea>
                </label>

                <button class="contact-submit" type="submit" data-contact-submit>Send Report</button>
            </form>
        </section>
    </section>

    <?php mineacle_compact_footer($site); ?>
</main>

<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation.js?rev=' . rawurlencode((string) (is_file($navigationJs) ? filemtime($navigationJs) : 1)),
        '/contact/assets/js/contact.js?rev=' . rawurlencode($assetVersion),
    ],
]); ?>
