<?php

declare(strict_types=1);

$requestPath = parse_url(
    (string) ($_SERVER['REQUEST_URI'] ?? '/'),
    PHP_URL_PATH
);

if (in_array($requestPath, ['/home', '/home.php', '/home/index.php'], true)) {
    header('Location: /', true, 302);
    exit;
}

require_once __DIR__ . '/../shared/php/layout.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];

$minecraftIp = trim(
    (string) ($site['minecraft_ip'] ?? 'mineacle.net')
) ?: 'mineacle.net';

$publicUrl = static function (mixed $value, string $fallback): string {
    $url = mineacle_page_public_link($value);
    return $url === '#' ? $fallback : $url;
};

$storeUrl = $publicUrl(
    $site['store_url'] ?? '',
    'https://store.mineacle.net/'
);

$discordUrl = $publicUrl(
    $site['discord_url'] ?? '',
    'https://discord.gg/qmpJ4xMguT'
);

$xUrl = $publicUrl(
    $site['x_url'] ?? '',
    'https://x.com/mineaclenetwork'
);

$youtubeUrl = $publicUrl(
    $site['youtube_url'] ?? '',
    'https://www.youtube.com/@mineaclenetwork'
);

$heroVideoUrl =
    'https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev/hero-bg.mp4';

$assetFiles = [
    __DIR__ . '/assets/css/home.css',
    __DIR__ . '/assets/js/home.js',
    __DIR__ . '/assets/images/mineacle-logo.png',
    __DIR__ . '/assets/images/hero.webp',
    __DIR__ . '/assets/images/social-discord.png',
    __DIR__ . '/assets/images/social-x.png',
    __DIR__ . '/assets/images/social-youtube.png',
];

$assetVersion = 1;

foreach ($assetFiles as $assetFile) {
    if (is_file($assetFile)) {
        $assetVersion = max(
            $assetVersion,
            (int) filemtime($assetFile)
        );
    }
}

$rev = rawurlencode((string) $assetVersion);

