<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/layout.php';
require_once __DIR__ . '/../shared/php/navigation.php';
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
        'limit' => 50,
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
        'limit' => 50,
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
$maxResults = (int) $categories[$category]['limit'];
$rows = [];
$loadError = false;
$totalAvailable = 0;

try {
    $totalAvailable = $category === 'teams'
        ? mineacle_stats_teams_count($sort, $search)
        : mineacle_stats_players_count($sort, $search);
    // Always load the strongest 50 records, then reverse those same rows for lowest-first view.
    $sourceOffset = 0;

    for ($chunkOffset = 0; $chunkOffset < $maxResults; $chunkOffset += 50) {
        $chunkLimit = min(50, $maxResults - $chunkOffset);
        $databaseOffset = $sourceOffset + $chunkOffset;
        $chunk = $category === 'teams'
            ? mineacle_stats_teams($chunkLimit, $databaseOffset, $sort, $search)
            : mineacle_stats_players($chunkLimit, $databaseOffset, $sort, $search);

        foreach ($chunk as $chunkIndex => $chunkRow) {
            $chunkRow['_global_rank'] = $databaseOffset + $chunkIndex + 1;
            $rows[] = $chunkRow;
        }

        if (count($chunk) < $chunkLimit) {
            break;
        }
    }

    if ($order === 'asc') {
        $rows = array_reverse($rows);
    }
} catch (Throwable) {
    $loadError = true;
}

function mineacle_leaderboards_url(string $category, string $metric = 'overall', string $order = 'desc', string $search = ''): string
{
    $params = [
        'category' => $category,
        'view' => $metric,
        'order' => $order,
    ];

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

    if ($owner !== '') {
        return 'Owner: ' . $owner;
    }

    return number_format($members) . ($members === 1 ? ' member' : ' members');
}

function mineacle_leaderboards_team_money(array $team): string
{
    $formatted = trim((string) ($team['balance_formatted'] ?? ''));

    if ($formatted !== '') {
        return $formatted;
    }

    $cents = mineacle_stats_int($team['balance_cents'] ?? 0);

    if ($cents > 0) {
        return '$' . number_format($cents / 100, 2);
    }

    return '$' . number_format(mineacle_stats_float($team['balance'] ?? 0), 2);
}

function mineacle_leaderboards_kd(int $kills, int $deaths, mixed $stored = null): string
{
    return mineacle_stats_kd_label($kills, $deaths, $stored);
}

function mineacle_leaderboards_rank_class(int $rank): string
{
    if ($rank === 1) {
        return ' is-rank-one';
    }

    if ($rank === 2) {
        return ' is-rank-two';
    }

    if ($rank === 3) {
        return ' is-rank-three';
    }

    return '';
}

$assetVersion = mineacle_page_asset_version();
$siteStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/site.css') ?: $assetVersion);
$pagesStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/pages.css') ?: $assetVersion);
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/../home/assets/css/home.css') ?: $assetVersion);
$navigationStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/navigation.css') ?: $assetVersion);
$navigationScriptVersion = (string) (filemtime(__DIR__ . '/../shared/assets/js/navigation.js') ?: $assetVersion);
$leaderboardsStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/css/leaderboards.css') ?: $assetVersion);
$leaderboardsScriptVersion = (string) (filemtime(__DIR__ . '/assets/js/leaderboards.js') ?: $assetVersion);
$heroVersion = (string) (filemtime(__DIR__ . '/assets/images/hero.webp') ?: $assetVersion);
$categoryLabel = (string) $categories[$category]['label'];
$categorySingular = (string) $categories[$category]['singular'];
$metricLabel = (string) $metricConfig['label'];
$resultCount = count($rows);
$panelTitle = $search !== ''
    ? $categorySingular . ' Search Results'
    : 'Top 50 ' . $categoryLabel . ' Global';
