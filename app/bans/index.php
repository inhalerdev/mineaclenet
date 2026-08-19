<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/components/page-start.php';
require_once __DIR__ . '/../shared/components/page-end.php';

$rows = [
    ['Vandal', 'Cheating', 'Permanent', 'Staff'],
    ['BlockFox', 'Exploiting', '14 days', 'Staff'],
    ['Nocturne', 'Harassment', '7 days', 'Staff'],
];

render_page_start('Bans', 'bans');
?>
<section class="section-page">
    <p class="section-kicker">Public moderation</p>
    <h1 class="section-title">Transparent punishment history.</h1>
    <p class="section-copy">Select a player from a punishment entry or use the player search above to open a profile. The moderation data remains isolated for the future LiteBans adapter.</p>

    <div class="table-wrap">
        <table class="mock-table">
            <thead>
                <tr><th>Player</th><th>Reason</th><th>Duration</th><th>Issuer</th></tr>
            </thead>
            <tbody>
            <?php foreach ($rows as [$username, $reason, $duration, $issuer]): ?>
                <tr>
                    <td>
                        <a class="player-link" href="<?= e(player_profile_url($username)) ?>">
                            <?php render_icon('player.svg'); ?>
                            <?= e($username) ?>
                        </a>
                    </td>
                    <td><?= e($reason) ?></td>
                    <td><?= e($duration) ?></td>
                    <td><?= e($issuer) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</section>
<?php render_page_end(); ?>
