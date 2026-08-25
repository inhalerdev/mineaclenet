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

$assetPath = __DIR__ . '/assets/css/home.css';
$assetVersion = is_file($assetPath)
    ? (string) (filemtime($assetPath) ?: 1)
    : '1';

mineacle_page_head('Home', [
    'meta_title' => 'Home | Mineacle',
    'meta_description' => 'Mineacle Minecraft network.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => [
        '/home/assets/css/home.css?rev=' . rawurlencode($assetVersion),
    ],
    'body_class' => 'mineacle-home',
    'external_fonts' => false,
    'theme_color' => '#080a0b',
]);
?>
<main class="home-page" aria-label="Mineacle home">
    <div class="home-wireframe">
        <section
            class="home-panel home-panel--top"
            aria-label="Top panel"
        ></section>

        <aside
            class="home-panel home-panel--rail"
            aria-label="Navigation rail"
        ></aside>

        <section
            class="home-panel home-panel--primary"
            aria-label="Featured panel"
        >
            <div class="home-panel__media" aria-hidden="true">
                <video
                    class="home-panel__video"
                    poster="/home/assets/images/hero.webp"
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
                        src="https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev/hero-bg.mp4"
                        type="video/mp4"
                    >
                </video>
            </div>

            <div class="home-panel__video-overlay" aria-hidden="true"></div>
            <div class="home-panel__future-content"></div>
        </section>

        <div class="home-panel-stack" aria-label="Secondary panels">
            <section
                class="home-panel home-panel--secondary"
                aria-label="Upper secondary panel"
            ></section>

            <section
                class="home-panel home-panel--secondary"
                aria-label="Lower secondary panel"
            ></section>
        </div>
    </div>
</main>
<?php mineacle_page_end(); ?>
