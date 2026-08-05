<?php

declare(strict_types=1);

require_once __DIR__ . '/layout.php';

/**
 * Return the canonical primary navigation used by Home, Leaderboards, and Player pages.
 *
 * @return list<array{key:string,label:string,url:string,external:bool}>
 */
function mineacle_site_navigation_links(array $site): array
{
    $publicUrl = static function (mixed $value, string $fallback): string {
        $resolved = mineacle_page_public_link($value);

        return $resolved === '#' ? $fallback : $resolved;
    };

    return [
        ['key' => 'home', 'label' => 'Home', 'url' => '/', 'external' => false],
        ['key' => 'vote', 'label' => 'Vote', 'url' => '/vote', 'external' => false],
        ['key' => 'leaderboards', 'label' => 'Leaderboards', 'url' => '/leaderboards', 'external' => false],
        ['key' => 'bans', 'label' => 'Bans', 'url' => '/bans', 'external' => false],
        [
            'key' => 'store',
            'label' => 'Store',
            'url' => $publicUrl($site['store_url'] ?? '', 'https://store.mineacle.net/'),
            'external' => true,
        ],
    ];
}

/**
 * Render the shared Mineacle header and responsive navigation menu.
 *
 * Supported options:
 * - current_key: home, vote, leaderboards, bans, store, or an empty string
 * - header_class: optional page-specific class appended to the shared header
 * - aria_label: optional navigation label
 */
function mineacle_site_navigation(array $site, array $options = []): void
{
    $currentKey = strtolower(trim((string) ($options['current_key'] ?? '')));
    $headerClass = trim((string) ($options['header_class'] ?? ''));
    $ariaLabel = trim((string) ($options['aria_label'] ?? 'Primary navigation')) ?: 'Primary navigation';
    $headerClasses = ['site-header'];

    foreach (preg_split('/\s+/', $headerClass) ?: [] as $className) {
        if ($className !== '' && preg_match('/^[a-zA-Z0-9_-]+$/', $className) === 1) {
            $headerClasses[] = $className;
        }
    }

    $links = mineacle_site_navigation_links($site);
    $loginUrl = mineacle_page_public_link($site['login_url'] ?? '');

    if ($loginUrl === '#') {
        $loginUrl = '/login';
    }

    $logoPath = __DIR__ . '/../../home/assets/images/logo-small.png';
    $logoVersion = (string) (is_file($logoPath) ? (filemtime($logoPath) ?: 1) : 1);
    ?>
    <header class="<?php echo h(implode(' ', array_unique($headerClasses))); ?>" data-site-header>
        <a
            class="site-brand"
            href="/"
            aria-label="Mineacle home"
        >
            <img
                src="/home/assets/images/logo-small.png?rev=<?php echo h(rawurlencode($logoVersion)); ?>"
                alt=""
                width="64"
                height="55"
                draggable="false"
            >
        </a>

        <nav class="site-navigation" aria-label="<?php echo h($ariaLabel); ?>">
            <div class="site-navigation__links">
                <?php foreach ($links as $link): ?>
                    <?php $isCurrent = (string) $link['key'] === $currentKey; ?>
                    <a
                        class="site-navigation__link<?php echo $isCurrent ? ' is-current' : ''; ?>"
                        href="<?php echo h((string) $link['url']); ?>"
                        <?php echo $isCurrent ? 'aria-current="page"' : ''; ?>
                        <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                    ><?php echo h((string) $link['label']); ?></a>
                <?php endforeach; ?>
            </div>

            <a class="site-navigation__login" href="<?php echo h($loginUrl); ?>">Login</a>

            <details class="site-menu" data-site-menu>
                <summary class="site-menu__button" aria-label="Open navigation menu">
                    <span aria-hidden="true"></span>
                    <span aria-hidden="true"></span>
                </summary>
                <nav class="site-menu__panel" aria-label="Menu navigation">
                    <?php foreach ($links as $link): ?>
                        <?php $isCurrent = (string) $link['key'] === $currentKey; ?>
                        <a
                            class="site-menu__link<?php echo $isCurrent ? ' is-current' : ''; ?>"
                            href="<?php echo h((string) $link['url']); ?>"
                            <?php echo $isCurrent ? 'aria-current="page"' : ''; ?>
                            <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                        ><?php echo h((string) $link['label']); ?></a>
                    <?php endforeach; ?>
                    <a class="site-menu__link site-menu__login" href="<?php echo h($loginUrl); ?>">Login</a>
                </nav>
            </details>
        </nav>
    </header>
    <?php
}
