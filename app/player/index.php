<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/components/page-start.php';
require_once __DIR__ . '/../shared/components/page-end.php';

$loggedIn = current_player();
$username = (string) ($_GET['username'] ?? ($loggedIn['username'] ?? 'Explorer'));
if (preg_match('/^[A-Za-z0-9_]{3,16}$/', $username) !== 1) {
    $username = 'Explorer';
}

$stats = [
    ['Balance', '$8,421,550'],
    ['Playtime', '326 hours'],
    ['Kills', '1,942'],
    ['Deaths', '318'],
    ['Votes', '84'],
    ['Rank', 'Mineacle+'],
];

render_page_start($username, 'player');
?>
<section class="section-page">
    <p class="section-kicker">Player profile</p>
    <h1 class="section-title"><?= e($username) ?></h1>
    <p class="section-copy">This profile is intentionally mocked for the foundation build. It is structured to accept real stats without changing the page shell.</p>

    <div class="content-grid">
        <?php foreach ($stats as [$label, $value]): ?>
            <article class="panel-card">
                <p><?= e($label) ?></p>
                <h2><?= e($value) ?></h2>
            </article>
        <?php endforeach; ?>
    </div>
</section>
<?php render_page_end(); ?>
