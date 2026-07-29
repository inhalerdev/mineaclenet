<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function mineacle_page_asset_version(): string
{
    return 'site-polish-20260729';
}

function mineacle_page_clean_text(string $value): string
{
    return trim((string) preg_replace('/\s+/', ' ', $value));
}

function mineacle_page_meta_title(string $title, string $siteName): string
{
    $cleanTitle = mineacle_page_clean_text($title) ?: 'Home';
    $normalizedTitle = strtolower($cleanTitle);

    if (in_array($normalizedTitle, ['leaderboard', 'leaderboards'], true)) {
        $cleanTitle = 'Leaderboards';
    }

    return $cleanTitle . ' | ' . $siteName;
}

function mineacle_page_meta_description(string $title, string $siteName): string
{
    $cleanTitle = mineacle_page_clean_text($title) ?: 'Home';

    if (in_array(strtolower($cleanTitle), ['leaderboard', 'leaderboards'], true)) {
        return 'View ' . $siteName . ' player leaderboards, rankings, and server stats.';
    }

    if (strcasecmp($cleanTitle, 'Admin') === 0) {
        return 'Manage ' . $siteName . ' website announcements.';
    }

    if (strcasecmp($cleanTitle, 'Player') === 0) {
        return 'View a ' . $siteName . ' player profile and server stats.';
    }

    if (strcasecmp($cleanTitle, 'Home') !== 0) {
        return 'View ' . $cleanTitle . '\'s ' . $siteName . ' player profile and server stats.';
    }

    return $siteName . ' is a Minecraft Java Edition network with player stats, updates, and community links.';
}

function mineacle_page_canonical_url(): string
{
    $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);

    if (!is_string($path) || $path === '') {
        $path = '/';
    }

    if ($path === '/index.php') {
        $path = '/';
    }

    return 'https://mineacle.net' . $path;
}

function mineacle_page_public_link(mixed $url): string
{
    $value = trim((string) $url);

    if ($value === '') {
        return '#';
    }

    if (str_starts_with($value, 'mailto:')) {
        $email = substr($value, 7);

        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $value : '#';
    }

    if ($value === '#' || str_starts_with($value, '/') || str_starts_with($value, './')) {
        return $value;
    }

    return filter_var($value, FILTER_VALIDATE_URL) ? $value : '#';
}

function mineacle_page_is_local_host(string $url): bool
{
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));

    if ($host === '') {
        return false;
    }

    if (in_array($host, ['localhost', '127.0.0.1', '0.0.0.0', '::1'], true)) {
        return true;
    }

    return preg_match('/^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/', $host) === 1;
}

function mineacle_page_home_url(array $site = []): string
{
    return 'https://mineacle.net/';
}

function mineacle_page_leaderboards_url(array $site = []): string
{
    $value = trim((string) ($site['stats_url'] ?? ''));
    $normalized = strtolower(trim($value, " \t\n\r\0\x0B/"));

    if ($value === '#') {
        return '#';
    }

    if ($value === '' || in_array($normalized, ['leaderboards', 'leaderboards.php', 'players', 'players.php'], true)) {
        return 'https://mineacle.net/leaderboards';
    }

    $safe = mineacle_page_public_link($value);

    if ($safe === '#') {
        return 'https://mineacle.net/leaderboards';
    }

    if (mineacle_page_is_local_host($safe)) {
        return 'https://mineacle.net/leaderboards';
    }

    if ($safe === '/leaderboards' || $safe === '/players' || $safe === '/players.php') {
        return 'https://mineacle.net/leaderboards';
    }

    if ($safe === '/leaderboards.php') {
        return 'https://mineacle.net/leaderboards';
    }

    $path = parse_url($safe, PHP_URL_PATH);

    if (is_string($path) && in_array($path, ['/leaderboards', '/leaderboards.php', '/players', '/players.php'], true)) {
        return 'https://mineacle.net/leaderboards';
    }

    return $safe;
}

