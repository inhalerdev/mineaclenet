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
require_once __DIR__ . '/../shared/php/home-content.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null)
    ? $config['site']
    : [];

$content = mineacle_home_content();
$hero = $content['hero'];
$duels = $content['duels'];
$plus = $content['plus'];

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
    __DIR__ . '/../shared/php/home-content.php',
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
<main class="home-page" aria-label="Mineacle home">
    <div class="home-layout">
        <?php
        mineacle_navigation_rail(
            $site,
            ['current_key' => 'home']
        );
        ?>

        <?php mineacle_site_header(); ?>

        <section
            class="home-tile home-tile--hero"
            aria-labelledby="home-hero-title"
        >
            <div
                class="home-tile__media"
                aria-hidden="true"
            >
                <video
                    class="home-tile__video"
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

            <div class="home-tile__shade" aria-hidden="true"></div>

            <?php if (!empty($hero['is_new'])): ?>
                <span class="home-tile__new">New</span>
            <?php endif; ?>

            <div class="home-tile__caption">
<h1 id="home-hero-title">
                    <?php echo h((string) $hero['title']); ?>
                </h1>

                <p>
                    <?php echo h((string) $hero['description']); ?>
                </p>

                <div class="home-tile__actions">
                    <a
                        class="home-button home-button--primary"
                        href="<?php echo h((string) $hero['primary_url']); ?>"
                    >
                        <?php echo h((string) $hero['primary_label']); ?>
                    </a>

                    <a
                        class="home-button home-button--quiet"
                        href="<?php echo h((string) $hero['secondary_url']); ?>"
                    >
                        <?php echo h((string) $hero['secondary_label']); ?>
                    </a>
                </div>
            </div>
        </section>

        <div class="home-feature-stack">
            <section
                class="home-tile home-tile--feature home-tile--duels"
                aria-labelledby="home-duels-title"
            >
                <div
                    class="home-tile__media"
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

                <div class="home-tile__shade" aria-hidden="true"></div>

                <?php if (!empty($duels['is_new'])): ?>
                    <span class="home-tile__new">New</span>
                <?php endif; ?>

                <div class="home-tile__caption">
<h2 id="home-duels-title">
                        <?php echo h((string) $duels['title']); ?>
                    </h2>

                    <p>
                        <?php echo h((string) $duels['description']); ?>
                    </p>

                    <div class="home-tile__bottom-row">
                        <span class="home-tile__meta">
                            <?php echo h((string) $duels['meta']); ?>
                        </span>

                        <a
                            class="home-button home-button--quiet"
                            href="<?php echo h((string) $duels['button_url']); ?>"
                        >
                            <?php echo h((string) $duels['button_label']); ?>
                        </a>
                    </div>
                </div>
            </section>

            <section
                class="home-tile home-tile--feature home-tile--plus"
                aria-labelledby="home-plus-title"
            >
                <div
                    class="home-tile__media"
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

                <div class="home-tile__shade" aria-hidden="true"></div>

                <?php if (!empty($plus['is_new'])): ?>
                    <span class="home-tile__new">New</span>
                <?php endif; ?>

                <div class="home-tile__caption">
<h2 id="home-plus-title">
                        <?php echo h((string) $plus['title']); ?>
                    </h2>

                    <p>
                        <?php echo h((string) $plus['description']); ?>
                    </p>

                    <div
                        class="home-plus-perks"
                        aria-label="Mineacle Plus perks"
                    >
                        <?php foreach ((array) $plus['perks'] as $perk): ?>
                            <span><?php echo h((string) $perk); ?></span>
                        <?php endforeach; ?>
                    </div>

                    <div class="home-tile__bottom-row">
                        <span class="home-tile__meta">
                            Mineacle+ Membership
                        </span>

                        <a
                            class="home-button home-button--primary"
                            href="<?php echo h((string) $plus['button_url']); ?>"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <?php echo h((string) $plus['button_label']); ?>
                        </a>
                    </div>
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
