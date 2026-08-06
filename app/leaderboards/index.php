<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';
require_once __DIR__ . '/../shared/php/compact-footer.php';
require_once __DIR__ . '/../shared/php/stats-lib.php';

$config = mineacle_config();
$site = is_array($config['site'] ?? null) ? $config['site'] : [];
$directPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);

if (in_array($directPath, ['/leaderboards.php', '/leaderboards/index.php'], true)) {
    $queryString = trim((string) ($_SERVER['QUERY_STRING'] ?? ''));
    header('Location: /leaderboards' . ($queryString !== '' ? '?' . $queryString : ''), true, 301);
    exit;
}

$rawCategory = strtolower(trim((string) ($_GET['category'] ?? 'players')));
$legacyView = strtolower(trim((string) ($_GET['view'] ?? $_GET['scope'] ?? 'overall')));
$rawOrder = strtolower(trim((string) ($_GET['order'] ?? 'desc')));
$search = trim(substr((string) ($_GET['search'] ?? ''), 0, 64));
$category = in_array($rawCategory, ['players', 'teams'], true) ? $rawCategory : 'players';
$order = $rawOrder === 'asc' ? 'asc' : 'desc';

$categories = [
    'players' => [
        'label' => 'Players',
        'singular' => 'Player',
        'metrics' => [
            'overall' => ['label' => 'Overall', 'sort' => 'overall'],
            'balance' => ['label' => 'Balance', 'sort' => 'money'],
            'kd' => ['label' => 'K/D', 'sort' => 'kd_qualified'],
            'playtime' => ['label' => 'Playtime', 'sort' => 'playtime'],
            'kills' => ['label' => 'Kills', 'sort' => 'kills'],
        ],
    ],
    'teams' => [
        'label' => 'Teams',
        'singular' => 'Team',
        'metrics' => [
            'overall' => ['label' => 'Overall', 'sort' => 'overall'],
            'balance' => ['label' => 'Capital', 'sort' => 'balance'],
            'kd' => ['label' => 'K/D', 'sort' => 'kd_qualified'],
            'members' => ['label' => 'Members', 'sort' => 'members'],
            'kills' => ['label' => 'Kills', 'sort' => 'kills'],
        ],
    ],
];

$legacyMetricMap = [
    'richest' => 'balance',
    'money' => 'balance',
    'global-kd' => 'kd',
    'player-kd' => 'kd',
    'team-kd' => 'kd',
];
$metric = $legacyMetricMap[$legacyView] ?? str_replace('_', '-', $legacyView);
$metric = isset($categories[$category]['metrics'][$metric]) ? $metric : 'overall';
$metricConfig = $categories[$category]['metrics'][$metric];
$sort = (string) $metricConfig['sort'];
$maxResults = 50;
$rows = [];
$loadError = false;
$totalAvailable = 0;
$totalPlayers = 0;
$totalTeams = 0;
$onlineNow = 0;

try {
    $totalPlayers = mineacle_stats_players_count('overall', '');
    $totalTeams = mineacle_stats_teams_count('overall', '');
    $totalAvailable = $category === 'teams'
        ? mineacle_stats_teams_count($sort, $search)
        : mineacle_stats_players_count($sort, $search);

    for ($chunkOffset = 0; $chunkOffset < $maxResults; $chunkOffset += 50) {
        $chunkLimit = min(50, $maxResults - $chunkOffset);
        $chunk = $category === 'teams'
            ? mineacle_stats_teams($chunkLimit, $chunkOffset, $sort, $search)
            : mineacle_stats_players($chunkLimit, $chunkOffset, $sort, $search);

        foreach ($chunk as $chunkIndex => $chunkRow) {
            $chunkRow['_global_rank'] = $chunkOffset + $chunkIndex + 1;
            $rows[] = $chunkRow;
        }

        if (count($chunk) < $chunkLimit) {
            break;
        }
    }

    if ($order === 'asc') {
        $rows = array_reverse($rows);
    }

    $pdo = mineacle_core_db();
    $tableName = (string) (($config['tables']['player_profiles'] ?? null) ?: 'mineacle_web_profiles');
    $tableSql = $pdo instanceof PDO ? mineacle_stats_table_sql($tableName) : null;

    if ($pdo instanceof PDO && is_string($tableSql)) {
        $onlineNow = max(0, (int) $pdo->query('SELECT COUNT(*) FROM ' . $tableSql . ' WHERE online = 1')->fetchColumn());
    }
} catch (Throwable) {
    $loadError = true;
}

