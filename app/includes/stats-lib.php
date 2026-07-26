<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function mineacle_stats_table_sql(string $table): ?string
{
    if (!in_array($table, ['mineacle_web_profiles', 'mineacle_web_teams', 'mineacle_web_fights'], true) || !preg_match('/^[A-Za-z0-9_]+$/', $table)) {
        return null;
    }

    return '`' . $table . '`';
}

function mineacle_stats_column_sql(string $column): ?string
{
    if (!preg_match('/^[A-Za-z0-9_]+$/', $column)) {
        return null;
    }

    return '`' . $column . '`';
}

function mineacle_stats_columns(PDO $pdo, string $tableSql): array
{
    $columns = [];
    $rows = $pdo->query('SHOW COLUMNS FROM ' . $tableSql)->fetchAll();

    foreach ($rows as $row) {
        $field = (string) ($row['Field'] ?? '');

        if ($field !== '' && mineacle_stats_column_sql($field) !== null) {
            $columns[strtolower($field)] = $field;
        }
    }

    return $columns;
}

function mineacle_stats_select_list(array $columns): string
{
    $defaults = [
        'uuid' => "''",
        'username' => "''",
        'display_name' => "''",
        'rank_key' => "''",
        'rank_name' => "''",
        'rank_prefix' => "''",
        'rank_color' => "''",
        'rank_weight' => '0',
        'online' => '0',
        'world_key' => "''",
        'world_name' => "''",
        'world_group' => "''",
        'team_id' => "''",
        'team_name' => "''",
        'team_role' => "''",
        'team_joined_at' => '0',
        'balance_cents' => '0',
        'balance_formatted' => "''",
        'playtime_seconds' => '0',
        'playtime_formatted' => "''",
        'kills' => '0',
        'deaths' => '0',
        'kd_ratio' => '0',
        'money_rank' => '0',
        'kills_rank' => '0',
        'playtime_rank' => '0',
        'first_joined_at' => '0',
        'last_seen' => '0',
        'updated_at' => '0',
    ];
    $select = [];

    foreach ($defaults as $column => $default) {
        $aliasSql = mineacle_stats_column_sql($column);
        $actual = $columns[strtolower($column)] ?? null;
        $actualSql = is_string($actual) ? mineacle_stats_column_sql($actual) : null;

        $select[] = ($actualSql ?? $default) . ' AS ' . $aliasSql;
    }

    return implode(', ', $select);
}

function mineacle_stats_column_from_candidates(array $columns, array $candidates): ?string
{
    foreach ($candidates as $candidate) {
        $actual = $columns[strtolower((string) $candidate)] ?? null;

        if (is_string($actual) && mineacle_stats_column_sql($actual) !== null) {
            return $actual;
        }
    }

    return null;
}

function mineacle_stats_team_select_list(array $columns): string
{
    $map = [
        'team_id' => [['team_id', 'id', 'uuid'], "''"],
        'name' => [['team_name', 'name', 'display_name'], "''"],
        'tag' => [['tag', 'team_tag', 'prefix'], "''"],
        'owner_uuid' => [['owner_uuid', 'founder_uuid', 'leader_uuid', 'owner'], "''"],
        'owner_name' => [['owner_name', 'leader_name', 'leader', 'owner_username'], "''"],
        'members' => [['members', 'member_count', 'total_members', 'players'], '0'],
        'online_members' => [['online_members', 'online_count', 'members_online', 'online'], '0'],
        'balance_cents' => [['total_balance_cents', 'balance_cents', 'bank_balance_cents', 'team_balance_cents'], '0'],
        'balance_formatted' => [['total_balance_formatted', 'balance_formatted', 'bank_balance_formatted', 'team_balance_formatted'], "''"],
        'balance' => [['balance', 'bank_balance', 'team_balance'], '0'],
        'kills' => [['kills', 'team_kills', 'total_kills'], '0'],
        'deaths' => [['deaths', 'team_deaths', 'total_deaths'], '0'],
        'kd_ratio' => [['kd_ratio', 'kdr', 'team_kd_ratio'], '0'],
        'playtime_seconds' => [['playtime_seconds', 'total_playtime_seconds', 'team_playtime_seconds'], '0'],
        'wins' => [['wins', 'team_wins'], '0'],
        'losses' => [['losses', 'team_losses'], '0'],
        'points' => [['points', 'score', 'rating', 'elo'], '0'],
        'created_at' => [['created_at', 'created', 'founded_at'], '0'],
        'updated_at' => [['updated_at', 'updated', 'last_updated'], '0'],
    ];
    $select = [];

    foreach ($map as $alias => [$candidates, $default]) {
        $actual = mineacle_stats_column_from_candidates($columns, $candidates);
        $actualSql = is_string($actual) ? mineacle_stats_column_sql($actual) : null;
        $aliasSql = mineacle_stats_column_sql((string) $alias);

        $select[] = ($actualSql ?? $default) . ' AS ' . $aliasSql;
    }

    return implode(', ', $select);
}

function mineacle_stats_team_online_members(PDO $pdo, array $teams): array
{
    if ($teams === []) {
        return [];
    }

    $config = mineacle_config();
    $tables = $config['tables'] ?? [];
    $table = (string) ($tables['player_profiles'] ?? 'mineacle_web_profiles');
    $tableSql = mineacle_stats_table_sql($table);

    if ($tableSql === null) {
        return [];
    }

    try {
        $columns = mineacle_stats_columns($pdo, $tableSql);
    } catch (Throwable) {
        return [];
    }

    $teamColumn = mineacle_stats_column_from_candidates($columns, ['team_id']);
    $onlineColumn = mineacle_stats_column_from_candidates($columns, ['online']);

    if (!is_string($teamColumn) || !is_string($onlineColumn)) {
        return [];
    }

    $teamSql = mineacle_stats_column_sql($teamColumn);
    $onlineSql = mineacle_stats_column_sql($onlineColumn);

    if ($teamSql === null || $onlineSql === null) {
        return [];
    }

    $teamIds = [];

    foreach ($teams as $team) {
        $teamId = trim((string) ($team['team_id'] ?? ''));

        if ($teamId !== '') {
            $teamIds[$teamId] = $teamId;
        }
    }

    if ($teamIds === []) {
        return [];
    }

    $uuidColumn = mineacle_stats_column_from_candidates($columns, ['uuid']);
    $usernameColumn = mineacle_stats_column_from_candidates($columns, ['username']);
    $displayColumn = mineacle_stats_column_from_candidates($columns, ['display_name', 'username']);
    $roleColumn = mineacle_stats_column_from_candidates($columns, ['team_role']);
    $updatedColumn = mineacle_stats_column_from_candidates($columns, ['updated_at']);
    $select = [
        $teamSql . ' AS team_id',
        is_string($uuidColumn) && mineacle_stats_column_sql($uuidColumn) !== null ? mineacle_stats_column_sql($uuidColumn) . ' AS uuid' : "'' AS uuid",
        is_string($usernameColumn) && mineacle_stats_column_sql($usernameColumn) !== null ? mineacle_stats_column_sql($usernameColumn) . ' AS username' : "'' AS username",
        is_string($displayColumn) && mineacle_stats_column_sql($displayColumn) !== null ? mineacle_stats_column_sql($displayColumn) . ' AS display_name' : "'' AS display_name",
        is_string($roleColumn) && mineacle_stats_column_sql($roleColumn) !== null ? mineacle_stats_column_sql($roleColumn) . ' AS team_role' : "'' AS team_role",
        is_string($updatedColumn) && mineacle_stats_column_sql($updatedColumn) !== null ? mineacle_stats_column_sql($updatedColumn) . ' AS updated_at' : '0 AS updated_at',
    ];
    $params = [];
    $placeholders = [];

    foreach (array_values($teamIds) as $index => $teamId) {
        $param = ':team' . $index;
        $params[$param] = $teamId;
        $placeholders[] = $param;
    }

    $roleSql = is_string($roleColumn) ? mineacle_stats_column_sql($roleColumn) : null;
    $displaySql = is_string($displayColumn) ? mineacle_stats_column_sql($displayColumn) : null;
    $order = [];

    if ($roleSql !== null) {
        $order[] = "CASE " . $roleSql . " WHEN 'Founder' THEN 1 WHEN 'MVP' THEN 2 WHEN 'VIP' THEN 3 ELSE 4 END ASC";
    }

    if ($displaySql !== null) {
        $order[] = $displaySql . ' ASC';
    }

    $sql = 'SELECT ' . implode(', ', $select)
        . ' FROM ' . $tableSql
        . ' WHERE ' . $teamSql . ' IN (' . implode(', ', $placeholders) . ')'
        . ' AND ' . $onlineSql . ' = 1';

    if ($order !== []) {
        $sql .= ' ORDER BY ' . implode(', ', $order);
    }

    try {
        $statement = $pdo->prepare($sql);
        $statement->execute($params);
    } catch (Throwable) {
        return [];
    }

    $members = [];

    foreach ($statement->fetchAll() as $row) {
        if (!is_array($row)) {
            continue;
        }

        $teamId = trim((string) ($row['team_id'] ?? ''));

        if ($teamId === '') {
            continue;
        }

        $members[$teamId][] = $row;
    }

    return $members;
}

