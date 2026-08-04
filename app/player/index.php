<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';
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

    return [
        'uuid' => trim((string) ($player['uuid'] ?? '')),
        'username' => mineacle_stats_username($player),
        'display_name' => mineacle_stats_display_name($player),
        'ranked_name_html' => mineacle_stats_ranked_name_html($player, 'profile-ranked-name'),
        'rank_name' => mineacle_stats_rank_name($player),
        'rank_color' => mineacle_stats_rank_color($player),
        'skin_head' => trim((string) ($skin['head'] ?? '')),
        'skin_bust' => trim((string) (($skin['bust'] ?? '') ?: ($skin['chest'] ?? ''))),
        'online' => $statusView['online'],
        'status_label' => $statusView['label'],
        'location_label' => $statusView['line'],
        'secondary_status' => $statusView['secondary'],
        'world_name' => $statusView['world'],
        'last_seen' => $statusView['last_seen'],
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

function mineacle_profile_icon(string $name, string $className = ''): string
{
    $aliases = [
        'balance' => 'balance',
        'calendar' => 'playtime',
        'deaths' => 'deaths',
        'duels' => 'duels',
        'kills' => 'kills',
        'playtime' => 'playtime',
        'rank' => 'rank',
        'team' => 'team',
    ];
    $safeName = preg_replace('/[^a-z0-9-]/', '', strtolower($name)) ?: '';
    $assetName = $aliases[$safeName] ?? '';

    if ($assetName === '') {
        return '';
    }

    $classes = trim('profile-icon profile-icon--' . $assetName . ' ' . $className);

    return '<img class="' . h($classes) . '" src="/player/assets/icons/' . h($assetName) . '.png" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">';
}

function mineacle_profile_stat_item(
    string $label,
    string $value,
    string $icon,
    string $tone = 'main',
    string $subvalue = ''
): void {
    echo '<article class="profile-stat-card profile-stat-card--' . h($tone) . '">';
    echo '<span class="profile-stat-card__icon">' . mineacle_profile_icon($icon) . '</span>';
    echo '<span class="profile-stat-card__copy">';
    echo '<span class="profile-stat-card__label">' . h($label) . '</span>';
    echo '<strong class="profile-stat-card__value">' . h($value) . '</strong>';
    if ($subvalue !== '') {
        echo '<span class="profile-stat-card__subvalue">' . h($subvalue) . '</span>';
    }
    echo '</span>';
    echo '</article>';
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
    $class = mineacle_profile_world_class($world);

    return h($parts[0])
        . '<span class="profile-world-name ' . h($class) . '">' . h($world) . '</span>'
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

function mineacle_profile_duel_fighter_html(string $headHtml, string $name, mixed $hearts, string $className = ''): string
{
    $classes = trim('profile-duel-fighter ' . $className);

    return '<span class="' . h($classes) . '">'
        . '<span class="profile-duel-head">' . $headHtml . '</span>'
        . '<span class="profile-duel-copy">'
        . '<span class="profile-duel-name">' . h($name !== '' ? $name : 'Unknown Player') . '</span>'
        . mineacle_stats_hearts_html($hearts, 'duel-hearts')
        . '</span>'
        . '</span>';
}

function mineacle_profile_fight_row(array $fight, array $viewModel, int $index): void
{
    $result = strtoupper((string) ($fight['result'] ?? 'LOSS'));
    $isWin = $result === 'WIN';
    $opponentDisplay = trim((string) ($fight['opponent_display_name'] ?? 'Unknown Player'));
    $opponentSkin = is_array($fight['opponent_skin'] ?? null) ? $fight['opponent_skin'] : [];
    $playerHead = trim((string) ($viewModel['skin_head'] ?? ''));
    $playerHearts = $isWin ? ($fight['winner_hearts'] ?? 0) : ($fight['loser_hearts'] ?? 0);
    $opponentHearts = $isWin ? ($fight['loser_hearts'] ?? 0) : ($fight['winner_hearts'] ?? 0);
    $playerName = (string) ($viewModel['display_name'] ?? 'Player');
    $playerHeadHtml = $playerHead !== ''
        ? '<img src="' . h($playerHead) . '" alt="" loading="' . ($index < 4 ? 'eager' : 'lazy') . '" decoding="async" draggable="false" aria-hidden="true">'
        : '<span aria-hidden="true">' . h(strtoupper(substr($playerName, 0, 1))) . '</span>';
    $opponentHeadHtml = mineacle_profile_fight_head($opponentSkin, $opponentDisplay);

    echo '<article class="profile-duel-row ' . ($isWin ? 'is-win' : 'is-loss') . '">';
    echo '<span class="profile-duel-result">' . h($result) . '</span>';
    echo mineacle_profile_duel_fighter_html($playerHeadHtml, $playerName, $playerHearts, 'is-self');
    echo '<span class="profile-duel-vs">VS</span>';
    echo mineacle_profile_duel_fighter_html($opponentHeadHtml, $opponentDisplay, $opponentHearts, 'is-opponent');
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

$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';
$uniquePlayerCount = 0;

try {
    $uniquePlayerCount = mineacle_stats_unique_players_count();
} catch (Throwable) {
    // A profile remains usable while aggregate counts are unavailable.
}

$searchPlaceholder = $uniquePlayerCount > 0
    ? 'Search ' . number_format($uniquePlayerCount) . ' players across all dimensions'
    : 'Search players across all dimensions';
$searchLabel = $uniquePlayerCount > 0
    ? 'Search ' . number_format($uniquePlayerCount) . ' players across all Mineacle dimensions'
    : 'Search players across all Mineacle dimensions';

$assetVersion = mineacle_page_asset_version();
$siteStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/site.css') ?: $assetVersion);
$pagesStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/pages.css') ?: $assetVersion);
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/../home/assets/css/home.css') ?: $assetVersion);
$navigationStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/navigation.css') ?: $assetVersion);
$navigationScriptVersion = (string) (filemtime(__DIR__ . '/../shared/assets/js/navigation.js') ?: $assetVersion);
$playerStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/css/player.css') ?: $assetVersion);
$playerScriptVersion = (string) (filemtime(__DIR__ . '/assets/js/player.js') ?: $assetVersion);
$heroImagePath = __DIR__ . '/assets/images/hero.webp';
$hasHeroImage = is_file($heroImagePath);
$heroImageVersion = (string) ($hasHeroImage ? (filemtime($heroImagePath) ?: $assetVersion) : $assetVersion);
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
        '/shared/assets/css/pages.css?rev=' . rawurlencode($pagesStylesheetVersion),
        '/home/assets/css/home.css?rev=' . rawurlencode($homeStylesheetVersion),
        '/shared/assets/css/navigation.css?rev=' . rawurlencode($navigationStylesheetVersion),
        '/player/assets/css/player.css?rev=' . rawurlencode($playerStylesheetVersion),
    ],
    'body_class' => 'secondary-page player-page player-page--cinematic',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);

mineacle_page_head($pageTitle, $metaOptions);
?>
<main class="player-site" aria-label="Mineacle player profile">
    <section class="profile-hero<?php echo $hasHeroImage ? ' has-banner' : ''; ?>" aria-labelledby="profile-player-name">
        <?php if ($hasHeroImage): ?>
            <img
                class="profile-hero__image"
                src="/player/assets/images/hero.webp?rev=<?php echo h(rawurlencode($heroImageVersion)); ?>"
                alt=""
                width="1774"
                height="887"
                draggable="false"
                aria-hidden="true"
            >
        <?php endif; ?>

        <div class="profile-hero__surface">
            <?php mineacle_site_navigation($site, [
                'current_key' => 'leaderboards',
                'header_class' => 'player-header',
            ]); ?>

            <?php if ($viewModel !== null): ?>
                <?php $profileUrl = 'https://mineacle.net/player/' . rawurlencode((string) $viewModel['username']); ?>
                <div class="profile-hero__content">
                    <div class="profile-identity">
                        <p class="profile-eyebrow">Player Profile</p>
                        <h1 id="profile-player-name"><?php echo $viewModel['ranked_name_html']; ?></h1>

                        <div class="profile-presence">
                            <span class="profile-presence__badge <?php echo $viewModel['online'] ? 'is-online' : 'is-offline'; ?>">
                                <span aria-hidden="true"></span>
                                <?php echo h((string) $viewModel['status_label']); ?>
                            </span>
                            <span class="profile-presence__line">
                                <?php echo mineacle_profile_status_line_html((string) $viewModel['location_label'], (string) $viewModel['world_name']); ?>
                            </span>
                        </div>

                        <div class="profile-meta" aria-label="Player account details">
                            <span>
                                <?php echo mineacle_profile_icon('playtime'); ?>
                                <span><small>First Joined</small><strong><?php echo h((string) $viewModel['first_joined']); ?></strong></span>
                            </span>
                            <span>
                                <?php echo mineacle_profile_icon('team'); ?>
                                <span><small>Player Team</small><strong><?php echo h((string) $viewModel['team']['name']); ?></strong></span>
                            </span>
                            <span>
                                <?php echo mineacle_profile_icon('rank'); ?>
                                <span><small>Global Rank</small><strong><?php echo h((string) $viewModel['global_rank']); ?></strong></span>
                            </span>
                        </div>

                        <div class="profile-hero__actions">
                            <a class="profile-button profile-button--primary" href="<?php echo h($leaderboardsUrl); ?>">
                                <?php echo mineacle_profile_icon('rank'); ?>
                                <span>Leaderboards</span>
                            </a>
                            <button
                                class="profile-button profile-button--secondary"
                                type="button"
                                data-copy-profile
                                data-copy-value="<?php echo h($profileUrl); ?>"
                            >
                                <span data-profile-copy-label aria-live="polite">Copy Profile</span>
                            </button>
                        </div>
                    </div>

                    <div class="profile-skin-stage<?php echo $viewModel['skin_bust'] !== '' ? ' has-skin' : ''; ?>">
                        <?php if ($viewModel['skin_bust'] !== ''): ?>
                            <img
                                src="<?php echo h((string) $viewModel['skin_bust']); ?>"
                                alt=""
                                decoding="async"
                                draggable="false"
                                aria-hidden="true"
                                onerror="this.parentElement.classList.remove('has-skin');this.remove();"
                            >
                        <?php endif; ?>
                        <span class="profile-skin-fallback"><?php echo h(strtoupper(substr((string) $viewModel['display_name'], 0, 1))); ?></span>
                    </div>
                </div>
            <?php else: ?>
                <div class="profile-hero__state-copy">
                    <p class="profile-eyebrow">Player Profile</p>
                    <h1 id="profile-player-name">Mineacle Players</h1>
                    <p>Search the network for a player profile, global statistics, team information, and recent duel history.</p>
                </div>
            <?php endif; ?>
        </div>
    </section>

    <section class="player-tools" aria-label="Player search and server actions">
        <div class="search-shell player-search-shell">
            <form class="search-control" id="player-search" role="search" action="/player" method="get">
                <div class="search-field">
                    <img class="search-user-icon" src="/shared/assets/images/search/user.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
                    <label class="visually-hidden" for="site-search"><?php echo h($searchLabel); ?></label>
                    <input
                        id="site-search"
                        name="username"
                        type="search"
                        placeholder="<?php echo h($searchPlaceholder); ?>"
                        maxlength="64"
                        autocomplete="off"
                        autocapitalize="none"
                        spellcheck="false"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded="false"
                        aria-controls="home-player-suggestions"
                    >
                </div>
                <button class="search-submit" type="submit" aria-label="Search player" title="Search">
                    <img class="search-arrow-icon" src="/shared/assets/images/search/submit.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
                </button>
            </form>
            <div class="search-suggestions" id="home-player-suggestions" role="listbox" aria-label="Player suggestions" hidden></div>
        </div>

        <div class="player-tools__actions">
            <div
                class="header-status is-loading"
                id="home-server-status"
                data-server-ip="<?php echo h($minecraftIp); ?>"
                role="status"
                aria-live="polite"
                aria-label="Checking Mineacle server status"
                title="Checking server status"
            >
                <span class="header-status__dot" aria-hidden="true"></span>
                <span class="header-status__copy">
                    <span class="header-status__count" id="home-server-status-count">--</span>
                    <span class="header-status__label" id="home-server-status-label">Currently Playing</span>
                </span>
            </div>
            <button
                class="player-play-button"
                type="button"
                data-player-copy-server
                data-copy-value="<?php echo h($minecraftIp); ?>"
                aria-label="Copy Mineacle server address"
                title="Copy <?php echo h($minecraftIp); ?>"
            >
                <span data-player-copy-label aria-live="polite">Play</span>
            </button>
        </div>
    </section>

    <div class="player-content">
        <?php if ($loadError): ?>
            <section class="profile-message" aria-labelledby="profile-load-error-title">
                <p class="profile-eyebrow">Player Profile</p>
                <h2 id="profile-load-error-title">Unable to load player stats</h2>
                <p>Please check the Mineacle Core database connection, then try again.</p>
                <a class="profile-button profile-button--primary" href="<?php echo h($leaderboardsUrl); ?>">
                    <?php echo mineacle_profile_icon('rank'); ?>
                    <span>Leaderboards</span>
                </a>
            </section>
        <?php elseif ($viewModel === null): ?>
            <section class="profile-message" aria-labelledby="profile-not-found-title">
                <p class="profile-eyebrow">Player Profile</p>
                <h2 id="profile-not-found-title">Player not found</h2>
                <p>No stored Mineacle profile was found for <?php echo h($query !== '' ? $query : 'that player'); ?>.</p>
                <a class="profile-button profile-button--primary" href="<?php echo h($leaderboardsUrl); ?>">
                    <?php echo mineacle_profile_icon('rank'); ?>
                    <span>Leaderboards</span>
                </a>
            </section>
        <?php else: ?>
            <section class="profile-section profile-stats-section" aria-labelledby="profile-stats-title">
                <header class="profile-section-header">
                    <div class="profile-section-header__title">
                        <span class="profile-section-icon"><?php echo mineacle_profile_icon('rank'); ?></span>
                        <div>
                            <p class="profile-eyebrow">Performance</p>
                            <h2 id="profile-stats-title">Global Statistics</h2>
                        </div>
                    </div>
                    <span class="profile-section-header__note">Live from Mineacle Core</span>
                </header>

                <div class="profile-section__body">
                    <div class="profile-stats-grid">
                        <?php
                        mineacle_profile_stat_item('Current Balance', (string) $viewModel['balance'], 'balance', 'green', (string) $viewModel['money_rank'] . ' richest');
                        mineacle_profile_stat_item('Global Kills', (string) $viewModel['kills'], 'kills', 'main', (string) $viewModel['kills_rank'] . ' overall');
                        mineacle_profile_stat_item('Global Deaths', (string) $viewModel['deaths'], 'deaths', 'danger', 'K/D ' . (string) $viewModel['kd']);
                        mineacle_profile_stat_item('Global Playtime', (string) $viewModel['playtime'], 'playtime', 'secondary', (string) $viewModel['playtime_rank'] . ' overall');
                        mineacle_profile_stat_item('Player Team', (string) $viewModel['team']['name'], 'team', 'main', (string) $viewModel['team']['role']);
                        mineacle_profile_stat_item('Global Rank', (string) $viewModel['global_rank'], 'rank', 'secondary', (string) $viewModel['rank_name']);
                        ?>
                    </div>
                </div>
            </section>

            <section class="profile-section profile-duels-section" aria-labelledby="profile-duels-title">
                <header class="profile-section-header">
                    <div class="profile-section-header__title">
                        <span class="profile-section-icon"><?php echo mineacle_profile_icon('duels'); ?></span>
                        <div>
                            <p class="profile-eyebrow">Combat History</p>
                            <h2 id="profile-duels-title">Recent Duels</h2>
                        </div>
                    </div>
                    <span class="profile-section-header__note">Latest 16 recorded fights</span>
                </header>

                <div class="profile-section__body">
                    <?php if (!$fightState['available']): ?>
                        <div class="profile-duels-empty">
                            <span class="profile-duels-empty__icon"><?php echo mineacle_profile_icon('duels'); ?></span>
                            <strong>Fight history is temporarily unavailable</strong>
                            <span>Core data is connected, but the duel history source did not respond.</span>
                        </div>
                    <?php elseif (($fightState['fights'] ?? []) === []): ?>
                        <div class="profile-duels-empty">
                            <span class="profile-duels-empty__icon"><?php echo mineacle_profile_icon('duels'); ?></span>
                            <strong>No recorded fights yet</strong>
                            <span>Completed Mineacle duels will appear here automatically.</span>
                        </div>
                    <?php else: ?>
                        <div class="profile-duels-table">
                            <div class="profile-duels-head" aria-hidden="true">
                                <span>Result</span>
                                <span>Player</span>
                                <span></span>
                                <span>Opponent</span>
                                <span>World</span>
                                <span>Duration</span>
                                <span>Date</span>
                            </div>
                            <div class="profile-duels-list" aria-label="16 most recent duels">
                                <?php foreach ($fightState['fights'] as $index => $fight): ?>
                                    <?php if (is_array($fight)) mineacle_profile_fight_row($fight, $viewModel, (int) $index); ?>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>
            </section>
        <?php endif; ?>
    </div>

    <?php mineacle_page_footer($site); ?>
</main>
<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/site.js',
        '/shared/assets/js/navigation.js?rev=' . rawurlencode($navigationScriptVersion),
        '/player/assets/js/player.js?rev=' . rawurlencode($playerScriptVersion),
    ],
]); ?>
