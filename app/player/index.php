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

function mineacle_profile_team_view_model(array $player, ?array $team): array
{
    $profileTeamName = mineacle_stats_team_name($player);
    $teamName = $team !== null ? trim((string) ($team['name'] ?? '')) : '';

    if ($teamName === '') {
        $teamName = $profileTeamName;
    }

    $hasTeam = $teamName !== '' && strcasecmp($teamName, 'No Team') !== 0;

    return [
        'has_team' => $hasTeam,
        'name' => $hasTeam ? $teamName : 'No Team',
        'role' => $hasTeam ? mineacle_stats_team_role($player) : 'None',
    ];
}

function mineacle_profile_view_model(array $player, ?array $team): array
{
    $skin = is_array($player['skin'] ?? null) ? $player['skin'] : [];
    $teamView = mineacle_profile_team_view_model($player, $team);
    $statusView = mineacle_stats_status_view($player);
    $rankName = trim(mineacle_stats_rank_name($player));
    $uuid = trim((string) ($player['uuid'] ?? ''));
    $username = mineacle_stats_username($player);
    $skinIdentifier = mineacle_stats_skin_identifier($uuid, $username);
    $fullBody = $skinIdentifier !== null
        ? mineacle_stats_skin_url('https://mc-heads.net/body/' . $skinIdentifier . '/512.png')
        : '';

    if ($fullBody === '') {
        $fullBody = trim((string) (($skin['bust'] ?? '') ?: ($skin['chest'] ?? '')));
    }

    return [
        'uuid' => $uuid,
        'username' => $username,
        'display_name' => mineacle_stats_display_name($player),
        'ranked_name_html' => mineacle_stats_ranked_name_html($player, 'profile-ranked-name'),
        'rank_name' => $rankName !== '' ? $rankName : 'Member',
        'skin_head' => trim((string) ($skin['head'] ?? '')),
        'skin_body' => $fullBody,
        'online' => $statusView['online'],
        'status_label' => $statusView['label'],
        'location_label' => $statusView['line'],
        'world_name' => $statusView['world'],
        'balance' => mineacle_stats_money_label($player),
        'kills' => number_format(mineacle_stats_int($player['kills'] ?? 0)),
        'deaths' => number_format(mineacle_stats_int($player['deaths'] ?? 0)),
        'kd' => mineacle_profile_kd($player),
        'playtime' => mineacle_stats_playtime_label($player),
        'money_rank' => mineacle_stats_rank_label($player['money_rank'] ?? 0),
        'kills_rank' => mineacle_stats_rank_label($player['kills_rank'] ?? 0),
        'playtime_rank' => mineacle_stats_rank_label($player['playtime_rank'] ?? 0),
        'global_rank' => mineacle_stats_rank_label($player['money_rank'] ?? 0),
        'first_joined' => mineacle_stats_date_label($player['first_joined_at'] ?? 0),
        'team' => $teamView,
    ];
}

function mineacle_profile_icon(string $name): string
{
    $allowed = ['balance', 'deaths', 'duels', 'kills', 'playtime', 'rank', 'team'];
    $safeName = preg_replace('/[^a-z0-9-]/', '', strtolower($name)) ?: '';

    if (!in_array($safeName, $allowed, true)) {
        return '';
    }

    $iconPath = __DIR__ . '/assets/icons/' . $safeName . '.png';
    $iconRevision = (string) (is_file($iconPath) ? (filemtime($iconPath) ?: mineacle_page_asset_version()) : mineacle_page_asset_version());

    return '<img class="profile-icon profile-icon--' . h($safeName) . '" src="/player/assets/icons/' . h($safeName) . '.png?rev=' . h(rawurlencode($iconRevision)) . '" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">';
}

function mineacle_profile_stat_has_value(string $value, array $unavailableLabels = []): bool
{
    $normalized = strtolower(trim($value));
    $unavailable = ['unknown', 'n/a', 'none', 'no data', '-', '—'];

    foreach ($unavailableLabels as $label) {
        $unavailable[] = strtolower(trim((string) $label));
    }

    return $normalized !== '' && !in_array($normalized, $unavailable, true);
}

function mineacle_profile_stat_item(
    string $label,
    string $value,
    string $icon,
    string $tone,
    string $detail = '',
    bool $available = true
): void {
    $classes = trim('profile-stat profile-stat--' . $tone . ($available ? '' : ' is-unavailable'));

    echo '<div class="' . h($classes) . '">';
    echo '<span class="profile-stat__icon">' . mineacle_profile_icon($icon) . '</span>';
    echo '<span class="profile-stat__copy">';
    echo '<span class="profile-stat__label">' . h($label) . '</span>';
    echo '<strong class="profile-stat__value">' . h($value !== '' ? $value : 'No data') . '</strong>';
    if ($detail !== '') {
        echo '<span class="profile-stat__detail">' . h($detail) . '</span>';
    }
    echo '</span>';
    echo '</div>';
}