function mineacle_stats_team_money_label(array $team): string
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

function mineacle_stats_kd_label(int $kills, int $deaths, mixed $stored = null): string
{
    $ratio = mineacle_stats_float($stored);

    if ($ratio <= 0 && ($kills > 0 || $deaths > 0)) {
        $ratio = $kills / max(1, $deaths);
    }

    return number_format($ratio, 2);
}

function mineacle_stats_team_rank(PDO $pdo, string $tableSql, array $columns, array $team): int
{
    $teamId = trim((string) ($team['team_id'] ?? ''));
    $teamName = trim((string) ($team['name'] ?? ''));
    $teamIdColumn = mineacle_stats_column_from_candidates($columns, ['team_id', 'id', 'uuid']);
    $teamIdSql = is_string($teamIdColumn) ? mineacle_stats_column_sql($teamIdColumn) : null;
    $nameColumn = mineacle_stats_column_from_candidates($columns, ['team_name', 'name', 'display_name']);
    $nameSql = is_string($nameColumn) ? mineacle_stats_column_sql($nameColumn) : null;
    $balanceColumn = mineacle_stats_column_from_candidates($columns, ['total_balance_cents', 'balance_cents', 'bank_balance_cents', 'team_balance_cents']);
    $balanceSql = is_string($balanceColumn) ? mineacle_stats_column_sql($balanceColumn) : null;
    $kdColumn = mineacle_stats_column_from_candidates($columns, ['kd_ratio', 'kdr', 'team_kd_ratio']);
    $kdSql = is_string($kdColumn) ? mineacle_stats_column_sql($kdColumn) : null;
    $killsColumn = mineacle_stats_column_from_candidates($columns, ['total_kills', 'kills', 'team_kills']);
    $killsSql = is_string($killsColumn) ? mineacle_stats_column_sql($killsColumn) : null;
    $membersColumn = mineacle_stats_column_from_candidates($columns, ['member_count', 'members', 'total_members', 'players']);
    $membersSql = is_string($membersColumn) ? mineacle_stats_column_sql($membersColumn) : null;
    $select = [
        $teamIdSql !== null ? $teamIdSql . ' AS team_id' : "'' AS team_id",
        $nameSql !== null ? $nameSql . ' AS name' : "'' AS name",
    ];
    $order = [];

    foreach ([$balanceSql, $kdSql, $killsSql, $membersSql] as $columnSql) {
        if ($columnSql !== null) {
            $order[] = $columnSql . ' DESC';
        }
    }

    if ($nameSql !== null) {
        $order[] = $nameSql . ' ASC';
    }

    if ($order === []) {
        return 0;
    }

    try {
        $statement = $pdo->query('SELECT ' . implode(', ', $select) . ' FROM ' . $tableSql . ' ORDER BY ' . implode(', ', $order) . ' LIMIT 500');
    } catch (Throwable) {
        return 0;
    }

    foreach ($statement->fetchAll() as $index => $row) {
        $rowTeamId = trim((string) ($row['team_id'] ?? ''));
        $rowName = trim((string) ($row['name'] ?? ''));

        if (($teamId !== '' && strcasecmp($rowTeamId, $teamId) === 0) || ($teamName !== '' && strcasecmp($rowName, $teamName) === 0)) {
            return $index + 1;
        }
    }

    return 0;
}

function mineacle_stats_team_by_profile(array $player): ?array
{
    $teamId = trim((string) ($player['team_id'] ?? ''));
    $teamName = trim((string) ($player['team_name'] ?? ''));

    if ($teamId === '' && ($teamName === '' || strcasecmp($teamName, 'No Team') === 0)) {
        return null;
    }

    $pdo = mineacle_core_db();

    if (!$pdo instanceof PDO) {
        return null;
    }

    $config = mineacle_config();
    $tables = $config['tables'] ?? [];
    $table = (string) ($tables['teams'] ?? 'mineacle_web_teams');
    $tableSql = mineacle_stats_table_sql($table);

    if ($tableSql === null) {
        return null;
    }

    try {
        $columns = mineacle_stats_columns($pdo, $tableSql);
    } catch (Throwable) {
        return null;
    }

    $select = mineacle_stats_team_select_list($columns);
    $where = [];
    $params = [];
    $teamIdColumn = mineacle_stats_column_from_candidates($columns, ['team_id', 'id', 'uuid']);
    $teamIdSql = is_string($teamIdColumn) ? mineacle_stats_column_sql($teamIdColumn) : null;
    $nameColumn = mineacle_stats_column_from_candidates($columns, ['team_name', 'name', 'display_name']);
    $nameSql = is_string($nameColumn) ? mineacle_stats_column_sql($nameColumn) : null;

    if ($teamId !== '' && $teamIdSql !== null) {
        $where[] = 'LOWER(' . $teamIdSql . ') = LOWER(:team_id)';
        $params[':team_id'] = $teamId;
    }

    if ($teamName !== '' && $nameSql !== null) {
        $where[] = 'LOWER(' . $nameSql . ') = LOWER(:team_name)';
        $params[':team_name'] = $teamName;
    }

    if ($where === []) {
        return null;
    }

    try {
        $statement = $pdo->prepare('SELECT ' . $select . ' FROM ' . $tableSql . ' WHERE ' . implode(' OR ', $where) . ' LIMIT 1');
        $statement->execute($params);
        $team = $statement->fetch();
    } catch (Throwable) {
        return null;
    }

    if (!is_array($team)) {
        return null;
    }

    $onlineMembers = mineacle_stats_team_online_members($pdo, [$team]);
    $matchedTeamId = trim((string) ($team['team_id'] ?? ''));
    $members = $matchedTeamId !== '' ? ($onlineMembers[$matchedTeamId] ?? []) : [];

    $team['online_member_list'] = $members;

    if (mineacle_stats_int($team['online_members'] ?? 0) <= 0 && $members !== []) {
        $team['online_members'] = count($members);
    }

    $team['rank'] = mineacle_stats_team_rank($pdo, $tableSql, $columns, $team);

    return $team;
}

