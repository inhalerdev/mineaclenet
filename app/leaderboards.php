<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/stats-lib.php';

$config = mineacle_config();
$site = $config['site'] ?? [];
$directPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);

if ($directPath === '/leaderboards.php') {
    $queryString = trim((string) ($_SERVER['QUERY_STRING'] ?? ''));
    header('Location: https://mineacle.net/leaderboards' . ($queryString !== '' ? '?' . $queryString : ''), true, 301);
    exit;
}

$rawCategory = strtolower(trim((string) ($_GET['category'] ?? '')));
$legacyView = strtolower(trim((string) ($_GET['view'] ?? '')));
$legacyScope = strtolower(trim((string) ($_GET['scope'] ?? '')));
$category = $rawCategory !== '' ? $rawCategory : ($legacyView === 'teams' ? 'teams' : 'players');
$view = str_replace('_', '-', $legacyView !== '' && $legacyView !== 'teams' ? $legacyView : $legacyScope);
$search = trim(substr((string) ($_GET['search'] ?? ''), 0, 64));
$requestedPage = max(1, (int) ($_GET['page'] ?? 1));
$perPage = 25;

$categories = [
    'players' => [
        'label' => 'Players',
        'views' => [
            'overall' => [
                'label' => 'Overall',
                'title' => 'Top Players',
                'description' => 'Top players ranked by balance, kills, K/D, playtime, and username.',
                'table' => 'players',
                'sort' => 'overall',
                'max' => 100,
            ],
            'richest' => [
                'label' => 'Richest',
                'title' => 'Richest Players',
                'description' => 'Players with the strongest personal economy standings.',
                'table' => 'players',
                'sort' => 'money',
                'max' => 100,
            ],
            'kd' => [
                'label' => 'Top K/D',
                'title' => 'Best Player K/D',
                'description' => 'Players ranked by global K/D. Players need at least 25 kills to qualify.',
                'table' => 'players',
                'sort' => 'kd_qualified',
                'max' => 100,
            ],
        ],
    ],
    'teams' => [
        'label' => 'Teams',
        'views' => [
            'overall' => [
                'label' => 'Overall',
                'title' => 'Top Teams',
                'description' => 'Teams ranked by capital, K/D, kills, members, and name.',
                'table' => 'teams',
                'sort' => 'overall',
                'max' => 50,
            ],
            'richest' => [
                'label' => 'Richest',
                'title' => 'Richest Teams',
                'description' => 'Teams controlling the most capital on Mineacle.',
                'table' => 'teams',
                'sort' => 'balance',
                'max' => 50,
            ],
            'kd' => [
                'label' => 'Top K/D',
                'title' => 'Best Team K/D',
                'description' => 'Qualified team K/D rankings. Teams need at least 25 total kills to appear here.',
                'table' => 'teams',
                'sort' => 'kd_qualified',
                'max' => 50,
            ],
        ],
    ],
];

if ($category === 'economy') {
    $category = $view === 'teams' ? 'teams' : 'players';
    $view = 'richest';
} elseif ($category === 'combat') {
    $category = in_array($view, ['teams', 'team-kd'], true) ? 'teams' : 'players';
    $view = 'kd';
}

if (!isset($categories[$category])) {
    $category = 'players';
}

if ($category === 'players' && in_array($view, ['money', 'balance'], true)) {
    $view = 'richest';
} elseif ($category === 'players' && in_array($view, ['kills', 'deaths', 'player-kd', 'global-kd'], true)) {
    $view = 'kd';
} elseif ($category === 'teams' && in_array($view, ['money', 'balance'], true)) {
    $view = 'richest';
} elseif ($category === 'teams' && in_array($view, ['kills', 'deaths', 'team-kd', 'global-kd'], true)) {
    $view = 'kd';
}

$views = $categories[$category]['views'];
$defaultView = (string) array_key_first($views);
$view = isset($views[$view]) ? $view : $defaultView;
$selected = $views[$view];
$tableMode = (string) $selected['table'];
$sort = (string) $selected['sort'];
$maxResults = (int) $selected['max'];
$players = [];
$teams = [];
$topRows = [];
$loadError = false;
$totalAvailable = 0;
$resultTotal = 0;
$page = $requestedPage;
$offset = 0;

