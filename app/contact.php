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

$config = mineacle_config();
$site = $config['site'] ?? [];
$contactConfig = $config['contact'] ?? [];
$assetVersion = mineacle_page_asset_version();
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/home.css') ?: $assetVersion);
$pagesStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/pages.css') ?: $assetVersion);
$contactStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/contact.css') ?: $assetVersion);
$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';
$uniquePlayerCount = 0;

try {
    $uniquePlayerCount = mineacle_stats_unique_players_count();
} catch (Throwable) {
    // The contact page must remain available while stats are offline.
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
    ['key' => 'vote', 'label' => 'Vote', 'url' => $siteUrl($site['vote_url'] ?? '', 'https://mineacle.net/vote'), 'external' => true],
    ['key' => 'stats', 'label' => 'Leaderboards', 'url' => '/leaderboards', 'external' => false],
    ['key' => 'bans', 'label' => 'Bans', 'url' => $siteUrl($site['bans_url'] ?? '', 'https://bans.mineacle.net/'), 'external' => true],
    ['key' => 'store', 'label' => 'Store', 'url' => $siteUrl($site['store_url'] ?? '', 'https://store.mineacle.net/'), 'external' => true],
];
$socialLinks = [
    ['key' => 'discord', 'label' => 'Mineacle Discord', 'title' => 'Discord', 'url' => $siteUrl($site['discord_url'] ?? '', 'https://discord.gg/qmpJ4xMguT')],
    ['key' => 'x', 'label' => 'Mineacle on X', 'title' => 'X', 'url' => $siteUrl($site['x_url'] ?? '', 'https://x.com/mineaclenetwork')],
];
$categories = [
    'bug' => 'Bug Report',
    'website' => 'Website Issue',
    'account' => 'Account Help',
    'store' => 'Store Support',
    'other' => 'Something Else',
];
$form = [
    'category' => 'bug',
    'player_name' => '',
    'email' => '',
    'subject' => '',
    'message' => '',
    'page_url' => '',
];
$errors = [];
$sent = false;