function mineacle_stats_profile_by_username(string $username): ?array
{
    $pdo = mineacle_core_db();

    if (!$pdo instanceof PDO) {
        throw new RuntimeException('Stats database is not connected.');
    }

    $config = mineacle_config();
    $tables = $config['tables'] ?? [];
    $table = (string) ($tables['player_profiles'] ?? 'mineacle_web_profiles');
    $tableSql = mineacle_stats_table_sql($table);

    if ($tableSql === null) {
        throw new RuntimeException('Player profiles table is not available.');
    }

    $columns = mineacle_stats_columns($pdo, $tableSql);
    $usernameColumn = $columns['username'] ?? null;
    $displayColumn = $columns['display_name'] ?? null;
    $uuidColumn = $columns['uuid'] ?? null;
    $usernameSql = is_string($usernameColumn) ? mineacle_stats_column_sql($usernameColumn) : null;
    $displaySql = is_string($displayColumn) ? mineacle_stats_column_sql($displayColumn) : null;
    $uuidSql = is_string($uuidColumn) ? mineacle_stats_column_sql($uuidColumn) : null;
    $where = [];
    $params = [];

    if ($usernameSql !== null) {
        $where[] = 'LOWER(' . $usernameSql . ') = LOWER(:username)';
        $params[':username'] = $username;
    }

    if ($displaySql !== null) {
        $where[] = 'LOWER(' . $displaySql . ') = LOWER(:display_name)';
        $params[':display_name'] = $username;
    }

    if ($uuidSql !== null) {
        $where[] = 'REPLACE(LOWER(' . $uuidSql . "), '-', '') = :uuid";
        $params[':uuid'] = preg_replace('/[^a-f0-9]/', '', strtolower($username)) ?: $username;
    }

    if ($where === []) {
        throw new RuntimeException('Player lookup columns are not available.');
    }

    $select = mineacle_stats_select_list($columns);
    $statement = $pdo->prepare('SELECT ' . $select . ' FROM ' . $tableSql . ' WHERE ' . implode(' OR ', $where) . ' LIMIT 1');
    $statement->execute($params);
    $row = $statement->fetch();

    if (!is_array($row)) {
        return null;
    }

    $row['skin'] = mineacle_stats_skin_assets((string) ($row['uuid'] ?? ''), mineacle_stats_username($row));
    $row['punishment_status'] = mineacle_stats_punishment_status($pdo, (string) ($row['uuid'] ?? ''));

    return $row;
}

function mineacle_stats_search_where(array $columns, array $candidates, string $search, array &$params): array
{
    $search = trim(substr($search, 0, 64));

    if ($search === '') {
        return [];
    }

    $parts = [];

    foreach ($candidates as $candidate) {
        $actual = $columns[strtolower((string) $candidate)] ?? null;
        $columnSql = is_string($actual) ? mineacle_stats_column_sql($actual) : null;

        if ($columnSql === null) {
            continue;
        }

        $param = ':search' . count($params);
        $parts[] = $columnSql . ' LIKE ' . $param;
        $params[$param] = '%' . $search . '%';
    }

    return $parts === [] ? [] : ['(' . implode(' OR ', $parts) . ')'];
}

function mineacle_stats_players_count(string $sort = 'overall', string $search = ''): int
{
    $pdo = mineacle_core_db();

    if (!$pdo instanceof PDO) {
        throw new RuntimeException('Stats database is not connected.');
    }

    $config = mineacle_config();
    $tables = $config['tables'] ?? [];
    $table = (string) ($tables['player_profiles'] ?? 'mineacle_web_profiles');
    $tableSql = mineacle_stats_table_sql($table);

    if ($tableSql === null) {
        throw new RuntimeException('Player profiles table is not available.');
    }

    $columns = mineacle_stats_columns($pdo, $tableSql);
    $killsColumn = mineacle_stats_column_from_candidates($columns, ['kills']);
    $killsSql = is_string($killsColumn) ? mineacle_stats_column_sql($killsColumn) : null;
    $onlineColumn = mineacle_stats_column_from_candidates($columns, ['online']);
    $onlineSql = is_string($onlineColumn) ? mineacle_stats_column_sql($onlineColumn) : null;
    $params = [];
    $where = mineacle_stats_search_where($columns, ['username', 'display_name', 'team_name'], $search, $params);

    if ($sort === 'kd_qualified' && $killsSql !== null) {
        $where[] = $killsSql . ' >= 25';
    }

    if ($sort === 'online' && $onlineSql !== null) {
        $where[] = $onlineSql . ' = 1';
    }

    $sql = 'SELECT COUNT(*) FROM ' . $tableSql;

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    return max(0, (int) $statement->fetchColumn());
}

