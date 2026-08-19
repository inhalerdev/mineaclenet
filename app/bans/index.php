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
    <p class="section-copy">The public bans panel is isolated here so the final LiteBans or moderation database adapter can be added without coupling it to the homepage.</p>

    <table class="mock-table">
        <thead>
            <tr><th>Player</th><th>Reason</th><th>Duration</th><th>Issuer</th></tr>
        </thead>
        <tbody>
        <?php foreach ($rows as $row): ?>
            <tr>
                <?php foreach ($row as $cell): ?><td><?= e($cell) ?></td><?php endforeach; ?>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
</section>
<?php render_page_end(); ?>