mineacle_page_head('Home', [
    'meta_title' => 'Home | Mineacle',
    'meta_description' =>
        'Join Mineacle, view leaderboards, vote, and explore the network.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => [
        '/home/assets/css/home.css?rev=' . $rev,
    ],
    'body_class' => 'mineacle-home',
    'external_fonts' => false,
    'theme_color' => '#0d0f10',
]);
?>
<main class="home-page" aria-label="Mineacle home">
    <div class="home-layout">

        <a class="home-logo" href="/" aria-label="Mineacle home">
            <img
                src="/home/assets/images/mineacle-logo.png?rev=<?php echo h($rev); ?>"
                alt="Mineacle"
                width="1840"
                height="766"
                draggable="false"
            >
        </a>

        <header class="home-topbar" aria-label="Mineacle utility bar">
            <div class="home-topbar__spacer" aria-hidden="true"></div>
            <a class="home-topbar__login" href="/login">Login</a>
        </header>

        <aside class="home-rail">
            <div class="home-rail__social-column">
                <nav class="home-socials" aria-label="Mineacle social links">
                    <a
                        class="home-social home-social--x"
                        href="<?php echo h($xUrl); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Follow Mineacle on X"
                    >
                        <span aria-hidden="true"></span>
                    </a>

                    <a
                        class="home-social home-social--discord"
                        href="<?php echo h($discordUrl); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Join Mineacle on Discord"
                    >
                        <span aria-hidden="true"></span>
                    </a>

                    <a
                        class="home-social home-social--youtube"
                        href="<?php echo h($youtubeUrl); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Watch Mineacle on YouTube"
                    >
                        <span aria-hidden="true"></span>
                    </a>
                </nav>

                <div class="home-rail__utility">
                    <a
                        class="home-utility-button"
                        href="/login"
                        aria-label="Login"
                        title="Login"
                    >
                        <span aria-hidden="true">↗</span>
                    </a>

                    <a
                        class="home-utility-button"
                        href="/contact"
                        aria-label="Contact Mineacle"
                        title="Contact"
                    >
                        <span aria-hidden="true">?</span>
                    </a>
                </div>
            </div>

            <div class="home-rail__menu-column">
                <div class="home-menu-heading">Menu</div>

                <nav class="home-menu" aria-label="Main navigation">
                    <a class="home-menu__link is-current" href="/" aria-current="page">
                        <span class="home-menu__icon" aria-hidden="true">⌂</span>
                        <span>Home</span>
                    </a>

                    <a class="home-menu__link" href="/leaderboards">
                        <span class="home-menu__icon" aria-hidden="true">▥</span>
                        <span>Leaderboard</span>
                    </a>

                    <a class="home-menu__link" href="/vote">
                        <span class="home-menu__icon" aria-hidden="true">★</span>
                        <span>Earn a Reward</span>
                    </a>

                    <a
                        class="home-menu__link"
                        href="https://bans.mineacle.net/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span class="home-menu__icon" aria-hidden="true">◆</span>
                        <span>Public Bans</span>
                    </a>

                    <a
                        class="home-menu__link"
                        href="<?php echo h($storeUrl); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span class="home-menu__icon" aria-hidden="true">▰</span>
                        <span>Visit our Store</span>
                    </a>
                </nav>

                <div class="home-menu-divider"></div>

                <div class="home-menu-heading home-menu-heading--quick">
                    Quick Links
                </div>

                <nav class="home-menu home-menu--quick" aria-label="Quick links">
                    <a class="home-menu__link" href="/leaderboards?type=players">
                        <span class="home-menu__icon" aria-hidden="true">▥</span>
                        <span>Top 10 (Global)</span>
                    </a>

                    <a class="home-menu__link" href="/leaderboards?type=teams">
                        <span class="home-menu__icon" aria-hidden="true">★</span>
                        <span>Top Teams</span>
                    </a>

                    <a class="home-menu__link" href="/leaderboards?metric=balance">
                        <span class="home-menu__icon" aria-hidden="true">★</span>
                        <span>Top Balance</span>
                    </a>

                    <a class="home-menu__link" href="/leaderboards?metric=kd">
                        <span class="home-menu__icon" aria-hidden="true">★</span>
                        <span>Top K/D</span>
                    </a>
                </nav>

                <div class="home-play-area">
                    <div
                        class="home-current-playing is-loading"
                        data-home-status
                        aria-live="polite"
                    >
                        <span data-home-status-label>Checking server</span>
                    </div>

                    <button
                        class="home-play-button"
                        type="button"
                        data-copy-server
                        data-server-address="<?php echo h($minecraftIp); ?>"
                    >
                        <span data-play-label>Play</span>
                    </button>
                </div>
            </div>
        </aside>

        <section
            class="home-promo-card"
            aria-labelledby="home-promo-title"
        >
            <div class="home-promo-card__media" aria-hidden="true">
                <video
                    class="home-promo-card__video"
                    poster="/home/assets/images/hero.webp?rev=<?php echo h($rev); ?>"
                    autoplay
                    muted
                    loop
                    playsinline
                    preload="metadata"
                    disablepictureinpicture
                    disableremoteplayback
                    controlslist="nodownload nofullscreen noremoteplayback"
                    tabindex="-1"
                >
                    <source
                        src="<?php echo h($heroVideoUrl); ?>"
                        type="video/mp4"
                    >
                </video>
            </div>

            <div class="home-promo-card__overlay" aria-hidden="true"></div>

            <div class="home-promo-card__content">
                <h1 id="home-promo-title">Mineacle+ Membership</h1>
                <p>
                    Premium Mineacle perks, cosmetics, convenience features,
                    and member benefits without changing the core survival experience.
                </p>

                <a
                    class="home-card-button"
                    href="<?php echo h($storeUrl); ?>"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <span aria-hidden="true">▶</span>
                    Learn More
                </a>
            </div>
        </section>

        <div class="home-feature-stack">
            <article
                class="home-feature-card"
                aria-labelledby="home-duels-title"
            >
                <div class="home-feature-card__content">
                    <h2 id="home-duels-title">Mineacle Duels</h2>
                    <p>
                        Fight other players, compete for wins, and climb
                        Mineacle's combat rankings.
                    </p>

                    <a
                        class="home-card-button"
                        href="/leaderboards"
                    >
                        <span aria-hidden="true">▶</span>
                        Learn More
                    </a>
                </div>
            </article>

            <article
                class="home-feature-card"
                aria-labelledby="home-membership-title"
            >
                <div class="home-feature-card__content">
                    <h2 id="home-membership-title">Mineacle+ Membership</h2>
                    <p>
                        Additional perks and gameplay enhancements for players
                        who want more from Mineacle.
                    </p>

                    <a
                        class="home-card-button"
                        href="<?php echo h($storeUrl); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <span aria-hidden="true">▶</span>
                        Learn More
                    </a>
                </div>
            </article>
        </div>

    </div>
</main>

<?php
mineacle_page_end([
    'scripts' => [
        '/home/assets/js/home.js?rev=' . $rev,
    ],
]);
?>