function mineacle_stats_players(int $limit = 25, int $offset = 0, string $sort = 'playtime', string $search = ''): array
{
    $pdo = mineacle_core_db();

    if (!$pdo instanceof PDO) {
        throw new RuntimeException('Stats database is not connected.');
    }

    $config = mineacle_config();
    $tables = $config['tables'] ?? [];
    $table = (string) ($tables['player_profiles'] ?? 'mineacle_web_profiles');
    $tableSql = mineacle_stats_table_sql($table);

    if ($tableSql === null) {
        throw new RuntimeException('Player profiles table is not available.');
    }

    $columns = mineacle_stats_columns($pdo, $tableSql);
    $select = mineacle_stats_select_list($columns);
    $sort = in_array($sort, [
        'overall',
        'playtime',
        'money',
        'balance',
        'kills',
        'deaths',
        'kd',
        'kd_qualified',
        'rank',
        'team',
        'first_joined',
        'last_seen',
        'recent',
        'veterans',
        'newest',
        'online',
        'updated',
    ], true) ? $sort : 'playtime';
    $usernameSql = isset($columns['username']) ? mineacle_stats_column_sql($columns['username']) : null;
    $balanceColumn = mineacle_stats_column_from_candidates($columns, ['balance_cents']);
    $balanceSql = is_string($balanceColumn) ? mineacle_stats_column_sql($balanceColumn) : null;
    $killsColumn = mineacle_stats_column_from_candidates($columns, ['kills']);
    $killsSql = is_string($killsColumn) ? mineacle_stats_column_sql($killsColumn) : null;
    $deathsColumn = mineacle_stats_column_from_candidates($columns, ['deaths']);
    $deathsSql = is_string($deathsColumn) ? mineacle_stats_column_sql($deathsColumn) : null;
    $kdColumn = mineacle_stats_column_from_candidates($columns, ['kd_ratio']);
    $kdSql = is_string($kdColumn) ? mineacle_stats_column_sql($kdColumn) : null;
    $playtimeColumn = mineacle_stats_column_from_candidates($columns, ['playtime_seconds']);
    $playtimeSql = is_string($playtimeColumn) ? mineacle_stats_column_sql($playtimeColumn) : null;
    $rankColumn = mineacle_stats_column_from_candidates($columns, ['rank_weight']);
    $rankSql = is_string($rankColumn) ? mineacle_stats_column_sql($rankColumn) : null;
    $teamColumn = mineacle_stats_column_from_candidates($columns, ['team_name']);
    $teamSql = is_string($teamColumn) ? mineacle_stats_column_sql($teamColumn) : null;
    $firstJoinedColumn = mineacle_stats_column_from_candidates($columns, ['first_joined_at']);
    $firstJoinedSql = is_string($firstJoinedColumn) ? mineacle_stats_column_sql($firstJoinedColumn) : null;
    $lastSeenColumn = mineacle_stats_column_from_candidates($columns, ['last_seen']);
    $lastSeenSql = is_string($lastSeenColumn) ? mineacle_stats_column_sql($lastSeenColumn) : null;
    $onlineColumn = mineacle_stats_column_from_candidates($columns, ['online']);
    $onlineSql = is_string($onlineColumn) ? mineacle_stats_column_sql($onlineColumn) : null;
    $updatedColumn = mineacle_stats_column_from_candidates($columns, ['updated_at']);
    $updatedSql = is_string($updatedColumn) ? mineacle_stats_column_sql($updatedColumn) : null;
    $searchColumns = [];

    foreach (['username', 'display_name', 'team_name'] as $column) {
        if (isset($columns[$column])) {
            $columnSql = mineacle_stats_column_sql($columns[$column]);

            if ($columnSql !== null) {
                $searchColumns[] = $columnSql;
            }
        }
    }

    $limit = max(1, min(200, $limit));
    $offset = max(0, $offset);
    $search = trim(substr($search, 0, 64));
    $params = [];
    $sql = 'SELECT ' . $select . ' FROM ' . $tableSql;
    $where = [];

    if ($search !== '' && $searchColumns !== []) {
        $searchParts = [];

        foreach ($searchColumns as $index => $columnSql) {
            $param = ':search' . $index;
            $searchParts[] = $columnSql . ' LIKE ' . $param;
            $params[$param] = '%' . $search . '%';
        }

        $where[] = '(' . implode(' OR ', $searchParts) . ')';
    }

    if ($sort === 'kd_qualified' && $killsSql !== null) {
        $where[] = $killsSql . ' >= 25';
    }

    if ($sort === 'online' && $onlineSql !== null) {
        $where[] = $onlineSql . ' = 1';
    }

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $order = [];
    $appendOrder = static function (?string $expression) use (&$order): void {
        if (is_string($expression) && $expression !== '' && !in_array($expression, $order, true)) {
            $order[] = $expression;
        }
    };

    if ($sort === 'overall') {
        $appendOrder($balanceSql !== null ? $balanceSql . ' DESC' : null);
        $appendOrder($killsSql !== null ? $killsSql . ' DESC' : null);
        $appendOrder($kdSql !== null ? $kdSql . ' DESC' : null);
        $appendOrder($playtimeSql !== null ? $playtimeSql . ' DESC' : null);
    } elseif ($sort === 'money' || $sort === 'balance') {
        $appendOrder($balanceSql !== null ? $balanceSql . ' DESC' : null);
    } elseif ($sort === 'kills') {
        $appendOrder($killsSql !== null ? $killsSql . ' DESC' : null);
        $appendOrder($kdSql !== null ? $kdSql . ' DESC' : null);
        $appendOrder($deathsSql !== null ? $deathsSql . ' ASC' : null);
    } elseif ($sort === 'deaths') {
        $appendOrder($deathsSql !== null ? $deathsSql . ' DESC' : null);
    } elseif ($sort === 'kd' || $sort === 'kd_qualified') {
        $appendOrder($kdSql !== null ? $kdSql . ' DESC' : null);
        $appendOrder($killsSql !== null ? $killsSql . ' DESC' : null);
        $appendOrder($deathsSql !== null ? $deathsSql . ' ASC' : null);
    } elseif ($sort === 'rank') {
        $appendOrder($rankSql !== null ? $rankSql . ' DESC' : null);
    } elseif ($sort === 'team') {
        $appendOrder($teamSql !== null ? $teamSql . ' ASC' : null);
    } elseif ($sort === 'first_joined' || $sort === 'veterans') {
        $appendOrder($firstJoinedSql !== null ? 'CASE WHEN ' . $firstJoinedSql . ' > 0 THEN 0 ELSE 1 END ASC' : null);
        $appendOrder($firstJoinedSql !== null ? $firstJoinedSql . ' ASC' : null);
    } elseif ($sort === 'newest') {
        $appendOrder($firstJoinedSql !== null ? $firstJoinedSql . ' DESC' : null);
    } elseif ($sort === 'last_seen' || $sort === 'recent') {
        $appendOrder($lastSeenSql !== null ? $lastSeenSql . ' DESC' : null);
    } elseif ($sort === 'online') {
        $appendOrder($lastSeenSql !== null ? $lastSeenSql . ' DESC' : null);
        $appendOrder($playtimeSql !== null ? $playtimeSql . ' DESC' : null);
    } elseif ($sort === 'updated') {
        $appendOrder($updatedSql !== null ? $updatedSql . ' DESC' : null);
    } else {
        $appendOrder($playtimeSql !== null ? $playtimeSql . ' DESC' : null);
    }

    if ($usernameSql !== null) {
        $order[] = $usernameSql . ' ASC';
    }

    if ($order === []) {
        $order[] = '1 ASC';
    }

    $sql .= ' ORDER BY ' . implode(', ', $order) . ' LIMIT :limit OFFSET :offset';
    $statement = $pdo->prepare($sql);

    foreach ($params as $param => $value) {
        $statement->bindValue($param, $value, PDO::PARAM_STR);
    }

    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();
    $players = [];

    foreach ($statement->fetchAll() as $row) {
        if (!is_array($row)) {
            continue;
        }

        $row['skin'] = mineacle_stats_skin_assets((string) ($row['uuid'] ?? ''), mineacle_stats_username($row));
        $row['punishment_status'] = mineacle_stats_empty_status();
        $players[] = $row;
    }

    return $players;
}

function mineacle_stats_teams_count(string $sort = 'overall', string $search = ''): int
{
    $pdo = mineacle_core_db();

    if (!$pdo instanceof PDO) {
        throw new RuntimeException('Stats database is not connected.');
    }

    $config = mineacle_config();
    $tables = $config['tables'] ?? [];
    $table = (string) ($tables['teams'] ?? 'mineacle_web_teams');
    $tableSql = mineacle_stats_table_sql($table);

    if ($tableSql === null) {
        throw new RuntimeException('Teams table is not available.');
    }

    $columns = mineacle_stats_columns($pdo, $tableSql);
    $killsColumn = mineacle_stats_column_from_candidates($columns, ['total_kills', 'kills', 'team_kills']);
    $killsSql = is_string($killsColumn) ? mineacle_stats_column_sql($killsColumn) : null;
    $params = [];
    $where = mineacle_stats_search_where($columns, ['team_name', 'name', 'display_name', 'tag', 'team_tag', 'owner_name', 'leader_name'], $search, $params);

    if ($sort === 'kd_qualified' && $killsSql !== null) {
        $where[] = $killsSql . ' >= 25';
    }

    $sql = 'SELECT COUNT(*) FROM ' . $tableSql;

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    return max(0, (int) $statement->fetchColumn());
}