function mineacle_leaderboards_url(string $category, string $metric = 'overall', string $order = 'desc', string $search = ''): string
{
    $params = ['category' => $category, 'view' => $metric, 'order' => $order];

    if ($search !== '') {
        $params['search'] = $search;
    }

    return '/leaderboards?' . http_build_query($params);
}

function mineacle_leaderboards_player_url(array $player): string
{
    return '/player/' . rawurlencode(mineacle_stats_username($player));
}

function mineacle_leaderboards_player_head(array $player): string
{
    $skin = is_array($player['skin'] ?? null) ? $player['skin'] : [];

    return trim((string) ($skin['head'] ?? ''));
}

function mineacle_leaderboards_team_name(array $team): string
{
    $name = trim((string) ($team['name'] ?? ''));

    return $name !== '' ? $name : 'Unnamed Team';
}

function mineacle_leaderboards_team_initial(array $team): string
{
    return strtoupper(substr(mineacle_leaderboards_team_name($team), 0, 1));
}

function mineacle_leaderboards_team_caption(array $team): string
{
    $owner = trim((string) ($team['owner_name'] ?? ''));
    $members = mineacle_stats_int($team['members'] ?? 0);

    return $owner !== '' ? 'Owner: ' . $owner : number_format($members) . ($members === 1 ? ' member' : ' members');
}

function mineacle_leaderboards_team_money(array $team): string
{
    $formatted = trim((string) ($team['balance_formatted'] ?? ''));

    if ($formatted !== '') {
        return $formatted;
    }

    $cents = mineacle_stats_int($team['balance_cents'] ?? 0);

    return '$' . number_format($cents > 0 ? $cents / 100 : mineacle_stats_float($team['balance'] ?? 0), 2);
}

function mineacle_leaderboards_rank_class(int $rank): string
{
    return match ($rank) {
        1 => ' is-rank-one',
        2 => ' is-rank-two',
        3 => ' is-rank-three',
        default => '',
    };
}

function mineacle_leaderboards_rank_label(int $rank): string
{
    return str_pad((string) $rank, 2, '0', STR_PAD_LEFT);
}

$assetVersion = mineacle_page_asset_version();
$siteStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/site.css') ?: $assetVersion);
$pagesStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/pages.css') ?: $assetVersion);
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/../home/assets/css/home.css') ?: $assetVersion);
$navigationStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/navigation.css') ?: $assetVersion);
$secondaryPagesStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/secondary-pages.css') ?: $assetVersion);
$navigationScriptVersion = (string) (filemtime(__DIR__ . '/../shared/assets/js/navigation.js') ?: $assetVersion);
$leaderboardsStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/css/leaderboards.css') ?: $assetVersion);
$leaderboardsScriptVersion = (string) (filemtime(__DIR__ . '/assets/js/leaderboards.js') ?: $assetVersion);
$heroVersion = (string) (filemtime(__DIR__ . '/assets/images/hero.webp') ?: $assetVersion);
$categoryLabel = (string) $categories[$category]['label'];
$categorySingular = (string) $categories[$category]['singular'];
$metricLabel = (string) $metricConfig['label'];
$resultCount = count($rows);
$panelTitle = $search !== '' ? $categorySingular . ' Search Results' : 'Top 50 ' . $categoryLabel . ' Global';
$searchPlaceholder = $category === 'teams' ? 'Search teams…' : 'Search players…';
$entityLabelLower = strtolower($categoryLabel);
$tableColumns = $category === 'players'
    ? [
        ['label' => 'Rank', 'metric' => 'overall'],
        ['label' => 'Player', 'metric' => null],
        ['label' => 'Balance', 'metric' => 'balance'],
        ['label' => 'K/D', 'metric' => 'kd'],
        ['label' => 'Playtime', 'metric' => 'playtime'],
        ['label' => 'Change', 'metric' => null],
    ]
    : [
        ['label' => 'Rank', 'metric' => 'overall'],
        ['label' => 'Team', 'metric' => null],
        ['label' => 'Capital', 'metric' => 'balance'],
        ['label' => 'K/D', 'metric' => 'kd'],
        ['label' => 'Members', 'metric' => 'members'],
        ['label' => 'Change', 'metric' => null],
    ];

