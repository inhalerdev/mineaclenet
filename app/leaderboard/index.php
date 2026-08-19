<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/components/page-start.php';
require_once __DIR__ . '/../shared/components/page-end.php';

$rows = [
    ['1', 'Aether', '$12,845,220', '412h'],
    ['2', 'Kairo', '$10,731,540', '389h'],
    ['3', 'Nova', '$9,912,104', '361h'],
    ['4', 'Vex', '$8,443,800', '347h'],
    ['5', 'Rune', '$7,955,410', '330h'],
];

render_page_start('Leaderboard', 'leaderboard');
?>
<section class="section-page">
    <p class="section-kicker">Global rankings</p>
    <h1 class="section-title">See who is leading Mineacle.</h1>
    <p class="section-copy">Search from the bar above or select any player below to open their public profile. The current values are mock data for the foundation build.</p>

    <div class="table-wrap">
        <table class="mock-table">
            <thead>
                <tr><th>Rank</th><th>Player</th><th>Balance</th><th>Playtime</th></tr>
            </thead>
            <tbody>
            <?php foreach ($rows as [$rank, $username, $balance, $playtime]): ?>
                <tr>
                    <td><?= e($rank) ?></td>
                    <td>
                        <a class="player-link" href="<?= e(player_profile_url($username)) ?>">
                            <?php render_icon('player.svg'); ?>
                            <?= e($username) ?>
                        </a>
                    </td>
                    <td><?= e($balance) ?></td>
                    <td><?= e($playtime) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</section>
<?php render_page_end(); ?>
