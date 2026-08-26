<?php

declare(strict_types=1);

require_once __DIR__ . '/layout.php';

/**
 * Shared Mineacle navigation rail.
 *
 * Pages include navigation-rail.css + navigation-rail.js, then render this
 * component in their page grid.
 *
 * @param array<string,mixed> $site
 * @param array<string,mixed> $options
 */
function mineacle_navigation_rail(array $site, array $options = []): void
{
    $currentKey = strtolower(trim((string) ($options['current_key'] ?? '')));

    if ($currentKey === '') {
        $requestPath = (string) (
            parse_url(
                (string) ($_SERVER['REQUEST_URI'] ?? '/'),
                PHP_URL_PATH
            ) ?? '/'
        );

        $requestPath = '/' . ltrim($requestPath, '/');
        $firstSegment = strtolower(
            (string) strtok(trim($requestPath, '/'), '/')
        );

        $currentKey = (
            $requestPath === '/'
            || $firstSegment === 'home'
        )
            ? 'home'
            : $firstSegment;
    }

    $publicUrl = static function (
        mixed $value,
        string $fallback
    ): string {
        $resolved = mineacle_page_public_link($value);

        return $resolved === '#'
            ? $fallback
            : $resolved;
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

    $minecraftIp = trim(
        (string) ($site['minecraft_ip'] ?? 'mineacle.net')
    ) ?: 'mineacle.net';

    $mainLinks = [
        [
            'key' => 'home',
            'label' => 'Home',
            'url' => '/',
            'icon' => 'home.png',
            'external' => false,
        ],
        [
            'key' => 'leaderboards',
            'label' => 'Leaderboard',
            'url' => '/leaderboards',
            'icon' => 'leaderboard.png',
            'external' => false,
        ],
        [
            'key' => 'vote',
            'label' => 'Earn a Reward',
            'url' => '/vote',
            'icon' => 'vote.png',
            'external' => false,
        ],
        [
            'key' => 'bans',
            'label' => 'Public Bans',
            'url' => 'https://bans.mineacle.net/',
            'icon' => 'bans.png',
            'external' => true,
        ],
        [
            'key' => 'store',
            'label' => 'Visit our Store',
            'url' => $storeUrl,
            'icon' => 'store.png',
            'external' => true,
        ],
    ];

    $quickLinks = [
        [
            'label' => 'Top 10 (Global)',
            'url' => '/leaderboards?type=players',
            'icon' => 'leaderboard.png',
        ],
        [
            'label' => 'Top Teams',
            'url' => '/leaderboards?type=teams',
            'icon' => 'team.png',
        ],
        [
            'label' => 'Top Balance',
            'url' => '/leaderboards?metric=balance',
            'icon' => 'balance.png',
        ],
        [
            'label' => 'Top K/D',
            'url' => '/leaderboards?metric=kd',
            'icon' => 'kills.png',
        ],
    ];

    $assetDirectory = __DIR__ . '/../assets/images/navigation';
    $assetVersion = 1;

    foreach (glob($assetDirectory . '/*') ?: [] as $assetPath) {
        if (is_file($assetPath)) {
            $assetVersion = max(
                $assetVersion,
                (int) (filemtime($assetPath) ?: 1)
            );
        }
    }

    foreach (
        glob($assetDirectory . '/social/*') ?: []
        as $assetPath
    ) {
        if (is_file($assetPath)) {
            $assetVersion = max(
                $assetVersion,
                (int) (filemtime($assetPath) ?: 1)
            );
        }
    }

    $rev = rawurlencode((string) $assetVersion);
    $assetBase = '/shared/assets/images/navigation';
    ?>
    <div class="site-rail-shell" data-site-rail>
        <a
            class="site-rail-logo"
            href="/"
            aria-label="Mineacle home"
        >
            <img
                src="<?php echo h($assetBase . '/mineacle-logo.png?rev=' . $rev); ?>"
                alt="Mineacle"
                width="1840"
                height="766"
                draggable="false"
                decoding="async"
            >
        </a>

        <aside
            class="site-rail"
            aria-label="Mineacle navigation"
        >
            <div class="site-rail__content">
                <section class="site-rail__section">
                    <h2 class="site-rail__heading">Menu</h2>

                    <nav
                        class="site-rail__menu site-rail__menu--main"
                        aria-label="Main navigation"
                    >
                        <?php foreach ($mainLinks as $link): ?>
                            <?php
                            $isCurrent = (
                                (string) $link['key']
                                === $currentKey
                            );
                            ?>
                            <a
                                class="site-rail__link<?php echo $isCurrent ? ' is-current' : ''; ?>"
                                href="<?php echo h((string) $link['url']); ?>"
                                <?php echo $isCurrent ? 'aria-current="page"' : ''; ?>
                                <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                            >
                                <span
                                    class="site-rail__link-icon site-rail__link-icon--<?php echo h((string) pathinfo((string) $link['icon'], PATHINFO_FILENAME)); ?>"
                                    aria-hidden="true"
                                ></span>
                                <span>
                                    <?php echo h((string) $link['label']); ?>
                                </span>
                            </a>
                        <?php endforeach; ?>
                    </nav>
                </section>

                <div
                    class="site-rail__divider"
                    aria-hidden="true"
                ></div>

                <section
                    class="site-rail__section site-rail__section--quick"
                >
                    <h2 class="site-rail__heading">
                        Quick Links
                    </h2>

                    <nav
                        class="site-rail__menu site-rail__menu--quick"
                        aria-label="Leaderboard quick links"
                    >
                        <?php foreach ($quickLinks as $link): ?>
                            <a
                                class="site-rail__link"
                                href="<?php echo h((string) $link['url']); ?>"
                            >
                                <span
                                    class="site-rail__link-icon site-rail__link-icon--<?php echo h((string) pathinfo((string) $link['icon'], PATHINFO_FILENAME)); ?>"
                                    aria-hidden="true"
                                ></span>
                                <span>
                                    <?php echo h((string) $link['label']); ?>
                                </span>
                            </a>
                        <?php endforeach; ?>
                    </nav>
                </section>

                <div class="site-rail__footer">
                    <div class="site-rail__utility-row">
                        <nav
                            class="site-rail__socials"
                            aria-label="Mineacle social links"
                        >
                            <a
                                href="<?php echo h($xUrl); ?>"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="X"
                                title="X"
                            >
                                <img
                                    src="<?php echo h($assetBase . '/social/x.png?rev=' . $rev); ?>"
                                    alt=""
                                    aria-hidden="true"
                                >
                            </a>

                            <a
                                href="<?php echo h($discordUrl); ?>"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Discord"
                                title="Discord"
                            >
                                <img
                                    src="<?php echo h($assetBase . '/social/discord.png?rev=' . $rev); ?>"
                                    alt=""
                                    aria-hidden="true"
                                >
                            </a>

                            <a
                                href="<?php echo h($youtubeUrl); ?>"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="YouTube"
                                title="YouTube"
                            >
                                <img
                                    src="<?php echo h($assetBase . '/social/youtube.png?rev=' . $rev); ?>"
                                    alt=""
                                    aria-hidden="true"
                                >
                            </a>
                        </nav>

                        <a
                            class="site-rail__help"
                            href="/contact"
                            aria-label="Help and contact"
                            title="Help"
                        >
                            <img
                                src="<?php echo h($assetBase . '/social/help.png?rev=' . $rev); ?>"
                                alt=""
                                aria-hidden="true"
                            >
                        </a>
                    </div>

                    <div
                        class="site-rail__status is-loading"
                        data-rail-status
                        aria-live="polite"
                    >
                        <span data-rail-status-label>
                            Checking server
                        </span>
                    </div>

                    <button
                        class="site-rail__play"
                        type="button"
                        data-rail-copy-server
                        data-server-address="<?php echo h($minecraftIp); ?>"
                        aria-label="Copy the Mineacle server address"
                    >
                        <img
                            src="<?php echo h($assetBase . '/play.png?rev=' . $rev); ?>"
                            alt=""
                            aria-hidden="true"
                        >

                        <span class="site-rail__play-copy">
                            <strong data-rail-play-label>
                                Play Mineacle
                            </strong>
                            <small>
                                <?php echo h($minecraftIp); ?>
                            </small>
                        </span>
                    </button>
                </div>
            </div>
        </aside>
    </div>
    <?php
}
