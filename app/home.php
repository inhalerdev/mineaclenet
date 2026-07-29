<?php

declare(strict_types=1);

$directHomePath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);

if ($directHomePath === '/home' || $directHomePath === '/home.php') {
    header('Location: /', true, 302);
    exit;
}

require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/stats-lib.php';

$config = mineacle_config();
$site = $config['site'] ?? [];
$homeConfig = $config['home'] ?? [];
$assetVersion = rawurlencode(mineacle_page_asset_version());
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/home.css') ?: mineacle_page_asset_version());
$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';
$uniquePlayerCount = 0;

try {
    $uniquePlayerCount = mineacle_stats_unique_players_count();
} catch (Throwable) {
    // Keep the homepage and search available when the stats database is offline.
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

$storeUrl = $siteUrl($site['store_url'] ?? '', 'https://store.mineacle.net/');
$discordUrl = $siteUrl($site['discord_url'] ?? '', 'https://discord.gg/qmpJ4xMguT');
$xUrl = $siteUrl($site['x_url'] ?? '', 'https://x.com/mineaclenetwork');
$heroVideoUrl = mineacle_page_public_link($homeConfig['hero_video_url'] ?? '');

if ($heroVideoUrl === '#') {
    $heroVideoUrl = 'https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev/Video%20Project%202.mp4';
}

$navLinks = [
    ['key' => 'home', 'label' => 'Home', 'url' => '/', 'external' => false],
    ['key' => 'vote', 'label' => 'Vote', 'url' => '/vote', 'external' => false],
    ['key' => 'stats', 'label' => 'Leaderboards', 'url' => '/leaderboards', 'external' => false],
    ['key' => 'bans', 'label' => 'Bans', 'url' => '/bans', 'external' => false],
    ['key' => 'store', 'label' => 'Store', 'url' => $storeUrl, 'external' => true],
];

$socialLinks = [
    [
        'key' => 'x',
        'label' => 'Mineacle on X',
        'title' => 'X',
        'url' => $xUrl,
    ],
    [
        'key' => 'discord',
        'label' => 'Mineacle Discord',
        'title' => 'Discord',
        'url' => $discordUrl,
    ],
];

mineacle_page_head('Home', [
    'meta_title' => 'Home | Mineacle',
    'meta_description' => 'Join Mineacle, search player profiles, view server rankings, vote, and connect with the community.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => ['/assets/home.css?rev=' . rawurlencode($homeStylesheetVersion)],
    'body_class' => 'home-page',
    'external_fonts' => false,
    'theme_color' => '#00001f',
]);
?>
<main class="canvas" aria-labelledby="home-page-title">
    <h1 id="home-page-title" class="visually-hidden">Mineacle</h1>

    <div class="interface-stage">
        <section class="interface" aria-label="Mineacle home">
            <aside class="sidebar" aria-label="Sidebar navigation">
                <a class="brand-link" href="/" aria-label="Mineacle home" aria-current="page">
                    <img
                        class="brand-mark"
                        src="/assets/home/mineacle-mark.png?v=<?php echo h($assetVersion); ?>"
                        alt=""
                        width="64"
                        height="64"
                        draggable="false"
                    >
                </a>

                <nav class="nav-stack nav-stack--upper" aria-label="Main">
                    <?php foreach ($navLinks as $link): ?>
                        <a
                            class="square-button"
                            href="<?php echo h((string) $link['url']); ?>"
                            aria-label="<?php echo h((string) $link['label']); ?>"
                            title="<?php echo h((string) $link['label']); ?>"
                            <?php echo $link['key'] === 'home' ? 'aria-current="page"' : ''; ?>
                            <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                        >
                            <img
                                class="nav-icon"
                                src="/assets/home/nav-<?php echo h((string) $link['key']); ?>.png?v=<?php echo h($assetVersion); ?>"
                                alt=""
                                aria-hidden="true"
                                draggable="false"
                            >
                        </a>
                    <?php endforeach; ?>
                </nav>

                <nav class="nav-stack nav-stack--lower" aria-label="Social links">
                    <?php foreach ($socialLinks as $link): ?>
                        <a
                            class="social-link social-link--rail social-link--<?php echo h((string) $link['key']); ?>"
                            href="<?php echo h((string) $link['url']); ?>"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="<?php echo h((string) $link['label']); ?>"
                            title="<?php echo h((string) $link['title']); ?>"
                        >
                            <span
                                class="social-logo social-logo--<?php echo h((string) $link['key']); ?>"
                                aria-hidden="true"
                            ></span>
                        </a>
                    <?php endforeach; ?>
                </nav>
            </aside>

            <div class="content">
                <header class="topbar">
                    <div class="search-shell">
                        <form class="search-control" id="player-search" role="search" action="/player" method="get">
                            <div class="search-field">
                                <img
                                    class="search-user-icon"
                                    src="/assets/home/search-user.png?v=<?php echo h($assetVersion); ?>"
                                    alt=""
                                    aria-hidden="true"
                                    draggable="false"
                                >
                                <label class="visually-hidden" for="site-search"><?php echo h($searchLabel); ?></label>
                                <input
                                    id="site-search"
                                    name="username"
                                    type="search"
                                    placeholder="<?php echo h($searchPlaceholder); ?>"
                                    maxlength="64"
                                    autocomplete="off"
                                    autocapitalize="none"
                                    spellcheck="false"
                                    role="combobox"
                                    aria-autocomplete="list"
                                    aria-expanded="false"
                                    aria-controls="home-player-suggestions"
                                >
                            </div>
                            <button class="search-submit" type="submit" aria-label="Search player" title="Search">
                                <img
                                    class="search-arrow-icon"
                                    src="/assets/home/search-submit.png?v=<?php echo h($assetVersion); ?>"
                                    alt=""
                                    aria-hidden="true"
                                    draggable="false"
                                >
                            </button>
                        </form>
                        <div
                            class="search-suggestions"
                            id="home-player-suggestions"
                            role="listbox"
                            aria-label="Player suggestions"
                            hidden
                        ></div>
                    </div>

                    <nav class="top-actions" aria-label="Header actions">
                        <div
                            class="header-status is-loading"
                            id="home-server-status"
                            data-server-ip="<?php echo h($minecraftIp); ?>"
                            role="status"
                            aria-live="polite"
                            aria-label="Checking Mineacle server status"
                            title="Checking server status"
                        >
                            <span class="header-status__dot" aria-hidden="true"></span>
                            <span class="header-status__copy">
                                <span class="header-status__count" id="home-server-status-count">--</span>
                                <span class="header-status__label" id="home-server-status-label">Currently Playing</span>
                            </span>
                        </div>

                        <button
                            class="top-action top-action--play"
                            id="play-button"
                            type="button"
                            data-copy-value="<?php echo h($minecraftIp); ?>"
                            aria-label="Copy Mineacle server address"
                            title="Copy <?php echo h($minecraftIp); ?>"
                        >
                            <span class="play-label" aria-live="polite">PLAY</span>
                        </button>
                    </nav>
                </header>

                <figure class="hero-media">
                    <video
                        id="hero-video"
                        autoplay
                        muted
                        loop
                        playsinline
                        preload="metadata"
                        controlslist="nodownload nofullscreen noremoteplayback"
                        disablepictureinpicture
                        disableremoteplayback
                        poster="/assets/home/hero-poster.webp?v=<?php echo h($assetVersion); ?>"
                        aria-describedby="hero-description"
                    >
                        <source src="<?php echo h($heroVideoUrl); ?>" type="video/mp4">
                    </video>
                    <figcaption id="hero-description" class="visually-hidden">
                        Mineacle Minecraft server entrance.
                    </figcaption>
                </figure>
            </div>
        </section>
    </div>
</main>
<?php mineacle_page_end(['scripts' => ['/assets/home.js']]); ?>
