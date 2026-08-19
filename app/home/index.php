<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);

if (in_array($requestPath, ['/home', '/home.php', '/home/index.php'], true)) {
    header('Location: /', true, 302);
    exit;
}

require_once __DIR__ . '/../shared/php/layout.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$home = is_array($config['home'] ?? null) ? $config['home'] : [];

$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';

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

$navigationLinks = [
    [
        'key' => 'home',
        'label' => 'Home',
        'url' => '/',
        'external' => false,
    ],
    [
        'key' => 'vote',
        'label' => 'Vote',
        'url' => '/vote',
        'external' => false,
    ],
    [
        'key' => 'leaderboards',
        'label' => 'Leaderboards',
        'url' => '/leaderboards',
        'external' => false,
    ],
    [
        'key' => 'bans',
        'label' => 'Bans',
        'url' => 'https://bans.mineacle.net/',
        'external' => true,
    ],
    [
        'key' => 'store',
        'label' => 'Store',
        'url' => $storeUrl,
        'external' => true,
    ],
];

$socialLinks = [
    [
        'key' => 'discord',
        'label' => 'Join Mineacle on Discord',
        'url' => $discordUrl,
    ],
    [
        'key' => 'x',
        'label' => 'Follow Mineacle on X',
        'url' => $xUrl,
    ],
    [
        'key' => 'youtube',
        'label' => 'Watch Mineacle on YouTube',
        'url' => $youtubeUrl,
    ],
];

$heroVideoBaseUrl = 'https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev';
$defaultHeroVideoUrl = $heroVideoBaseUrl . '/hero-bg.mp4';

$heroVideoUrl = trim(
    (string) ($home['hero_video_url'] ?? $defaultHeroVideoUrl)
);

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
        $assetVersion = max(
            $assetVersion,
            (int) filemtime($assetFile)
        );
    }
}

$assetRevision = rawurlencode((string) $assetVersion);

mineacle_page_head('Home', [
    'meta_title' => 'Home | Mineacle',
    'meta_description' => 'Enter the world of Mineacle, join the Minecraft server, vote, view leaderboards, and connect with the community.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => [
        '/home/assets/css/home.css?rev=' . $assetRevision,
    ],
    'body_class' => 'mineacle-home',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);
?>
<main class="home-page" aria-labelledby="home-page-title">
    <h1 id="home-page-title" class="visually-hidden">Mineacle</h1>

    <div class="home-layout">
        <aside class="home-nav-rail" aria-label="Mineacle navigation">
            <div class="home-nav-rail__inner">
                <a
                    class="home-nav-brand"
                    href="/"
                    aria-label="Mineacle home"
                >
                    <span class="home-nav-brand__visual" aria-hidden="true">
                        <img
                            class="home-nav-brand__image home-nav-brand__image--static"
                            src="/home/assets/images/static-logo.png?rev=<?php echo h($assetRevision); ?>"
                            alt=""
                            width="512"
                            height="436"
                            draggable="false"
                        >
                        <img
                            class="home-nav-brand__image home-nav-brand__image--hover"
                            src="/home/assets/images/hover-logo.png?rev=<?php echo h($assetRevision); ?>"
                            alt=""
                            width="512"
                            height="436"
                            draggable="false"
                        >
                    </span>
                </a>

                <nav class="home-nav-links" aria-label="Main navigation">
                    <?php foreach ($navigationLinks as $link): ?>
                        <?php $isCurrent = $link['key'] === 'home'; ?>
                        <a
                            class="home-nav-link<?php echo $isCurrent ? ' is-current' : ''; ?>"
                            href="<?php echo h((string) $link['url']); ?>"
                            <?php echo $isCurrent ? 'aria-current="page"' : ''; ?>
                            <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                        >
                            <span><?php echo h((string) $link['label']); ?></span>
                        </a>
                    <?php endforeach; ?>
                </nav>

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
        </aside>

        <section
            class="home-stage"
            aria-labelledby="merchant-title"
            data-home-hero
            tabindex="0"
        >
            <?php if ($heroVideoUrl !== ''): ?>
                <video
                    class="home-stage__media"
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

            <div class="home-stage__veil" aria-hidden="true"></div>

            <div class="home-stage__content">
                <article class="home-story">
                    <span class="home-story__eyebrow">Mineacle SMP</span>
                    <h2 id="merchant-title">The Merchant</h2>
                    <p>
                        In a silent world stripped of color, a nameless wanderer found a portal
                        hidden behind layers of unbreakable stone. It opened into a vibrant land
                        filled with crowded markets, growing settlements, and Merchants who valued
                        every block gathered and every item crafted. They claimed the realm's
                        prosperity came from an ancient source buried beneath the first village.
                    </p>
                </article>

                <button
                    class="home-play"
                    type="button"
                    data-copy-server
                    data-server-address="<?php echo h($minecraftIp); ?>"
                    aria-label="Copy the Mineacle server address"
                    title="Copy <?php echo h($minecraftIp); ?>"
                >
                    <span data-play-label aria-live="polite">Play</span>
                </button>
            </div>
        </section>
    </div>
</main>
<?php
mineacle_page_end([
    'scripts' => [
        '/home/assets/js/home.js?rev=' . $assetRevision,
    ],
]);
?>
