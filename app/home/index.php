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
require_once __DIR__ . '/../shared/php/stats-lib.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null)
    ? $config['site']
    : [];

$content = mineacle_home_content();
$hero = $content['hero'];

$features = [
    'duels' => $content['duels'],
    'plus' => $content['plus'],
];

$features = array_filter(
    $features,
    static fn (array $slot): bool =>
        mineacle_home_content_is_visible($slot)
);

uasort(
    $features,
    static fn (array $left, array $right): int =>
        ((int) ($left['order'] ?? 0))
        <=>
        ((int) ($right['order'] ?? 0))
);

$topKillPlayer = null;

try {
    $topKillRows = mineacle_stats_players(
        1,
        0,
        'kills',
        ''
    );

    if (
        isset($topKillRows[0])
        && is_array($topKillRows[0])
    ) {
        $row = $topKillRows[0];
        $username = trim(mineacle_stats_username($row));
        $kills = mineacle_stats_int($row['kills'] ?? 0);

        if ($username !== '' && $kills > 0) {
            $topKillPlayer = [
                'username' => $username,
                'kills' => $kills,
                'url' =>
                    '/player/'
                    . rawurlencode($username),
            ];
        }
    }
} catch (Throwable) {
    $topKillPlayer = null;
}

$assetFiles = [
    __DIR__ . '/assets/css/home.css',
    __DIR__ . '/assets/js/home.js',
    __DIR__ . '/../shared/assets/css/navigation-rail.css',
    __DIR__ . '/../shared/assets/js/navigation-rail.js',
    __DIR__ . '/../shared/assets/css/site-header.css',
    __DIR__ . '/../shared/assets/js/site-header.js',
    __DIR__ . '/../shared/assets/images/search/search.png',
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

$assetUrl = static function (
    string $url,
    string $rev
): string {
    if (
        str_starts_with($url, '/')
        && !str_contains($url, '?')
    ) {
        return $url . '?rev=' . $rev;
    }

    return $url;
};

$renderMedia = static function (
    array $slot,
    string $rev
) use ($assetUrl): void {
    $mediaType = (string) (
        $slot['media_type'] ?? 'image'
    );

    $mediaUrl = $assetUrl(
        (string) ($slot['media_url'] ?? ''),
        $rev
    );

    if ($mediaType === 'video'): ?>
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
                src="<?php echo h($mediaUrl); ?>"
                type="video/mp4"
            >
        </video>
    <?php else: ?>
        <img
            src="<?php echo h($mediaUrl); ?>"
            alt=""
            width="1920"
            height="1080"
            decoding="async"
            draggable="false"
        >
    <?php endif;
};

mineacle_page_head('Home', [
    'meta_title' => 'Mineacle | Home',
    'meta_description' =>
        'Mineacle is a competitive player-driven Minecraft survival server built around economy, teams, PvP, rankings, and progression.',
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
    <div
        class="home-layout<?php echo count($features) < 2 ? ' has-single-feature' : ''; ?>"
    >
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
                <?php $renderMedia($hero, $rev); ?>
            </div>

            <div
                class="home-tile__shade"
                aria-hidden="true"
            ></div>

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
            <?php foreach ($features as $key => $feature): ?>
                <?php
                $isDuels = $key === 'duels';
                $isPlus = $key === 'plus';
                $buttonUrl = (string) (
                    $feature['button_url'] ?? '#'
                );
                ?>
                <section
                    class="home-tile home-tile--feature home-tile--<?php echo h($key); ?>"
                    aria-labelledby="home-<?php echo h($key); ?>-title"
                    data-home-tile-link="<?php echo h($buttonUrl); ?>"
                    <?php echo str_starts_with($buttonUrl, 'https://') ? 'data-home-tile-external="true"' : ''; ?>
                >
                    <div
                        class="home-tile__media"
                        aria-hidden="true"
                    >
                        <?php $renderMedia($feature, $rev); ?>
                    </div>

                    <div
                        class="home-tile__shade"
                        aria-hidden="true"
                    ></div>

                    <?php if (!empty($feature['is_new'])): ?>
                        <span class="home-tile__new">New</span>
                    <?php endif; ?>

                    <div class="home-tile__caption">
                        <h2 id="home-<?php echo h($key); ?>-title">
                            <?php echo h((string) $feature['title']); ?>
                        </h2>

                        <p>
                            <?php echo h((string) $feature['description']); ?>
                        </p>

                        <?php if ($isDuels && $topKillPlayer !== null): ?>
                            <a
                                class="home-competitive-line"
                                href="<?php echo h((string) $topKillPlayer['url']); ?>"
                            >
                                <strong>
                                    #1 <?php echo h((string) $topKillPlayer['username']); ?>
                                </strong>
                                <span>
                                    <?php echo h(number_format((int) $topKillPlayer['kills'])); ?>
                                    kills
                                </span>
                            </a>
                        <?php endif; ?>

                        <?php if ($isPlus): ?>
                            <div
                                class="home-plus-perks"
                                aria-label="Mineacle Plus perks"
                            >
                                <?php foreach ((array) ($feature['perks'] ?? []) as $perk): ?>
                                    <span>
                                        <?php echo h((string) $perk); ?>
                                    </span>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>

                        <div class="home-tile__actions">
                            <a
                                class="home-button <?php echo $isPlus ? 'home-button--primary' : 'home-button--quiet'; ?>"
                                href="<?php echo h($buttonUrl); ?>"
                                <?php echo str_starts_with($buttonUrl, 'https://') ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                            >
                                <?php echo h((string) $feature['button_label']); ?>
                            </a>
                        </div>
                    </div>
                </section>
            <?php endforeach; ?>
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
