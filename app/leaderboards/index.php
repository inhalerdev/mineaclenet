<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/layout.php';
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
        'limit' => 100,
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
    $sourceOffset = $order === 'asc'
        ? max(0, $totalAvailable - $maxResults)
        : 0;

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

$siteUrl = static function (mixed $value, string $fallback): string {
    $resolved = mineacle_page_public_link($value);

    return $resolved === '#' ? $fallback : $resolved;
};

$navigation = [
    ['key' => 'home', 'label' => 'Home', 'url' => '/', 'external' => false],
    ['key' => 'vote', 'label' => 'Vote', 'url' => '/vote', 'external' => false],
    ['key' => 'leaderboards', 'label' => 'Leaderboards', 'url' => '/leaderboards', 'external' => false],
    ['key' => 'bans', 'label' => 'Bans', 'url' => '/bans', 'external' => false],
    ['key' => 'store', 'label' => 'Store', 'url' => $siteUrl($site['store_url'] ?? '', 'https://store.mineacle.net/'), 'external' => true],
];
$currentNavKey = 'leaderboards';
$assetVersion = mineacle_page_asset_version();
$siteStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/site.css') ?: $assetVersion);
$pagesStylesheetVersion = (string) (filemtime(__DIR__ . '/../shared/assets/css/pages.css') ?: $assetVersion);
$homeStylesheetVersion = (string) (filemtime(__DIR__ . '/../home/assets/css/home.css') ?: $assetVersion);
$leaderboardsStylesheetVersion = (string) (filemtime(__DIR__ . '/assets/css/leaderboards.css') ?: $assetVersion);
$leaderboardsScriptVersion = (string) (filemtime(__DIR__ . '/assets/js/leaderboards.js') ?: $assetVersion);
$heroVersion = (string) (filemtime(__DIR__ . '/assets/images/hero.webp') ?: $assetVersion);
$logoVersion = (string) (filemtime(__DIR__ . '/../home/assets/images/logo-small.png') ?: $assetVersion);
$categoryLabel = (string) $categories[$category]['label'];
$metricLabel = (string) $metricConfig['label'];
$resultCount = count($rows);
$visibleCount = min(5, $resultCount);
$panelTitle = $order === 'desc'
    ? 'Top 5 ' . $categoryLabel . ' Global'
    : $categoryLabel . ' Global';
$orderLabel = $order === 'asc' ? 'Ascending' : 'Descending';