mineacle_page_head('Leaderboards', [
    'meta_title' => 'Leaderboards | Mineacle',
    'meta_description' => 'Explore Mineacle global player and team rankings across economy, combat, and playtime.',
    'canonical_url' => 'https://mineacle.net/leaderboards',
    'stylesheets' => [
        '/shared/assets/css/site.css?rev=' . rawurlencode($siteStylesheetVersion),
        '/shared/assets/css/pages.css?rev=' . rawurlencode($pagesStylesheetVersion),
        '/home/assets/css/home.css?rev=' . rawurlencode($homeStylesheetVersion),
        '/shared/assets/css/navigation.css?rev=' . rawurlencode($navigationStylesheetVersion),
        '/shared/assets/css/secondary-pages.css?rev=' . rawurlencode($secondaryPagesStylesheetVersion),
        '/leaderboards/assets/css/leaderboards.css?rev=' . rawurlencode($leaderboardsStylesheetVersion),
    ],
    'body_class' => 'secondary-page leaderboards-page',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);
?>
<main class="leaderboards-site" aria-labelledby="leaderboards-page-title">
    <section class="leaderboards-hero" aria-labelledby="leaderboards-page-title">
        <img class="leaderboards-hero__image" src="/leaderboards/assets/images/hero.webp?rev=<?php echo h(rawurlencode($heroVersion)); ?>" alt="" width="2048" height="911" draggable="false" aria-hidden="true">
        <div class="leaderboards-hero__surface">
            <?php mineacle_site_navigation($site, ['current_key' => 'leaderboards', 'header_class' => 'leaderboards-header']); ?>

            <div class="leaderboards-hero__copy">
                <span>Global Rankings</span>
                <h1 id="leaderboards-page-title">Leaderboards</h1>
                <p>Mineacle’s global standings across economy, combat, and playtime.</p>
            </div>

            <div class="leaderboards-hero__stats" aria-label="Leaderboard summary">
                <div><strong><?php echo h(number_format($totalPlayers)); ?></strong><span>Ranked Players</span></div>
                <div><strong><?php echo h(number_format($totalTeams)); ?></strong><span>Active Teams</span></div>
                <div><strong><?php echo h(number_format($onlineNow)); ?></strong><span>Online Now</span></div>
            </div>
        </div>
    </section>

    <section class="leaderboard-panel" id="leaderboardRankings" data-leaderboard-root data-category="<?php echo h($category); ?>" data-metric="<?php echo h($metric); ?>" data-order="<?php echo h($order); ?>" data-search="<?php echo h($search); ?>" aria-labelledby="leaderboard-panel-title">
        <p class="sr-only" data-leaderboard-status aria-live="polite"></p>

        <header class="leaderboard-panel__header" data-leaderboard-header>
            <div class="leaderboard-category" role="group" aria-label="Leaderboard category">
                <?php foreach ($categories as $categoryKey => $categoryData): ?>
                    <?php $isCurrentCategory = $category === $categoryKey; ?>
                    <button class="leaderboard-category__button<?php echo $isCurrentCategory ? ' is-active' : ''; ?>" type="button" data-leaderboard-request="<?php echo h(mineacle_leaderboards_url((string) $categoryKey, 'overall', 'desc')); ?>" aria-pressed="<?php echo $isCurrentCategory ? 'true' : 'false'; ?>"><?php echo h((string) $categoryData['label']); ?></button>
                <?php endforeach; ?>
            </div>

            <div class="leaderboard-panel__title">
                <h2 id="leaderboard-panel-title"><?php echo h($panelTitle); ?></h2>
                <p>Ranked by: <strong><?php echo h($metricLabel); ?></strong> · <?php echo h(number_format($totalAvailable)); ?> ranked</p>
            </div>

            <div class="leaderboard-toolbar" aria-label="Leaderboard controls">
                <details class="leaderboard-metric" data-leaderboard-filter>
                    <summary><?php echo h($metricLabel); ?><span aria-hidden="true">⌄</span></summary>
                    <div>
                        <?php foreach ($categories[$category]['metrics'] as $metricKey => $metricData): ?>
                            <button class="<?php echo $metric === $metricKey ? 'is-active' : ''; ?>" type="button" data-leaderboard-request="<?php echo h(mineacle_leaderboards_url($category, (string) $metricKey, 'desc', $search)); ?>"><?php echo h((string) $metricData['label']); ?></button>
                        <?php endforeach; ?>
                        <button type="button" data-leaderboard-request="<?php echo h(mineacle_leaderboards_url($category, $metric, $order === 'desc' ? 'asc' : 'desc', $search)); ?>"><?php echo $order === 'desc' ? 'Lowest First' : 'Best First'; ?></button>
                    </div>
                </details>

                <form class="leaderboard-search" action="/leaderboards" method="get" role="search" data-leaderboard-search-form>
                    <input type="hidden" name="category" value="<?php echo h($category); ?>">
                    <input type="hidden" name="view" value="<?php echo h($metric); ?>">
                    <input type="hidden" name="order" value="<?php echo h($order); ?>">
                    <span aria-hidden="true">⌕</span>
                    <input type="search" name="search" value="<?php echo h($search); ?>" maxlength="64" placeholder="<?php echo h($searchPlaceholder); ?>" aria-label="Search leaderboard" autocomplete="off" spellcheck="false" data-leaderboard-search>
                </form>
            </div>
        </header>

        <div class="leaderboard-panel__dynamic" data-leaderboard-dynamic>
            <?php if ($loadError): ?>
                <section class="leaderboard-empty"><h3>Unable to load leaderboards</h3><p>Check the Mineacle Core database connection, then try again.</p></section>
            <?php elseif ($rows === []): ?>
                <section class="leaderboard-empty"><h3>No rankings found</h3><p><?php echo $search !== '' ? 'Try another name or clear the search.' : 'Rankings will appear after Mineacle Core records statistics.'; ?></p></section>
            <?php else: ?>
                <div class="leaderboard-table leaderboard-table--<?php echo h($category); ?>">
                    <div class="leaderboard-table__head" aria-label="Sort leaderboard columns">
                        <?php foreach ($tableColumns as $column): ?>
                            <?php if ($column['metric'] === null): ?>
                                <span><?php echo h((string) $column['label']); ?></span>
                            <?php else: ?>
                                <?php $columnMetric = (string) $column['metric']; $columnActive = $metric === $columnMetric; $columnOrder = $columnActive && $order === 'desc' ? 'asc' : 'desc'; ?>
                                <button class="<?php echo $columnActive ? 'is-active' : ''; ?>" type="button" data-leaderboard-request="<?php echo h(mineacle_leaderboards_url($category, $columnMetric, $columnOrder, $search)); ?>"><?php echo h((string) $column['label']); ?></button>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </div>

                    <div class="leaderboard-table__scroll" data-leaderboard-scroll tabindex="0" aria-label="Scrollable global <?php echo h($entityLabelLower); ?> rankings">
                        <div class="leaderboard-table__rows">
                            <?php foreach ($rows as $index => $row): ?>
                                <?php $rank = max(1, (int) ($row['_global_rank'] ?? ($index + 1))); $rankClass = mineacle_leaderboards_rank_class($rank); ?>
                                <?php if ($category === 'players'): ?>
                                    <?php
                                    $head = mineacle_leaderboards_player_head($row);
                                    $kills = mineacle_stats_int($row['kills'] ?? 0);
                                    $deaths = mineacle_stats_int($row['deaths'] ?? 0);
                                    $teamName = mineacle_stats_team_name($row);
                                    $isOnline = (bool) ($row['online'] ?? false);
                                    ?>
                                    <a class="leaderboard-row<?php echo h($rankClass); ?>" href="<?php echo h(mineacle_leaderboards_player_url($row)); ?>" data-leaderboard-rank="<?php echo h((string) $rank); ?>">
                                        <span class="leaderboard-row__rank"><?php echo h(mineacle_leaderboards_rank_label($rank)); ?></span>
                                        <span class="leaderboard-row__identity">
                                            <span class="leaderboard-row__avatar<?php echo $head !== '' ? ' has-image' : ''; ?>" aria-hidden="true"><?php if ($head !== ''): ?><img src="<?php echo h($head); ?>" alt="" loading="lazy" decoding="async" draggable="false"><?php else: ?><?php echo h(strtoupper(substr(mineacle_stats_display_name($row), 0, 1))); ?><?php endif; ?></span>
                                            <span class="leaderboard-row__name"><strong><i class="leaderboard-online<?php echo $isOnline ? ' is-online' : ''; ?>" aria-hidden="true"></i><?php echo mineacle_stats_ranked_name_html($row, 'leaderboard-ranked-name'); ?></strong><?php if ($teamName !== 'No Team'): ?><small><?php echo h($teamName); ?></small><?php endif; ?></span>
                                        </span>
                                        <span class="leaderboard-row__metric"><strong><?php echo h(mineacle_stats_money_label($row)); ?></strong></span>
                                        <span class="leaderboard-row__metric"><strong><?php echo h(mineacle_stats_kd_label($kills, $deaths, $row['kd_ratio'] ?? 0)); ?></strong></span>
                                        <span class="leaderboard-row__metric"><strong><?php echo h(mineacle_stats_playtime_label($row)); ?></strong></span>
                                        <span class="leaderboard-row__change">—</span>
                                    </a>
                                <?php else: ?>
                                    <?php $kills = mineacle_stats_int($row['kills'] ?? 0); $deaths = mineacle_stats_int($row['deaths'] ?? 0); $members = mineacle_stats_int($row['members'] ?? 0); ?>
                                    <article class="leaderboard-row<?php echo h($rankClass); ?>" data-leaderboard-rank="<?php echo h((string) $rank); ?>">
                                        <span class="leaderboard-row__rank"><?php echo h(mineacle_leaderboards_rank_label($rank)); ?></span>
                                        <span class="leaderboard-row__identity"><span class="leaderboard-row__avatar" aria-hidden="true"><?php echo h(mineacle_leaderboards_team_initial($row)); ?></span><span class="leaderboard-row__name"><strong><?php echo h(mineacle_leaderboards_team_name($row)); ?></strong><small><?php echo h(mineacle_leaderboards_team_caption($row)); ?></small></span></span>
                                        <span class="leaderboard-row__metric"><strong><?php echo h(mineacle_leaderboards_team_money($row)); ?></strong></span>
                                        <span class="leaderboard-row__metric"><strong><?php echo h(mineacle_stats_kd_label($kills, $deaths, $row['kd_ratio'] ?? 0)); ?></strong></span>
                                        <span class="leaderboard-row__metric"><strong><?php echo h(number_format($members)); ?></strong></span>
                                        <span class="leaderboard-row__change">—</span>
                                    </article>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

                <footer class="leaderboard-panel__footer"><span>Top <?php echo h(number_format($resultCount)); ?> loaded</span><span><?php echo $totalAvailable > $resultCount ? 'Showing ' . h(number_format($resultCount)) . ' of ' . h(number_format($totalAvailable)) : 'All ' . h(number_format($resultCount)) . ' ranked ' . h($entityLabelLower) . ' loaded'; ?></span></footer>
            <?php endif; ?>
        </div>
    </section>

    <?php mineacle_compact_footer($site); ?>
</main>
<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/site.js',
        '/shared/assets/js/navigation.js?rev=' . rawurlencode($navigationScriptVersion),
        '/leaderboards/assets/js/leaderboards.js?rev=' . rawurlencode($leaderboardsScriptVersion),
    ],
]); ?>
