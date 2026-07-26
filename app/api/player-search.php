<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/stats-lib.php';

mineacle_security_headers();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

function mineacle_player_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function mineacle_player_identifier(string $identifier): ?string
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $identifier)) {
        return null;
    }

    return '`' . $identifier . '`';
}

function mineacle_player_first_column(array $columns, array $candidates): ?string
{
    foreach ($candidates as $candidate) {
        $key = strtolower($candidate);

        if (isset($columns[$key]) && mineacle_player_identifier($columns[$key]) !== null) {
            return $columns[$key];
        }
    }

    return null;
}

function mineacle_player_like_value(string $value): string
{
    return strtr($value, [
        '\\' => '\\\\',
        '%' => '\\%',
        '_' => '\\_',
    ]);
}

function mineacle_player_int(mixed $value): ?int
{
    if ($value === null || $value === '') {
        return null;
    }

    if (is_numeric($value)) {
        return max(0, (int) $value);
    }

    return null;
}

function mineacle_player_playtime_label(?int $seconds): string
{
    if ($seconds === null) {
        return '';
    }

    if ($seconds < 3600) {
        return max(1, (int) floor($seconds / 60)) . 'm played';
    }

    if ($seconds < 86400) {
        return (int) floor($seconds / 3600) . 'h played';
    }

    return (int) floor($seconds / 86400) . 'd played';
}

function mineacle_player_table_columns(PDO $pdo, string $tableSql): array
{
    $columns = [];
    $columnRows = $pdo->query('SHOW COLUMNS FROM ' . $tableSql)->fetchAll();

    foreach ($columnRows as $row) {
        $field = (string) ($row['Field'] ?? '');

        if ($field !== '') {
            $columns[strtolower($field)] = $field;
        }
    }

    return $columns;
}

function mineacle_player_column_select(?string $column, string $alias): string
{
    $aliasSql = mineacle_player_identifier($alias);

    if ($aliasSql === null) {
        return 'NULL';
    }

    if ($column === null) {
        return 'NULL AS ' . $aliasSql;
    }

    $columnSql = mineacle_player_identifier($column);

    return $columnSql !== null ? $columnSql . ' AS ' . $aliasSql : 'NULL AS ' . $aliasSql;
}

function mineacle_player_uuid_key(mixed $uuid): ?string
{
    $value = strtolower(trim((string) $uuid));

    if ($value === '') {
        return null;
    }

    $compact = preg_replace('/[^a-f0-9]/', '', $value);

    return is_string($compact) && $compact !== '' ? $compact : $value;
}

function mineacle_player_bool(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if (is_int($value) || is_float($value)) {
        return (int) $value === 1;
    }

    if (is_string($value)) {
        if ($value === "\x00") {
            return false;
        }

        if ($value === "\x01") {
            return true;
        }

        $normalized = strtolower(trim($value));

        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }

    return false;
}

function mineacle_player_empty_punishment(string $type): array
{
    return [
        'active' => false,
        'type' => $type,
        'kind' => null,
        'permanent' => false,
        'until' => null,
        'reason' => null,
    ];
}

function mineacle_player_punishment_from_row(array $row, string $type): array
{
    $until = mineacle_player_int($row['until_value'] ?? null);
    $removed = mineacle_player_int($row['removed_value'] ?? null);
    $now = time() * 1000;
    $active = array_key_exists('active_value', $row) && $row['active_value'] !== null
        ? mineacle_player_bool($row['active_value'])
        : true;

    if ($removed !== null && $removed > 0) {
        $active = false;
    }

    if ($until !== null && $until > 0 && $until <= $now) {
        $active = false;
    }

    if (!$active) {
        return mineacle_player_empty_punishment($type);
    }

    $kind = $until !== null && $until > $now ? 'temporary' : 'permanent';
    $reason = trim((string) ($row['reason_value'] ?? ''));

    return [
        'active' => true,
        'type' => $type,
        'kind' => $kind,
        'permanent' => $kind === 'permanent',
        'until' => $kind === 'temporary' ? $until : null,
        'reason' => $reason !== '' ? $reason : null,
    ];
}

