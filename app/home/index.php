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

$navigationLinks = [
    ['label' => 'Home', 'url' => '/', 'current' => true, 'external' => false],
    ['label' => 'Vote', 'url' => '/vote', 'current' => false, 'external' => false],
    ['label' => 'Leaderboards', 'url' => '/leaderboards', 'current' => false, 'external' => false],
    ['label' => 'Bans', 'url' => 'https://bans.mineacle.net/', 'current' => false, 'external' => true],
    ['label' => 'Store', 'url' => $storeUrl, 'current' => false, 'external' => true],
];

$socialLinks = [
    ['key' => 'discord', 'label' => 'Discord', 'url' => $discordUrl],
    ['key' => 'x', 'label' => 'X', 'url' => $xUrl],
    ['key' => 'youtube', 'label' => 'YouTube', 'url' => $youtubeUrl],
];

$heroVideoUrl =
    'https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev/hero-bg.mp4';

$assetFiles = [
    __DIR__ . '/assets/css/home.css',
    __DIR__ . '/assets/js/home.js',
    __DIR__ . '/assets/images/hero.webp',
    __DIR__ . '/assets/images/static-logo.png',
    __DIR__ . '/assets/images/hover-logo.png',
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
        'Play Mineacle, view leaderboards, vote for the server, and explore the community.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => [
        '/home/assets/css/home.css?rev=' . $rev,
    ],
    'body_class' => 'mineacle-home',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);
?>
<main class="home-page" aria-label="Mineacle home">
    <div class="home-dashboard">

        <aside class="home-rail" aria-label="Mineacle navigation">
            <div class="home-rail__inner">
                <a class="home-brand" href="/" aria-label="Mineacle home">
                    <span class="home-brand__visual" aria-hidden="true">
                        <img
                            class="home-brand__image home-brand__image--static"
                            src="/home/assets/images/static-logo.png?rev=<?php echo h($rev); ?>"
                            alt=""
                            width="512"
                            height="436"
                            draggable="false"
                        >
                        <img
                            class="home-brand__image home-brand__image--hover"
                            src="/home/assets/images/hover-logo.png?rev=<?php echo h($rev); ?>"
                            alt=""
                            width="512"
                            height="436"
                            draggable="false"
                        >
                    </span>
                </a>

                <nav class="home-nav" aria-label="Primary navigation">
                    <?php foreach ($navigationLinks as $link): ?>
                        <a
                            class="home-nav__link<?php echo $link['current'] ? ' is-current' : ''; ?>"
                            href="<?php echo h((string) $link['url']); ?>"
                            <?php echo $link['current'] ? 'aria-current="page"' : ''; ?>
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

        <header class="home-topbar">
            <form
                class="home-search"
                action="/player"
                method="get"
                role="search"
                aria-label="Search for a Mineacle player"
            >
                <img
                    src="/shared/assets/images/search/search.png"
                    alt=""
                    width="18"
                    height="18"
                    aria-hidden="true"
                    draggable="false"
                >
                <input
                    type="search"
                    name="name"
                    placeholder="Search for a player..."
                    autocomplete="off"
                    aria-label="Search for a player"
                >
            </form>

            <div class="home-topbar__right">
                <div
                    class="home-server-status is-loading"
                    data-home-status
                    aria-live="polite"
                >
                    <span
                        class="home-server-status__dot"
                        aria-hidden="true"
                    ></span>
                    <span data-home-status-label>Checking server</span>
                </div>

                <a class="home-login" href="/login">Login</a>
            </div>
        </header>

        <section
            class="home-feature-card"
            aria-labelledby="home-feature-title"
            data-home-feature
        >
            <div class="home-feature-card__media" aria-hidden="true">
                <video
                    class="home-feature-card__video"
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

            <div
                class="home-feature-card__overlay"
                aria-hidden="true"
            ></div>

            <div class="home-feature-card__content">
                <span class="home-card-eyebrow">
                    Mineacle SMP
                </span>

                <h1 id="home-feature-title">
                    Your world.<br>Your economy.
                </h1>

                <p>
                    Build, trade, fight, and progress in a survival world
                    shaped by its players.
                </p>

                <div class="home-feature-card__actions">
                    <button
                        class="home-button home-button--play"
                        type="button"
                        data-copy-server
                        data-server-address="<?php echo h($minecraftIp); ?>"
                    >
                        <span data-play-label>Play Mineacle</span>
                    </button>

                    <a
                        class="home-button home-button--secondary"
                        href="/leaderboards"
                    >
                        Explore
                    </a>
                </div>
            </div>
        </section>

        <div class="home-side-stack">
            <article
                class="home-action-card home-action-card--leaderboards"
                aria-labelledby="home-leaderboards-title"
            >
                <div
                    class="home-podium"
                    aria-hidden="true"
                >
                    <span class="home-podium__bar home-podium__bar--second">
                        <b>2</b>
                    </span>
                    <span class="home-podium__bar home-podium__bar--first">
                        <b>1</b>
                    </span>
                    <span class="home-podium__bar home-podium__bar--third">
                        <b>3</b>
                    </span>
                </div>

                <div class="home-action-card__content">
                    <span class="home-card-eyebrow">
                        Competition
                    </span>

                    <h2 id="home-leaderboards-title">
                        Leaderboards
                    </h2>

                    <p>
                        See who is leading Mineacle across balance,
                        combat, playtime, and team rankings.
                    </p>

                    <a
                        class="home-button home-button--purple"
                        href="/leaderboards"
                    >
                        View Rankings
                    </a>
                </div>
            </article>

            <article
                class="home-action-card home-action-card--community"
                aria-labelledby="home-community-title"
            >
                <div
                    class="home-community-mark"
                    aria-hidden="true"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </div>

                <div class="home-action-card__content">
                    <span class="home-card-eyebrow">
                        Support Mineacle
                    </span>

                    <h2 id="home-community-title">
                        Vote. Earn. Grow.
                    </h2>

                    <p>
                        Support the server, earn voting rewards, or
                        explore optional Mineacle perks.
                    </p>

                    <div class="home-action-card__buttons">
                        <a
                            class="home-button home-button--green"
                            href="/vote"
                        >
                            Vote Now
                        </a>

                        <a
                            class="home-button home-button--secondary"
                            href="<?php echo h($storeUrl); ?>"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Store
                        </a>
                    </div>
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
