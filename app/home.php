<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);

if ($requestPath === '/home' || $requestPath === '/home.php') {
    header('Location: /', true, 302);
    exit;
}

require_once __DIR__ . '/includes/layout.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$home = is_array($config['home'] ?? null) ? $config['home'] : [];
$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';

$publicUrl = static function (mixed $value, string $fallback): string {
    $url = mineacle_page_public_link($value);

    return $url === '#' ? $fallback : $url;
};

$storeUrl = $publicUrl($site['store_url'] ?? '', 'https://store.mineacle.net/');
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

$navigation = [
    ['label' => 'Home', 'url' => '/', 'current' => true, 'external' => false],
    ['label' => 'Vote', 'url' => '/vote', 'current' => false, 'external' => false],
    ['label' => 'Leaderboards', 'url' => '/leaderboards', 'current' => false, 'external' => false],
    ['label' => 'Bans', 'url' => '/bans', 'current' => false, 'external' => false],
    ['label' => 'Store', 'url' => $storeUrl, 'current' => false, 'external' => true],
];

$socialLinks = [
    ['key' => 'discord', 'label' => 'Join Mineacle on Discord', 'url' => $discordUrl],
    ['key' => 'x', 'label' => 'Follow Mineacle on X', 'url' => $xUrl],
    ['key' => 'youtube', 'label' => 'Watch Mineacle on YouTube', 'url' => $youtubeUrl],
];

$assetDirectory = __DIR__ . '/assets/homepage';
$assetFiles = [
    $assetDirectory . '/css/home.css',
    $assetDirectory . '/js/home.js',
    $assetDirectory . '/images/hero.png',
];
$assetVersion = 1;

foreach ($assetFiles as $assetFile) {
    if (is_file($assetFile)) {
        $assetVersion = max($assetVersion, (int) filemtime($assetFile));
    }
}

$assetRevision = rawurlencode((string) $assetVersion);

mineacle_page_head('Home', [
    'meta_title' => 'Home | Mineacle',
    'meta_description' => 'Enter the world of Mineacle, join the Minecraft server, vote, view leaderboards, and connect with the community.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => ['/assets/homepage/css/home.css?rev=' . $assetRevision],
    'body_class' => 'mineacle-home',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);
?>
<main class="home-page" aria-labelledby="home-page-title">
    <h1 id="home-page-title" class="visually-hidden">Mineacle</h1>

    <section class="home-hero" aria-labelledby="merchant-title" data-home-hero>
        <?php if ($heroVideoUrl !== ''): ?>
            <video
                class="home-hero__image"
                poster="/assets/homepage/images/hero.png?rev=<?php echo h($assetRevision); ?>"
                width="2048"
                height="863"
                autoplay
                muted
                loop
                playsinline
                preload="auto"
                disablepictureinpicture
                disableremoteplayback
                controlslist="nodownload nofullscreen noremoteplayback"
                aria-hidden="true"
                tabindex="-1"
                data-home-hero-video
            >
                <source src="<?php echo h($heroVideoUrl); ?>" type="video/mp4" data-home-hero-source>
            </video>
        <?php endif; ?>

        <div class="home-hero__surface">
            <header class="home-header">
                <a class="home-brand" href="/" aria-label="Mineacle home" aria-current="page">
                    <img
                        src="/assets/homepage/images/logo-small.png?rev=<?php echo h($assetRevision); ?>"
                        alt=""
                        width="64"
                        height="55"
                        draggable="false"
                    >
                </a>

                <nav class="home-navigation" aria-label="Primary navigation">
                    <div class="home-navigation__links">
                        <?php foreach ($navigation as $link): ?>
                            <a
                                class="home-navigation__link<?php echo $link['current'] ? ' is-current' : ''; ?>"
                                href="<?php echo h((string) $link['url']); ?>"
                                <?php echo $link['current'] ? 'aria-current="page"' : ''; ?>
                                <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                            ><?php echo h((string) $link['label']); ?></a>
                        <?php endforeach; ?>
                    </div>

                    <details class="home-menu" data-home-menu>
                        <summary class="home-menu__button" aria-label="Open navigation menu">
                            <span aria-hidden="true"></span>
                            <span aria-hidden="true"></span>
                        </summary>
                        <nav class="home-menu__panel" aria-label="Menu navigation">
                            <?php foreach ($navigation as $link): ?>
                                <a
                                    class="home-menu__link<?php echo $link['current'] ? ' is-current' : ''; ?>"
                                    href="<?php echo h((string) $link['url']); ?>"
                                    <?php echo $link['current'] ? 'aria-current="page"' : ''; ?>
                                    <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                                ><?php echo h((string) $link['label']); ?></a>
                            <?php endforeach; ?>
                        </nav>
                    </details>
                </nav>
            </header>

            <div class="home-story">
                <div class="home-story__copy">
                    <h2 id="merchant-title">The Merchant</h2>
                    <p>In a silent world stripped of color, a nameless wanderer found a portal hidden behind layers of unbreakable stone. It opened into a vibrant land filled with crowded markets, growing settlements, and Merchants who valued every block gathered and every item crafted. They claimed the realm’s prosperity came from an ancient source buried beneath the first village. With nothing left to lose, the wanderer began searching for it before the gray world consumed itself completely.</p>
                </div>

                <div class="home-actions" aria-label="Play and community links">
                    <div class="home-actions__primary">
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
        </div>
    </section>

    <dialog class="join-dialog" data-join-dialog aria-labelledby="join-dialog-title">
        <div class="join-dialog__content">
            <button class="join-dialog__close" type="button" data-close-join-help aria-label="Close">×</button>
            <p class="join-dialog__eyebrow">Java Edition</p>
            <h2 id="join-dialog-title">Join Mineacle</h2>
            <ol>
                <li>Press <strong>Play</strong> to copy <span><?php echo h($minecraftIp); ?></span>.</li>
                <li>Open Minecraft, select <strong>Multiplayer</strong>, then <strong>Add Server</strong>.</li>
                <li>Paste the address, save the server, and join the world.</li>
            </ol>
            <button class="join-dialog__copy" type="button" data-copy-server data-server-address="<?php echo h($minecraftIp); ?>">
                <span data-play-label aria-live="polite">Copy server address</span>
            </button>
        </div>
    </dialog>
</main>
<?php mineacle_page_end(['scripts' => ['/assets/homepage/js/home.js?rev=' . $assetRevision]]); ?>
