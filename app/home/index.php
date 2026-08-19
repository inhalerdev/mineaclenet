<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/components/page-start.php';
require_once __DIR__ . '/../shared/components/page-end.php';

$player = current_player();
$isLoggedIn = $player !== null;
$displayName = $isLoggedIn ? (string) $player['username'] : 'Explorer';
$serverAddress = (string) config('server_address', 'play.mineacle.net');

render_page_start('Home', 'home', ['/home/assets/css/home.css'], 'page-home');
?>
<section class="home-layout" aria-label="Mineacle home">
    <div class="hero-panel<?= $isLoggedIn ? ' is-authenticated' : ' is-guest' ?>">
        <div class="hero-copy">
            <div class="hero-eyebrow">
                <span class="status-dot" aria-hidden="true"></span>
                <?= $isLoggedIn ? 'Profile connected' : 'Mineacle Network online' ?>
            </div>

            <?php if ($isLoggedIn): ?>
                <h1 class="hero-title">Welcome back,<br><span class="accent-word"><?= e($displayName) ?></span></h1>
                <p>
                    Your Mineacle tools stay in the same place every visit. Open your profile, vote for rewards,
                    compare rankings or jump straight back into the server.
                </p>
            <?php else: ?>
                <h1 class="hero-title">Everything Mineacle.<br><span class="accent-word">One place.</span></h1>
                <p>
                    Join the server, track player progress, vote for rewards, review rankings and keep the most
                    useful Mineacle actions one click away.
                </p>
            <?php endif; ?>

            <div class="hero-actions">
                <button
                    class="button button-accent play-button"
                    type="button"
                    data-copy-server="<?= e($serverAddress) ?>"
                >
                    <?php render_icon('copy.png'); ?>
                    <span data-copy-label>Play now</span>
                </button>

                <?php if ($isLoggedIn): ?>
                    <a class="button button-primary" href="<?= e(player_profile_url($displayName)) ?>">
                        <?php render_icon('player.svg'); ?>
                        View my profile
                    </a>
                <?php else: ?>
                    <button class="button button-primary" type="button" data-login-open>
                        <?php render_icon('player.svg'); ?>
                        Player login
                    </button>
                <?php endif; ?>

                <a class="button button-secondary" href="/store">
                    <?php render_icon('store.png'); ?>
                    Store
                </a>
            </div>

            <div class="hero-meta" aria-label="Server information">
                <div class="meta-stat">
                    <strong><?= e($serverAddress) ?></strong>
                    <span>Java server address</span>
                </div>
                <div class="meta-stat">
                    <strong>1.21+</strong>
                    <span>Modern Minecraft support</span>
                </div>
                <div class="meta-stat">
                    <strong><?= $isLoggedIn ? 'Connected' : 'Public' ?></strong>
                    <span><?= $isLoggedIn ? 'Player session active' : 'Stats and moderation data' ?></span>
                </div>
            </div>
        </div>

        <div class="player-stage" data-skin-stage>
            <div class="skin-card">
                <div class="skin-toolbar">
                    <span class="skin-state"><span class="status-dot" aria-hidden="true"></span><?= $isLoggedIn ? 'Your profile' : 'Player preview' ?></span>
                    <span class="skin-badge"><?= $isLoggedIn ? 'SIGNED IN' : 'GUEST' ?></span>
                </div>

                <img src="/shared/assets/images/mock-skin.svg" alt="Mock Minecraft player skin">

                <div class="skin-label">
                    <span class="skin-avatar" aria-hidden="true"><?php render_icon('player.svg'); ?></span>
                    <span class="skin-label-copy">
                        <strong><?= e($displayName) ?></strong>
                        <small><?= $isLoggedIn ? 'Open your stats from here anytime' : 'Sign in to connect your player profile' ?></small>
                    </span>
                    <?php if ($isLoggedIn): ?>
                        <a class="skin-action" href="<?= e(player_profile_url($displayName)) ?>" aria-label="View <?= e($displayName) ?> profile">View</a>
                    <?php else: ?>
                        <button class="skin-action" type="button" data-login-open>Sign in</button>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <div class="quick-grid" aria-label="Featured links">
        <a class="quick-card" href="/vote">
            <span class="card-arrow" aria-hidden="true">↗</span>
            <span class="card-icon"><?php render_icon('vote.png'); ?></span>
            <div class="quick-copy">
                <span class="quick-kicker">REWARDS</span>
                <h2>Vote & earn</h2>
                <p>Support Mineacle and collect in-game rewards from a predictable daily flow.</p>
            </div>
        </a>

        <a class="quick-card" href="/leaderboard">
            <span class="card-arrow" aria-hidden="true">↗</span>
            <span class="card-icon"><?php render_icon('leaderboard.png'); ?></span>
            <div class="quick-copy">
                <span class="quick-kicker">RANKINGS</span>
                <h2>Leaderboard</h2>
                <p>Search players, compare progress and open any public player profile directly from rankings.</p>
            </div>
        </a>

        <a class="quick-card is-accent" href="/store">
            <span class="card-arrow" aria-hidden="true">↗</span>
            <span class="card-icon"><?php render_icon('store.png'); ?></span>
            <div class="quick-copy">
                <span class="quick-kicker">MINEACLE+</span>
                <h2>Upgrade your rank</h2>
                <p>Unlock premium quality-of-life perks while supporting continued server development.</p>
            </div>
        </a>
    </div>
</section>
<?php render_page_end(['/home/assets/js/home.js']); ?>
