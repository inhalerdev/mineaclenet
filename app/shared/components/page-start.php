<?php

declare(strict_types=1);

require_once __DIR__ . '/../php/bootstrap.php';
require_once __DIR__ . '/icon.php';

function render_page_start(
    string $title,
    string $active = '',
    array $extraCss = [],
    string $bodyClass = ''
): void {
    $siteName = (string) config('site_name', 'Mineacle');
    $fullTitle = $title === '' ? $siteName : $title . ' | ' . $siteName;
    $player = current_player();
    ?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#333333">
    <meta name="color-scheme" content="dark">
    <title><?= e($fullTitle) ?></title>
    <link rel="stylesheet" href="/shared/assets/css/base.css">
    <?php foreach ($extraCss as $sheet): ?>
        <link rel="stylesheet" href="<?= e($sheet) ?>">
    <?php endforeach; ?>
    <script defer src="/shared/assets/js/app.js"></script>
</head>
<body class="<?= e($bodyClass) ?>">
<div class="site-shell">
    <aside class="side-rail" data-mobile-menu>
        <div class="brand-block">
            <a class="brand-mark" href="/" aria-label="Mineacle home">
                <span class="brand-gem" aria-hidden="true"></span>
                <span class="brand-word">MINEACLE</span>
            </a>
            <button class="mobile-close" type="button" data-menu-close aria-label="Close navigation">×</button>
        </div>

        <nav class="primary-nav" aria-label="Primary">
            <?php foreach (nav_items() as $item): ?>
                <?php $isActive = $active === $item['key']; ?>
                <a
                    class="nav-link<?= $isActive ? ' is-active' : '' ?>"
                    href="<?= e($item['href']) ?>"
                    <?= $isActive ? 'aria-current="page"' : '' ?>
                >
                    <?php render_icon($item['icon']); ?>
                    <span><?= e($item['label']) ?></span>
                </a>
            <?php endforeach; ?>
        </nav>

        <div class="rail-spacer"></div>

        <?php if ($player): ?>
            <div class="account-card">
                <a class="account-main" href="/player/<?= rawurlencode((string) $player['username']) ?>">
                    <span class="pixel-head" aria-hidden="true">
                        <span><?= e(strtoupper(substr((string) $player['username'], 0, 1))) ?></span>
                    </span>
                    <span class="account-copy">
                        <strong><?= e((string) $player['username']) ?></strong>
                        <small>View player stats</small>
                    </span>
                    <?php render_icon('chevron-down.png', 'account-chevron'); ?>
                </a>
                <form action="/logout" method="post">
                    <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
                    <button class="account-logout" type="submit">Sign out</button>
                </form>
            </div>
        <?php else: ?>
            <button class="login-rail-button" type="button" data-login-open>
                <span class="pixel-head is-guest" aria-hidden="true">?</span>
                <span class="account-copy">
                    <strong>Player login</strong>
                    <small>Link your profile</small>
                </span>
            </button>
        <?php endif; ?>
    </aside>

    <div class="mobile-topbar">
        <a class="brand-mark" href="/" aria-label="Mineacle home">
            <span class="brand-gem" aria-hidden="true"></span>
            <span class="brand-word">MINEACLE</span>
        </a>
        <button class="mobile-menu-button" type="button" data-menu-open aria-label="Open navigation">
            <span></span><span></span><span></span>
        </button>
    </div>

    <main class="page-canvas">
<?php
}