if (!isset($_SESSION['mineacle_contact_token']) || !is_string($_SESSION['mineacle_contact_token'])) {
    $_SESSION['mineacle_contact_token'] = bin2hex(random_bytes(24));
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach ($form as $key => $default) {
        $value = trim((string) ($_POST[$key] ?? $default));
        $form[$key] = $value;
    }

    $submittedToken = (string) ($_POST['contact_token'] ?? '');
    $honeypot = trim((string) ($_POST['website'] ?? ''));
    $lastSubmission = (int) ($_SESSION['mineacle_contact_last_submission'] ?? 0);

    if (!hash_equals((string) $_SESSION['mineacle_contact_token'], $submittedToken)) {
        $errors[] = 'Your form session expired. Refresh the page and try again.';
    }

    if ($honeypot !== '') {
        $errors[] = 'The report could not be submitted.';
    }

    if ($lastSubmission > 0 && time() - $lastSubmission < 45) {
        $errors[] = 'Please wait a moment before sending another report.';
    }

    if (!isset($categories[$form['category']])) {
        $errors[] = 'Choose a valid report category.';
    }

    if ($form['player_name'] !== '' && strlen($form['player_name']) > 64) {
        $errors[] = 'Player name must be 64 characters or fewer.';
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

    if ($form['page_url'] !== '' && (strlen($form['page_url']) > 500 || filter_var($form['page_url'], FILTER_VALIDATE_URL) === false)) {
        $errors[] = 'Page URL must be a valid URL.';
    }

    if ($errors === []) {
        $recipient = filter_var((string) ($contactConfig['recipient'] ?? ''), FILTER_VALIDATE_EMAIL);
        $fromEmail = filter_var((string) ($contactConfig['from_email'] ?? ''), FILTER_VALIDATE_EMAIL);

        if ($recipient === false || $fromEmail === false) {
            $errors[] = 'Bug reporting is not configured yet. Please try again later.';
        } else {
            $categoryLabel = $categories[$form['category']];
            $mailSubject = '[Mineacle] ' . $categoryLabel . ': ' . preg_replace('/[\r\n]+/', ' ', $form['subject']);
            $mailBody = implode("\n", [
                'Category: ' . $categoryLabel,
                'Player: ' . ($form['player_name'] !== '' ? $form['player_name'] : 'Not provided'),
                'Reply email: ' . $form['email'],
                'Page: ' . ($form['page_url'] !== '' ? $form['page_url'] : 'Not provided'),
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
                $form = array_replace($form, [
                    'subject' => '',
                    'message' => '',
                    'page_url' => '',
                ]);
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
    'theme_color' => '#00001f',
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
                <header class="topbar">
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

                <div class="page-scroll">
                    <div class="page-stack">
                        <main class="contact-layout" aria-labelledby="contact-title">
                            <section class="contact-intro">
                                <span class="contact-eyebrow">Mineacle Studios</span>
                                <h1 id="contact-title">Tell us what happened.</h1>
                                <p>Detailed reports help us reproduce issues faster. Include what you expected, what actually happened, and the steps that caused it.</p>
                                <div class="contact-expectations">
                                    <article><strong>Be specific</strong><span>Commands, pages, worlds, and exact steps are useful.</span></article>
                                    <article><strong>Protect your account</strong><span>Never send passwords, recovery codes, or payment details.</span></article>
                                    <article><strong>One issue per report</strong><span>Separate reports are easier to investigate and track.</span></article>
                                </div>
                            </section>

                            <section class="contact-form-panel" aria-label="Bug report form">
                                <?php if ($sent): ?>
                                    <div class="contact-notice is-success" role="status">
                                        <strong>Report sent</strong>
                                        <span>Mineacle Studios received your message.</span>
                                    </div>
                                <?php elseif ($errors !== []): ?>
                                    <div class="contact-notice is-error" role="alert">
                                        <strong>Check your report</strong>
                                        <ul>
                                            <?php foreach ($errors as $error): ?>
                                                <li><?php echo h($error); ?></li>
                                            <?php endforeach; ?>
                                        </ul>
                                    </div>
                                <?php endif; ?>

                                <form class="contact-form" action="/contact" method="post">
                                    <input type="hidden" name="contact_token" value="<?php echo h((string) $_SESSION['mineacle_contact_token']); ?>">
                                    <div class="contact-honeypot" aria-hidden="true">
                                        <label for="website">Website</label>
                                        <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
                                    </div>

                                    <label>
                                        <span>Category</span>
                                        <select name="category" required>
                                            <?php foreach ($categories as $value => $label): ?>
                                                <option value="<?php echo h($value); ?>"<?php echo $form['category'] === $value ? ' selected' : ''; ?>><?php echo h($label); ?></option>
                                            <?php endforeach; ?>
                                        </select>
                                    </label>

                                    <div class="contact-form__row">
                                        <label>
                                            <span>Player name <small>Optional</small></span>
                                            <input name="player_name" type="text" maxlength="64" autocomplete="nickname" value="<?php echo h($form['player_name']); ?>" placeholder="Your Mineacle name">
                                        </label>
                                        <label>
                                            <span>Reply email</span>
                                            <input name="email" type="email" maxlength="254" autocomplete="email" value="<?php echo h($form['email']); ?>" placeholder="you@example.com" required>
                                        </label>
                                    </div>

                                    <label>
                                        <span>Subject</span>
                                        <input name="subject" type="text" minlength="4" maxlength="120" value="<?php echo h($form['subject']); ?>" placeholder="Short summary of the issue" required>
                                    </label>

                                    <label>
                                        <span>Report details</span>
                                        <textarea name="message" minlength="20" maxlength="4000" rows="8" placeholder="What happened, what did you expect, and how can we reproduce it?" required><?php echo h($form['message']); ?></textarea>
                                    </label>

                                    <label>
                                        <span>Page URL <small>Optional</small></span>
                                        <input name="page_url" type="url" maxlength="500" value="<?php echo h($form['page_url']); ?>" placeholder="https://mineacle.net/...">
                                    </label>

                                    <button class="contact-submit" type="submit">Send Report</button>
                                </form>
                            </section>
                        </main>

                        <?php mineacle_page_footer($site); ?>
                    </div>
                </div>
            </div>
        </section>
    </div>
</div>
<?php mineacle_page_end(['scripts' => ['/assets/home.js']]); ?>