function mineacle_page_icon(string $name): string
{
    $assetVersion = rawurlencode(mineacle_page_asset_version());
    $iconVersion = '?v=' . $assetVersion;

    if ($name === 'discord') {
        $square = '/assets/icons/discord-square.svg' . $iconVersion;
        $mark = '/assets/icons/discord-mark.svg' . $iconVersion;

        return '<span class="site-icon site-icon-layered discord-icon" aria-hidden="true">'
            . '<img class="discord-icon-square" src="' . h($square) . '" alt="" draggable="false">'
            . '<img class="discord-icon-mark" src="' . h($mark) . '" alt="" draggable="false">'
            . '</span>';
    }

    if ($name === 'store') {
        $mark = '/assets/icons/store.svg' . $iconVersion;

        return '<span class="site-icon site-icon-layered store-icon" aria-hidden="true">'
            . '<span class="store-icon-square"></span>'
            . '<img class="store-icon-mark" src="' . h($mark) . '" alt="" draggable="false">'
            . '</span>';
    }

    if ($name === 'x') {
        $square = '/assets/icons/x-square.svg' . $iconVersion;
        $mark = '/assets/icons/x-mark.svg' . $iconVersion;

        return '<span class="site-icon site-icon-layered x-icon" aria-hidden="true">'
            . '<img class="x-icon-square" src="' . h($square) . '" alt="" draggable="false">'
            . '<img class="x-icon-mark" src="' . h($mark) . '" alt="" draggable="false">'
            . '</span>';
    }

    $officialIcons = [
        'home' => '/assets/icons/home.svg' . $iconVersion,
        'stats' => '/assets/icons/leaderboard.svg' . $iconVersion,
        'vote' => '/assets/icons/vote.svg' . $iconVersion,
        'bans' => '/assets/icons/bans.svg' . $iconVersion,
        'youtube' => '/assets/icons/youtube-pixel.svg' . $iconVersion,
    ];

    if (isset($officialIcons[$name])) {
        return '<img class="site-icon" src="' . h($officialIcons[$name]) . '" alt="" aria-hidden="true" draggable="false">';
    }

    $icons = [
        'youtube' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.5c.3 2.3.3 4.7 0 7-.2 1.4-1.2 2.4-2.6 2.6-4.2.4-8.6.4-12.8 0-1.4-.2-2.4-1.2-2.6-2.6-.3-2.3-.3-4.7 0-7 .2-1.4 1.2-2.4 2.6-2.6 4.2-.4 8.6-.4 12.8 0 1.4.2 2.4 1.2 2.6 2.6ZM10 15l5-3-5-3v6Z"/></svg>',
        'tiktok' => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h3c.2 2 1.4 3.4 3.4 3.8v3.1c-1.3-.1-2.4-.5-3.4-1.2V15a5 5 0 1 1-5-5h.6v3.2c-.2 0-.4-.1-.6-.1a1.9 1.9 0 1 0 1.9 1.9L14 3Z"/></svg>',
    ];

    return $icons[$name] ?? '';
}

function mineacle_page_search_header(array $site): void
{
    $minecraftIp = (string) ($site['minecraft_ip'] ?? 'mineacle.net');

    echo '<section class="search-row" aria-label="Search">';
    echo '<div class="server-status is-loading" data-server-status data-server-ip="' . h($minecraftIp) . '" aria-live="polite">';
    echo '<span class="server-status-dot" aria-hidden="true"></span>';
    echo '<span class="server-status-main">';
    echo '<span class="server-status-label">Server Status</span>';
    echo '<span class="server-status-count" data-server-status-count>Checking server</span>';
    echo '</span>';
    echo '</div>';
    echo '<label class="sr-only" for="homeSearch">Search</label>';
    echo '<div class="player-search" data-player-search>';
    echo '<form class="search-box" action="/player" method="get" role="search" data-player-search-form>';
    echo '<img src="/assets/icons/search.png" alt="" aria-hidden="true" draggable="false">';
    echo '<input id="homeSearch" name="name" type="search" placeholder="Search for a player..." autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="playerSearchResults">';
    echo '<button class="search-clear" type="button" aria-label="Clear search" hidden>';
    echo '<img src="/assets/icons/clear-search.svg" alt="" aria-hidden="true" draggable="false">';
    echo '</button>';
    echo '</form>';
    echo '<div class="player-search-results" id="playerSearchResults" data-player-search-results role="listbox" aria-label="Player search results" hidden></div>';
    echo '</div>';
    echo '</section>';
}

