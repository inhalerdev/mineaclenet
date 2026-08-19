<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/components/page-start.php';
require_once __DIR__ . '/../shared/components/page-end.php';

$loggedIn = current_player();
$username = trim((string) ($_GET['username'] ?? ''));

if ($username === '' && isset($loggedIn['username']) && is_string($loggedIn['username'])) {
    $username = $loggedIn['username'];
}

if (!valid_player_name($username)) {
    header('Location: /leaderboard', true, 302);
    exit;
}

$stats = [
    ['Balance', '$8,421,550'],
    ['Playtime', '326 hours'],
    ['Kills', '1,942'],
    ['Deaths', '318'],
    ['Votes', '84'],
    ['Rank', 'Mineacle+'],
];

render_page_start($username);
?>
<section class="section-page">
    <p class="section-kicker">Player profile</p>
    <h1 class="section-title"><?= e($username) ?></h1>
    <p class="section-copy">Opened from player search, leaderboard results, bans entries or your signed-in account. The values below are mock data until the production statistics adapter is connected.</p>

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