function mineacle_player_litebans_table_status(PDO $pdo, string $table, string $type, array $uuidKeys): array
{
    if (!in_array($table, ['litebans_bans', 'litebans_mutes'], true) || $uuidKeys === []) {
        return [];
    }

    $tableSql = mineacle_player_identifier($table);

    if ($tableSql === null) {
        return [];
    }

    try {
        $columns = mineacle_player_table_columns($pdo, $tableSql);
    } catch (Throwable) {
        return [];
    }

    $uuidColumn = mineacle_player_first_column($columns, ['uuid']);
    $uuidSql = $uuidColumn ? mineacle_player_identifier($uuidColumn) : null;

    if ($uuidSql === null) {
        return [];
    }

    $uuidKeySql = sprintf("REPLACE(LOWER(%s), '-', '')", $uuidSql);
    $untilColumn = mineacle_player_first_column($columns, ['until', 'expires', 'expires_at']);
    $timeColumn = mineacle_player_first_column($columns, ['time', 'created', 'created_at']);
    $reasonColumn = mineacle_player_first_column($columns, ['reason']);
    $activeColumn = mineacle_player_first_column($columns, ['active']);
    $removedColumn = mineacle_player_first_column($columns, ['removed_by_date', 'removed_at']);
    $params = [];
    $placeholders = [];

    foreach (array_values(array_unique($uuidKeys)) as $index => $uuidKey) {
        $param = ':uuid' . $index;
        $params[$param] = $uuidKey;
        $placeholders[] = $param;
    }

    $select = [
        $uuidKeySql . ' AS uuid_key',
        mineacle_player_column_select($untilColumn, 'until_value'),
        mineacle_player_column_select($timeColumn, 'time_value'),
        mineacle_player_column_select($reasonColumn, 'reason_value'),
        mineacle_player_column_select($activeColumn, 'active_value'),
        mineacle_player_column_select($removedColumn, 'removed_value'),
    ];
    $orderColumn = $timeColumn ? mineacle_player_identifier($timeColumn) : null;
    $sql = 'SELECT ' . implode(', ', $select) . ' FROM ' . $tableSql
        . ' WHERE ' . $uuidKeySql . ' IN (' . implode(', ', $placeholders) . ')';

    if ($orderColumn !== null) {
        $sql .= ' ORDER BY ' . $orderColumn . ' DESC';
    }

    $sql .= ' LIMIT 200';
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $statuses = [];

    foreach ($statement->fetchAll() as $row) {
        $uuidKey = mineacle_player_uuid_key($row['uuid_key'] ?? '');

        if ($uuidKey === null || isset($statuses[$uuidKey])) {
            continue;
        }

        $punishment = mineacle_player_punishment_from_row($row, $type);

        if ($punishment['active']) {
            $statuses[$uuidKey] = $punishment;
        }
    }

    return $statuses;
}

function mineacle_player_litebans_statuses(PDO $pdo, array $tables, array $players): array
{
    $uuidKeys = [];
    $playerKeys = [];

    foreach ($players as $player) {
        $key = mineacle_player_uuid_key($player['uuid'] ?? null);

        if ($key === null) {
            continue;
        }

        $uuidKeys[] = $key;
        $playerKeys[(string) ($player['uuid'] ?? '')] = $key;
    }

    if ($uuidKeys === []) {
        return [];
    }

    $banTable = (string) ($tables['litebans_bans'] ?? 'litebans_bans');
    $muteTable = (string) ($tables['litebans_mutes'] ?? 'litebans_mutes');
    $bans = mineacle_player_litebans_table_status($pdo, $banTable, 'ban', $uuidKeys);
    $mutes = mineacle_player_litebans_table_status($pdo, $muteTable, 'mute', $uuidKeys);
    $statuses = [];

    foreach ($playerKeys as $uuid => $key) {
        $ban = $bans[$key] ?? mineacle_player_empty_punishment('ban');
        $mute = $mutes[$key] ?? mineacle_player_empty_punishment('mute');
        $searchState = 'clear';

        if ($ban['active']) {
            $searchState = $ban['kind'] === 'temporary' ? 'temporary_ban' : 'permanent_ban';
        } elseif ($mute['active']) {
            $searchState = $mute['kind'] === 'temporary' ? 'temporary_mute' : 'permanent_mute';
        }

        $statuses[$uuid] = [
            'ban' => $ban,
            'mute' => $mute,
            'search_state' => $searchState,
        ];
    }

    return $statuses;
}

$config = mineacle_config();
$tables = $config['tables'] ?? [];
$table = (string) ($tables['player_profiles'] ?? 'mineacle_web_profiles');
$tableSql = mineacle_player_identifier($table);

if ($tableSql === null || $table !== 'mineacle_web_profiles') {
    mineacle_player_response([
        'success' => false,
        'players' => [],
        'message' => 'Player profiles table is not available.',
    ], 500);
}

