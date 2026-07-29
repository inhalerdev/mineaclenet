<?php

declare(strict_types=1);

$directContactPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/contact'), PHP_URL_PATH);

if ($directContactPath === '/contact.php') {
    header('Location: /contact', true, 301);
    exit;
}

require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/stats-lib.php';

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
$site = $config['site'] ?? [];
$contactConfig = $config['contact'] ?? [];
$assetVersion = mineacle_page_asset_version();
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/home.css') ?: $assetVersion);
$pagesStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/pages.css') ?: $assetVersion);
$contactStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/contact.css') ?: $assetVersion);
$contactScriptVersion = (string) (filemtime(__DIR__ . '/assets/contact.js') ?: $assetVersion);
$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';
$uniquePlayerCount = 0;

try {
    $uniquePlayerCount = mineacle_stats_unique_players_count();
} catch (Throwable) {
    // The contact page remains visible while aggregate statistics are unavailable.
}

$searchPlaceholder = $uniquePlayerCount > 0
    ? 'Search ' . number_format($uniquePlayerCount) . ' players across all dimensions'
    : 'Search players across all dimensions';
$searchLabel = $uniquePlayerCount > 0
    ? 'Search ' . number_format($uniquePlayerCount) . ' players across all Mineacle dimensions'
    : 'Search players across all Mineacle dimensions';

$siteUrl = static function (mixed $value, string $fallback): string {
    $resolved = mineacle_page_public_link($value);

    return $resolved === '#' ? $fallback : $resolved;
};

$navLinks = [
    ['key' => 'home', 'label' => 'Home', 'url' => '/', 'external' => false],
    ['key' => 'vote', 'label' => 'Vote', 'url' => '/vote', 'external' => false],
    ['key' => 'stats', 'label' => 'Leaderboards', 'url' => '/leaderboards', 'external' => false],
    ['key' => 'bans', 'label' => 'Bans', 'url' => '/bans', 'external' => false],
    ['key' => 'store', 'label' => 'Store', 'url' => $siteUrl($site['store_url'] ?? '', 'https://store.mineacle.net/'), 'external' => true],
];
$socialLinks = [
    ['key' => 'x', 'label' => 'Mineacle on X', 'title' => 'X', 'url' => $siteUrl($site['x_url'] ?? '', 'https://x.com/mineaclenetwork')],
    ['key' => 'discord', 'label' => 'Mineacle Discord', 'title' => 'Discord', 'url' => $siteUrl($site['discord_url'] ?? '', 'https://discord.gg/qmpJ4xMguT')],
];
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

