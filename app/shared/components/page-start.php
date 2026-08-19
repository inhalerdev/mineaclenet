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
    <meta name="theme-color" content="#222222">
    <meta name="color-scheme" content="dark">
    <title><?= e($fullTitle) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet">
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
                <a class="account-main" href="<?= e(player_profile_url((string) $player['username'])) ?>">
                    <span class="pixel-head" aria-hidden="true">
                        <?php render_icon('player.svg'); ?>
                    </span>
                    <span class="account-copy">
                        <strong><?= e((string) $player['username']) ?></strong>
                        <small>View your profile</small>
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
                <span class="pixel-head is-guest" aria-hidden="true"><?php render_icon('player.svg'); ?></span>
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
        <div class="page-toolbar">
            <div class="toolbar-context">
                <span class="toolbar-label"><?= e($title === '' ? $siteName : $title) ?></span>
                <?php if ($player): ?>
                    <span class="toolbar-state"><span class="status-dot" aria-hidden="true"></span> Signed in</span>
                <?php else: ?>
                    <button class="toolbar-login" type="button" data-login-open>Sign in</button>
                <?php endif; ?>
            </div>

            <form class="player-search" action="/player" method="get" role="search" data-player-search>
                <span class="search-icon" aria-hidden="true"><?php render_icon('player.svg'); ?></span>
                <input
                    type="search"
                    name="username"
                    minlength="3"
                    maxlength="16"
                    pattern="[A-Za-z0-9_]{3,16}"
                    autocomplete="off"
                    placeholder="Search player"
                    aria-label="Search for a player"
                    data-player-search-input
                    required
                >
                <button type="submit" aria-label="Open player profile">Go</button>
            </form>
        </div>
<?php
}