function mineacle_stats_teams(int $limit = 50, int $offset = 0, string $sort = 'overall', string $search = ''): array
{
    $pdo = mineacle_core_db();

    if (!$pdo instanceof PDO) {
        throw new RuntimeException('Stats database is not connected.');
    }

    $config = mineacle_config();
    $tables = $config['tables'] ?? [];
    $table = (string) ($tables['teams'] ?? 'mineacle_web_teams');
    $tableSql = mineacle_stats_table_sql($table);

    if ($tableSql === null) {
        throw new RuntimeException('Teams table is not available.');
    }

    $columns = mineacle_stats_columns($pdo, $tableSql);
    $select = mineacle_stats_team_select_list($columns);
    $sort = in_array($sort, ['overall', 'balance', 'capital', 'kills', 'kd', 'kd_qualified', 'members', 'online', 'updated', 'name'], true)
        ? $sort
        : 'overall';
    $nameColumn = mineacle_stats_column_from_candidates($columns, ['team_name', 'name', 'display_name']);
    $nameSql = is_string($nameColumn) ? mineacle_stats_column_sql($nameColumn) : null;
    $killsColumn = mineacle_stats_column_from_candidates($columns, ['total_kills', 'kills', 'team_kills']);
    $killsSql = is_string($killsColumn) ? mineacle_stats_column_sql($killsColumn) : null;
    $deathsColumn = mineacle_stats_column_from_candidates($columns, ['total_deaths', 'deaths', 'team_deaths']);
    $deathsSql = is_string($deathsColumn) ? mineacle_stats_column_sql($deathsColumn) : null;
    $balanceColumn = mineacle_stats_column_from_candidates($columns, ['total_balance_cents', 'balance_cents', 'bank_balance_cents', 'team_balance_cents']);
    $balanceSql = is_string($balanceColumn) ? mineacle_stats_column_sql($balanceColumn) : null;
    $kdColumn = mineacle_stats_column_from_candidates($columns, ['kd_ratio', 'kdr', 'team_kd_ratio']);
    $kdSql = is_string($kdColumn) ? mineacle_stats_column_sql($kdColumn) : null;
    $membersColumn = mineacle_stats_column_from_candidates($columns, ['member_count', 'members', 'total_members', 'players']);
    $membersSql = is_string($membersColumn) ? mineacle_stats_column_sql($membersColumn) : null;
    $onlineMembersColumn = mineacle_stats_column_from_candidates($columns, ['online_members', 'online_count', 'members_online', 'online']);
    $onlineMembersSql = is_string($onlineMembersColumn) ? mineacle_stats_column_sql($onlineMembersColumn) : null;
    $updatedColumn = mineacle_stats_column_from_candidates($columns, ['updated_at', 'updated', 'last_updated']);
    $updatedSql = is_string($updatedColumn) ? mineacle_stats_column_sql($updatedColumn) : null;
    $searchColumns = [];

    foreach (['team_name', 'name', 'display_name', 'tag', 'team_tag', 'owner_name', 'leader_name'] as $column) {
        if (isset($columns[$column])) {
            $columnSql = mineacle_stats_column_sql($columns[$column]);

            if ($columnSql !== null) {
                $searchColumns[] = $columnSql;
            }
        }
    }

    $limit = max(1, min(50, $limit));
    $offset = max(0, $offset);
    $search = trim(substr($search, 0, 64));
    $params = [];
    $sql = 'SELECT ' . $select . ' FROM ' . $tableSql;
    $where = [];

    if ($search !== '' && $searchColumns !== []) {
        $searchParts = [];

        foreach ($searchColumns as $index => $columnSql) {
            $param = ':search' . $index;
            $searchParts[] = $columnSql . ' LIKE ' . $param;
            $params[$param] = '%' . $search . '%';
        }

        $where[] = '(' . implode(' OR ', $searchParts) . ')';
    }

    if ($sort === 'kd_qualified' && $killsSql !== null) {
        $where[] = $killsSql . ' >= 25';
    }

    if ($where !== []) {
        $sql .= ' WHERE ' . implode(' AND ', $where);
    }

    $order = [];
    $appendOrder = static function (?string $expression) use (&$order): void {
        if (is_string($expression) && $expression !== '' && !in_array($expression, $order, true)) {
            $order[] = $expression;
        }
    };

    if ($sort === 'balance' || $sort === 'capital') {
        $appendOrder($balanceSql !== null ? $balanceSql . ' DESC' : null);
        $appendOrder($kdSql !== null ? $kdSql . ' DESC' : null);
    } elseif ($sort === 'kills') {
        $appendOrder($killsSql !== null ? $killsSql . ' DESC' : null);
        $appendOrder($kdSql !== null ? $kdSql . ' DESC' : null);
        $appendOrder($deathsSql !== null ? $deathsSql . ' ASC' : null);
    } elseif ($sort === 'kd' || $sort === 'kd_qualified') {
        $appendOrder($kdSql !== null ? $kdSql . ' DESC' : null);
        $appendOrder($killsSql !== null ? $killsSql . ' DESC' : null);
        $appendOrder($deathsSql !== null ? $deathsSql . ' ASC' : null);
    } elseif ($sort === 'members') {
        $appendOrder($membersSql !== null ? $membersSql . ' DESC' : null);
    } elseif ($sort === 'online') {
        $appendOrder($onlineMembersSql !== null ? $onlineMembersSql . ' DESC' : null);
        $appendOrder($membersSql !== null ? $membersSql . ' DESC' : null);
        $appendOrder($updatedSql !== null ? $updatedSql . ' DESC' : null);
    } elseif ($sort === 'updated') {
        $appendOrder($updatedSql !== null ? $updatedSql . ' DESC' : null);
    } elseif ($sort === 'name') {
        $appendOrder($nameSql !== null ? $nameSql . ' ASC' : null);
    } else {
        $appendOrder($balanceSql !== null ? $balanceSql . ' DESC' : null);
        $appendOrder($kdSql !== null ? $kdSql . ' DESC' : null);
        $appendOrder($killsSql !== null ? $killsSql . ' DESC' : null);
        $appendOrder($membersSql !== null ? $membersSql . ' DESC' : null);
    }

    $appendOrder($nameSql !== null ? $nameSql . ' ASC' : null);

    if ($order === []) {
        $order[] = '1 ASC';
    }

    $sql .= ' ORDER BY ' . implode(', ', $order) . ' LIMIT :limit OFFSET :offset';
    $statement = $pdo->prepare($sql);

    foreach ($params as $param => $value) {
        $statement->bindValue($param, $value, PDO::PARAM_STR);
    }

    $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
    $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
    $statement->execute();
    $teams = [];

    foreach ($statement->fetchAll() as $index => $row) {
        if (!is_array($row)) {
            continue;
        }

        $row['rank'] = $offset + $index + 1;
        $teams[] = $row;
    }

    $onlineMembers = mineacle_stats_team_online_members($pdo, $teams);

    foreach ($teams as $index => $team) {
        $teamId = trim((string) ($team['team_id'] ?? ''));
        $members = $teamId !== '' ? ($onlineMembers[$teamId] ?? []) : [];
        $onlineCount = count($members);

        $teams[$index]['online_member_list'] = $members;

        if (mineacle_stats_int($team['online_members'] ?? 0) <= 0 && $onlineCount > 0) {
            $teams[$index]['online_members'] = $onlineCount;
        }
    }

    return $teams;
}

function mineacle_players(int $limit = 25, int $offset = 0, string $sort = 'playtime', string $search = ''): array
{
    return mineacle_stats_players($limit, $offset, $sort, $search);
}

function mineacle_player(string $query): ?array
{
    return mineacle_stats_profile_by_username($query);
}

function mineacle_stats_username(array $player): string
{
    $username = trim((string) ($player['username'] ?? ''));

    return $username !== '' ? $username : 'unknown';
}

function mineacle_stats_display_name(array $player): string
{
    $displayName = trim((string) ($player['display_name'] ?? ''));

    return $displayName !== '' ? $displayName : mineacle_stats_username($player);
}

function mineacle_stats_rank_is_default(string $value): bool
{
    $normalized = strtolower(trim($value));

    return $normalized === '' || in_array($normalized, ['default', 'member', 'unranked', 'none', 'normal', 'player', 'user'], true);
}

function mineacle_stats_rank_name(array $player): string
{
    $rankKey = trim((string) ($player['rank_key'] ?? ''));
    $rankName = trim((string) ($player['rank_name'] ?? ''));
    $rankPrefix = trim(strip_tags((string) ($player['rank_prefix'] ?? '')));

    foreach ([$rankPrefix, $rankName, $rankKey] as $candidate) {
        if (mineacle_stats_rank_is_default($candidate)) {
            continue;
        }

        return '+';
    }

    return '';
}

function mineacle_stats_known_rank_color(string $rank): ?string
{
    if (mineacle_stats_rank_is_default($rank)) {
        return null;
    }

    $normalized = strtolower(str_replace([' ', '_', '-'], '', trim($rank)));

    if (in_array($normalized, ['admin', 'administrator'], true)) {
        return '#ff5555';
    }

    if (in_array($normalized, ['developer', 'dev'], true)) {
        return '#ffaa00';
    }

    if (in_array($normalized, ['mineacle+', 'mineacleplus', 'plus'], true)) {
        return '#ff55ff';
    }

    return null;
}

function mineacle_stats_rank_color(array $player): string
{
    $rankKey = trim((string) ($player['rank_key'] ?? ''));
    $rankPrefix = trim(strip_tags((string) ($player['rank_prefix'] ?? '')));
    $rankName = trim((string) ($player['rank_name'] ?? ''));
    $color = strtolower(trim((string) ($player['rank_color'] ?? '')));

    if (preg_match('/^#?[0-9a-f]{6}$/', $color) === 1) {
        return '#' . ltrim($color, '#');
    }

    foreach ([$rankKey, $rankPrefix, $rankName] as $source) {
        $knownColor = mineacle_stats_known_rank_color($source);

        if ($knownColor !== null) {
            return $knownColor;
        }
    }

    return '#bbbbbb';
}

