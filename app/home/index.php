<?php

declare(strict_types=1);

$requestPath = parse_url(
    (string) ($_SERVER['REQUEST_URI'] ?? '/'),
    PHP_URL_PATH
);

if (
    in_array(
        $requestPath,
        ['/home', '/home.php', '/home/index.php'],
        true
    )
) {
    header('Location: /', true, 302);
    exit;
}

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/auth.php';
require_once __DIR__ . '/../shared/php/navigation-rail.php';
require_once __DIR__ . '/../shared/php/site-header.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null)
    ? $config['site']
    : [];

$publicUrl = static function (mixed $value, string $fallback): string {
    $resolved = mineacle_page_public_link($value);

    return $resolved === '#'
        ? $fallback
        : $resolved;
};

$storeUrl = $publicUrl(
    $site['store_url'] ?? '',
    'https://store.mineacle.net/'
);

$assetFiles = [
    __DIR__ . '/assets/css/home.css',
    __DIR__ . '/assets/js/home.js',
    __DIR__ . '/../shared/assets/css/navigation-rail.css',
    __DIR__ . '/../shared/assets/js/navigation-rail.js',
    __DIR__ . '/../shared/assets/css/site-header.css',
    __DIR__ . '/../shared/assets/js/site-header.js',
    __DIR__ . '/../shared/assets/images/search/search.png',
    __DIR__ . '/assets/images/duels-slot.png',
    __DIR__ . '/assets/images/mineacle-plus-slot.png',
];

$assetVersion = 1;

foreach ($assetFiles as $assetFile) {
    if (is_file($assetFile)) {
        $assetVersion = max(
            $assetVersion,
            (int) (filemtime($assetFile) ?: 1)
        );
    }
}

$rev = rawurlencode((string) $assetVersion);

$heroVideoUrl =
    'https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev/hero-bg.mp4';

mineacle_page_head('Home', [
    'meta_title' => 'Home | Mineacle',
    'meta_description' =>
        'Play Mineacle, find players, view rankings, vote, and explore the network.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => [
        '/shared/assets/css/navigation-rail.css?rev=' . $rev,
        '/shared/assets/css/site-header.css?rev=' . $rev,
        '/home/assets/css/home.css?rev=' . $rev,
    ],
    'body_class' => 'mineacle-home',
    'external_fonts' => false,
    'theme_color' => '#0d0f10',
]);
?>
<main
    class="home-page"
    aria-label="Mineacle home"
>
    <div class="home-layout">
        <?php
        mineacle_navigation_rail(
            $site,
            ['current_key' => 'home']
        );
        ?>

        <?php mineacle_site_header(); ?>

        <section
            class="home-promo-card"
            aria-label="Mineacle featured world"
        >
            <div
                class="home-promo-card__media"
                aria-hidden="true"
            >
                <video
                    class="home-promo-card__video"
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

            <div
                class="home-promo-card__overlay"
                aria-hidden="true"
            ></div>

            <div class="home-promo-card__content">
                <span class="home-promo-card__eyebrow">
                    Mineacle SMP
                </span>

                <div class="home-promo-card__copy">
                    <h1>
                        A survival world built around players.
                    </h1>

                    <p>
                        Trade, compete, build, and make your mark
                        in a persistent player-driven economy.
                    </p>
                </div>

                <div class="home-promo-card__actions">
                    <a
                        class="home-ui-button home-ui-button--primary"
                        href="/vote"
                    >
                        Earn Rewards
                    </a>

                    <a
                        class="home-ui-button home-ui-button--secondary"
                        href="/leaderboards"
                    >
                        View Leaderboards
                    </a>
                </div>
            </div>
        </section>

        <div class="home-feature-stack">
            <section
                class="home-feature-card home-feature-card--duels"
                aria-labelledby="home-duels-title"
            >
                <div
                    class="home-feature-card__backdrop"
                    aria-hidden="true"
                >
                    <img
                        src="/home/assets/images/duels-slot.png?rev=<?php echo h($rev); ?>"
                        alt=""
                        width="1920"
                        height="1080"
                        decoding="async"
                        draggable="false"
                    >
                </div>

                <div class="home-feature-card__content">
                    <div class="home-feature-card__heading">
                        <span class="home-feature-card__eyebrow">
                            Mineacle Duels
                        </span>

                        <h2 id="home-duels-title">
                            Fight. Climb. Repeat.
                        </h2>

                        <p>
                            Fast competitive PvP, clean matchups,
                            and server-wide combat rankings.
                        </p>
                    </div>

                    <div class="home-feature-card__footer">
                        <div class="home-feature-card__stat">
                            <small>Combat Leaderboard</small>
                            <strong>See Top Kills</strong>
                        </div>

                        <a
                            class="home-ui-button home-ui-button--secondary"
                            href="/leaderboards?metric=kills"
                        >
                            View Top Kills
                        </a>
                    </div>
                </div>
            </section>

            <section
                class="home-feature-card home-feature-card--plus"
                aria-labelledby="home-plus-title"
            >
                <div
                    class="home-feature-card__backdrop"
                    aria-hidden="true"
                >
                    <img
                        src="/home/assets/images/mineacle-plus-slot.png?rev=<?php echo h($rev); ?>"
                        alt=""
                        width="1708"
                        height="960"
                        decoding="async"
                        draggable="false"
                    >
                </div>

                <div class="home-feature-card__content">
                    <div class="home-feature-card__heading">
                        <span class="home-feature-card__eyebrow">
                            Mineacle+
                        </span>

                        <h2 id="home-plus-title">
                            More freedom to play your way.
                        </h2>

                        <p>
                            Premium convenience without changing
                            the core survival experience.
                        </p>
                    </div>

                    <div
                        class="home-plus-perks"
                        aria-label="Mineacle Plus perks"
                    >
                        <span>5 Homes</span>
                        <span>Faster Teleports</span>
                        <span>Priority RTP</span>
                        <span>Spawn Flight</span>
                        <span>25 Orders</span>
                        <span>45 Auction Slots</span>
                        <span>Nicknames</span>
                    </div>

                    <a
                        class="home-ui-button home-ui-button--primary home-feature-card__store"
                        href="<?php echo h($storeUrl); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Visit Store
                    </a>
                </div>
            </section>
        </div>
    </div>
</main>

<?php
mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation-rail.js?rev=' . $rev,
        '/shared/assets/js/site-header.js?rev=' . $rev,
        '/home/assets/js/home.js?rev=' . $rev,
    ],
]);
?>
