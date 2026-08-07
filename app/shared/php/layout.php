<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function mineacle_page_asset_version(): string
{
    return 'palette-refresh-20260729-v4';
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
    echo '<img src="/shared/assets/images/search/search.png" alt="" aria-hidden="true" draggable="false">';
    echo '<input id="homeSearch" name="name" type="search" placeholder="Search for a player..." autocomplete="off" aria-autocomplete="list" aria-expanded="false" aria-controls="playerSearchResults">';
    echo '<button class="search-clear" type="button" aria-label="Clear search" hidden>';
    echo '<img src="/shared/assets/images/search/clear.svg" alt="" aria-hidden="true" draggable="false">';
    echo '</button>';
    echo '</form>';
    echo '<div class="player-search-results" id="playerSearchResults" data-player-search-results role="listbox" aria-label="Player search results" hidden></div>';
    echo '</div>';
    echo '</section>';
}

function mineacle_page_footer(array $site): void
{
    require_once __DIR__ . '/compact-footer.php';
    mineacle_compact_footer($site);
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
    echo '<meta name="theme-color" content="' . h((string) ($options['theme_color'] ?? '#111111')) . '">';
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

    echo '<link rel="icon" type="image/png" href="/shared/assets/images/favicon.png?v=' . h($assetVersion) . '">';

    if (($options['external_fonts'] ?? true) === true) {
        echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
        echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
        echo '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@500;600;700&display=swap">';
    }

    $stylesheets = $options['stylesheets'] ?? ['/shared/assets/css/site.css'];

    if (!is_array($stylesheets) || $stylesheets === []) {
        $stylesheets = ['/shared/assets/css/site.css'];
    }

    foreach ($stylesheets as $stylesheet) {
        $stylesheetUrl = trim((string) $stylesheet);

        if ($stylesheetUrl === '') {
            continue;
        }

        $separator = str_contains($stylesheetUrl, '?') ? '&' : '?';
        echo '<link rel="stylesheet" href="' . h($stylesheetUrl . $separator . 'v=' . $assetVersion) . '">';
    }

    if (!$isAdmin) {
        $documentCssPath = __DIR__ . '/../assets/css/document.css';
        $documentCssVersion = (string) (
            is_file($documentCssPath)
                ? (filemtime($documentCssPath) ?: 1)
                : 1
        );

        echo '<link rel="stylesheet" href="/shared/assets/css/document.css?rev='
            . h(rawurlencode($documentCssVersion))
            . '&v='
            . h($assetVersion)
            . '">';
    }

    echo '</head>';
    $bodyClass = mineacle_page_clean_text((string) ($options['body_class'] ?? ''));
    echo $bodyClass !== '' ? '<body class="' . h($bodyClass) . '">' : '<body>';
}

function mineacle_page_end(array $options = []): void
{
    $scripts = $options['scripts'] ?? ['/shared/assets/js/site.js'];

    if (!is_array($scripts)) {
        $scripts = ['/shared/assets/js/site.js'];
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
