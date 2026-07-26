<?php

declare(strict_types=1);

$frontPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$frontPath = is_string($frontPath) ? rtrim($frontPath, '/') : '';

if ($frontPath === '') {
    $frontPath = '/';
}

if (preg_match('#^/player/([A-Za-z0-9_-]{1,64})$#', $frontPath, $frontMatch) === 1) {
    $_GET['username'] = rawurldecode($frontMatch[1]);
    require __DIR__ . '/player.php';
    exit;
}

if ($frontPath === '/player') {
    require __DIR__ . '/player.php';
    exit;
}

if ($frontPath === '/leaderboards' || $frontPath === '/players') {
    require __DIR__ . '/leaderboards.php';
    exit;
}

require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/home-data.php';

$site = mineacle_config()['site'] ?? [];
$home = mineacle_home_data();
$supportEmail = (string) ($site['support_email'] ?? 'support@mineacle.net');
$minecraftIp = (string) ($site['minecraft_ip'] ?? 'mineacle.net');
$year = date('Y');

function mineacle_icon(string $name): string
{
    return mineacle_page_icon($name);
}

function mineacle_home_is_video_url(string $url): bool
{
    $path = parse_url($url, PHP_URL_PATH);

    return is_string($path) && preg_match('/\.(m4v|mp4|mov|webm)$/i', $path) === 1;
}

function mineacle_home_versioned_url(string $url, string $version): string
{
    if ($url === '' || $url === '#') {
        return $url;
    }

    $separator = strpos($url, '?') === false ? '?' : '&';

    return $url . $separator . 'v=' . rawurlencode($version);
}

function mineacle_footer_link(mixed $url): string
{
    $value = trim((string) $url);

    if (str_starts_with($value, 'mailto:')) {
        $email = substr($value, 7);

        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $value : '#';
    }

    return mineacle_home_link($value);
}

$homeUrl = mineacle_page_home_url($site);
$leaderboardsUrl = mineacle_page_leaderboards_url($site);

$navLinks = [
    ['key' => 'home', 'url' => $homeUrl],
    ['key' => 'vote', 'url' => (string) ($site['vote_url'] ?? '#')],
    ['key' => 'stats', 'label' => 'Leaderboards', 'url' => $leaderboardsUrl],
    ['key' => 'bans', 'url' => (string) ($site['bans_url'] ?? '#')],
];

$storeLink = ['key' => 'store', 'url' => (string) ($site['store_url'] ?? '#')];
$currentNavKey = 'home';

$footerQuickLinks = [
    ['label' => 'Home', 'url' => $homeUrl],
    ['label' => 'Leaderboards', 'url' => $leaderboardsUrl],
    ['label' => 'Store', 'url' => (string) ($site['store_url'] ?? '#')],
    ['label' => 'Vote', 'url' => (string) ($site['vote_url'] ?? '#')],
];

$footerSocialLinks = [
    ['key' => 'discord', 'label' => 'Discord', 'url' => (string) ($site['discord_url'] ?? '#')],
    ['key' => 'x', 'label' => 'X/Twitter', 'url' => (string) ($site['x_url'] ?? '#')],
    ['key' => 'youtube', 'label' => 'YouTube', 'url' => (string) ($site['youtube_url'] ?? '#')],
];

$supportLink = trim((string) ($site['support_url'] ?? ''));

if ($supportLink === '') {
    $supportLink = filter_var($supportEmail, FILTER_VALIDATE_EMAIL) ? 'mailto:' . $supportEmail : '#';
}

$footerLegalLinks = [
    ['label' => 'Terms of Service', 'url' => (string) ($site['terms_url'] ?? '#')],
    ['label' => 'Privacy Policy', 'url' => (string) ($site['privacy_url'] ?? '#')],
    ['label' => 'Refund Policy', 'url' => (string) ($site['refund_url'] ?? '#')],
    ['label' => 'Support', 'url' => $supportLink],
];

$announcements = array_slice($home['announcements'], 0, 12);
$announcementCount = count($announcements);
$announcementCanSlide = $announcementCount > 3;
$announcementPageSize = 3;
$announcementPageCount = max(1, (int) ceil($announcementCount / $announcementPageSize));
$heroBackground = trim((string) ($home['hero']['background_image_url'] ?? ''));
$heroBackgroundUrl = mineacle_home_safe_url($heroBackground);
$heroBackgroundIsVideo = mineacle_home_is_video_url($heroBackgroundUrl);
$heroAssetVersion = mineacle_page_asset_version();

