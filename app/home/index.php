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
require_once __DIR__ . '/../shared/php/auth.php';
require_once __DIR__ . '/../shared/php/navigation-rail.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$user = mineacle_auth_current_user();

$publicUrl = static function (mixed $value, string $fallback): string {
    $resolved = mineacle_page_public_link($value);

    return $resolved === '#' ? $fallback : $resolved;
};

$storeUrl = $publicUrl(
    $site['store_url'] ?? '',
    'https://store.mineacle.net/'
);

$heroVideoUrl =
    'https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev/hero-bg.mp4';

$assetFiles = [
    __DIR__ . '/assets/css/home.css',
    __DIR__ . '/assets/js/home.js',
    __DIR__ . '/assets/images/hero.webp',
    __DIR__ . '/../shared/assets/css/navigation-rail.css',
    __DIR__ . '/../shared/assets/js/navigation-rail.js',
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

mineacle_page_head('Home', [
    'meta_title' => 'Home | Mineacle',
    'meta_description' =>
        'Join Mineacle, view leaderboards, vote, and explore the network.',
    'canonical_url' => 'https://mineacle.net/',
    'stylesheets' => [
        '/shared/assets/css/navigation-rail.css?rev=' . $rev,
        '/home/assets/css/home.css?rev=' . $rev,
    ],
    'body_class' => 'mineacle-home',
    'external_fonts' => false,
    'theme_color' => '#0d0f10',
]);
?>
<main class="home-page" aria-label="Mineacle home">
    <div class="home-layout">
        <?php mineacle_navigation_rail($site, ['current_key' => 'home']); ?>

        <header class="home-topbar">
            <form
                class="home-player-search"
                action="/player"
                method="get"
                role="search"
                aria-label="Search Mineacle players"
            >
                <img
                    src="/shared/assets/images/search/search.png"
                    alt=""
                    aria-hidden="true"
                    width="18"
                    height="18"
                >
                <input
                    type="search"
                    name="username"
                    placeholder="Search for a player"
                    autocomplete="off"
                    spellcheck="false"
                    aria-label="Search for a player"
                >
            </form>

            <div class="home-account">
                <?php if ($user === null): ?>
                    <a class="home-account__button" href="/login">
                        <img
                            src="/shared/assets/images/navigation/user.png?rev=<?php echo h($rev); ?>"
                            alt=""
                            aria-hidden="true"
                        >
                        <span>Login</span>
                    </a>
                <?php else: ?>
                    <form action="/logout" method="post">
                        <input
                            type="hidden"
                            name="csrf"
                            value="<?php echo h(mineacle_auth_csrf_token()); ?>"
                        >
                        <button
                            class="home-account__button home-account__button--logout"
                            type="submit"
                            aria-label="Log out <?php echo h((string) $user['username']); ?>"
                        >
                            <img
                                src="/shared/assets/images/navigation/user.png?rev=<?php echo h($rev); ?>"
                                alt=""
                                aria-hidden="true"
                            >
                            <span>Logout</span>
                        </button>
                    </form>
                <?php endif; ?>
            </div>
        </header>

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
                <p class="home-card-eyebrow">Featured</p>
                <h1 id="home-promo-title">Mineacle+ Membership</h1>
                <p class="home-card-copy">
                    Unlock premium Mineacle perks, cosmetics, and quality-of-life
                    features while keeping the survival experience competitive.
                </p>

                <a
                    class="home-card-button"
                    href="<?php echo h($storeUrl); ?>"
                    target="_blank"
                    rel="noopener noreferrer"
                >
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
                    <p class="home-card-eyebrow">Combat</p>
                    <h2 id="home-duels-title">Mineacle Duels</h2>
                    <p class="home-card-copy">
                        Challenge other players, record fight history, and
                        compete across Mineacle's combat rankings.
                    </p>

                    <a class="home-card-button" href="/leaderboards">
                        Learn More
                    </a>
                </div>
            </article>

            <article
                class="home-feature-card"
                aria-labelledby="home-membership-title"
            >
                <div class="home-feature-card__content">
                    <p class="home-card-eyebrow">Mineacle+</p>
                    <h2 id="home-membership-title">More ways to play</h2>
                    <p class="home-card-copy">
                        Optional perks and member features designed around
                        convenience, customization, and progression.
                    </p>

                    <a
                        class="home-card-button"
                        href="<?php echo h($storeUrl); ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
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
        '/shared/assets/js/navigation-rail.js?rev=' . $rev,
        '/home/assets/js/home.js?rev=' . $rev,
    ],
]);
?>
