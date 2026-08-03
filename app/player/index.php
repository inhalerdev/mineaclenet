<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/stats-lib.php';

$config = mineacle_config();
$site = $config['site'] ?? [];
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
    $rankName = mineacle_stats_rank_name($player);
    $statusView = mineacle_stats_status_view($player);
    $displayName = mineacle_stats_display_name($player);
    $username = mineacle_stats_username($player);
    $rankColor = mineacle_stats_rank_color($player);

    return [
        'uuid' => trim((string) ($player['uuid'] ?? '')),
        'username' => $username,
        'display_name' => $displayName,
        'ranked_name_html' => mineacle_stats_ranked_name_html($player, 'profile-ranked-name'),
        'rank_name' => $rankName,
        'rank_color' => $rankColor,
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

function mineacle_profile_stat_item(string $label, string $value, string $icon, string $alt = '', string $subvalue = ''): void
{
    echo '<article class="profile-summary-item">';
    echo '<span>' . h($label) . '</span>';
    echo '<strong>';
    if ($icon !== '') {
        echo '<img src="' . h($icon) . '" alt="' . h($alt) . '" draggable="false"> ';
    }
    echo '<span class="profile-summary-value">' . h($value);
    if ($subvalue !== '') {
        echo '<small>' . h($subvalue) . '</small>';
    }
    echo '</span></strong>';
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
    $result = (string) ($fight['result'] ?? 'LOSS');
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
    echo '<span class="profile-duel-vs">vs</span>';
    echo mineacle_profile_duel_fighter_html($opponentHeadHtml, $opponentDisplay, $opponentHearts, 'is-opponent');
    echo '<span class="profile-duel-world">' . h((string) ($fight['world_label'] ?? 'Survival')) . '</span>';
    echo '<span class="profile-duel-duration">' . h((string) ($fight['duration_label'] ?? '0s')) . '</span>';
    echo '<span class="profile-duel-date">' . h(mineacle_profile_fight_date_label($fight['ended_at'] ?? 0)) . '</span>';
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
    // Player profiles remain usable while aggregate statistics are unavailable.
}

$searchPlaceholder = $uniquePlayerCount > 0
    ? 'Search ' . number_format($uniquePlayerCount) . ' players across all dimensions'
    : 'Search players across all dimensions';
$searchLabel = $uniquePlayerCount > 0
    ? 'Search ' . number_format($uniquePlayerCount) . ' players across all Mineacle dimensions'
    : 'Search players across all Mineacle dimensions';

$siteUrl = static function (mixed $value, string $fallback): string {
    $resolved = mineacle_page_public_link($value);

    return $resolved === '#' ? $fallback : $resolved;
};

$navLinks = [
    ['key' => 'home', 'label' => 'Home', 'url' => '/', 'external' => false],
    ['key' => 'vote', 'label' => 'Vote', 'url' => '/vote', 'external' => false],
    ['key' => 'leaderboards', 'label' => 'Leaderboards', 'url' => '/leaderboards', 'external' => false],
    ['key' => 'bans', 'label' => 'Bans', 'url' => '/bans', 'external' => false],
    ['key' => 'store', 'label' => 'Store', 'url' => $siteUrl($site['store_url'] ?? '', 'https://store.mineacle.net/'), 'external' => true],
];
$socialLinks = [
    ['key' => 'x', 'label' => 'Mineacle on X', 'title' => 'X', 'url' => $siteUrl($site['x_url'] ?? '', 'https://x.com/mineaclenetwork')],
    ['key' => 'discord', 'label' => 'Mineacle Discord', 'title' => 'Discord', 'url' => $siteUrl($site['discord_url'] ?? '', 'https://discord.gg/qmpJ4xMguT')],
];
$currentNavKey = 'leaderboards';
$assetVersion = mineacle_page_asset_version();
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/site.css') ?: $assetVersion);
$pagesStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/pages.css') ?: $assetVersion);
$playerStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/css/player.css') ?: $assetVersion);
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
        '/shared/assets/css/site.css?rev=' . rawurlencode($homeStylesheetVersion),
        '/shared/assets/css/pages.css?rev=' . rawurlencode($pagesStylesheetVersion),
        '/player/assets/css/player.css?rev=' . rawurlencode($playerStylesheetVersion),
    ],
    'body_class' => 'secondary-page player-page',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);

