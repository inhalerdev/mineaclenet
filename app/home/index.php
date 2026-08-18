<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);

if (in_array($requestPath, ['/home', '/home.php', '/home/index.php'], true)) {
    header('Location: /', true, 302);
    exit;
}

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$home = is_array($config['home'] ?? null) ? $config['home'] : [];
$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';

$publicUrl = static function (mixed $value, string $fallback): string {
    $url = mineacle_page_public_link($value);

    return $url === '#' ? $fallback : $url;
};

$discordUrl = $publicUrl($site['discord_url'] ?? '', 'https://discord.gg/qmpJ4xMguT');
$xUrl = $publicUrl($site['x_url'] ?? '', 'https://x.com/mineaclenetwork');
$youtubeUrl = $publicUrl($site['youtube_url'] ?? '', 'https://www.youtube.com/@mineaclenetwork');

$heroVideoBaseUrl = 'https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev';
$defaultHeroVideoUrl = $heroVideoBaseUrl . '/hero-bg.mp4';
$heroVideoUrl = trim((string) ($home['hero_video_url'] ?? $defaultHeroVideoUrl));
$normalizedHeroVideoUrl = rtrim($heroVideoUrl, '/');

if (
    $normalizedHeroVideoUrl === $heroVideoBaseUrl
    || $normalizedHeroVideoUrl === $heroVideoBaseUrl . '/Video%20Project%202.mp4'
    || $normalizedHeroVideoUrl === $heroVideoBaseUrl . '/Video Project 2.mp4'
) {
    $heroVideoUrl = $defaultHeroVideoUrl;
}

if (
    filter_var($heroVideoUrl, FILTER_VALIDATE_URL) === false
    || strtolower((string) parse_url($heroVideoUrl, PHP_URL_SCHEME)) !== 'https'
) {
    $heroVideoUrl = '';
}

$socialLinks = [
    ['key' => 'discord', 'label' => 'Join Mineacle on Discord', 'url' => $discordUrl],
    ['key' => 'x', 'label' => 'Follow Mineacle on X', 'url' => $xUrl],
    ['key' => 'youtube', 'label' => 'Watch Mineacle on YouTube', 'url' => $youtubeUrl],
];

$assetDirectory = __DIR__ . '/assets';
$assetFiles = [
    $assetDirectory . '/css/home.css',
    $assetDirectory . '/js/home.js',
    $assetDirectory . '/images/hero.webp',
    $assetDirectory . '/images/static-logo.png',
    $assetDirectory . '/images/hover-logo.png',
    $assetDirectory . '/images/social-discord.png',
    $assetDirectory . '/images/social-x.png',
    $assetDirectory . '/images/social-youtube.png',
];

$assetVersion = 1;

foreach ($assetFiles as $assetFile) {
    if (is_file($assetFile)) {
        $assetVersion = max($assetVersion, (int) filemtime($assetFile));
    }
}

$assetRevision = rawurlencode((string) $assetVersion);
$navigationStylesheetPath = __DIR__ . '/../shared/assets/css/navigation.css';
$navigationScriptPath = __DIR__ . '/../shared/assets/js/navigation.js';

$navigationStylesheetVersion = (string) (
    is_file($navigationStylesheetPath)
        ? (filemtime($navigationStylesheetPath) ?: $assetVersion)
        : $assetVersion
);

$navigationScriptVersion = (string) (
    is_file($navigationScriptPath)
        ? (filemtime($navigationScriptPath) ?: $assetVersion)
        : $assetVersion
);

mineacle_page_head('Home', [
    'meta_title' => 'Home | Mineacle',
    'meta_description' => 'Enter the world of Mineacle, join the Minecraft server, vote, view leaderboards, and connect with the community.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => [
        '/shared/assets/css/navigation.css?rev=' . rawurlencode($navigationStylesheetVersion),
        '/home/assets/css/home.css?rev=' . $assetRevision,
    ],
    'body_class' => 'mineacle-home',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);
