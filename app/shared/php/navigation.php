<?php

declare(strict_types=1);

require_once __DIR__ . '/layout.php';
require_once __DIR__ . '/auth.php';

/**
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
 * Resolve the active navigation item from the request when a page does not
 * explicitly provide current_key.
 */
function mineacle_site_navigation_current_key(array $links, string $requestedKey): string
{
    $requestedKey = strtolower(trim($requestedKey));
    $validKeys = [];

    foreach ($links as $link) {
        $key = strtolower(trim((string) ($link['key'] ?? '')));

        if ($key !== '') {
            $validKeys[$key] = true;
        }
    }

    if ($requestedKey !== '' && isset($validKeys[$requestedKey])) {
        return $requestedKey;
    }

    $requestPath = (string) (parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?? '/');
    $requestPath = '/' . ltrim($requestPath, '/');
    $firstSegment = strtolower((string) strtok(trim($requestPath, '/'), '/'));

    if ($requestPath === '/' || $firstSegment === 'home') {
        return isset($validKeys['home']) ? 'home' : '';
    }

    return isset($validKeys[$firstSegment]) ? $firstSegment : '';
}

function mineacle_site_account_action(string $className, bool $mobile = false): void
{
    $user = mineacle_auth_current_user();
    $labelClass = $mobile ? 'site-menu__label' : 'site-navigation__label';

    if ($user === null) {
        echo '<a class="' . h($className) . '" href="/login">';
        echo '<span class="' . h($labelClass) . '">Login</span>';
        echo '</a>';

        return;
    }

    $formClass = $mobile ? 'site-menu__account-form' : 'site-navigation__account-form';

    echo '<form class="' . h($formClass) . '" action="/logout" method="post">';
    echo '<input type="hidden" name="csrf" value="' . h(mineacle_auth_csrf_token()) . '">';
    echo '<button class="' . h($className) . '" type="submit" aria-label="Log out ' . h((string) $user['username']) . '">';
    echo '<span class="' . h($labelClass) . '">Logout</span>';
    echo '</button>';
    echo '</form>';
}

function mineacle_site_navigation(array $site, array $options = []): void
{
    $headerClass = trim((string) ($options['header_class'] ?? ''));
    $ariaLabel = trim((string) ($options['aria_label'] ?? 'Primary navigation')) ?: 'Primary navigation';
    $headerClasses = ['site-header'];

    foreach (preg_split('/\s+/', $headerClass) ?: [] as $className) {
        if ($className !== '' && preg_match('/^[a-zA-Z0-9_-]+$/', $className) === 1) {
            $headerClasses[] = $className;
        }
    }

    $links = mineacle_site_navigation_links($site);
    $currentKey = mineacle_site_navigation_current_key(
        $links,
        (string) ($options['current_key'] ?? '')
    );

    $staticLogoPath = __DIR__ . '/../../home/assets/images/static-logo.png';
    $hoverLogoPath = __DIR__ . '/../../home/assets/images/hover-logo.png';

    $staticLogoVersion = is_file($staticLogoPath) ? (int) (filemtime($staticLogoPath) ?: 1) : 1;
    $hoverLogoVersion = is_file($hoverLogoPath) ? (int) (filemtime($hoverLogoPath) ?: 1) : $staticLogoVersion;
    $logoVersion = (string) max($staticLogoVersion, $hoverLogoVersion);

    $staticLogoUrl = is_file($staticLogoPath)
        ? '/home/assets/images/static-logo.png?rev=' . rawurlencode($logoVersion)
        : '/home/assets/images/logo-small.png?rev=' . rawurlencode($logoVersion);

    $hoverLogoUrl = is_file($hoverLogoPath)
        ? '/home/assets/images/hover-logo.png?rev=' . rawurlencode($logoVersion)
        : $staticLogoUrl;
    ?>
    <header class="<?php echo h(implode(' ', array_unique($headerClasses))); ?>" data-site-header>
        <a class="site-brand" href="/" aria-label="Mineacle home">
            <span class="site-brand__visual" aria-hidden="true">
                <img
                    class="site-brand__logo site-brand__logo--static"
                    src="<?php echo h($staticLogoUrl); ?>"
                    alt=""
                    width="512"
                    height="436"
                    draggable="false"
                    decoding="async"
                >
                <img
                    class="site-brand__logo site-brand__logo--hover"
                    src="<?php echo h($hoverLogoUrl); ?>"
                    alt=""
                    width="512"
                    height="436"
                    draggable="false"
                    decoding="async"
                >
            </span>
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
                    ><span class="site-navigation__label"><?php echo h((string) $link['label']); ?></span></a>
                <?php endforeach; ?>
            </div>

            <?php mineacle_site_account_action('site-navigation__login'); ?>

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
                        ><span class="site-menu__label"><?php echo h((string) $link['label']); ?></span></a>
                    <?php endforeach; ?>

                    <?php mineacle_site_account_action('site-menu__link site-menu__login', true); ?>
                </nav>
            </details>
        </nav>
    </header>
    <?php
}