try {
    $totalAvailable = $tableMode === 'teams'
        ? mineacle_stats_teams_count($sort, $search)
        : mineacle_stats_players_count($sort, $search);
    $resultTotal = min($totalAvailable, $maxResults);
    $totalPages = max(1, (int) ceil(max(1, $resultTotal) / $perPage));
    $page = min($requestedPage, $totalPages);
    $offset = ($page - 1) * $perPage;
    $limit = max(0, min($perPage, $maxResults - $offset));

    if ($tableMode === 'teams') {
        $teams = $limit > 0 ? mineacle_stats_teams($limit, $offset, $sort, $search) : [];
        $topRows = mineacle_stats_teams(3, 0, $sort);
    } else {
        $players = $limit > 0 ? mineacle_stats_players($limit, $offset, $sort, $search) : [];
        $topRows = mineacle_stats_players(3, 0, $sort);
    }
} catch (Throwable) {
    $loadError = true;
    $totalPages = 1;
}

function mineacle_players_profile_url(array $player): string
{
    return '/player/' . rawurlencode(mineacle_stats_username($player));
}

function mineacle_leaderboards_url(string $category, string $view = '', string $search = '', int $page = 1): string
{
    $params = ['category' => $category];

    if ($view !== '') {
        $params['view'] = $view;
    }

    if ($search !== '') {
        $params['search'] = $search;
    }

    if ($page > 1) {
        $params['page'] = $page;
    }

    return '/leaderboards?' . http_build_query($params);
}

function mineacle_leaderboards_money_from_cents(int $cents): string
{
    return '$' . number_format($cents / 100, 2);
}

function mineacle_leaderboards_team_name(array $team): string
{
    $name = trim((string) ($team['name'] ?? ''));

    return $name !== '' ? $name : 'Unnamed Team';
}

function mineacle_leaderboards_team_money(array $team): string
{
    $formatted = trim((string) ($team['balance_formatted'] ?? ''));

    if ($formatted !== '') {
        return $formatted;
    }

    $cents = mineacle_stats_int($team['balance_cents'] ?? 0);

    if ($cents > 0) {
        return mineacle_leaderboards_money_from_cents($cents);
    }

    $balance = mineacle_stats_float($team['balance'] ?? 0);

    return '$' . number_format($balance, 2);
}

function mineacle_leaderboards_team_online_label(array $team): string
{
    $online = mineacle_stats_int($team['online_members'] ?? 0);
    $members = mineacle_stats_int($team['members'] ?? 0);

    return number_format($online) . ' / ' . number_format($members);
}

function mineacle_leaderboards_team_caption(array $team): string
{
    $onlineMembers = is_array($team['online_member_list'] ?? null) ? $team['online_member_list'] : [];
    $names = [];

    foreach ($onlineMembers as $member) {
        if (!is_array($member)) {
            continue;
        }

        $name = trim((string) ($member['display_name'] ?? ''));

        if ($name === '') {
            $name = trim((string) ($member['username'] ?? ''));
        }

        if ($name !== '') {
            $names[] = $name;
        }
    }

    if ($names !== []) {
        $shown = array_slice($names, 0, 3);
        $remaining = count($names) - count($shown);

        return 'Online: ' . implode(', ', $shown) . ($remaining > 0 ? ' +' . $remaining : '');
    }

    $owner = trim((string) ($team['owner_name'] ?? ''));

    return $owner !== '' ? 'Owner: ' . $owner : 'Team profile';
}

function mineacle_leaderboards_kd(int $kills, int $deaths, mixed $stored = null): string
{
    $ratio = mineacle_stats_float($stored);

    if ($ratio <= 0 && ($kills > 0 || $deaths > 0)) {
        $ratio = $kills / max(1, $deaths);
    }

    return number_format($ratio, 2);
}

function mineacle_leaderboards_player_head(array $player): string
{
    $skin = is_array($player['skin'] ?? null) ? $player['skin'] : [];

    return trim((string) ($skin['head'] ?? ''));
}

function mineacle_leaderboards_top_name(array $row, string $mode): string
{
    return $mode === 'teams' ? mineacle_leaderboards_team_name($row) : mineacle_stats_display_name($row);
}

