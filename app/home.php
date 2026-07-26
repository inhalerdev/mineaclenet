<?php

declare(strict_types=1);

$directHomePath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);

if ($directHomePath === '/home' || $directHomePath === '/home.php') {
    header('Location: /', true, 302);
    exit;
}

require_once __DIR__ . '/includes/layout.php';

$site = mineacle_config()['site'] ?? [];
$assetVersion = rawurlencode(mineacle_page_asset_version());
$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';

$siteUrl = static function (mixed $value, string $fallback): string {
    $resolved = mineacle_page_public_link($value);

    return $resolved === '#' ? $fallback : $resolved;
};

$voteUrl = $siteUrl($site['vote_url'] ?? '', 'https://mineacle.net/vote');
$bansUrl = $siteUrl($site['bans_url'] ?? '', 'https://bans.mineacle.net/');
$storeUrl = $siteUrl($site['store_url'] ?? '', 'https://store.mineacle.net/');
$discordUrl = $siteUrl($site['discord_url'] ?? '', 'https://discord.gg/qmpJ4xMguT');
$xUrl = $siteUrl($site['x_url'] ?? '', 'https://x.com/mineaclenetwork');

$navLinks = [
    ['key' => 'home', 'label' => 'Home', 'url' => '/', 'external' => false],
    ['key' => 'vote', 'label' => 'Vote', 'url' => $voteUrl, 'external' => true],
    ['key' => 'stats', 'label' => 'Leaderboards', 'url' => '/leaderboards', 'external' => false],
    ['key' => 'bans', 'label' => 'Bans', 'url' => $bansUrl, 'external' => true],
    ['key' => 'store', 'label' => 'Store', 'url' => $storeUrl, 'external' => true],
];

$socialLinks = [
    [
        'key' => 'discord',
        'label' => 'Mineacle Discord',
        'title' => 'Discord',
        'url' => $discordUrl,
        'icon' => '/assets/home/social-discord.png',
    ],
    [
        'key' => 'x',
        'label' => 'Mineacle on X',
        'title' => 'X',
        'url' => $xUrl,
        'icon' => '/assets/home/social-x.png',
    ],
];

mineacle_page_head('Home', [
    'meta_title' => 'Mineacle | Minecraft Survival Server',
    'meta_description' => 'Join Mineacle, search player profiles, view server rankings, vote, and connect with the community.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => ['/assets/home.css'],
    'body_class' => 'home-page',
    'external_fonts' => false,
    'theme_color' => '#00001f',
]);
?>
<svg class="svg-symbols" aria-hidden="true">
    <symbol id="icon-user" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.5"></circle>
        <path d="M5.5 20c.5-4 2.7-6 6.5-6s6 2 6.5 6"></path>
    </symbol>
    <symbol id="icon-arrow" viewBox="0 0 24 24">
        <path d="M5 12h14"></path>
        <path d="m13 6 6 6-6 6"></path>
    </symbol>
</svg>

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
                            class="square-button"
                            href="<?php echo h((string) $link['url']); ?>"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="<?php echo h((string) $link['label']); ?>"
                            title="<?php echo h((string) $link['title']); ?>"
                        >
                            <img
                                class="social-icon<?php echo $link['key'] === 'discord' ? ' social-icon--discord' : ''; ?>"
                                src="<?php echo h((string) $link['icon']); ?>?v=<?php echo h($assetVersion); ?>"
                                alt=""
                                aria-hidden="true"
                                draggable="false"
                            >
                        </a>
                    <?php endforeach; ?>
                </nav>
            </aside>

            <div class="content">
                <header class="topbar">
                    <form class="search-control" id="player-search" role="search" action="/player" method="get">
                        <div class="search-field">
                            <svg class="search-user-icon" aria-hidden="true">
                                <use href="#icon-user"></use>
                            </svg>
                            <label class="visually-hidden" for="site-search">Search for a player</label>
                            <input
                                id="site-search"
                                name="username"
                                type="search"
                                placeholder="SEARCH PLAYER"
                                maxlength="64"
                                autocomplete="off"
                                autocapitalize="none"
                                spellcheck="false"
                            >
                        </div>
                        <button class="search-submit" type="submit" aria-label="Search player" title="Search">
                            <svg class="search-arrow-icon" aria-hidden="true">
                                <use href="#icon-arrow"></use>
                            </svg>
                        </button>
                    </form>

                    <nav class="top-actions" aria-label="Header actions">
                        <?php foreach ($socialLinks as $link): ?>
                            <a
                                class="top-action top-action--social"
                                href="<?php echo h((string) $link['url']); ?>"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="<?php echo h((string) $link['label']); ?>"
                                title="<?php echo h((string) $link['title']); ?>"
                            >
                                <img
                                    class="social-icon<?php echo $link['key'] === 'discord' ? ' social-icon--discord' : ''; ?>"
                                    src="<?php echo h((string) $link['icon']); ?>?v=<?php echo h($assetVersion); ?>"
                                    alt=""
                                    aria-hidden="true"
                                    draggable="false"
                                >
                            </a>
                        <?php endforeach; ?>

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
                        poster="/assets/home/hero-poster.webp?v=<?php echo h($assetVersion); ?>"
                        aria-describedby="hero-description"
                    >
                        <source src="/assets/home/hero.mp4?v=<?php echo h($assetVersion); ?>" type="video/mp4">
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