?>
<main class="home-page" aria-labelledby="home-page-title">
    <h1 id="home-page-title" class="visually-hidden">Mineacle</h1>

    <div class="home-shell">
        <aside class="home-rail" aria-label="Mineacle navigation and server controls">
            <div class="home-rail__surface">
                <?php
                mineacle_site_navigation($site, [
                    'current_key' => 'home',
                    'header_class' => 'home-rail__navigation',
                    'aria_label' => 'Mineacle navigation',
                ]);
                ?>

                <div class="home-rail__spacer" aria-hidden="true"></div>

                <div class="home-rail__actions" aria-label="Play and community links">
                    <div class="home-rail__play-row">
                        <button
                            class="home-action home-action--play"
                            type="button"
                            data-copy-server
                            data-server-address="<?php echo h($minecraftIp); ?>"
                            aria-label="Copy the Mineacle server address"
                            title="Copy <?php echo h($minecraftIp); ?>"
                        >
                            <span data-play-label aria-live="polite">Play</span>
                        </button>

                        <button
                            class="home-action home-action--help"
                            type="button"
                            data-open-join-help
                            aria-label="How to join Mineacle"
                            title="How to join Mineacle"
                        >?</button>
                    </div>

                    <nav class="home-socials" aria-label="Mineacle social links">
                        <?php foreach ($socialLinks as $social): ?>
                            <a
                                class="home-social home-social--<?php echo h((string) $social['key']); ?>"
                                href="<?php echo h((string) $social['url']); ?>"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="<?php echo h((string) $social['label']); ?>"
                                title="<?php echo h((string) $social['label']); ?>"
                            >
                                <span class="home-social__icon" aria-hidden="true"></span>
                            </a>
                        <?php endforeach; ?>
                    </nav>
                </div>
            </div>
        </aside>

        <section
            class="home-hero"
            aria-labelledby="merchant-title"
            data-home-hero
            tabindex="0"
        >
            <?php if ($heroVideoUrl !== ''): ?>
                <video
                    class="home-hero__image"
                    poster="/home/assets/images/hero.webp?rev=<?php echo h($assetRevision); ?>"
                    width="2048"
                    height="863"
                    autoplay
                    muted
                    loop
                    playsinline
                    preload="metadata"
                    disablepictureinpicture
                    disableremoteplayback
                    controlslist="nodownload nofullscreen noremoteplayback"
                    aria-hidden="true"
                    tabindex="-1"
                    data-home-hero-video
                >
                    <source
                        src="<?php echo h($heroVideoUrl); ?>"
                        type="video/mp4"
                        data-home-hero-source
                    >
                </video>
            <?php endif; ?>

            <div class="home-hero__surface">
                <div class="home-story">
                    <p class="home-story__eyebrow">Mineacle SMP</p>
                    <h2 id="merchant-title">The Merchant</h2>
                    <p>
                        In a silent world stripped of color, a nameless wanderer found a portal hidden behind layers of unbreakable stone.
                        It opened into a vibrant land filled with crowded markets, growing settlements, and Merchants who valued every block
                        gathered and every item crafted. They claimed the realm's prosperity came from an ancient source buried beneath the
                        first village. With nothing left to lose, the wanderer began searching for it before the gray world consumed itself completely.
                    </p>
                </div>
            </div>
        </section>
    </div>

    <dialog class="join-dialog" data-join-dialog aria-labelledby="join-dialog-title">
        <div class="join-dialog__content">
            <button
                class="join-dialog__close"
                type="button"
                data-close-join-help
                aria-label="Close"
            >
                <span class="join-dialog__close-icon" aria-hidden="true"></span>
            </button>

            <p class="join-dialog__eyebrow">Java Edition</p>
            <h2 id="join-dialog-title">Join Mineacle</h2>

            <ol>
                <li>Press <strong>Play</strong> to copy <span><?php echo h($minecraftIp); ?></span></li>
                <li>Open Minecraft, select <strong>Multiplayer</strong>, then <strong>Add Server</strong></li>
                <li>Paste the address, save the server, and join the world</li>
            </ol>

            <button
                class="join-dialog__copy"
                type="button"
                data-copy-server
                data-server-address="<?php echo h($minecraftIp); ?>"
            >
                <span data-play-label aria-live="polite">Copy server address</span>
            </button>
        </div>
    </dialog>
</main>
<?php
mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation.js?rev=' . rawurlencode($navigationScriptVersion),
        '/home/assets/js/home.js?rev=' . $assetRevision,
    ],
]);
?>