function mineacle_leaderboards_top_metric(array $row, string $mode, string $sort): string
{
    if ($mode === 'teams') {
        if ($sort === 'kd_qualified' || $sort === 'kd') {
            return 'K/D ' . mineacle_leaderboards_kd(mineacle_stats_int($row['kills'] ?? 0), mineacle_stats_int($row['deaths'] ?? 0), $row['kd_ratio'] ?? 0);
        }

        if ($sort === 'kills') {
            return number_format(mineacle_stats_int($row['kills'] ?? 0)) . ' kills';
        }

        return mineacle_leaderboards_team_money($row) . ' capital';
    }

    if ($sort === 'kills') {
        return number_format(mineacle_stats_int($row['kills'] ?? 0)) . ' kills';
    }

    if ($sort === 'kd_qualified' || $sort === 'kd') {
        return 'K/D ' . mineacle_leaderboards_kd(mineacle_stats_int($row['kills'] ?? 0), mineacle_stats_int($row['deaths'] ?? 0), $row['kd_ratio'] ?? 0);
    }

    return mineacle_stats_money_label($row);
}

function mineacle_leaderboards_team_initial(array $team): string
{
    $name = mineacle_leaderboards_team_name($team);

    return strtoupper(substr($name, 0, 1));
}

function mineacle_leaderboards_category_icon(string $category, string $assetVersion): string
{
    $icons = [
        'players' => '/assets/player/top-player.png',
        'teams' => '/assets/player/team.png',
    ];
    $file = $icons[$category] ?? '/assets/player/top-player.png';

    return $file . '?v=' . rawurlencode($assetVersion);
}

$siteUrl = static function (mixed $value, string $fallback): string {
    $resolved = mineacle_page_public_link($value);

    return $resolved === '#' ? $fallback : $resolved;
};

$navLinks = [
    ['key' => 'home', 'label' => 'Home', 'url' => '/', 'external' => false],
    ['key' => 'vote', 'label' => 'Vote', 'url' => '/vote', 'external' => false],
    ['key' => 'stats', 'label' => 'Leaderboards', 'url' => '/leaderboards', 'external' => false],
    ['key' => 'bans', 'label' => 'Bans', 'url' => '/bans', 'external' => false],
    ['key' => 'store', 'label' => 'Store', 'url' => $siteUrl($site['store_url'] ?? '', 'https://store.mineacle.net/'), 'external' => true],
];
$socialLinks = [
    ['key' => 'x', 'label' => 'Mineacle on X', 'title' => 'X', 'url' => $siteUrl($site['x_url'] ?? '', 'https://x.com/mineaclenetwork')],
    ['key' => 'discord', 'label' => 'Mineacle Discord', 'title' => 'Discord', 'url' => $siteUrl($site['discord_url'] ?? '', 'https://discord.gg/qmpJ4xMguT')],
];
$currentNavKey = 'stats';
$rows = $tableMode === 'teams' ? $teams : $players;
$hasResults = $rows !== [];
$shownStart = $hasResults ? $offset + 1 : 0;
$shownEnd = $hasResults ? min($offset + count($rows), $resultTotal) : 0;
$topTitle = 'Top 3 ' . ($tableMode === 'teams' ? 'Teams' : 'Players');
$leaderboardTitle = (string) $selected['title'];
$leaderboardDescription = (string) $selected['description'];
$assetVersion = mineacle_page_asset_version();
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/home.css') ?: $assetVersion);
$pagesStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/pages.css') ?: $assetVersion);
$leaderboardsStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/leaderboards.css') ?: $assetVersion);
$minecraftIp = trim((string) ($site['minecraft_ip'] ?? 'mineacle.net')) ?: 'mineacle.net';
$uniquePlayerCount = 0;

try {
    $uniquePlayerCount = mineacle_stats_unique_players_count();
} catch (Throwable) {
    // Keep the navigation search available while aggregate stats are offline.
}

$headerSearchPlaceholder = $uniquePlayerCount > 0
    ? 'Search ' . number_format($uniquePlayerCount) . ' players across all dimensions'
    : 'Search players across all dimensions';
$headerSearchLabel = $uniquePlayerCount > 0
    ? 'Search ' . number_format($uniquePlayerCount) . ' players across all Mineacle dimensions'
    : 'Search players across all Mineacle dimensions';