mineacle_page_head('Home');
?>
<div class="site-shell">
    <aside class="rail" aria-label="Primary navigation">
        <a class="rail-logo" href="<?php echo h($homeUrl); ?>" aria-label="Home">
            <img src="assets/brand/nav-logo-web.png" alt="">
        </a>

        <nav class="rail-nav" aria-label="Server links">
            <?php foreach ($navLinks as $link): ?>
                <?php $isActiveNavLink = (string) $link['key'] === $currentNavKey; ?>
                <a class="rail-link<?php echo $isActiveNavLink ? ' is-active' : ''; ?>" href="<?php echo h(mineacle_home_link($link['url'])); ?>" aria-label="<?php echo h((string) ($link['label'] ?? $link['key'])); ?>"<?php echo $isActiveNavLink ? ' aria-current="page"' : ''; ?>>
                    <?php echo mineacle_icon((string) $link['key']); ?>
                </a>
            <?php endforeach; ?>
            <?php $isStoreActive = (string) $storeLink['key'] === $currentNavKey; ?>
            <a class="rail-link rail-store-button<?php echo $isStoreActive ? ' is-active' : ''; ?>" href="<?php echo h(mineacle_home_link($storeLink['url'])); ?>" aria-label="Store"<?php echo $isStoreActive ? ' aria-current="page"' : ''; ?>>
                <?php echo mineacle_icon((string) $storeLink['key']); ?>
            </a>
        </nav>

        <div class="rail-social" aria-label="Social links">
            <a class="rail-link" href="<?php echo h(mineacle_home_link($site['discord_url'] ?? '#')); ?>" aria-label="Discord">
                <?php echo mineacle_icon('discord'); ?>
            </a>
            <a class="rail-link" href="<?php echo h(mineacle_home_link($site['x_url'] ?? '#')); ?>" aria-label="X">
                <?php echo mineacle_icon('x'); ?>
            </a>
        </div>
    </aside>

    <main class="home-grid" aria-label="Home layout">
        <section class="top-row">
            <article class="panel hero-panel"<?php echo $heroBackgroundIsVideo ? '' : mineacle_home_image_style($home['hero']['background_image_url'] ?? ''); ?> aria-label="Hero">
                <?php if ($heroBackground !== ''): ?>
                    <?php if ($heroBackgroundIsVideo): ?>
                        <video class="hero-background hero-background-video" data-hero-video autoplay muted loop playsinline preload="none" controlslist="nodownload noplaybackrate" disablepictureinpicture draggable="false" aria-hidden="true">
                            <source data-src="<?php echo h(mineacle_home_versioned_url($heroBackgroundUrl, $heroAssetVersion)); ?>" type="video/mp4">
                        </video>
                    <?php else: ?>
                        <img class="hero-background" src="<?php echo h($heroBackgroundUrl); ?>" alt="" draggable="false" aria-hidden="true">
                    <?php endif; ?>
                <?php endif; ?>
                <?php if (trim((string) ($home['hero']['image_url'] ?? '')) !== ''): ?>
                    <span class="panel-media"<?php echo mineacle_home_image_style($home['hero']['image_url'] ?? '', '--media-image'); ?>></span>
                <?php endif; ?>
                <div class="hero-copy">
                    <h1 class="hero-logo-title">
                        <img src="<?php echo h(mineacle_home_versioned_url('/assets/brand/hero-logo-web.png', $heroAssetVersion)); ?>" alt="Mineacle">
                    </h1>
                    <div class="hero-actions" aria-label="Server actions">
                        <button class="hero-action hero-action-primary hero-copy-ip" type="button" data-copy-server-ip data-server-ip="<?php echo h($minecraftIp); ?>" data-default-label="Play Now" data-copied-label="IP Copied" data-failed-label="Copy Failed" aria-label="Copy Mineacle server IP">
                            <span class="hero-action-icon-stack" aria-hidden="true">
                                <img class="hero-action-icon hero-action-icon-default" src="<?php echo h(mineacle_home_versioned_url('/assets/icons/play.svg', $heroAssetVersion)); ?>" alt="">
                                <img class="hero-action-icon hero-action-icon-copied" src="<?php echo h(mineacle_home_versioned_url('/assets/icons/check.svg', $heroAssetVersion)); ?>" alt="">
                            </span>
                            <span data-copy-server-label>Play Now</span>
                        </button>
                        <button class="hero-action hero-action-status is-loading" type="button" data-open-join-modal data-server-status data-status-format="hero-join" data-server-ip="<?php echo h($minecraftIp); ?>" aria-live="polite">
                            <span data-server-status-count>Join Players Online</span>
                        </button>
                    </div>
                </div>
                <span class="sr-only">Hero banner</span>
            </article>
        </section>

        <?php if ($announcementCount > 0): ?>
        <section class="announcements-section<?php echo $announcementCanSlide ? ' has-carousel' : ''; ?>" aria-label="Announcements">
            <div class="section-heading">
                <h2><span>Latest Server</span> <strong>Updates</strong></h2>
            </div>

            <div class="announcements-shell" data-announcement-carousel>
                <div class="announcements-viewport" data-announcement-track tabindex="0" aria-label="Announcement carousel">
                    <div class="announcements-grid">
                    <?php foreach ($announcements as $index => $announcement): ?>
                        <?php
                        $announcementUrl = mineacle_home_link($announcement['link_url'] ?? '#');
                        $announcementTag = trim((string) ($announcement['eyebrow'] ?? 'Update'));
                        $announcementTitle = trim((string) ($announcement['title'] ?? 'Announcement'));
                        $announcementBody = trim((string) ($announcement['body'] ?? 'More details will be posted soon.'));
                        $announcementContent = trim((string) ($announcement['content'] ?? ''));
                        $announcementImage = mineacle_home_safe_url($announcement['image_url'] ?? '');
                        $announcementHasContent = $announcementContent !== '';
                        $announcementHasLink = $announcementUrl !== '#';
                        ?>
                        <article class="announcement-card" data-announcement-card>
                            <?php if ($announcementImage !== ''): ?>
                                <img src="<?php echo h($announcementImage); ?>" alt="" loading="lazy" decoding="async" draggable="false">
                            <?php endif; ?>
                            <p><?php echo h($announcementTag !== '' ? $announcementTag : 'Update'); ?></p>
                            <h3><?php echo h($announcementTitle !== '' ? $announcementTitle : 'Announcement'); ?></h3>
                            <span><?php echo h($announcementBody !== '' ? $announcementBody : 'More details will be posted soon.'); ?></span>
                            <?php if ($announcementHasContent): ?>
                                <button type="button" data-open-announcement-modal data-announcement-title="<?php echo h($announcementTitle !== '' ? $announcementTitle : 'Announcement'); ?>" data-announcement-eyebrow="<?php echo h($announcementTag !== '' ? $announcementTag : 'Update'); ?>" data-announcement-summary="<?php echo h($announcementBody !== '' ? $announcementBody : 'More details will be posted soon.'); ?>" data-announcement-content="<?php echo h($announcementContent); ?>" data-announcement-image="<?php echo h($announcementImage); ?>" data-announcement-link="<?php echo h($announcementUrl); ?>">Read More</button>
                            <?php elseif ($announcementHasLink): ?>
                                <a href="<?php echo h($announcementUrl); ?>">Open Link</a>
                            <?php endif; ?>
                        </article>
                    <?php endforeach; ?>
                    </div>
                </div>

                <?php if ($announcementCanSlide): ?>
                    <div class="announcement-dots" aria-label="Announcement pages">
                        <?php for ($pageIndex = 0; $pageIndex < $announcementPageCount; $pageIndex++): ?>
                            <?php $targetIndex = min($announcementCount - 1, $pageIndex * $announcementPageSize); ?>
                            <button type="button" data-announcement-dot="<?php echo h((string) $targetIndex); ?>" aria-label="Go to announcement page <?php echo h((string) ($pageIndex + 1)); ?>"<?php echo $pageIndex === 0 ? ' class="is-active"' : ''; ?>></button>
                        <?php endfor; ?>
                    </div>
                <?php endif; ?>
            </div>
        </section>
        <?php endif; ?>

        <section class="creators-panel" aria-label="Creator videos">
            <div class="section-heading creators-heading">
                <h2 class="sr-only">Mineacle Creators</h2>
                <img class="creators-logo" src="/assets/brand/mineacle-creators-web.png" alt="" aria-hidden="true" draggable="false" loading="lazy" decoding="async">
            </div>
            <div class="creator-videos" data-creator-videos aria-live="polite"></div>
            <p class="creator-status" data-creator-status>Finding latest creator videos...</p>
        </section>

        <footer class="footer-panel" aria-label="Footer">
            <div class="footer-inner">
                <section class="footer-about" aria-label="Mineacle Studios">
                    <div class="footer-brand">
                        <img src="<?php echo h(mineacle_home_versioned_url('/assets/brand/mncl-studios-web.png', $heroAssetVersion)); ?>" alt="Mineacle Studios" draggable="false" loading="lazy" decoding="async">
                    </div>
                    <p>Mineacle Studios is a small team of Minecraft developers building the custom systems behind Mineacle. After over a year of trial, error, and refinement, we are creating a smooth, polished, community-driven survival experience while staying true to the Minecraft everyone already loves.</p>
                    <div class="footer-socials" aria-label="Social links">
                        <?php foreach ($footerSocialLinks as $link): ?>
                            <a href="<?php echo h(mineacle_home_link($link['url'])); ?>" aria-label="<?php echo h($link['label']); ?>">
                                <?php echo mineacle_icon((string) $link['key']); ?>
                            </a>
                        <?php endforeach; ?>
                    </div>
                </section>

                <nav class="footer-links" aria-label="Quick links">
                    <h2>Quick Links:</h2>
                    <?php foreach ($footerQuickLinks as $link): ?>
                        <a href="<?php echo h(mineacle_home_link($link['url'])); ?>"><?php echo h($link['label']); ?></a>
                    <?php endforeach; ?>
                </nav>

                <section class="footer-bug-panel" aria-label="Report a bug">
                    <a class="footer-bug-banner" href="<?php echo h(mineacle_footer_link($supportLink)); ?>">
                        <span>
                            <strong>Report a Bug</strong>
                            <small>Found an issue? Send it to Mineacle Studios.</small>
                        </span>
                        <img src="assets/brand/bug-mob-web.png" alt="" aria-hidden="true" draggable="false" loading="lazy" decoding="async">
                    </a>
                </section>

                <p class="footer-bottom">
                    <img src="assets/brand/nav-logo-web.png" alt="" aria-hidden="true">
                    <span>
                        Copyright © <?php echo h((string) $year); ?> Mineacle Studios. All Rights Reserved. Mineacle is not affiliated with or endorsed by Mojang Studios or Microsoft.
                        <span class="footer-policy-links">
                            <?php foreach ($footerLegalLinks as $link): ?>
                                <a href="<?php echo h(mineacle_footer_link($link['url'])); ?>"><?php echo h($link['label']); ?></a>
                            <?php endforeach; ?>
                        </span>
                    </span>
                </p>
            </div>
        </footer>
    </main>