$searchPlaceholder = $category === 'teams' ? 'Search teams' : 'Search players';
$searchLabel = $category === 'teams' ? 'Search the team leaderboard' : 'Search the player leaderboard';
$tableColumns = $category === 'players'
    ? [
        ['label' => 'Rank', 'metric' => 'overall'],
        ['label' => 'Player', 'metric' => null],
        ['label' => 'Balance', 'metric' => 'balance'],
        ['label' => 'K/D Ratio', 'metric' => 'kd'],
        ['label' => 'Playtime', 'metric' => 'playtime'],
    ]
    : [
        ['label' => 'Rank', 'metric' => 'overall'],
        ['label' => 'Team', 'metric' => null],
        ['label' => 'Capital', 'metric' => 'balance'],
        ['label' => 'K/D Ratio', 'metric' => 'kd'],
        ['label' => 'Members', 'metric' => 'members'],
    ];
$entityLabelLower = strtolower($categoryLabel);
$footerPrimary = $search !== ''
    ? number_format($totalAvailable) . ($totalAvailable === 1 ? ' match' : ' matches')
    : 'Top ' . number_format($resultCount) . ' loaded';
$footerSecondary = $totalAvailable > $resultCount
    ? 'Showing ' . number_format($resultCount) . ' of ' . number_format($totalAvailable) . ' ranked ' . $entityLabelLower
    : 'All ' . number_format($resultCount) . ' ranked ' . $entityLabelLower . ' loaded';