mineacle_page_head('Leaderboards', [
    'meta_title' => 'Leaderboards | Mineacle',
    'meta_description' => 'Explore Mineacle global player and team rankings across economy, combat, and playtime.',
    'canonical_url' => 'https://mineacle.net/leaderboards',
    'stylesheets' => [
        '/assets/home.css?rev=' . rawurlencode($homeStylesheetVersion),
        '/assets/pages.css?rev=' . rawurlencode($pagesStylesheetVersion),
        '/assets/leaderboards.css?rev=' . rawurlencode($leaderboardsStylesheetVersion),
    ],
    'body_class' => 'secondary-page leaderboards-page',
    'external_fonts' => false,
    'theme_color' => '#000000',
]);
?>
<div class="canvas">
    <div class="interface-stage">
        <section class="interface" aria-label="Mineacle leaderboards">
            <aside class="sidebar" aria-label="Sidebar navigation">
                <a class="brand-link" href="/" aria-label="Mineacle home">
                    <img class="brand-mark" src="/assets/home/mineacle-mark.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" width="64" height="64" draggable="false">
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
                            <img class="nav-icon" src="/assets/home/nav-<?php echo h((string) $link['key']); ?>.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
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

            <div class="content">
                <div class="page-stack">
                <header class="topbar secondary-topbar">
                    <div class="search-shell">
                        <form class="search-control" id="player-search" role="search" action="/player" method="get">
                            <div class="search-field">
                                <img class="search-user-icon" src="/assets/home/search-user.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
                                <label class="visually-hidden" for="site-search"><?php echo h($headerSearchLabel); ?></label>
                                <input
                                    id="site-search"
                                    name="username"
                                    type="search"
                                    placeholder="<?php echo h($headerSearchPlaceholder); ?>"
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
                                <img class="search-arrow-icon" src="/assets/home/search-submit.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
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

                        <main class="leaderboard-page" aria-label="Leaderboards">
        <section class="panel leaderboard-overview" aria-label="Leaderboard overview">
            <div class="leaderboard-hero-content">
                <div class="leaderboard-copy">
                    <h1>Leaderboards</h1>
                    <p>Follow Mineacle’s global standings across economy, combat efficiency, playtime, and team performance. Switch between players and teams, compare the strongest records, and open any player profile for the story behind their rank.</p>
                </div>

                <aside class="leaderboard-top-card" aria-label="<?php echo h($topTitle); ?>">
                    <header class="leaderboard-top-heading">
                        <span class="leaderboard-top-heading-icon" aria-hidden="true">
                            <img src="<?php echo h(mineacle_leaderboards_category_icon($category, $assetVersion)); ?>" alt="" draggable="false">
                        </span>
                        <span>
                            <strong><?php echo h($topTitle); ?></strong>
                        </span>
                    </header>
                    <div class="leaderboard-top-list">
                        <?php if ($topRows === []): ?>
                            <article class="leaderboard-top-entry">
                                <span class="leaderboard-top-rank">--</span>
                                <span class="leaderboard-top-avatar" aria-hidden="true">?</span>
                                <span><strong>Pending</strong><small>Waiting for stats</small></span>
                            </article>
                        <?php else: ?>
                            <?php foreach ($topRows as $index => $entry): ?>
                                <?php
                                $rank = $index + 1;
                                $head = $tableMode === 'players' ? mineacle_leaderboards_player_head($entry) : '';
                                ?>
                                <?php if ($tableMode === 'players'): ?>
                                    <a class="leaderboard-top-entry is-rank-<?php echo h((string) $rank); ?>" href="<?php echo h(mineacle_players_profile_url($entry)); ?>">
                                        <span class="leaderboard-top-rank">#<?php echo h((string) $rank); ?></span>
                                        <span class="leaderboard-top-avatar<?php echo $head !== '' ? ' has-player-head' : ''; ?>" aria-hidden="true">
                                            <?php if ($head !== ''): ?>
                                                <img src="<?php echo h($head); ?>" alt="" loading="lazy" decoding="async" draggable="false">
                                            <?php else: ?>
                                                ?
                                            <?php endif; ?>
                                        </span>
                                        <span>
                                            <span class="leaderboard-top-name"><?php echo mineacle_stats_ranked_name_html($entry, 'leaderboard-ranked-name'); ?></span>
                                            <small><?php echo h(mineacle_leaderboards_top_metric($entry, $tableMode, $sort)); ?></small>
                                        </span>
                                    </a>
                                <?php else: ?>
                                    <article class="leaderboard-top-entry is-rank-<?php echo h((string) $rank); ?>">
                                        <span class="leaderboard-top-rank">#<?php echo h((string) $rank); ?></span>
                                        <span class="leaderboard-top-avatar" aria-hidden="true"><?php echo h(mineacle_leaderboards_team_initial($entry)); ?></span>
                                        <span>
                                            <strong><?php echo h(mineacle_leaderboards_top_name($entry, $tableMode)); ?></strong>
                                            <small><?php echo h(mineacle_leaderboards_top_metric($entry, $tableMode, $sort)); ?></small>
                                        </span>
                                    </article>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </aside>
            </div>
        </section>

        <section class="panel leaderboard-board" id="leaderboardRankings" aria-label="<?php echo h($leaderboardTitle); ?>">
            <p class="sr-only" data-leaderboard-status aria-live="polite"></p>
            <div class="leaderboard-board-top">
                <header class="profile-section-heading leaderboard-section-heading">
                    <span aria-hidden="true">
                        <img src="<?php echo h(mineacle_leaderboards_category_icon($category, $assetVersion)); ?>" alt="" draggable="false">
                    </span>
                    <h2><?php echo h($leaderboardTitle); ?></h2>
                </header>

                <nav class="leaderboard-category-grid" aria-label="Leaderboard categories">
                    <?php foreach ($categories as $key => $card): ?>
                        <?php $isActive = $category === $key; ?>
                        <a class="leaderboard-category-card<?php echo $isActive ? ' is-active' : ''; ?>" href="<?php echo h(mineacle_leaderboards_url((string) $key)); ?>" data-leaderboard-category-link<?php echo $isActive ? ' aria-current="page"' : ''; ?>>
                            <span class="leaderboard-category-icon" aria-hidden="true">
                                <img src="<?php echo h(mineacle_leaderboards_category_icon((string) $key, $assetVersion)); ?>" alt="" draggable="false">
                            </span>
                            <span class="leaderboard-category-copy">
                                <strong><?php echo h((string) $card['label']); ?></strong>
                            </span>
                        </a>
                    <?php endforeach; ?>
                </nav>
            </div>

            <div class="leaderboard-view-row">
                <nav class="leaderboard-subfilters" aria-label="<?php echo h((string) $categories[$category]['label']); ?> filters">
                    <?php foreach ($views as $viewKey => $viewData): ?>
                        <?php $isActiveView = $view === $viewKey; ?>
                        <a class="<?php echo $isActiveView ? 'is-active' : ''; ?>" href="<?php echo h(mineacle_leaderboards_url($category, (string) $viewKey, $search)); ?>" data-leaderboard-view-link<?php echo $isActiveView ? ' aria-current="page"' : ''; ?>>
                            <?php echo h((string) $viewData['label']); ?>
                        </a>
                    <?php endforeach; ?>
                </nav>

                <span class="leaderboard-result-count"><?php echo $hasResults ? h(number_format($shownStart) . '-' . number_format($shownEnd) . ' of ' . number_format($resultTotal)) : h(number_format($resultTotal) . ' results'); ?></span>
            </div>

            <div class="leaderboard-results" data-leaderboard-results>
                <p class="sr-only"><?php echo h($leaderboardDescription); ?></p>

                <?php if ($loadError): ?>
                    <section class="profile-message">
                        <h1>Unable to load leaderboards right now</h1>
                        <p>Check the Mineacle Core database connection, then try again.</p>
                    </section>
                <?php elseif (!$hasResults): ?>
                    <section class="profile-message">
                        <h1>No leaderboard data found yet</h1>
                        <p><?php echo $tableMode === 'teams' ? 'Teams will appear here once Mineacle Core writes team standings.' : 'Players will appear here once Mineacle Core writes profile stats.'; ?></p>
                    </section>
                <?php elseif ($tableMode === 'teams'): ?>
                <div class="leaderboard-table-head leaderboard-table-head-teams" aria-hidden="true">
                    <span>#</span>
                    <span>Team</span>
                    <span>Members</span>
                    <span>Online</span>
                    <span>Capital</span>
                    <span>Kills</span>
                    <span>K/D</span>
                </div>

                <div class="players-list">
                    <?php foreach ($teams as $index => $team): ?>
                        <?php
                        $rank = $offset + $index + 1;
                        $kills = mineacle_stats_int($team['kills'] ?? 0);
                        $deaths = mineacle_stats_int($team['deaths'] ?? 0);
                        ?>
                        <article class="player-card leaderboard-table-row leaderboard-team-row<?php echo $rank <= 3 ? ' is-top-rank' : ''; ?>">
                            <span class="leaderboard-team-rank">#<?php echo h((string) $rank); ?></span>
                            <span class="player-card-main">
                                <strong><?php echo h(mineacle_leaderboards_team_name($team)); ?></strong>
                                <span><?php echo h(mineacle_leaderboards_team_caption($team)); ?></span>
                            </span>
                            <span class="player-card-stat"><?php echo h(number_format(mineacle_stats_int($team['members'] ?? 0))); ?></span>
                            <span class="player-card-status <?php echo mineacle_stats_int($team['online_members'] ?? 0) > 0 ? 'is-online' : 'is-offline'; ?>">
                                <span aria-hidden="true"></span>
                                <?php echo h(mineacle_leaderboards_team_online_label($team)); ?>
                            </span>
                            <span class="player-card-stat"><?php echo h(mineacle_leaderboards_team_money($team)); ?></span>
                            <span class="player-card-stat"><?php echo h(number_format($kills)); ?></span>
                            <span class="player-card-stat"><?php echo h(mineacle_leaderboards_kd($kills, $deaths, $team['kd_ratio'] ?? 0)); ?></span>
                        </article>
                    <?php endforeach; ?>
                </div>
                <?php else: ?>
                <div class="leaderboard-table-head leaderboard-table-head-players" aria-hidden="true">
                    <span>#</span>
                    <span>Player</span>
                    <span>Team</span>
                    <span>Balance</span>
                    <span>Kills</span>
                    <span>Deaths</span>
                    <span>K/D</span>
                    <span>Playtime</span>
                    <span>Status</span>
                </div>

                <div class="players-list">
                    <?php foreach ($players as $index => $player): ?>
                        <?php
                        $head = mineacle_leaderboards_player_head($player);
                        $online = mineacle_stats_online($player);
                        $rank = $offset + $index + 1;
                        ?>
                        <a class="player-card leaderboard-table-row leaderboard-player-row<?php echo $rank <= 3 ? ' is-top-rank' : ''; ?>" href="<?php echo h(mineacle_players_profile_url($player)); ?>">
                            <span class="leaderboard-team-rank">#<?php echo h((string) $rank); ?></span>
                            <span class="player-card-main leaderboard-player-main">
                                <span class="player-card-head">
                                    <?php if ($head !== ''): ?>
                                        <img src="<?php echo h($head); ?>" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">
                                    <?php endif; ?>
                                </span>
                                <span>
                                    <span class="leaderboard-row-name"><?php echo mineacle_stats_ranked_name_html($player, 'leaderboard-ranked-name'); ?></span>
                                </span>
                            </span>
                            <span class="player-card-stat"><?php echo h(mineacle_stats_team_name($player)); ?></span>
                            <span class="player-card-stat"><?php echo h(mineacle_stats_money_label($player)); ?></span>
                            <span class="player-card-stat"><?php echo h(number_format(mineacle_stats_int($player['kills'] ?? 0))); ?></span>
                            <span class="player-card-stat"><?php echo h(number_format(mineacle_stats_int($player['deaths'] ?? 0))); ?></span>
                            <span class="player-card-stat"><?php echo h(mineacle_leaderboards_kd(mineacle_stats_int($player['kills'] ?? 0), mineacle_stats_int($player['deaths'] ?? 0), $player['kd_ratio'] ?? 0)); ?></span>
                            <span class="player-card-stat"><?php echo h(mineacle_stats_playtime_label($player)); ?></span>
                            <span class="player-card-status <?php echo $online ? 'is-online' : 'is-offline'; ?>">
                                <span aria-hidden="true"></span>
                                <?php echo h($online ? 'Online' : 'Offline'); ?>
                            </span>
                        </a>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>

                <?php if (!$loadError && $resultTotal > $perPage): ?>
                    <nav class="leaderboard-pagination" aria-label="Leaderboard pages">
                        <?php $prevPage = max(1, $page - 1); ?>
                        <?php $nextPage = min($totalPages, $page + 1); ?>
                        <a class="<?php echo $page <= 1 ? 'is-disabled' : ''; ?>" href="<?php echo h(mineacle_leaderboards_url($category, $view, $search, $prevPage)); ?>" data-leaderboard-page-link<?php echo $page <= 1 ? ' aria-disabled="true"' : ''; ?>>Previous</a>
                        <span>Page <?php echo h((string) $page); ?> of <?php echo h((string) $totalPages); ?></span>
                        <a class="<?php echo $page >= $totalPages ? 'is-disabled' : ''; ?>" href="<?php echo h(mineacle_leaderboards_url($category, $view, $search, $nextPage)); ?>" data-leaderboard-page-link<?php echo $page >= $totalPages ? ' aria-disabled="true"' : ''; ?>>Next</a>
                    </nav>
                <?php endif; ?>
            </div>
        </section>

                        </main>
                        <?php mineacle_page_footer($site); ?>
                    </div>
            </div>
        </section>
    </div>
</div>
<?php mineacle_page_end(['scripts' => ['/assets/home.js', '/assets/home-page.js']]); ?>
