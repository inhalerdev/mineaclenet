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
$summaryConfig = is_array($voteConfig['summary'] ?? null) ? $voteConfig['summary'] : [];
$rawSites = is_array($voteConfig['sites'] ?? null) ? $voteConfig['sites'] : [];
$rawMilestones = is_array($voteConfig['milestones'] ?? null) ? $voteConfig['milestones'] : [];
$sites = [];
$now = time();

foreach ($rawSites as $index => $rawSite) {
    if (!is_array($rawSite)) {
        continue;
    }

    $name = trim((string) ($rawSite['name'] ?? $rawSite['label'] ?? 'Vote Site ' . ($index + 1)));
    $url = mineacle_page_public_link($rawSite['url'] ?? '');

    if ($name === '' || $url === '#') {
        continue;
    }

    $cooldownHours = max(1, min(168, (int) ($rawSite['cooldown_hours'] ?? $rawSite['cooldown'] ?? 24)));
    $nextVoteAt = max(0, (int) ($rawSite['next_vote_at'] ?? 0));
    $available = array_key_exists('available', $rawSite)
        ? (bool) $rawSite['available']
        : ($nextVoteAt <= $now);
    $accent = strtolower(trim((string) ($rawSite['accent'] ?? '#8436fe')));

    if (preg_match('/^#[0-9a-f]{6}$/', $accent) !== 1) {
        $accent = '#8436fe';
    }

    $sites[] = [
        'name' => $name,
        'url' => $url,
        'description' => trim((string) ($rawSite['description'] ?? 'Support Mineacle and receive the configured in-game reward.')),
        'reward' => trim((string) ($rawSite['reward'] ?? 'Vote reward')),
        'cooldown_hours' => $cooldownHours,
        'next_vote_at' => $nextVoteAt,
        'available' => $available,
        'accent' => $accent,
        'initial' => strtoupper(substr(trim((string) ($rawSite['initial'] ?? $name)), 0, 1)),
    ];
}

$profile = null;

try {
    $profile = mineacle_auth_profile_by_uuid(mineacle_auth_database(), (string) $user['uuid']);
} catch (Throwable) {
    $profile = null;
}

$displayName = trim((string) ($profile['display_name'] ?? $profile['username'] ?? $user['username']));
$totalVotes = max(0, (int) ($profile['total_votes'] ?? $profile['votes'] ?? $summaryConfig['total_votes'] ?? 0));
$monthVotes = max(0, (int) ($profile['month_votes'] ?? $summaryConfig['month_votes'] ?? 0));
$streakDays = max(0, (int) ($profile['vote_streak'] ?? $summaryConfig['streak_days'] ?? 0));
$availableSites = count(array_filter($sites, static fn (array $entry): bool => $entry['available']));

if ($rawMilestones === []) {
    $rawMilestones = [
        ['votes' => 5, 'reward' => 'Vote Crate Key', 'icon' => '🔑'],
        ['votes' => 10, 'reward' => '$2,500 + Rare Key', 'icon' => '💰'],
        ['votes' => 25, 'reward' => 'Epic Crate Key + $5,000', 'icon' => '📦'],
        ['votes' => 50, 'reward' => 'Legendary Key + Title', 'icon' => '👑'],
        ['votes' => 100, 'reward' => 'Exclusive Rank Upgrade', 'icon' => 'UP'],
    ];
}

$milestones = [];

foreach ($rawMilestones as $rawMilestone) {
    if (!is_array($rawMilestone)) {
        continue;
    }

    $target = max(1, (int) ($rawMilestone['votes'] ?? $rawMilestone['target'] ?? 0));
    $reward = trim((string) ($rawMilestone['reward'] ?? 'Vote milestone reward'));

    if ($reward === '') {
        continue;
    }

    $milestones[] = [
        'target' => $target,
        'reward' => $reward,
        'icon' => trim((string) ($rawMilestone['icon'] ?? '◆')) ?: '◆',
    ];
}