function mineacle_stats_ranked_name_html(array $player, string $className = 'ranked-player-name'): string
{
    $displayName = mineacle_stats_display_name($player);
    $rankName = mineacle_stats_rank_name($player);
    $class = preg_match('/^[A-Za-z0-9_-]+$/', $className) === 1 ? $className : 'ranked-player-name';
    $classAttribute = $class . ($rankName === '+' ? ' is-plus-rank' : '');
    $rankStyle = $rankName !== '' ? ' style="--rank-color: ' . h(mineacle_stats_rank_color($player)) . '"' : '';
    $html = '<span class="' . h($classAttribute) . '"' . $rankStyle . '>';

    if ($rankName !== '') {
        $html .= '<span class="' . h($class) . '__rank">' . h($rankName) . '</span>';
    }

    $html .= '<span class="' . h($class) . '__name">' . h($displayName) . '</span>';
    $html .= '</span>';

    return $html;
}

function mineacle_stats_team_name(array $player): string
{
    $teamName = trim((string) ($player['team_name'] ?? ''));

    return $teamName !== '' ? $teamName : 'No Team';
}

function mineacle_stats_team_role(array $player): string
{
    $teamRole = trim((string) ($player['team_role'] ?? ''));

    return $teamRole !== '' ? $teamRole : 'Member';
}

function mineacle_stats_int(mixed $value): int
{
    return is_numeric($value) ? (int) $value : 0;
}

function mineacle_stats_float(mixed $value): float
{
    return is_numeric($value) ? (float) $value : 0.0;
}

function mineacle_stats_money_label(array $player): string
{
    $formatted = trim((string) ($player['balance_formatted'] ?? ''));

    if ($formatted !== '') {
        return $formatted;
    }

    return '$' . number_format(mineacle_stats_int($player['balance_cents'] ?? 0) / 100, 2);
}

function mineacle_stats_playtime_label(array $player): string
{
    $formatted = trim((string) ($player['playtime_formatted'] ?? ''));

    if ($formatted !== '') {
        return $formatted;
    }

    $seconds = max(0, mineacle_stats_int($player['playtime_seconds'] ?? 0));
    $days = intdiv($seconds, 86400);
    $hours = intdiv($seconds % 86400, 3600);
    $minutes = intdiv($seconds % 3600, 60);

    if ($days > 0) {
        return $days . 'd ' . $hours . 'h';
    }

    if ($hours > 0) {
        return $hours . 'h ' . $minutes . 'm';
    }

    return max(1, $minutes) . 'm';
}

function mineacle_stats_rank_label(mixed $rank): string
{
    $value = mineacle_stats_int($rank);

    return $value > 0 ? '#' . $value : 'Unranked';
}

function mineacle_stats_date_label(mixed $millis): string
{
    $value = mineacle_stats_int($millis);

    if ($value <= 0) {
        return 'Unknown';
    }

    return date('M j, Y', (int) floor($value / 1000));
}

function mineacle_stats_relative_time_label(mixed $millis): string
{
    $value = mineacle_stats_int($millis);

    if ($value <= 0) {
        return 'Unknown';
    }

    $seconds = (int) floor($value / 1000);
    $delta = max(0, time() - $seconds);

    if ($delta < 45) {
        return 'just now';
    }

    if ($delta < 3600) {
        $minutes = max(1, (int) floor($delta / 60));

        return $minutes . 'm ago';
    }

    if ($delta < 86400) {
        $hours = max(1, (int) floor($delta / 3600));

        return $hours . 'h ago';
    }

    if ($delta < 604800) {
        $days = max(1, (int) floor($delta / 86400));

        return $days . 'd ago';
    }

    if (date('Ym', $seconds) === date('Ym')) {
        $weeks = max(1, (int) floor($delta / 604800));

        return $weeks . 'w ago';
    }

    return mineacle_stats_date_label($millis);
}

function mineacle_stats_online(array $player): bool
{
    return mineacle_stats_int($player['online'] ?? 0) === 1;
}

function mineacle_stats_last_seen_label(array $player): string
{
    return mineacle_stats_online($player) ? 'Online now' : mineacle_stats_relative_time_label($player['last_seen'] ?? 0);
}

function mineacle_stats_world_name(array $player): string
{
    $worldName = trim((string) ($player['world_name'] ?? ''));

    if ($worldName !== '') {
        return $worldName;
    }

    $worldKey = strtolower(trim((string) ($player['world_key'] ?? '')));
    $fallbacks = [
        'spawn1' => 'Spawn 1',
        'spawn2' => 'Spawn 2',
        'spawn3' => 'Spawn 3',
        'origins' => 'Overworld',
        'origins_nether' => 'Nether',
        'origins_the_end' => 'End',
        'world_nether' => 'Nether',
        'world_the_end' => 'End',
    ];

    return $fallbacks[$worldKey] ?? '';
}

function mineacle_stats_status_view(array $player): array
{
    $online = mineacle_stats_online($player);
    $world = mineacle_stats_world_name($player);
    $lastSeen = mineacle_stats_last_seen_label($player);

    return [
        'online' => $online,
        'label' => $online ? 'Online' : 'Offline',
        'line' => $online
            ? ($world !== '' ? 'Located in ' . $world : 'Online now')
            : 'Last seen ' . $lastSeen,
        'secondary' => !$online && $world !== '' ? 'Last seen in ' . $world : '',
        'world' => $world,
        'last_seen' => $lastSeen,
    ];
}

function mineacle_stats_skin_identifier(?string $uuid, string $username, bool $uuidOnly = false): ?string
{
    $uuidValue = strtolower(trim((string) $uuid));
    $uuidKey = preg_replace('/[^a-f0-9]/', '', $uuidValue);

    if (is_string($uuidKey) && $uuidKey !== '') {
        return rawurlencode($uuidKey);
    }

    if ($uuidOnly || $username === '') {
        return null;
    }

    return rawurlencode($username);
}

function mineacle_stats_skin_size(mixed $value, int $fallback, int $max = 600): int
{
    $size = (int) $value;

    return max(16, min($max, $size > 0 ? $size : $fallback));
}

function mineacle_stats_skin_cache_query(): string
{
    return 'skin=' . (string) floor(time() / 60);
}

function mineacle_stats_skin_url(string $url): string
{
    return $url . (str_contains($url, '?') ? '&' : '?') . mineacle_stats_skin_cache_query();
}

function mineacle_stats_mc_api_path(?string $uuid, string $username, string $type, int $size): ?string
{
    $uuidKey = preg_replace('/[^a-f0-9]/', '', strtolower(trim((string) $uuid)));

    if (is_string($uuidKey) && $uuidKey !== '') {
        return mineacle_stats_skin_url('https://mc-api.io/render/' . rawurlencode($type) . '/' . rawurlencode($uuidKey) . '?size=' . $size);
    }

    $username = trim($username);

    if ($username === '') {
        return null;
    }

    return mineacle_stats_skin_url('https://mc-api.io/render/' . rawurlencode($type) . '/' . rawurlencode($username) . '/java?size=' . $size);
}