function mineacle_page_footer(array $site): void
{
    $assetVersion = rawurlencode(mineacle_page_asset_version());
    $plusUrl = mineacle_page_public_link($site['plus_url'] ?? $site['store_url'] ?? '#');

    if ($plusUrl === '#') {
        $plusUrl = mineacle_page_public_link($site['store_url'] ?? '#');
    }
    $quickLinks = [
        ['key' => 'home', 'label' => 'Home', 'url' => '/'],
        ['key' => 'vote', 'label' => 'Vote', 'url' => '/vote'],
        ['key' => 'bans', 'label' => 'Bans', 'url' => '/bans'],
        ['key' => 'stats', 'label' => 'Leaderboards', 'url' => '/leaderboards'],
        ['key' => 'store', 'label' => 'Store', 'url' => (string) ($site['store_url'] ?? '#')],
    ];
    $socialLinks = [
        ['key' => 'x', 'label' => 'X/Twitter', 'url' => (string) ($site['x_url'] ?? '#')],
        ['key' => 'discord', 'label' => 'Discord', 'url' => (string) ($site['discord_url'] ?? '#')],
    ];
    $legalLinks = [
        ['label' => 'Terms of Service', 'url' => (string) ($site['terms_url'] ?? '#')],
        ['label' => 'Privacy Policy', 'url' => (string) ($site['privacy_url'] ?? '#')],
        ['label' => 'Refund Policy', 'url' => (string) ($site['refund_url'] ?? '#')],
        ['label' => 'Contact Us', 'url' => '/contact'],
    ];

    echo '<footer class="site-footer" aria-label="Mineacle footer">';
    echo '<div class="site-footer__main">';
    echo '<section class="site-footer__studio" aria-label="Mineacle Studios">';
    echo '<a class="site-footer__studio-logo" href="/" aria-label="Mineacle Studios, creators of Mineacle"><img src="/assets/brand/mncl-studios-footer.webp?v=' . h($assetVersion) . '" alt="Mineacle Studios" draggable="false"></a>';
    echo '<p><strong>Mineacle Studios</strong> builds the custom systems behind Mineacle—a polished, community-driven survival experience that stays true to the Minecraft everyone already loves.</p>';
    echo '</section>';

    echo '<section class="site-footer__plus" aria-label="Mineacle Plus">';
    echo '<div class="site-footer__plus-cta"><h2>Mineacle+</h2>';
    echo '<p>Level up your survival experience and support the network.</p>';
    echo '<a class="site-footer__plus-button" href="' . h($plusUrl) . '" target="_blank" rel="noopener noreferrer"><span>Buy Now</span><span class="site-footer__plus-arrow" aria-hidden="true"></span></a></div>';
    echo '<nav class="site-footer__links" aria-label="Quick links"><h3>Quick Links</h3><div>';
    foreach ($quickLinks as $link) {
        $url = mineacle_page_public_link($link['url']);

        if ($url === '#') {
            continue;
        }

        echo '<a href="' . h($url) . '"><img src="/assets/home/nav-' . h($link['key']) . '.png?v=' . h($assetVersion) . '" alt="" aria-hidden="true" draggable="false"><span>' . h($link['label']) . '</span></a>';
    }
    echo '</div></nav>';
    echo '</section>';

    echo '<section class="site-footer__community" aria-label="Mineacle community and support">';
    echo '<div class="site-footer__connect"><h2>Stay up to date</h2>';
    echo '<p>Follow Mineacle for updates, releases, and community news.</p>';
    echo '<nav class="site-footer__socials" aria-label="Mineacle social links">';
    foreach ($socialLinks as $link) {
        $key = (string) $link['key'];
        $url = mineacle_page_public_link($link['url']);

        if ($url === '#') {
            continue;
        }

        echo '<a class="social-link social-link--footer social-link--' . h($key) . '" href="' . h($url) . '" target="_blank" rel="noopener noreferrer" aria-label="' . h($link['label']) . '"><span class="social-logo social-logo--' . h($key) . '" aria-hidden="true"></span></a>';
    }
    echo '</nav></div>';
    echo '<a class="site-footer__bug-link" href="/contact" aria-label="Contact Mineacle Studios to report a bug">';
    echo '<img class="site-footer__bug" src="/assets/brand/footer-slime-static.webp?v=' . h($assetVersion) . '" data-footer-slime data-static-src="/assets/brand/footer-slime-static.webp?v=' . h($assetVersion) . '" data-animated-src="/assets/brand/footer-slime.webp?v=' . h($assetVersion) . '" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">';
    echo '<span><strong>Found a Bug?</strong><span>Every report helps us keep Mineacle clean and stable.</span></span></a>';
    echo '</section>';
    echo '</div>';

    echo '<div class="site-footer__bottom"><p>© 2026 Mineacle Studios. All Rights Reserved. Mineacle is not affiliated with or endorsed by Mojang Studios or Microsoft.</p>';
    echo '<nav aria-label="Legal links">';
    foreach ($legalLinks as $link) {
        $url = mineacle_page_public_link($link['url']);

        if ($url === '#') {
            echo '<span class="site-footer__legal-label">' . h($link['label']) . '</span>';
            continue;
        }

        echo '<a href="' . h($url) . '">' . h($link['label']) . '</a>';
    }
    echo '</nav>';
    echo '</div>';
    echo '</footer>';
}