$pdo = mineacle_core_db();

if (!$pdo instanceof PDO) {
    mineacle_player_response([
        'success' => false,
        'players' => [],
        'message' => 'Player search is not connected yet.',
    ]);
}

$query = trim((string) ($_GET['q'] ?? ''));
$query = preg_replace('/\s+/', ' ', $query) ?? '';
$query = substr($query, 0, 40);
$limit = max(1, min(25, (int) ($_GET['limit'] ?? ($query === '' ? 25 : 8))));

try {
    $columns = mineacle_player_table_columns($pdo, $tableSql);
    $nameColumn = mineacle_player_first_column($columns, [
        'username',
        'player_name',
        'name',
        'display_name',
        'last_username',
        'last_known_name',
        'minecraft_username',
        'player',
    ]);

    if ($nameColumn === null) {
        mineacle_player_response([
            'success' => true,
            'players' => [],
        ]);
    }

    $uuidColumn = mineacle_player_first_column($columns, [
        'uuid',
        'player_uuid',
        'unique_id',
        'minecraft_uuid',
    ]);
    $playtimeColumn = mineacle_player_first_column($columns, [
        'playtime_seconds',
        'seconds_played',
        'playtime',
        'time_played',
    ]);
    $lastSeenColumn = mineacle_player_first_column($columns, [
        'last_seen_at',
        'last_seen',
        'last_login',
        'last_joined',
        'updated_at',
    ]);
    $joinedColumn = mineacle_player_first_column($columns, [
        'joined_at',
        'first_joined_at',
        'first_joined',
        'created_at',
    ]);
    $displayColumn = mineacle_player_first_column($columns, [
        'display_name',
        'username',
    ]);
    $rankKeyColumn = mineacle_player_first_column($columns, ['rank_key']);
    $rankNameColumn = mineacle_player_first_column($columns, ['rank_name']);
    $rankPrefixColumn = mineacle_player_first_column($columns, ['rank_prefix']);
    $rankColorColumn = mineacle_player_first_column($columns, ['rank_color']);
    $rankWeightColumn = mineacle_player_first_column($columns, ['rank_weight']);
    $onlineColumn = mineacle_player_first_column($columns, ['online']);
    $worldKeyColumn = mineacle_player_first_column($columns, ['world_key']);
    $worldNameColumn = mineacle_player_first_column($columns, ['world_name']);
    $worldGroupColumn = mineacle_player_first_column($columns, ['world_group']);

    $nameSql = mineacle_player_identifier($nameColumn);

    if ($nameSql === null) {
        mineacle_player_response([
            'success' => true,
            'players' => [],
        ]);
    }

    $select = [
        $nameSql . ' AS username',
        $uuidColumn ? mineacle_player_identifier($uuidColumn) . ' AS uuid' : 'NULL AS uuid',
        $displayColumn ? mineacle_player_identifier($displayColumn) . ' AS display_name' : $nameSql . ' AS display_name',
        $rankKeyColumn ? mineacle_player_identifier($rankKeyColumn) . ' AS rank_key' : "'' AS rank_key",
        $rankNameColumn ? mineacle_player_identifier($rankNameColumn) . ' AS rank_name' : "'' AS rank_name",
        $rankPrefixColumn ? mineacle_player_identifier($rankPrefixColumn) . ' AS rank_prefix' : "'' AS rank_prefix",
        $rankColorColumn ? mineacle_player_identifier($rankColorColumn) . ' AS rank_color' : "'' AS rank_color",
        $rankWeightColumn ? mineacle_player_identifier($rankWeightColumn) . ' AS rank_weight' : '0 AS rank_weight',
        $onlineColumn ? mineacle_player_identifier($onlineColumn) . ' AS online' : '0 AS online',
        $worldKeyColumn ? mineacle_player_identifier($worldKeyColumn) . ' AS world_key' : "'' AS world_key",
        $worldNameColumn ? mineacle_player_identifier($worldNameColumn) . ' AS world_name' : "'' AS world_name",
        $worldGroupColumn ? mineacle_player_identifier($worldGroupColumn) . ' AS world_group' : "'' AS world_group",
        $playtimeColumn ? mineacle_player_identifier($playtimeColumn) . ' AS playtime_seconds' : 'NULL AS playtime_seconds',
        $lastSeenColumn ? mineacle_player_identifier($lastSeenColumn) . ' AS last_seen' : 'NULL AS last_seen',
        $joinedColumn ? mineacle_player_identifier($joinedColumn) . ' AS joined_at' : 'NULL AS joined_at',
    ];

    $sql = 'SELECT ' . implode(', ', $select) . ' FROM ' . $tableSql;
    $params = [];

    if ($query !== '') {
        $safeQuery = mineacle_player_like_value($query);
        $displaySql = $displayColumn ? mineacle_player_identifier($displayColumn) : null;
        $searchParts = [$nameSql . ' LIKE :prefix', $nameSql . ' LIKE :contains'];

        if ($displaySql !== null && $displaySql !== $nameSql) {
            $searchParts[] = $displaySql . ' LIKE :display_prefix';
            $searchParts[] = $displaySql . ' LIKE :display_contains';
            $params[':display_prefix'] = $safeQuery . '%';
            $params[':display_contains'] = '%' . $safeQuery . '%';
        }

        $sql .= ' WHERE ' . implode(' OR ', $searchParts);
        $params[':prefix'] = $safeQuery . '%';
        $params[':contains'] = '%' . $safeQuery . '%';
    }

    $order = [];

    if ($query !== '') {
        $order[] = 'CASE WHEN ' . $nameSql . ' LIKE :prefix_order THEN 0 ELSE 1 END';
        $params[':prefix_order'] = mineacle_player_like_value($query) . '%';
    }

    if ($playtimeColumn) {
        $order[] = mineacle_player_identifier($playtimeColumn) . ' DESC';
    }

    $order[] = $nameSql . ' ASC';
    $sql .= ' ORDER BY ' . implode(', ', $order) . ' LIMIT ' . $limit;

    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $rows = $statement->fetchAll();
    $players = [];

    foreach ($rows as $row) {
        $name = trim((string) ($row['username'] ?? ''));

        if ($name === '') {
            continue;
        }

        $playtimeSeconds = mineacle_player_int($row['playtime_seconds'] ?? null);
        $rankPlayer = [
            'username' => $name,
            'display_name' => $row['display_name'] ?? $name,
            'rank_key' => $row['rank_key'] ?? '',
            'rank_name' => $row['rank_name'] ?? '',
            'rank_prefix' => $row['rank_prefix'] ?? '',
            'rank_color' => $row['rank_color'] ?? '',
            'rank_weight' => $row['rank_weight'] ?? 0,
            'online' => $row['online'] ?? 0,
            'world_key' => $row['world_key'] ?? '',
            'world_name' => $row['world_name'] ?? '',
            'world_group' => $row['world_group'] ?? '',
            'last_seen' => $row['last_seen'] ?? 0,
        ];
        $statusView = mineacle_stats_status_view($rankPlayer);

        $players[] = [
            'name' => $name,
            'display_name' => mineacle_stats_display_name($rankPlayer),
            'rank_label' => mineacle_stats_rank_name($rankPlayer),
            'rank_color' => mineacle_stats_rank_color($rankPlayer),
            'uuid' => $row['uuid'] !== null ? (string) $row['uuid'] : null,
            'skin' => mineacle_stats_skin_assets($row['uuid'] !== null ? (string) $row['uuid'] : null, $name),
            'playtime_seconds' => $playtimeSeconds,
            'playtime_label' => mineacle_player_playtime_label($playtimeSeconds),
            'last_seen' => $row['last_seen'] !== null ? (string) $row['last_seen'] : null,
            'joined_at' => $row['joined_at'] !== null ? (string) $row['joined_at'] : null,
            'online' => $statusView['online'],
            'world_name' => $statusView['world'],
            'status_label' => $statusView['label'],
            'status_line' => $statusView['line'],
            'status_secondary' => $statusView['secondary'],
            'punishment_status' => [
                'ban' => mineacle_player_empty_punishment('ban'),
                'mute' => mineacle_player_empty_punishment('mute'),
                'search_state' => 'clear',
            ],
        ];
    }

    $litebansPdo = mineacle_litebans_db();
    $statuses = $litebansPdo instanceof PDO ? mineacle_player_litebans_statuses($litebansPdo, $tables, $players) : [];

    foreach ($players as $index => $player) {
        $uuid = (string) ($player['uuid'] ?? '');

        if (isset($statuses[$uuid])) {
            $players[$index]['punishment_status'] = $statuses[$uuid];
        }
    }

    mineacle_player_response([
        'success' => true,
        'players' => $players,
    ]);
} catch (Throwable) {
    mineacle_player_response([
        'success' => false,
        'players' => [],
        'message' => 'Player search is unavailable.',
    ]);
}