mineacle_page_head('Leaderboards', [
    'meta_title' => 'Leaderboards | Mineacle',
    'meta_description' => 'Explore Mineacle global player and team rankings across economy, combat, and playtime.',
    'canonical_url' => 'https://mineacle.net/leaderboards',
    'stylesheets' => [
        '/shared/assets/css/site.css?rev=' . rawurlencode($siteStylesheetVersion),
        '/shared/assets/css/pages.css?rev=' . rawurlencode($pagesStylesheetVersion),
        '/home/assets/css/home.css?rev=' . rawurlencode($homeStylesheetVersion),
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
            <header class="home-header leaderboards-header">
                <a class="home-brand" href="/" aria-label="Mineacle home">
                    <img
                        src="/home/assets/images/logo-small.png?rev=<?php echo h(rawurlencode($logoVersion)); ?>"
                        alt=""
                        width="64"
                        height="55"
                        draggable="false"
                    >
                </a>

                <nav class="home-navigation" aria-label="Primary navigation">
                    <div class="home-navigation__links">
                        <?php foreach ($navigation as $link): ?>
                            <?php $isCurrent = (string) $link['key'] === $currentNavKey; ?>
                            <a
                                class="home-navigation__link<?php echo $isCurrent ? ' is-current' : ''; ?>"
                                href="<?php echo h((string) $link['url']); ?>"
                                <?php echo $isCurrent ? 'aria-current="page"' : ''; ?>
                                <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                            ><?php echo h((string) $link['label']); ?></a>
                        <?php endforeach; ?>
                    </div>

                    <details class="home-menu" data-leaderboards-menu>
                        <summary class="home-menu__button" aria-label="Open navigation menu">
                            <span aria-hidden="true"></span>
                            <span aria-hidden="true"></span>
                        </summary>
                        <nav class="home-menu__panel" aria-label="Menu navigation">
                            <?php foreach ($navigation as $link): ?>
                                <?php $isCurrent = (string) $link['key'] === $currentNavKey; ?>
                                <a
                                    class="home-menu__link<?php echo $isCurrent ? ' is-current' : ''; ?>"
                                    href="<?php echo h((string) $link['url']); ?>"
                                    <?php echo $isCurrent ? 'aria-current="page"' : ''; ?>
                                    <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                                ><?php echo h((string) $link['label']); ?></a>
                            <?php endforeach; ?>
                        </nav>
                    </details>
                </nav>
            </header>

            <div class="leaderboards-hero__copy">
                <h1 id="leaderboards-page-title">Leaderboards</h1>
                <p>Follow Mineacle’s global standings across economy, combat efficiency, playtime, and team performance. Switch between players and teams, compare the strongest records, and open any player profile for the story behind their rank.</p>
            </div>
        </div>
    </section>

    <section
        class="leaderboard-panel"
        id="leaderboardRankings"
        data-leaderboard-root
        aria-labelledby="leaderboard-panel-title"
    >
        <p class="sr-only" data-leaderboard-status aria-live="polite"></p>

        <header class="leaderboard-panel__header">
            <div class="leaderboard-panel__title">
                <span>Global rankings</span>
                <h2 id="leaderboard-panel-title"><?php echo h($panelTitle); ?></h2>
            </div>

            <div class="leaderboard-panel__controls">
                <nav class="leaderboard-order" aria-label="Ranking order">
                    <a
                        class="leaderboard-order__button<?php echo $order === 'asc' ? ' is-active' : ''; ?>"
                        href="<?php echo h(mineacle_leaderboards_url($category, $metric, 'asc', $search)); ?>"
                        data-leaderboard-link
                        aria-label="Sort <?php echo h($categoryLabel); ?> ascending"
                        title="Ascending"
                        <?php echo $order === 'asc' ? 'aria-current="page"' : ''; ?>
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5 5 12h4v7h6v-7h4L12 5Z"/></svg>
                    </a>
                    <a
                        class="leaderboard-order__button<?php echo $order === 'desc' ? ' is-active' : ''; ?>"
                        href="<?php echo h(mineacle_leaderboards_url($category, $metric, 'desc', $search)); ?>"
                        data-leaderboard-link
                        aria-label="Sort <?php echo h($categoryLabel); ?> descending"
                        title="Descending"
                        <?php echo $order === 'desc' ? 'aria-current="page"' : ''; ?>
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 19 7-7h-4V5H9v7H5l7 7Z"/></svg>
                    </a>
                </nav>

                <details class="leaderboard-filter" data-leaderboard-filter>
                    <summary class="leaderboard-filter__button" aria-label="Filter leaderboards" title="Filter leaderboards">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M4 6h7v2H4V6Zm11 0h5v2h-5V6ZM9 4h2v6H9V4ZM4 11h3v2H4v-2Zm7 0h9v2h-9v-2Zm-2-2h2v6H9V9Zm-5 7h10v2H4v-2Zm14 0h2v2h-2v-2Zm-2-2h2v6h-2v-6Z"/>
                        </svg>
                    </summary>

                    <div class="leaderboard-filter__menu">
                        <section aria-labelledby="leaderboard-filter-scope">
                            <h3 id="leaderboard-filter-scope">Leaderboard</h3>
                            <div class="leaderboard-filter__options">
                                <?php foreach ($categories as $categoryKey => $categoryData): ?>
                                    <?php $isCurrentCategory = $category === $categoryKey; ?>
                                    <a
                                        class="leaderboard-filter__option<?php echo $isCurrentCategory ? ' is-active' : ''; ?>"
                                        href="<?php echo h(mineacle_leaderboards_url((string) $categoryKey, 'overall', 'desc', $search)); ?>"
                                        data-leaderboard-link
                                        <?php echo $isCurrentCategory ? 'aria-current="page"' : ''; ?>
                                    >
                                        <span><?php echo h((string) $categoryData['label']); ?></span>
                                        <small>Global</small>
                                    </a>
                                <?php endforeach; ?>
                            </div>
                        </section>

                        <section aria-labelledby="leaderboard-filter-metric">
                            <h3 id="leaderboard-filter-metric">Rank by</h3>
                            <div class="leaderboard-filter__metrics">
                                <?php foreach ($categories[$category]['metrics'] as $metricKey => $metricData): ?>
                                    <?php $isCurrentMetric = $metric === $metricKey; ?>
                                    <a
                                        class="leaderboard-filter__metric<?php echo $isCurrentMetric ? ' is-active' : ''; ?>"
                                        href="<?php echo h(mineacle_leaderboards_url($category, (string) $metricKey, $order, $search)); ?>"
                                        data-leaderboard-link
                                        <?php echo $isCurrentMetric ? 'aria-current="page"' : ''; ?>
                                    ><?php echo h((string) $metricData['label']); ?></a>
                                <?php endforeach; ?>
                            </div>
                        </section>
                    </div>
                </details>
            </div>
        </header>

        <div class="leaderboard-panel__context">
            <span><?php echo h($metricLabel); ?></span>
            <span aria-hidden="true">•</span>
            <span><?php echo h($orderLabel); ?></span>
            <span aria-hidden="true">•</span>
            <span><?php echo h(number_format(min($totalAvailable, $maxResults))); ?> ranked</span>
        </div>

        <?php if ($loadError): ?>
            <section class="leaderboard-empty" aria-labelledby="leaderboard-error-title">
                <h3 id="leaderboard-error-title">Unable to load leaderboards</h3>
                <p>Check the Mineacle Core database connection, then try again.</p>
            </section>
        <?php elseif ($rows === []): ?>
            <section class="leaderboard-empty" aria-labelledby="leaderboard-empty-title">
                <h3 id="leaderboard-empty-title">No rankings available yet</h3>
                <p><?php echo $category === 'teams' ? 'Teams will appear after Mineacle Core records team standings.' : 'Players will appear after Mineacle Core records player statistics.'; ?></p>
            </section>
        <?php else: ?>
            <div class="leaderboard-table leaderboard-table--<?php echo h($category); ?>">
                <?php if ($category === 'players'): ?>
                    <div class="leaderboard-table__head" aria-hidden="true">
                        <span>Rank</span>
                        <span>Player</span>
                        <span>Balance</span>
                        <span>K/D Ratio</span>
                        <span>Playtime</span>
                    </div>
                <?php else: ?>
                    <div class="leaderboard-table__head" aria-hidden="true">
                        <span>Rank</span>
                        <span>Team</span>
                        <span>Capital</span>
                        <span>K/D Ratio</span>
                        <span>Members</span>
                    </div>
                <?php endif; ?>

                <div class="leaderboard-table__scroll" data-leaderboard-scroll tabindex="0" aria-label="Scrollable global <?php echo h(strtolower($categoryLabel)); ?> rankings">
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
                                <a class="leaderboard-row<?php echo h($rankClass); ?>" href="<?php echo h(mineacle_leaderboards_player_url($row)); ?>">
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
                                <article class="leaderboard-row<?php echo h($rankClass); ?>">
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
                <span>Showing <?php echo h((string) $visibleCount); ?> at a time</span>
                <span>Scroll for all <?php echo h(number_format($resultCount)); ?> loaded <?php echo h(strtolower($categoryLabel)); ?></span>
            </footer>
        <?php endif; ?>
    </section>

    <?php mineacle_page_footer($site); ?>
</main>
<?php mineacle_page_end([
    'scripts' => [
        '/shared/assets/js/site.js',
        '/leaderboards/assets/js/leaderboards.js?rev=' . rawurlencode($leaderboardsScriptVersion),
    ],
]); ?>