</div>
<div class="announcement-modal" data-announcement-modal hidden>
    <div class="announcement-modal-backdrop" data-close-announcement-modal></div>
    <section class="announcement-modal-panel" role="dialog" aria-modal="true" aria-labelledby="announcementModalTitle" tabindex="-1">
        <button class="join-modal-close announcement-modal-close" type="button" data-close-announcement-modal aria-label="Close announcement"></button>
        <div class="announcement-modal-media" data-announcement-modal-media hidden>
            <img src="" alt="" data-announcement-modal-image draggable="false">
        </div>
        <div class="announcement-modal-copy">
            <p data-announcement-modal-eyebrow>Update</p>
            <h2 id="announcementModalTitle" data-announcement-modal-title>Announcement</h2>
            <p data-announcement-modal-summary></p>
            <div class="announcement-modal-body" data-announcement-modal-content></div>
            <a href="#" data-announcement-modal-link hidden>Open update</a>
        </div>
    </section>
</div>
<div class="join-modal" data-join-modal hidden>
    <div class="join-modal-backdrop" data-close-join-modal></div>
    <section class="join-modal-panel" role="dialog" aria-modal="true" aria-labelledby="joinModalTitle" tabindex="-1">
        <button class="join-modal-close" type="button" data-close-join-modal aria-label="Close how to join"></button>
        <div class="join-modal-copy">
            <p>Java Edition 1.21.11 to 26+</p>
            <h2 id="joinModalTitle">Join Mineacle</h2>
        </div>
        <div class="join-modal-media">
            <img data-join-gif data-src="<?php echo h(mineacle_home_versioned_url('/assets/brand/mineacle-how-to-join.gif', $heroAssetVersion)); ?>" alt="How to join Mineacle on Java Edition">
        </div>
        <div class="join-modal-actions">
            <p class="join-modal-ip"><span>Server IP:</span> <strong><?php echo h($minecraftIp); ?></strong></p>
            <button class="hero-action hero-action-primary hero-copy-ip join-modal-copy-ip" type="button" data-copy-server-ip data-server-ip="<?php echo h($minecraftIp); ?>" data-default-label="Copy IP" data-copied-label="IP Copied" data-failed-label="Copy Failed" aria-label="Copy Mineacle server IP">
                <span class="hero-action-icon-stack" aria-hidden="true">
                    <img class="hero-action-icon hero-action-icon-default" src="<?php echo h(mineacle_home_versioned_url('/assets/icons/play.svg', $heroAssetVersion)); ?>" alt="">
                    <img class="hero-action-icon hero-action-icon-copied" src="<?php echo h(mineacle_home_versioned_url('/assets/icons/check.svg', $heroAssetVersion)); ?>" alt="">
                </span>
                <span data-copy-server-label>Copy IP</span>
            </button>
        </div>
    </section>
</div>
<?php mineacle_page_end(); ?>