function mineacle_stats_skin_assets(?string $uuid, string $username): array
{
    $config = mineacle_config();
    $skin = is_array($config['skins'] ?? null) ? $config['skins'] : [];
    $provider = strtolower(trim((string) ($skin['provider'] ?? 'mc-api')));
    $headSize = mineacle_stats_skin_size($skin['head_size'] ?? null, 96, 512);
    $chestSize = mineacle_stats_skin_size($skin['chest_size'] ?? null, 320);
    $bustSize = mineacle_stats_skin_size($skin['bust_size'] ?? null, 512, 512);

    if ($provider === 'mcapi') {
        $provider = 'mc-api';
    }

    if (!in_array($provider, ['mc-api', 'crafty', 'mineskin', 'minotar', 'mc-heads', 'crafatar'], true)) {
        $provider = 'mc-api';
    }

    $identifier = mineacle_stats_skin_identifier($uuid, $username, $provider === 'crafatar');

    if ($identifier === null) {
        return [
            'provider' => $provider,
            'head' => null,
            'chest' => null,
            'bust' => null,
        ];
    }

    if ($provider === 'mc-api') {
        $head = mineacle_stats_mc_api_path($uuid, $username, 'face', $headSize);
        $bust = mineacle_stats_mc_api_path($uuid, $username, 'bust', $bustSize);

        return [
            'provider' => $provider,
            'head' => $head,
            'chest' => $bust,
            'bust' => $bust,
        ];
    }

    if ($provider === 'crafty') {
        return [
            'provider' => $provider,
            'head' => mineacle_stats_skin_url('https://render.crafty.gg/2d/head/' . $identifier . '?size=' . $headSize),
            'chest' => mineacle_stats_skin_url('https://render.crafty.gg/3d/bust/' . $identifier . '?width=' . $chestSize . '&height=' . max(420, $chestSize + 220) . '&x=-25&z=35&shadow=false'),
            'bust' => mineacle_stats_skin_url('https://render.crafty.gg/3d/bust/' . $identifier . '?width=960&height=1080&x=-25&z=35&shadow=false'),
        ];
    }

    if ($provider === 'minotar') {
        return [
            'provider' => $provider,
            'head' => mineacle_stats_skin_url('https://minotar.net/helm/' . $identifier . '/' . $headSize . '.png'),
            'chest' => mineacle_stats_skin_url('https://minotar.net/armor/bust/' . $identifier . '/' . $chestSize . '.png'),
            'bust' => mineacle_stats_skin_url('https://minotar.net/armor/bust/' . $identifier . '/' . $chestSize . '.png'),
        ];
    }

    if ($provider === 'mc-heads') {
        return [
            'provider' => $provider,
            'head' => mineacle_stats_skin_url('https://mc-heads.net/avatar/' . $identifier . '/' . $headSize . '.png'),
            'chest' => mineacle_stats_skin_url('https://mc-heads.net/body/' . $identifier . '/' . $chestSize . '.png'),
            'bust' => mineacle_stats_skin_url('https://mc-heads.net/body/' . $identifier . '/' . $chestSize . '.png'),
        ];
    }

    if ($provider === 'crafatar') {
        return [
            'provider' => $provider,
            'head' => mineacle_stats_skin_url('https://crafatar.com/renders/head/' . $identifier . '?scale=4&overlay'),
            'chest' => mineacle_stats_skin_url('https://crafatar.com/renders/body/' . $identifier . '?scale=4&overlay'),
            'bust' => mineacle_stats_skin_url('https://crafatar.com/renders/body/' . $identifier . '?scale=4&overlay'),
        ];
    }

    return [
        'provider' => $provider,
        'head' => mineacle_stats_skin_url('https://mineskin.eu/helm/' . $identifier . '/' . $headSize . '.png'),
        'chest' => mineacle_stats_skin_url('https://mineskin.eu/armor/bust/' . $identifier . '/' . $chestSize . '.png'),
        'bust' => mineacle_stats_skin_url('https://mineskin.eu/armor/bust/' . $identifier . '/' . $chestSize . '.png'),
    ];
}

function mineacle_stats_duration_label(mixed $seconds): string
{
    $value = max(0, mineacle_stats_int($seconds));

    if ($value < 60) {
        return $value . 's';
    }

    $minutes = intdiv($value, 60);
    $remainingSeconds = $value % 60;

    return $minutes . 'm ' . str_pad((string) $remainingSeconds, 2, '0', STR_PAD_LEFT) . 's';
}

function mineacle_stats_decimal_label(mixed $value): string
{
    if (!is_numeric($value)) {
        return '0';
    }

    $formatted = number_format((float) $value, 2, '.', '');
    $formatted = rtrim(rtrim($formatted, '0'), '.');

    return $formatted === '' ? '0' : $formatted;
}

function mineacle_stats_fight_world_name(array $fight): string
{
    $worldName = trim((string) ($fight['world_name'] ?? ''));

    if ($worldName !== '') {
        return $worldName;
    }

    $worldKey = strtolower(trim((string) ($fight['world_key'] ?? '')));
    $fallbacks = [
        'origins' => 'Overworld',
        'origins_nether' => 'Nether',
        'origins_the_end' => 'End',
        'world_nether' => 'Nether',
        'world_the_end' => 'End',
    ];

    return $fallbacks[$worldKey] ?? 'Survival';
}

function mineacle_stats_recent_fights(string $profileUuid, int $limit = 16): array
{
    $uuidKey = preg_replace('/[^a-f0-9]/', '', strtolower(trim($profileUuid)));

    if (!is_string($uuidKey) || $uuidKey === '') {
        return ['available' => true, 'fights' => []];
    }

    $pdo = mineacle_core_db();

    if (!$pdo instanceof PDO) {
        return ['available' => false, 'fights' => []];
    }

    $config = mineacle_config();
    $tables = $config['tables'] ?? [];
    $table = (string) ($tables['fights'] ?? 'mineacle_web_fights');
    $tableSql = mineacle_stats_table_sql($table);

    if ($tableSql === null) {
        return ['available' => false, 'fights' => []];
    }

    $limit = max(1, min(16, $limit));
    $winnerKeySql = "REPLACE(LOWER(`winner_uuid`), '-', '')";
    $loserKeySql = "REPLACE(LOWER(`loser_uuid`), '-', '')";
    $sql = 'SELECT '
        . '`fight_id`, '
        . '`winner_uuid`, `winner_username`, `winner_display_name`, '
        . '`loser_uuid`, `loser_username`, `loser_display_name`, '
        . '`world_key`, `world_name`, '
        . '`winner_hearts`, `loser_hearts`, '
        . '`started_at`, `ended_at`, `duration_seconds`, '
        . 'CASE WHEN ' . $winnerKeySql . ' = ? THEN \'WIN\' ELSE \'LOSS\' END AS `result`, '
        . 'CASE WHEN ' . $winnerKeySql . ' = ? THEN `loser_uuid` ELSE `winner_uuid` END AS `opponent_uuid`, '
        . 'CASE WHEN ' . $winnerKeySql . ' = ? THEN `loser_username` ELSE `winner_username` END AS `opponent_username`, '
        . 'CASE WHEN ' . $winnerKeySql . ' = ? THEN `loser_display_name` ELSE `winner_display_name` END AS `opponent_display_name` '
        . 'FROM ' . $tableSql . ' '
        . 'WHERE ' . $winnerKeySql . ' = ? OR ' . $loserKeySql . ' = ? '
        . 'ORDER BY `ended_at` DESC '
        . 'LIMIT ' . $limit;

    try {
        $statement = $pdo->prepare($sql);
        $statement->execute([$uuidKey, $uuidKey, $uuidKey, $uuidKey, $uuidKey, $uuidKey]);
        $rows = $statement->fetchAll();
    } catch (Throwable) {
        return ['available' => false, 'fights' => []];
    }

    $fights = [];

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $opponentUsername = trim((string) ($row['opponent_username'] ?? ''));
        $opponentDisplayName = trim((string) ($row['opponent_display_name'] ?? ''));
        $opponentUuid = trim((string) ($row['opponent_uuid'] ?? ''));
        $winnerHearts = mineacle_stats_decimal_label($row['winner_hearts'] ?? 0);
        $result = strtoupper(trim((string) ($row['result'] ?? 'LOSS'))) === 'WIN' ? 'WIN' : 'LOSS';

        if ($opponentDisplayName === '') {
            $opponentDisplayName = $opponentUsername !== '' ? $opponentUsername : 'Unknown Player';
        }

        $row['result'] = $result;
        $row['opponent_username'] = $opponentUsername;
        $row['opponent_display_name'] = $opponentDisplayName;
        $row['opponent_skin'] = mineacle_stats_skin_assets($opponentUuid, $opponentUsername !== '' ? $opponentUsername : $opponentDisplayName);
        $row['world_label'] = mineacle_stats_fight_world_name($row);
        $row['winner_hearts_label'] = $winnerHearts;
        $row['loser_hearts_label'] = mineacle_stats_decimal_label($row['loser_hearts'] ?? 0);
        $row['heart_text'] = $result === 'WIN'
            ? 'Won with ' . $winnerHearts . ' hearts'
            : 'Opponent won with ' . $winnerHearts . ' hearts';
        $row['duration_label'] = mineacle_stats_duration_label($row['duration_seconds'] ?? 0);
        $row['ended_label'] = mineacle_stats_relative_time_label($row['ended_at'] ?? 0);
        $fights[] = $row;
    }

    return ['available' => true, 'fights' => $fights];
}

