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
    <p class="section-copy">This is a layout-ready mock leaderboard. The data layer can later be wired to the same player statistics source used by the server.</p>

    <table class="mock-table">
        <thead>
            <tr><th>Rank</th><th>Player</th><th>Balance</th><th>Playtime</th></tr>
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
