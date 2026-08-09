<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';
require_once __DIR__ . '/../shared/php/compact-footer.php';
require_once __DIR__ . '/../shared/php/stats-lib.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$leaderboardsUrl = mineacle_page_leaderboards_url($site);
$directPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);
$directUsername = trim((string) ($_GET['username'] ?? ''));

if (in_array($directPath, ['/player.php', '/player/index.php'], true) && preg_match('/^[A-Za-z0-9_-]{1,64}$/', $directUsername) === 1) {
    header('Location: /player/' . rawurlencode($directUsername), true, 301);
    exit;
}

function mineacle_profile_requested_username(): string
{
    $query = trim((string) ($_GET['username'] ?? $_GET['name'] ?? $_GET['player'] ?? $_GET['search'] ?? ''));
    $pathInfo = trim((string) ($_SERVER['PATH_INFO'] ?? ''), '/');
    $requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);

    if ($query === '' && $pathInfo !== '') {
        $query = rawurldecode($pathInfo);
    }

    if ($query === '' && is_string($requestPath) && preg_match('#^/player/([^/]+)/?$#', $requestPath, $match) === 1) {
        $query = rawurldecode($match[1]);
    }

    return substr(trim($query), 0, 64);
}

function mineacle_profile_kd(array $player): string
{
    return mineacle_stats_kd_label(
        mineacle_stats_int($player['kills'] ?? 0),
        mineacle_stats_int($player['deaths'] ?? 0),
        $player['kd_ratio'] ?? 0
    );
}

function mineacle_profile_view_model(array $player, ?array $team): array
{
    $skin = is_array($player['skin'] ?? null) ? $player['skin'] : [];
    $statusView = mineacle_stats_status_view($player);
    $uuid = trim((string) ($player['uuid'] ?? ''));
    $username = mineacle_stats_username($player);
    $bustRender = mineacle_stats_mc_api_path($uuid, $username, 'bust', 640) ?? '';

    if ($bustRender === '') {
        $bustRender = trim((string) (($skin['bust'] ?? '') ?: ($skin['chest'] ?? '')));
    }

    $profileTeamName = mineacle_stats_team_name($player);
    $teamName = $team !== null ? trim((string) ($team['name'] ?? '')) : '';

    if ($teamName === '') {
        $teamName = $profileTeamName;
    }

    $hasTeam = $teamName !== '' && strcasecmp($teamName, 'No Team') !== 0;
    $rankView = mineacle_stats_rank_view($player);
    $rankKey = strtolower(trim((string) ($rankView['key'] ?? 'default')));

    $rankName = match ($rankKey) {
        'plus' => 'Mineacle +',
        'admin' => 'Admin',
        default => '',
    };

    return [
        'uuid' => $uuid,
        'username' => $username,
        'display_name' => mineacle_stats_display_name($player),
        'rank_key' => $rankKey,
        'rank_name' => $rankName,
        'skin_body' => $bustRender,
        'online' => (bool) $statusView['online'],
        'status_label' => (string) $statusView['label'],
        'location_label' => (string) $statusView['line'],
        'world_name' => (string) $statusView['world'],
        'balance' => mineacle_stats_money_label($player),
        'balance_cents' => mineacle_stats_int($player['balance_cents'] ?? 0),
        'kills' => mineacle_stats_int($player['kills'] ?? 0),
        'deaths' => mineacle_stats_int($player['deaths'] ?? 0),
        'kd' => mineacle_profile_kd($player),
        'playtime' => mineacle_stats_playtime_label($player),
        'global_rank' => mineacle_stats_rank_label($player['money_rank'] ?? 0),
        'first_joined' => mineacle_stats_date_label($player['first_joined_at'] ?? 0),
        'team_name' => $hasTeam ? $teamName : 'No Team',
        'team_role' => $hasTeam ? mineacle_stats_team_role($player) : '',
    ];
}

function mineacle_profile_fight_head(array $skin, string $name): string
{
    $url = trim((string) ($skin['head'] ?? ''));

    if ($url !== '') {
        return '<img src="' . h($url) . '" alt="" loading="lazy" decoding="async" draggable="false" aria-hidden="true">';
    }

    return '<span aria-hidden="true">' . h(strtoupper(substr($name !== '' ? $name : '?', 0, 1))) . '</span>';
}

function mineacle_profile_fight_date_label(mixed $timestamp): string
{
    $value = mineacle_stats_int($timestamp);

    if ($value <= 0) {
        return 'Unknown';
    }

    if ($value > 9999999999) {
        $value = (int) floor($value / 1000);
    }

    return date('n/j/Y', $value);
}