mineacle_page_head('Leaderboards', [
    'meta_title' => 'Leaderboards | Mineacle',
    'meta_description' => 'Explore Mineacle global player and team rankings across economy, combat, and playtime.',
    'canonical_url' => 'https://mineacle.net/leaderboards',
    'stylesheets' => [
        '/shared/assets/css/site.css?rev=' . rawurlencode($siteStylesheetVersion),
        '/shared/assets/css/pages.css?rev=' . rawurlencode($pagesStylesheetVersion),
        '/home/assets/css/home.css?rev=' . rawurlencode($homeStylesheetVersion),
        '/shared/assets/css/navigation.css?rev=' . rawurlencode($navigationStylesheetVersion),
        '/leaderboards/assets/css/leaderboards.css?rev=' . rawurlencode($leaderboardsStylesheetVersion),
    ],
    'body_class' => 'secondary-page leaderboards-page',
    'external_fonts' => false,
    'theme_color' => '#111111',
]);
?>
<main class="leaderboards-site" aria-labelledby="leaderboards-page-title">
    <section class="leaderboards-hero" aria-labelledby="leaderboards-page-title">
        <img
            class="leaderboards-hero__image"
            src="/leaderboards/assets/images/hero.webp?rev=<?php echo h(rawurlencode($heroVersion)); ?>"
            alt=""
            width="2048"
            height="911"
            draggable="false"
            aria-hidden="true"
        >
        <div class="leaderboards-hero__surface">
            <?php mineacle_site_navigation($site, [
                'current_key' => 'leaderboards',
                'header_class' => 'leaderboards-header',
            ]); ?>

            <div class="leaderboards-hero__copy">
                <h1 id="leaderboards-page-title">Leaderboards</h1>
                <p>Follow Mineacle’s global standings across economy, combat efficiency, playtime, and team performance. Search the top players and teams, compare the strongest records, and open any player profile for the story behind their rank.</p>
            </div>
        </div>
    </section>

    <section
        class="leaderboard-panel"
        id="leaderboardRankings"
        data-leaderboard-root
        data-category="<?php echo h($category); ?>"
        data-metric="<?php echo h($metric); ?>"
        data-order="<?php echo h($order); ?>"
        data-search="<?php echo h($search); ?>"
        aria-labelledby="leaderboard-panel-title"
    >
        <p class="sr-only" data-leaderboard-status aria-live="polite"></p>

        <header class="leaderboard-panel__header" data-leaderboard-header>
            <div class="leaderboard-panel__title">
                <span>Global rankings</span>
                <h2 id="leaderboard-panel-title"><?php echo h($panelTitle); ?></h2>
            </div>

            <div class="leaderboard-toolbar" aria-label="Leaderboard controls">
                <form
                    class="leaderboard-search"
                    action="/leaderboards"
                    method="get"
                    role="search"
                    data-leaderboard-search-form
                >
                    <input type="hidden" name="category" value="<?php echo h($category); ?>">
                    <input type="hidden" name="view" value="<?php echo h($metric); ?>">
                    <input type="hidden" name="order" value="<?php echo h($order); ?>">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M10.75 4a6.75 6.75 0 1 0 4.24 12l4.5 4.5 1.41-1.41-4.5-4.5A6.75 6.75 0 0 0 10.75 4Zm0 2a4.75 4.75 0 1 1 0 9.5 4.75 4.75 0 0 1 0-9.5Z"/>
                    </svg>
                    <input
                        type="search"
                        name="search"
                        value="<?php echo h($search); ?>"
                        maxlength="64"
                        placeholder="<?php echo h($searchPlaceholder); ?>"
                        aria-label="<?php echo h($searchLabel); ?>"
                        autocomplete="off"
                        spellcheck="false"
                        data-leaderboard-search
                    >
                </form>

                <div class="leaderboard-direction-frame" role="group" aria-label="Sort direction">
                    <?php foreach (['desc' => 'Best first', 'asc' => 'Lowest first'] as $directionKey => $directionText): ?>
                        <?php $isCurrentDirection = $order === $directionKey; ?>
                        <button
                            class="leaderboard-direction-frame__button<?php echo $isCurrentDirection ? ' is-active' : ''; ?>"
                            type="button"
                            data-leaderboard-request="<?php echo h(mineacle_leaderboards_url($category, $metric, $directionKey, $search)); ?>"
                            aria-label="<?php echo h($directionText); ?>"
                            aria-pressed="<?php echo $isCurrentDirection ? 'true' : 'false'; ?>"
                            title="<?php echo h($directionText); ?>"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <?php if ($directionKey === 'desc'): ?>
                                    <path d="m12 18 6-6h-4V5h-4v7H6l6 6Z"/>
                                <?php else: ?>
                                    <path d="m12 6-6 6h4v7h4v-7h4l-6-6Z"/>
                                <?php endif; ?>
                            </svg>
                        </button>
                    <?php endforeach; ?>
                </div>

                <details class="leaderboard-filter" data-leaderboard-filter>
                    <summary class="leaderboard-filter__button" aria-label="Filter leaderboard" title="Filter leaderboard">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 6h10v2H4V6Zm14 0h2v2h-2V6ZM8 11h12v2H8v-2Zm-4 0h2v2H4v-2Zm0 5h10v2H4v-2Zm14 0h2v2h-2v-2Z"/>
                            <path d="M14 4h4v6h-4V4ZM4 9h4v6H4V9Zm10 5h4v6h-4v-6Z"/>
                        </svg>
                    </summary>
                    <div class="leaderboard-filter__menu" role="menu" aria-label="Leaderboard type">
                        <span class="leaderboard-filter__label">Leaderboard</span>
                        <?php foreach ($categories as $categoryKey => $categoryData): ?>
                            <?php $isCurrentCategory = $category === $categoryKey; ?>
                            <button
                                class="leaderboard-filter__option<?php echo $isCurrentCategory ? ' is-active' : ''; ?>"
                                type="button"
                                role="menuitemradio"
                                data-leaderboard-request="<?php echo h(mineacle_leaderboards_url((string) $categoryKey, 'overall', 'desc')); ?>"
                                aria-checked="<?php echo $isCurrentCategory ? 'true' : 'false'; ?>"
                            >
                                <span><?php echo h((string) $categoryData['label']); ?></span>
                                <?php if ($isCurrentCategory): ?>
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.2-4-4 1.4-1.4 2.6 2.6 8.2-8.2 1.4 1.4-9.6 9.6Z"/></svg>
                                <?php endif; ?>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </details>
            </div>
        </header>

        <div class="leaderboard-panel__dynamic" data-leaderboard-dynamic>
            <div class="leaderboard-panel__context">
                <div class="leaderboard-panel__context-copy">
                    <span>Ranked by</span>
                    <strong><?php echo h($metricLabel); ?></strong>
                    <span aria-hidden="true">•</span>
                    <span><?php echo h(number_format($totalAvailable)); ?> ranked</span>
                    <?php if ($search !== ''): ?>
                        <span aria-hidden="true">•</span>
                        <span>Search</span>
                        <strong><?php echo h($search); ?></strong>
                    <?php endif; ?>
                </div>
            </div>

            <?php if ($loadError): ?>
                <section class="leaderboard-empty" aria-labelledby="leaderboard-error-title">
                    <h3 id="leaderboard-error-title">Unable to load leaderboards</h3>
                    <p>Check the Mineacle Core database connection, then try again.</p>
                </section>
            <?php elseif ($rows === []): ?>
                <section class="leaderboard-empty" aria-labelledby="leaderboard-empty-title">
                    <h3 id="leaderboard-empty-title">No rankings found</h3>
                    <p><?php echo $search !== '' ? 'Try another name or clear the search.' : ($category === 'teams' ? 'Teams will appear after Mineacle Core records team standings.' : 'Players will appear after Mineacle Core records player statistics.'); ?></p>
                </section>
            <?php else: ?>
                <div class="leaderboard-table leaderboard-table--<?php echo h($category); ?>">
                    <div class="leaderboard-table__head" aria-label="Sort leaderboard columns">
                        <?php foreach ($tableColumns as $column): ?>
                            <?php if ($column['metric'] === null): ?>
                                <span class="leaderboard-table__label"><?php echo h((string) $column['label']); ?></span>
                            <?php else: ?>
                                <?php
                                $columnMetric = (string) $column['metric'];
                                $columnActive = $metric === $columnMetric;
                                $columnOrder = $columnActive && $order === 'desc' ? 'asc' : 'desc';
                                ?>
                                <button
                                    class="leaderboard-sort-heading<?php echo $columnActive ? ' is-active' : ''; ?>"
                                    type="button"
                                    data-leaderboard-request="<?php echo h(mineacle_leaderboards_url($category, $columnMetric, $columnOrder, $search)); ?>"
                                    aria-label="Sort by <?php echo h((string) $column['label']); ?><?php echo $columnActive ? ($order === 'desc' ? ', currently best first' : ', currently lowest first') : ''; ?>"
                                    aria-pressed="<?php echo $columnActive ? 'true' : 'false'; ?>"
                                >
                                    <span><?php echo h((string) $column['label']); ?></span>
                                    <?php if ($columnActive): ?>
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <?php if ($order === 'desc'): ?>
                                                <path d="m12 18 6-6h-4V5h-4v7H6l6 6Z"/>
                                            <?php else: ?>
                                                <path d="m12 6-6 6h4v7h4v-7h4l-6-6Z"/>
                                            <?php endif; ?>
                                        </svg>
                                    <?php endif; ?>
                                </button>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </div>

                    <div class="leaderboard-table__scroll" data-leaderboard-scroll tabindex="0" aria-label="Scrollable global <?php echo h($entityLabelLower); ?> rankings">
                        <div class="leaderboard-table__rows">
                            <?php foreach ($rows as $index => $row): ?>
                                <?php
                                $rank = max(1, (int) ($row['_global_rank'] ?? ($index + 1)));
                                $rankClass = mineacle_leaderboards_rank_class($rank);
                                ?>
                                <?php if ($category === 'players'): ?>
                                    <?php
                                    $head = mineacle_leaderboards_player_head($row);
                                    $kills = mineacle_stats_int($row['kills'] ?? 0);
                                    $deaths = mineacle_stats_int($row['deaths'] ?? 0);
                                    $teamName = mineacle_stats_team_name($row);
                                    ?>
                                    <a class="leaderboard-row<?php echo h($rankClass); ?>" href="<?php echo h(mineacle_leaderboards_player_url($row)); ?>" data-leaderboard-rank="<?php echo h((string) $rank); ?>">
                                        <span class="leaderboard-row__rank">#<?php echo h((string) $rank); ?></span>
                                        <span class="leaderboard-row__identity">
                                            <span class="leaderboard-row__avatar<?php echo $head !== '' ? ' has-image' : ''; ?>" aria-hidden="true">
                                                <?php if ($head !== ''): ?>
                                                    <img src="<?php echo h($head); ?>" alt="" loading="lazy" decoding="async" draggable="false">
                                                <?php else: ?>
                                                    <?php echo h(strtoupper(substr(mineacle_stats_display_name($row), 0, 1))); ?>
                                                <?php endif; ?>
                                            </span>
                                            <span class="leaderboard-row__name">
                                                <strong><?php echo mineacle_stats_ranked_name_html($row, 'leaderboard-ranked-name'); ?></strong>
                                                <small><?php echo h($teamName); ?></small>
                                            </span>
                                        </span>
                                        <span class="leaderboard-row__metric is-money">
                                            <small>Balance</small>
                                            <strong><?php echo h(mineacle_stats_money_label($row)); ?></strong>
                                        </span>
                                        <span class="leaderboard-row__metric is-kd">
                                            <small>K/D Ratio</small>
                                            <strong><?php echo h(mineacle_leaderboards_kd($kills, $deaths, $row['kd_ratio'] ?? 0)); ?></strong>
                                        </span>
                                        <span class="leaderboard-row__metric is-playtime">
                                            <small>Playtime</small>
                                            <strong><?php echo h(mineacle_stats_playtime_label($row)); ?></strong>
                                        </span>
                                    </a>
                                <?php else: ?>
                                    <?php
                                    $kills = mineacle_stats_int($row['kills'] ?? 0);
                                    $deaths = mineacle_stats_int($row['deaths'] ?? 0);
                                    $members = mineacle_stats_int($row['members'] ?? 0);
                                    ?>
                                    <article class="leaderboard-row<?php echo h($rankClass); ?>" data-leaderboard-rank="<?php echo h((string) $rank); ?>">
                                        <span class="leaderboard-row__rank">#<?php echo h((string) $rank); ?></span>
                                        <span class="leaderboard-row__identity">
                                            <span class="leaderboard-row__avatar" aria-hidden="true"><?php echo h(mineacle_leaderboards_team_initial($row)); ?></span>
                                            <span class="leaderboard-row__name">
                                                <strong><?php echo h(mineacle_leaderboards_team_name($row)); ?></strong>
                                                <small><?php echo h(mineacle_leaderboards_team_caption($row)); ?></small>
                                            </span>
                                        </span>
                                        <span class="leaderboard-row__metric is-money">
                                            <small>Capital</small>
                                            <strong><?php echo h(mineacle_leaderboards_team_money($row)); ?></strong>
                                        </span>
                                        <span class="leaderboard-row__metric is-kd">
                                            <small>K/D Ratio</small>
                                            <strong><?php echo h(mineacle_leaderboards_kd($kills, $deaths, $row['kd_ratio'] ?? 0)); ?></strong>
                                        </span>
                                        <span class="leaderboard-row__metric is-members">
                                            <small>Members</small>
                                            <strong><?php echo h(number_format($members)); ?></strong>
                                        </span>
                                    </article>
                                <?php endif; ?>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

                <footer class="leaderboard-panel__footer">
                    <span><?php echo h($footerPrimary); ?></span>
                    <span><?php echo h($footerSecondary); ?></span>
                </footer>
            <?php endif; ?>
        </div>
    </section>

    <?php mineacle_page_footer($site); ?>
</main>
<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/site.js',
        '/shared/assets/js/navigation.js?rev=' . rawurlencode($navigationScriptVersion),
        '/leaderboards/assets/js/leaderboards.js?rev=' . rawurlencode($leaderboardsScriptVersion),
    ],
]); ?>
