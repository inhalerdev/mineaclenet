<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/layout.php';
require_once __DIR__ . '/includes/stats-lib.php';

$site = mineacle_config()['site'] ?? [];
$homeUrl = mineacle_page_home_url($site);
$leaderboardsUrl = mineacle_page_leaderboards_url($site);
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
        'label' => 'Top Players Global',
        'copy' => 'Global player standings across wealth, combat, and playtime.',
        'section_label' => 'Global Player Rankings',
        'views' => [
            'overall' => [
                'label' => 'Overall',
                'title' => 'Top Players Global',
                'description' => 'Top players ranked by balance, kills, K/D, playtime, and username.',
                'table' => 'players',
                'sort' => 'overall',
                'max' => 100,
            ],
            'richest' => [
                'label' => 'Richest',
                'title' => 'Global Richest Players',
                'description' => 'Players with the strongest personal economy standings.',
                'table' => 'players',
                'sort' => 'money',
                'max' => 100,
            ],
            'kd' => [
                'label' => 'Top K/D',
                'title' => 'Top Global K/D',
                'description' => 'Players ranked by global K/D. Players need at least 25 kills to qualify.',
                'table' => 'players',
                'sort' => 'kd_qualified',
                'max' => 100,
            ],
        ],
    ],
    'teams' => [
        'label' => 'Top Teams Global',
        'copy' => 'Global team standings across capital, combat, and membership.',
        'section_label' => 'Global Team Rankings',
        'views' => [
            'overall' => [
                'label' => 'Overall',
                'title' => 'Top Teams Global',
                'description' => 'Teams ranked by capital, K/D, kills, members, and name.',
                'table' => 'teams',
                'sort' => 'overall',
                'max' => 50,
            ],
            'richest' => [
                'label' => 'Richest',
                'title' => 'Global Richest Teams',
                'description' => 'Teams controlling the most capital on Mineacle.',
                'table' => 'teams',
                'sort' => 'balance',
                'max' => 50,
            ],
            'kd' => [
                'label' => 'Top K/D',
                'title' => 'Global Team K/D',
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

function mineacle_players_link(mixed $url): string
{
    $value = trim((string) $url);

    return $value !== '' ? $value : '#';
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
        'players' => 'top-player.svg',
        'teams' => 'top-team.png',
    ];
    $file = $icons[$category] ?? 'leaderboard.svg';

    return '/assets/icons/' . $file . '?v=' . rawurlencode($assetVersion);
}

$navLinks = [
    ['key' => 'home', 'url' => $homeUrl],
    ['key' => 'vote', 'url' => $site['vote_url'] ?? '#'],
    ['key' => 'stats', 'label' => 'Leaderboards', 'url' => $leaderboardsUrl],
    ['key' => 'bans', 'url' => $site['bans_url'] ?? '#'],
];
$storeLink = ['key' => 'store', 'url' => $site['store_url'] ?? '#'];
$currentNavKey = 'stats';
$rows = $tableMode === 'teams' ? $teams : $players;
$hasResults = $rows !== [];
$shownStart = $hasResults ? $offset + 1 : 0;
$shownEnd = $hasResults ? min($offset + count($rows), $resultTotal) : 0;
$searchPlaceholder = $tableMode === 'teams' ? 'Search for a team...' : 'Search for a player...';
$topTitle = 'Top 3 ' . ($tableMode === 'teams' ? 'Global Teams' : 'Global Players');
$leaderboardTitle = (string) $selected['title'];
$leaderboardDescription = (string) $selected['description'];
$leaderboardSectionLabel = (string) $categories[$category]['section_label'];
$leaderboardFilterLabel = $category === 'teams' ? 'Team Rankings' : 'Player Rankings';
$assetVersion = mineacle_page_asset_version();
$canSuggestPlayers = $tableMode === 'players';

mineacle_page_head('Leaderboards');
?>
<div class="site-shell">
    <aside class="rail" aria-label="Primary navigation">
        <a class="rail-logo" href="<?php echo h($homeUrl); ?>" aria-label="Home">
            <img src="/assets/brand/nav-logo-web.png" alt="">
        </a>

        <nav class="rail-nav" aria-label="Server links">
            <?php foreach ($navLinks as $link): ?>
                <?php $isActiveNavLink = (string) $link['key'] === $currentNavKey; ?>
                <a class="rail-link<?php echo $isActiveNavLink ? ' is-active' : ''; ?>" href="<?php echo h(mineacle_players_link($link['url'])); ?>" aria-label="<?php echo h((string) ($link['label'] ?? $link['key'])); ?>"<?php echo $isActiveNavLink ? ' aria-current="page"' : ''; ?>>
                    <?php echo mineacle_page_icon((string) $link['key']); ?>
                </a>
            <?php endforeach; ?>
            <?php $isStoreActive = (string) $storeLink['key'] === $currentNavKey; ?>
            <a class="rail-link rail-store-button<?php echo $isStoreActive ? ' is-active' : ''; ?>" href="<?php echo h(mineacle_players_link($storeLink['url'])); ?>" aria-label="Store"<?php echo $isStoreActive ? ' aria-current="page"' : ''; ?>>
                <?php echo mineacle_page_icon((string) $storeLink['key']); ?>
            </a>
        </nav>

        <div class="rail-social" aria-label="Social links">
            <a class="rail-link" href="<?php echo h(mineacle_players_link($site['discord_url'] ?? '#')); ?>" aria-label="Discord">
                <?php echo mineacle_page_icon('discord'); ?>
            </a>
            <a class="rail-link" href="<?php echo h(mineacle_players_link($site['x_url'] ?? '#')); ?>" aria-label="X">
                <?php echo mineacle_page_icon('x'); ?>
            </a>
        </div>
    </aside>

    <main class="home-grid players-page leaderboard-page" aria-label="Leaderboards">
        <section class="panel leaderboard-overview" aria-label="Leaderboard overview">
            <div class="leaderboard-hero-content">
                <div class="leaderboard-copy">
                    <p>Survival Rankings</p>
                    <h1>Leaderboards</h1>
                    <span>Track Mineacle's top global players and teams across survival, wealth, and combat.</span>
                </div>

                <aside class="leaderboard-top-card" aria-label="<?php echo h($topTitle); ?>">
                    <header class="leaderboard-top-heading">
                        <span class="leaderboard-top-heading-icon" aria-hidden="true">
                            <img src="<?php echo h(mineacle_leaderboards_category_icon($category, $assetVersion)); ?>" alt="" draggable="false">
                        </span>
                        <span>
                            <small><?php echo h((string) $categories[$category]['label']); ?></small>
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
                                            <strong><?php echo mineacle_stats_ranked_name_html($entry, 'leaderboard-ranked-name'); ?></strong>
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

            <nav class="leaderboard-category-grid" aria-label="Leaderboard categories">
                <?php foreach ($categories as $key => $card): ?>
                    <?php $isActive = $category === $key; ?>
                    <a class="leaderboard-category-card<?php echo $isActive ? ' is-active' : ''; ?>" href="<?php echo h(mineacle_leaderboards_url((string) $key)); ?>" data-leaderboard-category-link<?php echo $isActive ? ' aria-current="page"' : ''; ?>>
                        <span class="leaderboard-category-icon" aria-hidden="true">
                            <img src="<?php echo h(mineacle_leaderboards_category_icon((string) $key, $assetVersion)); ?>" alt="" draggable="false">
                        </span>
                        <span class="leaderboard-category-copy">
                            <strong><?php echo h((string) $card['label']); ?></strong>
                            <small><?php echo h((string) $card['copy']); ?></small>
                        </span>
                    </a>
                <?php endforeach; ?>
            </nav>
        </section>

        <section class="panel leaderboard-board" id="leaderboardRankings" aria-label="<?php echo h($leaderboardTitle); ?>">
            <p class="sr-only" data-leaderboard-status aria-live="polite"></p>
            <div class="leaderboard-board-top">
                <header class="profile-section-heading leaderboard-section-heading">
                    <span aria-hidden="true">
                        <img src="<?php echo h(mineacle_leaderboards_category_icon($category, $assetVersion)); ?>" alt="" draggable="false">
                    </span>
                    <div>
                        <p><?php echo h($leaderboardSectionLabel); ?></p>
                        <h2><?php echo h($leaderboardTitle); ?></h2>
                    </div>
                </header>

                <form class="leaderboard-search player-search" method="get" action="/leaderboards" data-player-search data-player-search-form data-player-search-submit="filter" data-player-search-enabled="<?php echo $canSuggestPlayers ? 'true' : 'false'; ?>">
                    <input type="hidden" name="category" value="<?php echo h($category); ?>" data-leaderboard-category-input>
                    <input type="hidden" name="view" value="<?php echo h($view); ?>" data-leaderboard-view-input>
                    <label class="sr-only" for="homeSearch"><?php echo h($searchPlaceholder); ?></label>
                    <div class="leaderboard-search-grid">
                        <div class="search-box">
                            <img src="/assets/icons/player-search.png?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" aria-hidden="true" draggable="false">
                            <input id="homeSearch" name="search" type="search" placeholder="<?php echo h($searchPlaceholder); ?>" value="<?php echo h($search); ?>" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="leaderboardPlayerSearchResults">
                            <button class="search-clear" type="button" aria-label="Clear search" hidden>
                                <img src="/assets/icons/clear-search-pixel.svg?v=<?php echo h(rawurlencode($assetVersion)); ?>" alt="" draggable="false">
                            </button>
                        </div>
                        <button class="leaderboard-search-submit" type="submit">Filter</button>
                    </div>
                    <div class="player-search-results leaderboard-search-results" id="leaderboardPlayerSearchResults" data-player-search-results role="listbox" hidden></div>
                </form>
            </div>

            <div class="leaderboard-view-row">
                <span class="leaderboard-filter-context">
                    <small>Global</small>
                    <strong><?php echo h($leaderboardFilterLabel); ?></strong>
                </span>

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
                <p class="leaderboard-description"><?php echo h($leaderboardDescription); ?></p>

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
                                    <strong><?php echo mineacle_stats_ranked_name_html($player, 'leaderboard-ranked-name'); ?></strong>
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

        <?php mineacle_page_footer($site); ?>
    </main>
</div>
<?php mineacle_page_end(); ?>