function mineacle_profile_fight_row(array $fight): void
{
    $result = strtoupper((string) ($fight['result'] ?? 'LOSS'));
    $isWin = $result === 'WIN';
    $opponentDisplay = trim((string) ($fight['opponent_display_name'] ?? 'Unknown Player'));
    $opponentSkin = is_array($fight['opponent_skin'] ?? null) ? $fight['opponent_skin'] : [];
    $opponentHearts = $isWin ? ($fight['loser_hearts'] ?? 0) : ($fight['winner_hearts'] ?? 0);

    echo '<article class="profile-duel-row ' . ($isWin ? 'is-win' : 'is-loss') . '">';
    echo '<span class="profile-duel-result">' . h($result) . '</span>';
    echo '<span class="profile-duel-opponent">';
    echo '<span class="profile-duel-head">' . mineacle_profile_fight_head($opponentSkin, $opponentDisplay) . '</span>';
    echo '<span><strong>' . h($opponentDisplay) . '</strong>' . mineacle_stats_hearts_html($opponentHearts, 'duel-hearts') . '</span>';
    echo '</span>';
    echo '<span><small>World</small><strong>' . h((string) ($fight['world_label'] ?? 'Survival')) . '</strong></span>';
    echo '<span><small>Duration</small><strong>' . h((string) ($fight['duration_label'] ?? '0s')) . '</strong></span>';
    echo '<span><small>Date</small><strong>' . h(mineacle_profile_fight_date_label($fight['ended_at'] ?? 0)) . '</strong></span>';
    echo '</article>';
}

function mineacle_profile_chart_bars(array $fights, float $fallback): array
{
    $ordered = array_slice(array_reverse($fights), -7);
    $values = [];
    $score = max(0.5, min(8.0, $fallback));

    if ($ordered === []) {
        $values = array_fill(0, 7, $score);
    } else {
        foreach ($ordered as $fight) {
            if (!is_array($fight)) {
                continue;
            }

            $score += strtoupper((string) ($fight['result'] ?? 'LOSS')) === 'WIN' ? 0.55 : -0.35;
            $score = max(0.35, min(8.0, $score));
            $values[] = $score;
        }

        while (count($values) < 7) {
            array_unshift($values, $values[0]);
        }
    }

    $minimum = min($values);
    $maximum = max($values);
    $range = max(0.5, $maximum - $minimum);

    return array_map(
        static fn (float $value): float => 24.0 + ((($value - $minimum) / $range) * 76.0),
        $values
    );
}

$query = mineacle_profile_requested_username();
$validUsername = preg_match('/^[A-Za-z0-9_-]{1,64}$/', $query) === 1;
$player = null;
$team = null;
$loadError = false;

if ($validUsername) {
    try {
        $player = mineacle_stats_profile_by_username($query);
        $team = is_array($player) ? mineacle_stats_team_by_profile($player) : null;
    } catch (Throwable) {
        $loadError = true;
    }
}

if ($loadError) {
    http_response_code(503);
} elseif (!$validUsername || !$player) {
    http_response_code(404);
}

$assetVersion = mineacle_page_asset_version();
$siteStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/site.css') ?: $assetVersion);
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/../home/assets/css/home.css') ?: $assetVersion);
$navigationStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/navigation.css') ?: $assetVersion);
$secondaryPagesStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/secondary-pages.css') ?: $assetVersion);
$navigationScriptVersion = (string) (filemtime(__DIR__ . '/../shared/assets/js/navigation.js') ?: $assetVersion);
$playerStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/css/player.css') ?: $assetVersion);
$playerScriptVersion = (string) (filemtime(__DIR__ . '/js/player.js') ?: $assetVersion);
$heroImagePath = __DIR__ . '/assets/images/hero.webp';
$heroImageVersion = (string) (is_file($heroImagePath) ? (filemtime($heroImagePath) ?: $assetVersion) : $assetVersion);
$viewModel = $player ? mineacle_profile_view_model($player, $team) : null;
$fightState = $viewModel !== null ? mineacle_stats_recent_fights((string) $viewModel['uuid'], 16) : ['available' => true, 'fights' => []];
$fights = is_array($fightState['fights'] ?? null) ? $fightState['fights'] : [];
$fightWins = count(array_filter($fights, static fn (mixed $fight): bool => is_array($fight) && strtoupper((string) ($fight['result'] ?? 'LOSS')) === 'WIN'));
$fightTotal = count($fights);
$pageTitle = $viewModel ? (string) $viewModel['display_name'] : 'Player';
$metaOptions = [];

