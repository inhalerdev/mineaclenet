<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestPath = is_string($requestPath) ? rtrim($requestPath, '/') : '';

if ($requestPath === '') {
    $requestPath = '/';
}

if (preg_match('#^/player/([A-Za-z0-9_-]{1,64})$#', $requestPath, $playerMatch) === 1) {
    $_GET['username'] = rawurldecode($playerMatch[1]);
    require __DIR__ . '/player.php';
    exit;
}

if ($requestPath === '/player') {
    require __DIR__ . '/player.php';
    exit;
}

if ($requestPath === '/leaderboards' || $requestPath === '/players') {
    require __DIR__ . '/leaderboards.php';
    exit;
}

require_once __DIR__ . '/includes/layout.php';

$site = mineacle_config()['site'] ?? [];
$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';
$assetVersion = mineacle_page_asset_version();
$homeUrl = '/';
$leaderboardsUrl = '/leaderboards';

$railLinks = [
    ['key' => 'home', 'label' => 'Home', 'url' => $homeUrl],
    ['key' => 'vote', 'label' => 'Vote', 'url' => mineacle_page_public_link($site['vote_url'] ?? '#')],
    ['key' => 'stats', 'label' => 'Leaderboards', 'url' => $leaderboardsUrl],
    ['key' => 'bans', 'label' => 'Bans', 'url' => mineacle_page_public_link($site['bans_url'] ?? '#')],
    ['key' => 'store', 'label' => 'Store', 'url' => mineacle_page_public_link($site['store_url'] ?? '#')],
];

$discordUrl = mineacle_page_public_link($site['discord_url'] ?? '#');
$xUrl = mineacle_page_public_link($site['x_url'] ?? '#');

mineacle_page_head('Home', [
    'stylesheets' => ['/assets/home-screen.css'],
    'body_class' => 'home-viewport-page',
]);
?>
<main class="home-viewport" id="main-content">
    <div class="home-frame">
        <aside class="home-rail" aria-label="Primary navigation">
            <a class="home-rail-brand" href="<?php echo h($homeUrl); ?>" aria-label="Mineacle home" aria-current="page">
                <img src="/assets/brand/nav-logo-web.png?v=<?php echo h($assetVersion); ?>" alt="" width="80" height="80" draggable="false">
            </a>

            <nav class="home-rail-navigation" aria-label="Server links">
                <?php foreach ($railLinks as $link): ?>
                    <?php
                    $key = (string) $link['key'];
                    $isHome = $key === 'home';
                    $className = 'home-rail-link' . ($isHome ? ' is-active' : '') . ($key === 'store' ? ' home-rail-store' : '');
                    ?>
                    <a class="<?php echo h($className); ?>" href="<?php echo h((string) $link['url']); ?>" aria-label="<?php echo h((string) $link['label']); ?>"<?php echo $isHome ? ' aria-current="page"' : ''; ?>>
                        <?php echo mineacle_page_icon($key); ?>
                    </a>
                <?php endforeach; ?>
            </nav>

            <div class="home-rail-socials" aria-label="Social links">
                <a class="home-rail-link home-social-link home-x-link" href="<?php echo h($xUrl); ?>" aria-label="Mineacle on X">
                    <?php echo mineacle_page_icon('x'); ?>
                </a>
                <a class="home-rail-link home-social-link home-discord-link" href="<?php echo h($discordUrl); ?>" aria-label="Mineacle Discord">
                    <?php echo mineacle_page_icon('discord'); ?>
                </a>
            </div>
        </aside>

        <header class="home-toolbar" aria-label="Player search and server actions">
            <div class="home-player-search" data-home-player-search>
                <form class="home-search-form" action="/player" method="get" role="search" data-home-player-search-form>
                    <img class="home-search-person" src="/assets/icons/player-search.png?v=<?php echo h($assetVersion); ?>" alt="" width="24" height="24" aria-hidden="true" draggable="false">
                    <label class="sr-only" for="homePlayerSearch">Search for a player</label>
                    <input
                        id="homePlayerSearch"
                        name="name"
                        type="search"
                        placeholder="Search 18,762 unique player IDs..."
                        autocomplete="off"
                        spellcheck="false"
                        aria-autocomplete="list"
                        aria-controls="homePlayerSearchResults"
                        aria-expanded="false"
                        data-home-player-search-input
                    >
                    <button class="home-search-submit" type="submit" aria-label="Open player profile">
                        <span aria-hidden="true"></span>
                    </button>
                </form>
                <div class="home-search-results" id="homePlayerSearchResults" role="listbox" aria-label="Player recommendations" data-home-player-search-results hidden></div>
            </div>

            <nav class="home-toolbar-actions" aria-label="Mineacle actions">
                <a class="home-toolbar-square home-x-link" href="<?php echo h($xUrl); ?>" aria-label="Mineacle on X">
                    <?php echo mineacle_page_icon('x'); ?>
                </a>
                <a class="home-toolbar-square home-discord-link" href="<?php echo h($discordUrl); ?>" aria-label="Mineacle Discord">
                    <?php echo mineacle_page_icon('discord'); ?>
                </a>
                <span class="home-online-count is-loading" data-home-server-status data-server-ip="<?php echo h($minecraftIp); ?>" aria-live="polite">
                    <span data-home-server-count>Checking server...</span>
                </span>
                <button
                    class="home-play-button"
                    type="button"
                    data-home-copy-ip
                    data-server-ip="<?php echo h($minecraftIp); ?>"
                    data-default-label="Play Now"
                    data-copied-label="IP Copied"
                >
                    <span data-home-copy-label>Play Now</span>
                </button>
            </nav>
        </header>

        <section class="home-hero" aria-label="Mineacle">
            <img
                class="home-hero-background"
                src="/assets/brand/home-hero-bg.webp?v=<?php echo h($assetVersion); ?>"
                alt=""
                aria-hidden="true"
                draggable="false"
                decoding="async"
            >
            <div class="home-hero-shade" aria-hidden="true"></div>
            <img
                class="home-main-logo"
                src="/assets/brand/home-main-logo.webp?v=<?php echo h($assetVersion); ?>"
                alt="Mineacle"
                width="1254"
                height="1254"
                draggable="false"
                fetchpriority="high"
                decoding="async"
            >
        </section>
    </div>

    <p class="home-live-status sr-only" aria-live="polite" data-home-live-status></p>
</main>
<?php
mineacle_page_end([
    'scripts' => ['/assets/home-screen.js'],
]);
?>