mineacle_page_head($pageTitle, $metaOptions);
?>
<div class="canvas">
    <div class="interface-stage">
        <section class="interface" aria-label="Mineacle player profile">
            <aside class="sidebar" aria-label="Sidebar navigation">
                <a class="brand-link" href="/" aria-label="Mineacle home">
                    <img class="brand-mark" src="/shared/assets/images/navigation/logo.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" width="64" height="64" draggable="false">
                </a>

                <nav class="nav-stack nav-stack--upper" aria-label="Main">
                    <?php foreach ($navLinks as $link): ?>
                        <?php $isActiveNavLink = (string) $link['key'] === $currentNavKey; ?>
                        <a
                            class="square-button"
                            href="<?php echo h((string) $link['url']); ?>"
                            aria-label="<?php echo h((string) $link['label']); ?>"
                            title="<?php echo h((string) $link['label']); ?>"
                            <?php echo $isActiveNavLink ? 'aria-current="page"' : ''; ?>
                            <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                        >
                            <img class="nav-icon" src="/shared/assets/images/navigation/<?php echo h((string) $link['key']); ?>.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
                        </a>
                    <?php endforeach; ?>
                </nav>

                <nav class="nav-stack nav-stack--lower" aria-label="Social links">
                    <?php foreach ($socialLinks as $link): ?>
                        <a
                            class="social-link social-link--rail social-link--<?php echo h((string) $link['key']); ?>"
                            href="<?php echo h((string) $link['url']); ?>"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="<?php echo h((string) $link['label']); ?>"
                            title="<?php echo h((string) $link['title']); ?>"
                        >
                            <span class="social-logo social-logo--<?php echo h((string) $link['key']); ?>" aria-hidden="true"></span>
                        </a>
                    <?php endforeach; ?>
                </nav>
            </aside>

            <div class="content player-content">
                <div class="page-stack">
                <header class="topbar secondary-topbar">
                    <div class="search-shell">
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

                    <nav class="top-actions" aria-label="Header actions">
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
                        <button class="top-action top-action--play" id="play-button" type="button" data-copy-value="<?php echo h($minecraftIp); ?>" aria-label="Copy Mineacle server address" title="Copy <?php echo h($minecraftIp); ?>">
                            <span class="play-label" aria-live="polite">PLAY</span>
                        </button>
                    </nav>
                </header>

                    <main class="player-surface profile-page" aria-label="Player profile">
        <?php if ($loadError): ?>
            <section class="panel profile-message">
                <h1>Unable to load player stats right now</h1>
                <p>Please check the Mineacle Core database connection, then try again.</p>
            </section>
        <?php elseif ($viewModel === null): ?>
            <section class="panel profile-message">
                <h1>Player not found</h1>
                <p>No stored Mineacle profile was found for <?php echo h($query !== '' ? $query : 'that player'); ?>.</p>
                <a class="profile-message-link" href="<?php echo h($leaderboardsUrl); ?>">Back to leaderboards</a>
            </section>
        <?php else: ?>
            <section class="panel profile-main-panel" aria-label="<?php echo h((string) $viewModel['display_name']); ?> stats">
                <div class="profile-hero-content">
                    <div class="profile-bust-stage<?php echo $viewModel['skin_bust'] !== '' ? ' has-skin' : ''; ?>">
                        <?php if ($viewModel['skin_bust'] !== ''): ?>
                            <img src="<?php echo h((string) $viewModel['skin_bust']); ?>" alt="" draggable="false" aria-hidden="true" onerror="this.parentElement.classList.remove('has-skin');this.remove();">
                        <?php endif; ?>
                        <span class="profile-bust-fallback"><?php echo h(strtoupper(substr((string) $viewModel['display_name'], 0, 1))); ?></span>
                    </div>

                    <div class="profile-player-lockup">
                        <h1><?php echo $viewModel['ranked_name_html']; ?></h1>
                        <div class="profile-state-lines">
                            <p>
                                <strong class="<?php echo $viewModel['online'] ? 'is-online' : 'is-offline'; ?>"><?php echo h((string) $viewModel['status_label']); ?></strong>
                                <span><?php echo mineacle_profile_status_line_html((string) $viewModel['location_label'], (string) $viewModel['world_name']); ?></span>
                            </p>
                        </div>
                        <p class="profile-joined-date">Joined <?php echo h((string) $viewModel['first_joined']); ?></p>
                    </div>
                </div>

                <div class="profile-summary-bar" aria-label="Player stat summary">
                    <?php
                    mineacle_profile_stat_item('Current Balance', (string) $viewModel['balance'], '/player/assets/icons/balance.png?v=' . rawurlencode($assetVersion), 'Balance');
                    mineacle_profile_stat_item('Global Kills', (string) $viewModel['kills'], '/player/assets/icons/kills.png?v=' . rawurlencode($assetVersion), 'Kills');
                    mineacle_profile_stat_item('Global Deaths', (string) $viewModel['deaths'], '/player/assets/icons/deaths.png?v=' . rawurlencode($assetVersion), 'Deaths');
                    mineacle_profile_stat_item('Global Playtime', (string) $viewModel['playtime'], '/player/assets/icons/playtime.png?v=' . rawurlencode($assetVersion), 'Playtime');
                    mineacle_profile_stat_item('Player Team', (string) $viewModel['team']['name'], '/player/assets/icons/team.png?v=' . rawurlencode($assetVersion), 'Team', (string) $viewModel['team']['role']);
                    mineacle_profile_stat_item('Global Rank', (string) $viewModel['global_rank'], '/player/assets/icons/top-player.png?v=' . rawurlencode($assetVersion), 'Global rank');
                    ?>
                </div>
            </section>

            <section class="panel profile-recent-panel" aria-label="Recent fights">
                <header class="profile-section-heading">
                    <span><img src="/player/assets/icons/duels.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false"></span>
                    <h2>Recent Duels</h2>
                </header>

                <?php if (!$fightState['available']): ?>
                    <div class="profile-duels-empty">Fight history is temporarily unavailable</div>
                <?php elseif (($fightState['fights'] ?? []) === []): ?>
                    <div class="profile-duels-empty">No recorded fights yet</div>
                <?php else: ?>
                    <div class="profile-duels-table">
                        <div class="profile-duels-head" aria-hidden="true">
                            <span>Status</span>
                            <span>Player</span>
                            <span></span>
                            <span>Opponent</span>
                            <span>World</span>
                            <span>Duration</span>
                            <span>Date</span>
                        </div>
                        <div class="profile-duels-scroll" aria-label="16 most recent duels">
                            <?php foreach ($fightState['fights'] as $index => $fight): ?>
                                <?php if (is_array($fight)) mineacle_profile_fight_row($fight, $viewModel, (int) $index); ?>
                            <?php endforeach; ?>
                        </div>
                    </div>
                <?php endif; ?>
            </section>
        <?php endif; ?>
                    </main>
                    <?php mineacle_page_footer($site); ?>
                </div>
            </div>
        </section>
    </div>
</div>
<?php mineacle_page_end(['scripts' => ['/shared/assets/js/site.js']]); ?>
