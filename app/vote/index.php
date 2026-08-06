<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';
require_once __DIR__ . '/../shared/php/compact-footer.php';
require_once __DIR__ . '/../shared/php/auth.php';

mineacle_auth_private_headers();
$user = mineacle_auth_require_login('/vote');
$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$voteConfig = is_array($config['vote'] ?? null) ? $config['vote'] : [];
$rawSites = is_array($voteConfig['sites'] ?? null) ? $voteConfig['sites'] : [];
$sites = [];

foreach ($rawSites as $index => $rawSite) {
    if (!is_array($rawSite)) {
        continue;
    }

    $name = trim((string) ($rawSite['name'] ?? $rawSite['label'] ?? 'Vote Site ' . ($index + 1)));
    $url = mineacle_page_public_link($rawSite['url'] ?? '');

    if ($name === '' || $url === '#') {
        continue;
    }

    $sites[] = [
        'name' => $name,
        'url' => $url,
        'description' => trim((string) ($rawSite['description'] ?? 'Support Mineacle and receive the configured in-game reward.')),
        'reward' => trim((string) ($rawSite['reward'] ?? 'Vote reward')),
    ];
}

$profile = null;

try {
    $profile = mineacle_auth_profile_by_uuid(mineacle_auth_database(), (string) $user['uuid']);
} catch (Throwable) {
    $profile = null;
}

$displayName = trim((string) ($profile['display_name'] ?? $profile['username'] ?? $user['username']));
$assetVersion = (string) (is_file(__DIR__ . '/assets/css/vote.css') ? filemtime(__DIR__ . '/assets/css/vote.css') : 1);
$navigationCss = __DIR__ . '/../shared/assets/css/navigation.css';
$secondaryCss = __DIR__ . '/../shared/assets/css/secondary-pages.css';
$navigationJs = __DIR__ . '/../shared/assets/js/navigation.js';

mineacle_page_head('Vote', [
    'meta_title' => 'Vote | Mineacle',
    'meta_description' => 'Vote for Mineacle using your verified Minecraft account.',
    'canonical_url' => 'https://mineacle.net/vote',
    'stylesheets' => [
        '/shared/assets/css/navigation.css?rev=' . rawurlencode((string) (is_file($navigationCss) ? filemtime($navigationCss) : 1)),
        '/shared/assets/css/secondary-pages.css?rev=' . rawurlencode((string) (is_file($secondaryCss) ? filemtime($secondaryCss) : 1)),
        '/vote/assets/css/vote.css?rev=' . rawurlencode($assetVersion),
    ],
    'body_class' => 'mineacle-vote-page',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);
?>
<main class="vote-page">
    <section class="vote-hero" aria-labelledby="vote-title">
        <div class="vote-hero__surface">
            <?php mineacle_site_navigation($site, ['current_key' => 'vote']); ?>

            <div class="vote-hero__content">
                <div class="vote-hero__copy">
                    <span class="vote-kicker">Verified voting</span>
                    <h1 id="vote-title">Support Mineacle</h1>
                    <p>Vote while signed in to the Minecraft profile that will receive the reward. Your website identity is already linked to your in-game UUID.</p>
                </div>

                <div class="vote-player">
                    <img src="<?php echo h(mineacle_auth_bust_url((string) $user['uuid'], (string) $user['username'], 256)); ?>" alt="" width="144" height="144" draggable="false">
                    <div>
                        <span>Voting as</span>
                        <strong><?php echo h($displayName); ?></strong>
                        <small>Verified Minecraft account</small>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section class="vote-content" aria-label="Vote sites">
        <?php if ($sites === []): ?>
            <div class="vote-empty">
                <span>Vote links</span>
                <h2>Voting sites are being prepared.</h2>
                <p>Your account is verified and ready. Add vote sites under <code>vote.sites</code> in the website configuration to publish them here.</p>
            </div>
        <?php else: ?>
            <div class="vote-grid">
                <?php foreach ($sites as $siteEntry): ?>
                    <article class="vote-card">
                        <div>
                            <span><?php echo h($siteEntry['reward']); ?></span>
                            <h2><?php echo h($siteEntry['name']); ?></h2>
                            <p><?php echo h($siteEntry['description']); ?></p>
                        </div>
                        <a href="<?php echo h($siteEntry['url']); ?>" target="_blank" rel="noopener noreferrer">Vote Now</a>
                    </article>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </section>

    <?php mineacle_compact_footer($site); ?>
</main>
<?php mineacle_page_end([
    'scripts' => ['/shared/assets/js/navigation.js?rev=' . rawurlencode((string) (is_file($navigationJs) ? filemtime($navigationJs) : 1))],
]); ?>