function mineacle_page_head(string $title = 'Home', array $options = []): void
{
    mineacle_security_headers();
    $config = mineacle_config();
    $site = $config['site'] ?? [];
    $name = mineacle_page_clean_text((string) ($site['name'] ?? 'Mineacle')) ?: 'Mineacle';
    $customTitle = mineacle_page_clean_text((string) ($options['meta_title'] ?? ''));
    $customDescription = mineacle_page_clean_text((string) ($options['meta_description'] ?? ''));
    $customCanonical = trim((string) ($options['canonical_url'] ?? ''));
    $metaTitle = $customTitle !== '' ? $customTitle : mineacle_page_meta_title($title, $name);
    $metaDescription = $customDescription !== '' ? $customDescription : mineacle_page_meta_description($title, $name);
    $canonicalUrl = $customCanonical !== '' ? $customCanonical : mineacle_page_canonical_url();
    $isAdmin = strcasecmp(mineacle_page_clean_text($title), 'Admin') === 0;

    echo '<!doctype html>';
    echo '<html lang="en">';
    echo '<head>';
    echo '<meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
    echo '<meta name="theme-color" content="' . h((string) ($options['theme_color'] ?? '#080808')) . '">';
    echo '<title>' . h($metaTitle) . '</title>';
    echo '<meta name="description" content="' . h($metaDescription) . '">';
    echo '<link rel="canonical" href="' . h($canonicalUrl) . '">';
    echo '<meta property="og:site_name" content="' . h($name) . '">';
    echo '<meta property="og:type" content="website">';
    echo '<meta property="og:title" content="' . h($metaTitle) . '">';
    echo '<meta property="og:description" content="' . h($metaDescription) . '">';
    echo '<meta property="og:url" content="' . h($canonicalUrl) . '">';
    echo '<meta name="twitter:card" content="summary">';
    echo '<meta name="twitter:title" content="' . h($metaTitle) . '">';
    echo '<meta name="twitter:description" content="' . h($metaDescription) . '">';

    if ($isAdmin || ($options['robots'] ?? '') !== '') {
        $robots = $isAdmin ? 'noindex,nofollow' : (string) $options['robots'];
        echo '<meta name="robots" content="' . h($robots) . '">';
    }

    $assetVersion = mineacle_page_asset_version();

    echo '<link rel="icon" type="image/png" href="/assets/fav-web.png?v=' . h($assetVersion) . '">';
    if (($options['external_fonts'] ?? true) === true) {
        echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
        echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
        echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@500;600;700&display=swap">';
    }

    $stylesheets = $options['stylesheets'] ?? ['/assets/home-page.css'];

    if (!is_array($stylesheets) || $stylesheets === []) {
        $stylesheets = ['/assets/home-page.css'];
    }

    foreach ($stylesheets as $stylesheet) {
        $stylesheetUrl = trim((string) $stylesheet);

        if ($stylesheetUrl === '') {
            continue;
        }

        $separator = str_contains($stylesheetUrl, '?') ? '&' : '?';
        echo '<link rel="stylesheet" href="' . h($stylesheetUrl . $separator . 'v=' . $assetVersion) . '">';
    }

    echo '</head>';
    $bodyClass = mineacle_page_clean_text((string) ($options['body_class'] ?? ''));
    echo $bodyClass !== '' ? '<body class="' . h($bodyClass) . '">' : '<body>';
}

function mineacle_page_end(array $options = []): void
{
    $scripts = $options['scripts'] ?? ['/assets/home-page.js'];

    if (!is_array($scripts)) {
        $scripts = ['/assets/home-page.js'];
    }

    foreach ($scripts as $script) {
        $scriptUrl = trim((string) $script);

        if ($scriptUrl === '') {
            continue;
        }

        $separator = str_contains($scriptUrl, '?') ? '&' : '?';
        echo '<script src="' . h($scriptUrl . $separator . 'v=' . mineacle_page_asset_version()) . '"></script>';
    }

    echo '</body>';
    echo '</html>';
}