if ($viewModel !== null) {
    $metaOptions = [
        'meta_title' => $viewModel['display_name'] . ' | Mineacle',
        'meta_description' => 'View ' . $viewModel['display_name'] . '\'s Mineacle stats, team, balance, combat record, playtime, and status.',
        'canonical_url' => 'https://mineacle.net/player/' . rawurlencode((string) $viewModel['username']),
    ];
} elseif (!$loadError) {
    $metaOptions = ['robots' => 'noindex,follow', 'meta_description' => 'The requested Mineacle player profile could not be found.'];
}

$metaOptions = array_merge($metaOptions, [
    'stylesheets' => [
        '/shared/assets/css/site.css?rev=' . rawurlencode($siteStylesheetVersion),
        '/home/assets/css/home.css?rev=' . rawurlencode($homeStylesheetVersion),
        '/shared/assets/css/navigation.css?rev=' . rawurlencode($navigationStylesheetVersion),
        '/shared/assets/css/secondary-pages.css?rev=' . rawurlencode($secondaryPagesStylesheetVersion),
        '/player/assets/css/player.css?rev=' . rawurlencode($playerStylesheetVersion),
    ],
    'body_class' => 'secondary-page player-page',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);

mineacle_page_head($pageTitle, $metaOptions);
?>
<main class="player-site" aria-label="Mineacle player profile">
    <section class="profile-hero" aria-labelledby="profile-player-name">
        <img class="profile-hero__image" src="/player/assets/images/hero.webp?rev=<?php echo h(rawurlencode($heroImageVersion)); ?>" alt="" width="2048" height="845" draggable="false" aria-hidden="true">
        <div class="profile-hero__surface">
            <?php mineacle_site_navigation($site, ['current_key' => '', 'header_class' => 'player-header']); ?>

            <?php if ($viewModel !== null): ?>
                <?php
                $profileUrl = 'https://mineacle.net/player/' . rawurlencode((string) $viewModel['username']);
                $followKey = trim((string) $viewModel['uuid']) !== '' ? strtolower((string) $viewModel['uuid']) : strtolower((string) $viewModel['username']);
                ?>
                <div class="profile-hero__layout">
                    <div class="profile-identity">
                        <div class="profile-identity__topline">
                            <?php if ((string) $viewModel['rank_name'] !== ''): ?>
                                <span class="profile-rank-badge is-rank-ready is-rank-<?php echo h((string) $viewModel['rank_key']); ?>"><?php echo h((string) $viewModel['rank_name']); ?></span>
                            <?php endif; ?>
                            <span class="profile-presence <?php echo $viewModel['online'] ? 'is-online' : 'is-offline'; ?>"><i aria-hidden="true"></i><?php echo h((string) $viewModel['status_label']); ?></span>
                            <?php if (!$viewModel['online']): ?>
                                <span class="profile-last-seen"><?php echo h((string) $viewModel['location_label']); ?></span>
                            <?php endif; ?>
                        </div>
                        <h1 id="profile-player-name"><?php echo h((string) $viewModel['display_name']); ?></h1>
                        <div class="profile-identity__meta"><span><?php echo h((string) ($viewModel['team_role'] !== '' ? $viewModel['team_role'] . ' · ' : '') . (string) $viewModel['team_name']); ?></span><span>Member since <?php echo h((string) $viewModel['first_joined']); ?></span></div>
                        <div class="profile-actions">
                            <button class="profile-action profile-action--follow" type="button" data-follow-profile data-follow-key="<?php echo h($followKey); ?>" aria-pressed="false"><span data-follow-label>Follow</span></button>
                            <button class="profile-action profile-action--muted" type="button" data-copy-profile data-copy-value="<?php echo h($profileUrl); ?>"><span data-profile-copy-label aria-live="polite">Copy Link</span></button>
                        </div>
                    </div>

                    <div class="profile-skin-stage<?php echo $viewModel['skin_body'] !== '' ? ' has-skin' : ''; ?>" aria-hidden="true">
                        <?php if ($viewModel['skin_body'] !== ''): ?>
                            <img src="<?php echo h((string) $viewModel['skin_body']); ?>" class="profile-skin-stage__render" alt="" width="640" height="640" decoding="async" draggable="false" onerror="this.parentElement.classList.remove('has-skin');this.remove();">
                        <?php endif; ?>
                        <span class="profile-skin-fallback"><?php echo h(strtoupper(substr((string) $viewModel['display_name'], 0, 1))); ?></span>
                    </div>

                    <aside class="profile-global-rank">
                        <span>Global Rank</span>
                        <strong><?php echo h((string) $viewModel['global_rank']); ?></strong>
                        <small>of all ranked players</small>
                        <div><span style="width: 72%"></span></div>
                    </aside>
                </div>
            <?php else: ?>
                <div class="profile-hero__state"><h1 id="profile-player-name">Mineacle Players</h1><p>View player statistics, team information, and recent duel history.</p></div>
            <?php endif; ?>
        </div>
    </section>

    <?php if ($loadError): ?>
        <section class="profile-message"><h2>Unable to load player stats</h2><p>Please check the Mineacle Core database connection, then try again.</p><a class="profile-action" href="<?php echo h($leaderboardsUrl); ?>">Leaderboards</a></section>
    <?php elseif ($viewModel === null): ?>
        <section class="profile-message"><h2>Player not found</h2><p>No stored Mineacle profile was found for <?php echo h($query !== '' ? $query : 'that player'); ?>.</p><a class="profile-action" href="<?php echo h($leaderboardsUrl); ?>">Leaderboards</a></section>
    <?php else: ?>
        <section class="profile-stats-strip" aria-label="Player statistics">
            <article class="is-balance"><span>Balance</span><strong><?php echo h((string) $viewModel['balance']); ?></strong></article>
            <article class="is-kills"><span>Kills</span><strong><?php echo h(number_format((int) $viewModel['kills'])); ?></strong></article>
            <article class="is-deaths"><span>Deaths</span><strong><?php echo h(number_format((int) $viewModel['deaths'])); ?></strong></article>
            <article class="is-kd"><span>K/D Ratio</span><strong><?php echo h((string) $viewModel['kd']); ?></strong></article>
            <article class="is-playtime"><span>Playtime</span><strong><?php echo h((string) $viewModel['playtime']); ?></strong></article>
            <article class="is-fights"><span>Fights Won</span><strong><?php echo h($fightWins . '/' . max(0, $fightTotal)); ?></strong></article>
        </section>

        <?php
        $balanceAmount = max(0.0, ((int) $viewModel['balance_cents']) / 100);
        $balanceGoal = max(50000, (int) (ceil(max(1, $balanceAmount) / 50000) * 50000));
        if ($balanceGoal <= $balanceAmount) $balanceGoal += 50000;
        $balanceProgress = min(100, ($balanceAmount / max(1, $balanceGoal)) * 100);
        $chartBars = mineacle_profile_chart_bars($fights, (float) $viewModel['kd']);
        ?>
        <section class="profile-overview" id="overview" aria-label="Player overview">
            <article class="profile-overview-card profile-combat-card">
                <header><h2>Combat Form — Recent</h2><span>avg <?php echo h((string) $viewModel['kd']); ?></span></header>
                <div class="profile-trend-bars" role="img" aria-label="Recent combat form trend">
                    <?php foreach ($chartBars as $barHeight): ?>
                        <span style="height: <?php echo h(number_format((float) $barHeight, 2, '.', '')); ?>%"></span>
                    <?php endforeach; ?>
                </div>
            </article>

            <article class="profile-overview-card profile-balance-card">
                <header><h2>Balance Milestone</h2></header>
                <div class="profile-balance-card__value"><strong><?php echo h((string) $viewModel['balance']); ?></strong><span>$<?php echo h(number_format($balanceGoal)); ?> goal</span></div>
                <div class="profile-balance-progress"><span style="width: <?php echo h(number_format($balanceProgress, 2, '.', '')); ?>%"></span></div>
                <p><?php echo h(number_format($balanceProgress, 0)); ?>% toward next milestone</p>
                <footer><div><span>Team</span><strong><?php echo h((string) $viewModel['team_name']); ?></strong></div><div><span>Fight wins</span><strong><?php echo h(number_format($fightWins)); ?></strong></div></footer>
            </article>
        </section>

        <section class="profile-duels" id="fights" aria-labelledby="profile-duels-title">
            <header><div><h2 id="profile-duels-title">Recent Fights &amp; Duels</h2><span>Up to 16 completed fights</span></div><a href="<?php echo h($leaderboardsUrl); ?>">View Rankings</a></header>

            <?php if (!$fightState['available']): ?>
                <div class="profile-empty"><strong>Fight history is temporarily unavailable</strong><span>The duel data source did not respond.</span></div>
            <?php elseif ($fights === []): ?>
                <div class="profile-empty"><strong>No recorded fights yet</strong><span>Completed Mineacle duels will appear here automatically.</span></div>
            <?php else: ?>
                <div class="profile-duels-table"><div class="profile-duels-head"><span>Result</span><span>Opponent</span><span>World</span><span>Duration</span><span>Date</span></div><div class="profile-duels-list"><?php foreach ($fights as $fight): ?><?php if (is_array($fight)) mineacle_profile_fight_row($fight); ?><?php endforeach; ?></div></div>
            <?php endif; ?>
        </section>
    <?php endif; ?>

    <?php mineacle_compact_footer($site); ?>
</main>
<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation.js?rev=' . rawurlencode($navigationScriptVersion),
        '/player/js/player.js?rev=' . rawurlencode($playerScriptVersion),
    ],
]); ?>
