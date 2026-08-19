<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/components/page-start.php';
require_once __DIR__ . '/../shared/components/page-end.php';

$player = current_player();
$displayName = $player['username'] ?? config('default_player', 'Explorer');
$serverAddress = (string) config('server_address', 'play.mineacle.net');

render_page_start('Home', 'home', ['/home/assets/css/home.css'], 'page-home');
?>
<section class="home-layout" aria-label="Mineacle home">
    <div class="hero-panel">
        <div class="hero-copy">
            <div class="hero-eyebrow">
                <span class="status-dot" aria-hidden="true"></span>
                Mineacle Network Online
            </div>

            <h1 class="hero-title">Your world.<br><span class="accent-word">Built better.</span></h1>

            <p>
                A focused Minecraft network built around progression, competition and quality-of-life systems.
                Jump in fast, track your profile and keep everything that matters one click away.
            </p>

            <div class="hero-actions">
                <button
                    class="button button-accent play-button"
                    type="button"
                    data-copy-server="<?= e($serverAddress) ?>"
                >
                    <?php render_icon('copy.png'); ?>
                    <span data-copy-label>Play now</span>
                </button>

                <a class="button button-secondary" href="/store">
                    <?php render_icon('store.png'); ?>
                    Upgrade rank
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
                    <strong>Mineacle+</strong>
                    <span>Extra in-game benefits</span>
                </div>
            </div>
        </div>

        <div class="player-stage" data-skin-stage>
            <div class="skin-halo" aria-hidden="true"></div>
            <div class="skin-card">
                <img src="/shared/assets/images/mock-skin.svg" alt="Mock Minecraft player skin">
                <div class="skin-label">
                    <span class="skin-label-copy">
                        <strong><?= e((string) $displayName) ?></strong>
                        <small><?= $player ? 'Signed in player' : 'Preview profile' ?></small>
                    </span>
                    <span class="skin-label-badge"><?= $player ? 'PROFILE' : 'MOCKUP' ?></span>
                </div>
            </div>
        </div>
    </div>

    <div class="quick-grid" aria-label="Featured links">
        <a class="quick-card" href="/vote">
            <span class="card-arrow" aria-hidden="true">↗</span>
            <span class="card-icon"><?php render_icon('vote.png'); ?></span>
            <h2>Vote & earn</h2>
            <p>Support the network and collect in-game vote rewards from one clean page.</p>
        </a>

        <a class="quick-card" href="/leaderboard">
            <span class="card-arrow" aria-hidden="true">↗</span>
            <span class="card-icon"><?php render_icon('leaderboard.png'); ?></span>
            <h2>Climb the leaderboard</h2>
            <p>Compare player progress, economy, combat and server-wide rankings.</p>
        </a>

        <a class="quick-card is-accent" href="/store">
            <span class="card-arrow" aria-hidden="true">↗</span>
            <span class="card-icon"><?php render_icon('store.png'); ?></span>
            <h2>Upgrade to Mineacle+</h2>
            <p>Unlock premium quality-of-life perks and help support continued development.</p>
        </a>
    </div>
</section>
<?php render_page_end(['/home/assets/js/home.js']); ?>