function mineacle_profile_world_class(string $world): string
{
    $normalized = strtolower($world);

    if (str_contains($normalized, 'nether')) {
        return 'is-nether';
    }

    if (str_contains($normalized, 'end')) {
        return 'is-end';
    }

    if (str_contains($normalized, 'spawn')) {
        return 'is-spawn';
    }

    if (str_contains($normalized, 'overworld')) {
        return 'is-overworld';
    }

    return 'is-world';
}

function mineacle_profile_status_line_html(string $line, string $world): string
{
    $world = trim($world);

    if ($line === '' || $world === '' || !str_contains($line, $world)) {
        return h($line);
    }

    $parts = explode($world, $line, 2);

    return h($parts[0])
        . '<span class="profile-world-name ' . h(mineacle_profile_world_class($world)) . '">' . h($world) . '</span>'
        . h($parts[1] ?? '');
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
    echo '<span class="profile-duel-opponent-copy"><strong>' . h($opponentDisplay) . '</strong>' . mineacle_stats_hearts_html($opponentHearts, 'duel-hearts') . '</span>';
    echo '</span>';
    echo '<span class="profile-duel-detail"><small>World</small><strong>' . h((string) ($fight['world_label'] ?? 'Survival')) . '</strong></span>';
    echo '<span class="profile-duel-detail"><small>Duration</small><strong>' . h((string) ($fight['duration_label'] ?? '0s')) . '</strong></span>';
    echo '<span class="profile-duel-detail"><small>Date</small><strong>' . h(mineacle_profile_fight_date_label($fight['ended_at'] ?? 0)) . '</strong></span>';
    echo '</article>';
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
$pageTitle = $viewModel ? (string) $viewModel['display_name'] : 'Player';
$metaOptions = [];

if ($viewModel !== null) {
    $metaOptions = [
        'meta_title' => $viewModel['display_name'] . ' | Mineacle',
        'meta_description' => 'View ' . $viewModel['display_name'] . '\'s Mineacle stats, team, balance, combat record, playtime, and status.',
        'canonical_url' => 'https://mineacle.net/player/' . rawurlencode((string) $viewModel['username']),
    ];
} elseif (!$loadError) {
    $metaOptions = [
        'robots' => 'noindex,follow',
        'meta_description' => 'The requested Mineacle player profile could not be found.',
    ];
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
        <img
            class="profile-hero__image"
            src="/player/assets/images/hero.webp?rev=<?php echo h(rawurlencode($heroImageVersion)); ?>"
            alt=""
            width="2048"
            height="845"
            draggable="false"
            aria-hidden="true"
        >

        <div class="profile-hero__surface">
            <?php mineacle_site_navigation($site, [
                'current_key' => 'leaderboards',
                'header_class' => 'player-header',
            ]); ?>

            <?php if ($viewModel !== null): ?>
                <?php $profileUrl = 'https://mineacle.net/player/' . rawurlencode((string) $viewModel['username']); ?>
                <div class="profile-hero__layout">
                    <div class="profile-hero__copy">
                        <h1 id="profile-player-name"><?php echo $viewModel['ranked_name_html']; ?></h1>

                        <div class="profile-presence">
                            <span class="profile-presence__state <?php echo $viewModel['online'] ? 'is-online' : 'is-offline'; ?>">
                                <span aria-hidden="true"></span><?php echo h((string) $viewModel['status_label']); ?>
                            </span>
                            <span><?php echo mineacle_profile_status_line_html((string) $viewModel['location_label'], (string) $viewModel['world_name']); ?></span>
                        </div>

                        <div class="profile-meta" aria-label="Player details">
                            <span>Team <strong><?php echo h((string) $viewModel['team']['name']); ?></strong></span>
                            <span>Joined <strong><?php echo h((string) $viewModel['first_joined']); ?></strong></span>
                            <span>Global rank <strong><?php echo h((string) $viewModel['global_rank']); ?></strong></span>
                        </div>

                        <div class="profile-summary__actions">
                            <a class="profile-action" href="<?php echo h($leaderboardsUrl); ?>">Leaderboards</a>
                            <button class="profile-action profile-action--muted" type="button" data-copy-profile data-copy-value="<?php echo h($profileUrl); ?>">
                                <span data-profile-copy-label aria-live="polite">Copy link</span>
                            </button>
                        </div>
                    </div>

                    <div class="profile-skin-stage<?php echo $viewModel['skin_body'] !== '' ? ' has-skin' : ''; ?>" aria-hidden="true">
                        <?php if ($viewModel['skin_body'] !== ''): ?>
                            <img
                                src="<?php echo h((string) $viewModel['skin_body']); ?>"
                                alt=""
                                decoding="async"
                                draggable="false"
                                onerror="this.parentElement.classList.remove('has-skin');this.remove();"
                            >
                        <?php endif; ?>
                        <span class="profile-skin-fallback"><?php echo h(strtoupper(substr((string) $viewModel['display_name'], 0, 1))); ?></span>
                    </div>
                </div>
            <?php else: ?>
                <div class="profile-hero__layout profile-hero__layout--state">
                    <div class="profile-hero__copy">
                        <h1 id="profile-player-name">Mineacle Players</h1>
                        <p>View player statistics, team information, and recent duel history.</p>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </section>

    <div class="player-content">
        <?php if ($loadError): ?>
            <section class="profile-message" aria-labelledby="profile-load-error-title">
                <h2 id="profile-load-error-title">Unable to load player stats</h2>
                <p>Please check the Mineacle Core database connection, then try again.</p>
                <a class="profile-action" href="<?php echo h($leaderboardsUrl); ?>">Leaderboards</a>
            </section>
        <?php elseif ($viewModel === null): ?>
            <section class="profile-message" aria-labelledby="profile-not-found-title">
                <h2 id="profile-not-found-title">Player not found</h2>
                <p>No stored Mineacle profile was found for <?php echo h($query !== '' ? $query : 'that player'); ?>.</p>
                <a class="profile-action" href="<?php echo h($leaderboardsUrl); ?>">Leaderboards</a>
            </section>
        <?php else: ?>
            <section class="profile-panel" aria-labelledby="profile-stats-title">
                <header class="profile-panel__header">
                    <h2 id="profile-stats-title">Global Statistics</h2>
                    <span>Live data · updates every minute</span>
                </header>

                <div class="profile-stats-row" aria-label="Player statistics">
                    <?php
                    mineacle_profile_stat_item('Balance', (string) $viewModel['balance'], 'balance', 'balance', (string) $viewModel['money_rank'] . ' richest', mineacle_profile_stat_has_value((string) $viewModel['balance']));
                    mineacle_profile_stat_item(
                        'Team',
                        (string) $viewModel['team']['name'],
                        'team',
                        'team',
                        $viewModel['team']['has_team'] ? (string) $viewModel['team']['role'] : '',
                        (bool) $viewModel['team']['has_team']
                    );
                    mineacle_profile_stat_item('Kills', (string) $viewModel['kills'], 'kills', 'kills', (string) $viewModel['kills_rank'] . ' overall', mineacle_profile_stat_has_value((string) $viewModel['kills']));
                    mineacle_profile_stat_item('Deaths', (string) $viewModel['deaths'], 'deaths', 'deaths', 'K/D ' . (string) $viewModel['kd'], mineacle_profile_stat_has_value((string) $viewModel['deaths']));
                    mineacle_profile_stat_item('Playtime', (string) $viewModel['playtime'], 'playtime', 'playtime', (string) $viewModel['playtime_rank'] . ' overall', mineacle_profile_stat_has_value((string) $viewModel['playtime']));
                    ?>
                </div>
            </section>

            <section class="profile-panel" aria-labelledby="profile-duels-title">
                <header class="profile-panel__header">
                    <h2 id="profile-duels-title">Recent Duels</h2>
                    <span>Up to 16 recent fights</span>
                </header>

                <?php if (!$fightState['available']): ?>
                    <div class="profile-empty">
                        <strong>Fight history is temporarily unavailable</strong>
                        <span>The duel data source did not respond.</span>
                    </div>
                <?php elseif (($fightState['fights'] ?? []) === []): ?>
                    <div class="profile-empty">
                        <strong>No recorded fights yet</strong>
                        <span>Completed Mineacle duels will appear here automatically.</span>
                    </div>
                <?php else: ?>
                    <div class="profile-duels-table">
                        <div class="profile-duels-head" aria-hidden="true">
                            <span>Result</span><span>Opponent</span><span>World</span><span>Duration</span><span>Date</span>
                        </div>
                        <div class="profile-duels-list" aria-label="Recent duels">
                            <?php foreach ($fightState['fights'] as $fight): ?>
                                <?php if (is_array($fight)) mineacle_profile_fight_row($fight); ?>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endif; ?>
            </section>
        <?php endif; ?>
    </div>

    <?php mineacle_compact_footer($site); ?>
</main>
<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/navigation.js?rev=' . rawurlencode($navigationScriptVersion),
        '/player/js/player.js?rev=' . rawurlencode($playerScriptVersion),
    ],
]); ?>