usort($milestones, static fn (array $a, array $b): int => $a['target'] <=> $b['target']);
$currentMilestoneIndex = null;

foreach ($milestones as $index => $milestone) {
    if ($totalVotes < $milestone['target']) {
        $currentMilestoneIndex = $index;
        break;
    }
}

if ($currentMilestoneIndex === null && $milestones !== []) {
    $currentMilestoneIndex = array_key_last($milestones);
}

$currentMilestone = $currentMilestoneIndex !== null ? $milestones[$currentMilestoneIndex] : null;
$currentTarget = (int) ($currentMilestone['target'] ?? max(1, $totalVotes));
$currentRemaining = max(0, $currentTarget - $totalVotes);
$currentProgress = min(100, max(0, ($totalVotes / max(1, $currentTarget)) * 100));

$assetVersion = (string) max(
    (int) (is_file(__DIR__ . '/assets/css/vote.css') ? filemtime(__DIR__ . '/assets/css/vote.css') : 1),
    (int) (is_file(__DIR__ . '/assets/js/vote.js') ? filemtime(__DIR__ . '/assets/js/vote.js') : 1)
);
$navigationCss = __DIR__ . '/../shared/assets/css/navigation.css';
$secondaryCss = __DIR__ . '/../shared/assets/css/secondary-pages.css';
$navigationJs = __DIR__ . '/../shared/assets/js/navigation.js';
$heroPath = __DIR__ . '/../leaderboards/assets/images/hero.webp';
$heroVersion = (string) (is_file($heroPath) ? (filemtime($heroPath) ?: $assetVersion) : $assetVersion);

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
        <img class="vote-hero__image" src="/leaderboards/assets/images/hero.webp?rev=<?php echo h(rawurlencode($heroVersion)); ?>" alt="" aria-hidden="true" draggable="false">
        <div class="vote-hero__surface">
            <?php mineacle_site_navigation($site, ['current_key' => 'vote']); ?>

            <div class="vote-hero__copy">
                <span class="vote-kicker">Support the Server</span>
                <h1 id="vote-title">Vote</h1>
                <p>Vote on server listing sites to help Mineacle grow and earn in-game rewards.</p>
            </div>

            <div class="vote-hero__metrics" aria-label="Voting summary">
                <div><strong><?php echo h($availableSites . ' / ' . count($sites)); ?></strong><span>Sites Available</span></div>
                <div><strong><?php echo h($streakDays . ' ' . ($streakDays === 1 ? 'day' : 'days')); ?></strong><span>Your Streak</span></div>
                <div><strong><?php echo h(number_format($totalVotes)); ?></strong><span>Total Votes</span></div>
            </div>
        </div>
    </section>

    <section class="vote-summary" aria-label="Vote account summary">
        <article class="vote-summary__card is-green"><span>◆ Total Votes</span><strong><?php echo h(number_format($totalVotes)); ?></strong></article>
        <article class="vote-summary__card is-purple"><span>◉ This Month</span><strong><?php echo h(number_format($monthVotes)); ?></strong></article>
        <article class="vote-summary__card is-yellow"><span>＋ Vote Streak</span><strong><?php echo h($streakDays . ' ' . ($streakDays === 1 ? 'day' : 'days')); ?></strong></article>
        <article class="vote-summary__milestone">
            <header><span>Next Milestone</span><small><?php echo h(number_format($totalVotes) . ' / ' . number_format($currentTarget) . ' votes'); ?></small></header>
            <div class="vote-progress"><span style="width: <?php echo h(number_format($currentProgress, 2, '.', '')); ?>%"></span></div>
            <footer><strong><?php echo h((string) ($currentMilestone['icon'] ?? '◆') . ' ' . (string) ($currentMilestone['reward'] ?? 'All milestones complete')); ?></strong><small><?php echo h($currentRemaining . ' to go'); ?></small></footer>
        </article>
    </section>

    <section class="vote-sites" aria-labelledby="vote-sites-title">
        <header class="vote-sites__header">
            <div><h2 id="vote-sites-title">Voting Sites</h2><span><?php echo h($availableSites); ?> available · resets based on each listing site</span></div>
            <div class="vote-sites__legend"><span><i class="is-available"></i>Available</span><span><i class="is-cooldown"></i>Cooldown</span></div>
        </header>

        <?php if ($sites === []): ?>
            <div class="vote-empty">
                <span>Vote links</span>
                <h2>Voting sites are being prepared.</h2>
                <p>Your account is verified and ready. Add vote sites under <code>vote.sites</code> in the website configuration to publish them here.</p>
            </div>
        <?php else: ?>
            <div class="vote-grid">
                <?php foreach ($sites as $siteEntry): ?>
                    <article class="vote-card<?php echo $siteEntry['available'] ? ' is-available' : ' is-cooldown'; ?>" style="--vote-site-accent: <?php echo h($siteEntry['accent']); ?>" data-vote-card data-next-vote-at="<?php echo h((string) $siteEntry['next_vote_at']); ?>">
                        <header class="vote-card__header">
                            <span class="vote-card__initial"><?php echo h($siteEntry['initial']); ?></span>
                            <div><h3><?php echo h($siteEntry['name']); ?></h3><span>Cooldown: <?php echo h((string) $siteEntry['cooldown_hours']); ?>h</span></div>
                            <strong data-vote-state><?php echo $siteEntry['available'] ? 'Available' : 'Cooldown'; ?></strong>
                        </header>
                        <div class="vote-card__reward"><span>🎁 Reward:</span><strong><?php echo h($siteEntry['reward']); ?></strong></div>
                        <?php if ($siteEntry['available']): ?>
                            <a class="vote-card__action" href="<?php echo h($siteEntry['url']); ?>" target="_blank" rel="noopener noreferrer">Vote on <?php echo h($siteEntry['name']); ?></a>
                        <?php else: ?>
                            <div class="vote-card__cooldown">
                                <div><span>Next vote in</span><strong data-vote-countdown>Calculating…</strong></div>
                                <div class="vote-card__cooldown-bar"><span></span></div>
                                <button type="button" disabled>On Cooldown</button>
                            </div>
                        <?php endif; ?>
                    </article>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </section>

    <?php if ($milestones !== []): ?>
        <section class="vote-milestones" aria-labelledby="vote-milestones-title">
            <header><h2 id="vote-milestones-title">Vote Milestones</h2><span>Cumulative rewards for total votes</span></header>
            <div class="vote-milestones__head"><span>Votes</span><span>Reward</span><span>Status</span></div>
            <div class="vote-milestones__rows">
                <?php foreach ($milestones as $index => $milestone): ?>
                    <?php
                    $claimed = $totalVotes >= $milestone['target'];
                    $current = !$claimed && $index === $currentMilestoneIndex;
                    $remaining = max(0, $milestone['target'] - $totalVotes);
                    ?>
                    <article class="vote-milestone-row<?php echo $claimed ? ' is-claimed' : ($current ? ' is-current' : ''); ?>">
                        <strong><?php echo h(number_format($milestone['target'])); ?></strong>
                        <div><span><?php echo h($milestone['icon']); ?></span><strong><?php echo h($milestone['reward']); ?></strong><?php if ($current): ?><em>Current</em><?php endif; ?></div>
                        <span><?php echo $claimed ? '✓ Claimed' : ($current ? number_format($remaining) . ' left' : number_format($remaining) . ' away'); ?></span>
                    </article>
                <?php endforeach; ?>
            </div>
        </section>
    <?php endif; ?>

    <p class="vote-user-note">Signed in as <strong><?php echo h($displayName); ?></strong></p>

    <?php mineacle_compact_footer($site); ?>
</main>
<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation.js?rev=' . rawurlencode((string) (is_file($navigationJs) ? filemtime($navigationJs) : 1)),
        '/vote/assets/js/vote.js?rev=' . rawurlencode($assetVersion),
    ],
]); ?>