function mineacle_stats_hearts_html(mixed $hearts, string $className = 'fight-hearts'): string
{
    $value = max(0.0, mineacle_stats_float($hearts));
    $label = mineacle_stats_decimal_label($value);
    $visualValue = min(10.0, $value);
    $assetVersion = function_exists('mineacle_page_asset_version') ? mineacle_page_asset_version() : 'base';
    $assetQuery = '?v=' . rawurlencode($assetVersion);
    $fullHeart = '/assets/icons/full-heart.png' . $assetQuery;
    $partialHeart = '/assets/icons/partial-heart.png' . $assetQuery;
    $emptyHeart = '/assets/icons/empty-heart.png' . $assetQuery;
    $html = '<span class="' . h($className) . '" role="img" aria-label="' . h($label . ' hearts remaining') . '">';

    for ($index = 0; $index < 10; $index++) {
        $remaining = $visualValue - $index;
        $src = $emptyHeart;
        $state = 'empty';

        if ($remaining >= 1) {
            $src = $fullHeart;
            $state = 'full';
        } elseif ($remaining > 0) {
            $src = $partialHeart;
            $state = 'partial';
        }

        $html .= '<img class="' . h($className) . '__heart is-' . h($state) . '" src="' . h($src) . '" alt="" draggable="false" loading="lazy" decoding="async" aria-hidden="true">';
    }

    $html .= '<span class="' . h($className) . '__text">' . h($label . ' hearts remaining') . '</span>';
    $html .= '</span>';

    return $html;
}

function mineacle_stats_empty_punishment(string $type): array
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

function mineacle_stats_empty_status(): array
{
    return [
        'ban' => mineacle_stats_empty_punishment('ban'),
        'mute' => mineacle_stats_empty_punishment('mute'),
        'search_state' => 'clear',
    ];
}

function mineacle_stats_bool(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if (is_numeric($value)) {
        return (int) $value === 1;
    }

    if (is_string($value)) {
        if ($value === "\x01") {
            return true;
        }

        if ($value === "\x00") {
            return false;
        }

        return in_array(strtolower(trim($value)), ['1', 'true', 'yes', 'on'], true);
    }

    return false;
}

function mineacle_stats_litebans_status(PDO $pdo, string $table, string $type, string $uuid): array
{
    if (!in_array($table, ['litebans_bans', 'litebans_mutes'], true)) {
        return mineacle_stats_empty_punishment($type);
    }

    $tableSql = mineacle_stats_column_sql($table);

    if ($tableSql === null) {
        return mineacle_stats_empty_punishment($type);
    }

    try {
        $columns = mineacle_stats_columns($pdo, $tableSql);
    } catch (Throwable) {
        return mineacle_stats_empty_punishment($type);
    }

    $uuidColumn = $columns['uuid'] ?? null;
    $uuidSql = is_string($uuidColumn) ? mineacle_stats_column_sql($uuidColumn) : null;

    if ($uuidSql === null) {
        return mineacle_stats_empty_punishment($type);
    }

    $uuidKey = preg_replace('/[^a-f0-9]/', '', strtolower($uuid));

    if (!is_string($uuidKey) || $uuidKey === '') {
        return mineacle_stats_empty_punishment($type);
    }

    $untilColumn = $columns['until'] ?? null;
    $timeColumn = $columns['time'] ?? null;
    $reasonColumn = $columns['reason'] ?? null;
    $activeColumn = $columns['active'] ?? null;
    $removedColumn = $columns['removed_by_date'] ?? ($columns['removed_at'] ?? null);
    $select = [
        mineacle_stats_column_sql((string) $untilColumn) ? mineacle_stats_column_sql((string) $untilColumn) . ' AS until_value' : 'NULL AS until_value',
        mineacle_stats_column_sql((string) $timeColumn) ? mineacle_stats_column_sql((string) $timeColumn) . ' AS time_value' : 'NULL AS time_value',
        mineacle_stats_column_sql((string) $reasonColumn) ? mineacle_stats_column_sql((string) $reasonColumn) . ' AS reason_value' : 'NULL AS reason_value',
        mineacle_stats_column_sql((string) $activeColumn) ? mineacle_stats_column_sql((string) $activeColumn) . ' AS active_value' : 'NULL AS active_value',
        mineacle_stats_column_sql((string) $removedColumn) ? mineacle_stats_column_sql((string) $removedColumn) . ' AS removed_value' : 'NULL AS removed_value',
    ];
    $orderSql = is_string($timeColumn) ? mineacle_stats_column_sql($timeColumn) : null;
    $uuidKeySql = sprintf("REPLACE(LOWER(%s), '-', '')", $uuidSql);
    $sql = 'SELECT ' . implode(', ', $select) . ' FROM ' . $tableSql
        . ' WHERE ' . $uuidKeySql . ' = :uuid';

    if ($orderSql !== null) {
        $sql .= ' ORDER BY ' . $orderSql . ' DESC';
    }

    $sql .= ' LIMIT 10';
    $statement = $pdo->prepare($sql);
    $statement->execute([':uuid' => $uuidKey]);
    $now = time() * 1000;

    foreach ($statement->fetchAll() as $row) {
        $until = mineacle_stats_int($row['until_value'] ?? 0);
        $removed = mineacle_stats_int($row['removed_value'] ?? 0);
        $active = array_key_exists('active_value', $row) && $row['active_value'] !== null
            ? mineacle_stats_bool($row['active_value'])
            : true;

        if ($removed > 0 || ($until > 0 && $until <= $now)) {
            continue;
        }

        if (!$active) {
            continue;
        }

        $kind = $until > $now ? 'temporary' : 'permanent';
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

    return mineacle_stats_empty_punishment($type);
}

function mineacle_stats_punishment_status(PDO $pdo, string $uuid): array
{
    $litebansPdo = mineacle_litebans_db();

    if (!$litebansPdo instanceof PDO) {
        return mineacle_stats_empty_status();
    }

    $config = mineacle_config();
    $tables = $config['tables'] ?? [];
    $ban = mineacle_stats_litebans_status($litebansPdo, (string) ($tables['litebans_bans'] ?? 'litebans_bans'), 'ban', $uuid);
    $mute = mineacle_stats_litebans_status($litebansPdo, (string) ($tables['litebans_mutes'] ?? 'litebans_mutes'), 'mute', $uuid);
    $state = 'clear';

    if ($ban['active']) {
        $state = $ban['kind'] === 'temporary' ? 'temporary_ban' : 'permanent_ban';
    } elseif ($mute['active']) {
        $state = $mute['kind'] === 'temporary' ? 'temporary_mute' : 'permanent_mute';
    }

    return [
        'ban' => $ban,
        'mute' => $mute,
        'search_state' => $state,
    ];
}