mineacle_page_head('Contact', [
    'meta_title' => 'Contact | Mineacle',
    'meta_description' => 'Contact Mineacle Studios, report a bug, or request account and store support.',
    'canonical_url' => 'https://mineacle.net/contact',
    'stylesheets' => [
        '/assets/home.css?rev=' . rawurlencode($homeStylesheetVersion),
        '/assets/pages.css?rev=' . rawurlencode($pagesStylesheetVersion),
        '/assets/contact.css?rev=' . rawurlencode($contactStylesheetVersion),
    ],
    'body_class' => 'secondary-page contact-page',
    'external_fonts' => false,
    'theme_color' => '#000000',
]);
?>
<div class="canvas">
    <div class="interface-stage">
        <section class="interface" aria-label="Contact Mineacle">
            <aside class="sidebar" aria-label="Sidebar navigation">
                <a class="brand-link" href="/" aria-label="Mineacle home">
                    <img class="brand-mark" src="/assets/home/mineacle-mark.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" width="64" height="64" draggable="false">
                </a>

                <nav class="nav-stack nav-stack--upper" aria-label="Main">
                    <?php foreach ($navLinks as $link): ?>
                        <a class="square-button" href="<?php echo h((string) $link['url']); ?>" aria-label="<?php echo h((string) $link['label']); ?>" title="<?php echo h((string) $link['label']); ?>" <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>>
                            <img class="nav-icon" src="/assets/home/nav-<?php echo h((string) $link['key']); ?>.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
                        </a>
                    <?php endforeach; ?>
                </nav>

                <nav class="nav-stack nav-stack--lower" aria-label="Social links">
                    <?php foreach ($socialLinks as $link): ?>
                        <a class="social-link social-link--rail social-link--<?php echo h((string) $link['key']); ?>" href="<?php echo h((string) $link['url']); ?>" target="_blank" rel="noopener noreferrer" aria-label="<?php echo h((string) $link['label']); ?>" title="<?php echo h((string) $link['title']); ?>">
                            <span class="social-logo social-logo--<?php echo h((string) $link['key']); ?>" aria-hidden="true"></span>
                        </a>
                    <?php endforeach; ?>
                </nav>
            </aside>

            <div class="content">
                <div class="page-stack">
                    <header class="topbar secondary-topbar">
                        <div class="search-shell">
                            <form class="search-control" id="player-search" role="search" action="/player" method="get">
                                <div class="search-field">
                                    <img class="search-user-icon" src="/assets/home/search-user.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
                                    <label class="visually-hidden" for="site-search"><?php echo h($searchLabel); ?></label>
                                    <input id="site-search" name="username" type="search" placeholder="<?php echo h($searchPlaceholder); ?>" maxlength="64" autocomplete="off" autocapitalize="none" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="home-player-suggestions">
                                </div>
                                <button class="search-submit" type="submit" aria-label="Search player" title="Search">
                                    <img class="search-arrow-icon" src="/assets/home/search-submit.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
                                </button>
                            </form>
                            <div class="search-suggestions" id="home-player-suggestions" role="listbox" aria-label="Player suggestions" hidden></div>
                        </div>

                        <nav class="top-actions" aria-label="Header actions">
                            <div class="header-status is-loading" id="home-server-status" data-server-ip="<?php echo h($minecraftIp); ?>" role="status" aria-live="polite" aria-label="Checking Mineacle server status" title="Checking server status">
                                <span class="header-status__dot" aria-hidden="true"></span>
                                <span class="header-status__copy">
                                    <span class="header-status__count" id="home-server-status-count">--</span>
                                    <span class="header-status__label" id="home-server-status-label">Currently Playing</span>
                                </span>
                            </div>
                            <button class="top-action top-action--play" id="play-button" type="button" data-copy-value="<?php echo h($minecraftIp); ?>" aria-label="Copy Mineacle server address" title="Copy <?php echo h($minecraftIp); ?>">
                                <span class="play-label" aria-live="polite">PLAY</span>
                            </button>
                        </nav>
                    </header>

                    <main class="contact-layout" aria-labelledby="contact-title">
                        <section class="contact-intro">
                            <div class="contact-intro__copy">
                                <span class="contact-intro__eyebrow">Mineacle Support</span>
                                <h1 id="contact-title">Contact Us</h1>
                                <p>Connect a verified Mineacle profile, choose the right report type, and give the team the details needed to investigate quickly.</p>
                            </div>

                            <div class="contact-reward">
                                <div>
                                    <strong>Verified reports earn rewards</strong>
                                    <p>Confirmed bug reports can receive an in-game reward within 72 hours. Rewards scale with the report type, reproducibility, and player impact.</p>
                                </div>
                                <img src="/assets/brand/footer-slime-static.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
                            </div>

                            <div class="contact-guidance-block">
                                <h2>Send a useful report</h2>
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
                                    <label for="contact-player">
                                        <span>In-game name</span>
                                    </label>
                                    <div class="contact-player-input">
                                        <img src="/assets/home/search-user.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
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
                    </main>

                    <?php mineacle_page_footer($site); ?>
                </div>
            </div>
        </section>
    </div>
</div>
<?php mineacle_page_end([
    'scripts' => [
        '/assets/home.js',
        '/assets/contact.js?rev=' . rawurlencode($contactScriptVersion),
    ],
]); ?>
