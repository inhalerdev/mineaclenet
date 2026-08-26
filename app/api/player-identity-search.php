<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/db.php';
require_once __DIR__ . '/../shared/php/stats-lib.php';

mineacle_security_headers();

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

function mineacle_identity_response(
    array $payload,
    int $status = 200
): never {
    http_response_code($status);

    echo json_encode(
        $payload,
        JSON_UNESCAPED_SLASHES
        | JSON_UNESCAPED_UNICODE
    );

    exit;
}

function mineacle_identity_identifier(
    string $identifier
): ?string {
    if (!preg_match('/^[A-Za-z0-9_]+$/', $identifier)) {
        return null;
    }

    return '`' . $identifier . '`';
}

/**
 * @param array<string,string> $columns
 * @param list<string> $candidates
 */
function mineacle_identity_first_column(
    array $columns,
    array $candidates
): ?string {
    foreach ($candidates as $candidate) {
        $key = strtolower($candidate);

        if (
            isset($columns[$key])
            && mineacle_identity_identifier($columns[$key]) !== null
        ) {
            return $columns[$key];
        }
    }

    return null;
}

function mineacle_identity_like_value(
    string $value
): string {
    return strtr(
        $value,
        [
            '\\' => '\\\\',
            '%' => '\\%',
            '_' => '\\_',
        ]
    );
}

/**
 * @return array<string,string>
 */
function mineacle_identity_columns(
    PDO $pdo,
    string $tableSql
): array {
    $columns = [];

    foreach (
        $pdo->query('SHOW COLUMNS FROM ' . $tableSql)->fetchAll()
        as $row
    ) {
        $field = trim((string) ($row['Field'] ?? ''));

        if ($field !== '') {
            $columns[strtolower($field)] = $field;
        }
    }

    return $columns;
}

$config = mineacle_config();
$tables = is_array($config['tables'] ?? null)
    ? $config['tables']
    : [];

/*
 * Only the public player-profile cache is allowed here.
 * A config value cannot redirect this endpoint to an arbitrary table.
 */
$table = (string) (
    $tables['player_profiles']
    ?? 'mineacle_web_profiles'
);

if ($table !== 'mineacle_web_profiles') {
    mineacle_identity_response(
        [
            'success' => false,
            'players' => [],
        ],
        500
    );
}

$tableSql = mineacle_identity_identifier($table);

if ($tableSql === null) {
    mineacle_identity_response(
        [
            'success' => false,
            'players' => [],
        ],
        500
    );
}

$pdo = mineacle_core_db();

if (!$pdo instanceof PDO) {
    mineacle_identity_response([
        'success' => false,
        'players' => [],
    ]);
}

/*
 * Keep autocomplete intentionally small.
 * The browser cannot choose the result limit or any database column.
 */
$query = trim((string) ($_GET['q'] ?? ''));
$query = preg_replace('/\s+/', ' ', $query) ?? '';
$query = mb_substr($query, 0, 40, 'UTF-8');

if ($query === '') {
    mineacle_identity_response([
        'success' => true,
        'players' => [],
    ]);
}

try {
    $columns = mineacle_identity_columns(
        $pdo,
        $tableSql
    );

    $usernameColumn = mineacle_identity_first_column(
        $columns,
        [
            'username',
            'player_name',
            'name',
            'last_username',
            'last_known_name',
            'minecraft_username',
            'player',
        ]
    );

    $uuidColumn = mineacle_identity_first_column(
        $columns,
        [
            'uuid',
            'player_uuid',
            'unique_id',
            'minecraft_uuid',
        ]
    );

    /*
     * Nickname is preferred when a dedicated field exists.
     * display_name is the current Mineacle profile fallback.
     */
    $nicknameColumn = mineacle_identity_first_column(
        $columns,
        [
            'nickname',
            'nick',
            'display_name',
        ]
    );

    if ($usernameColumn === null) {
        mineacle_identity_response([
            'success' => true,
            'players' => [],
        ]);
    }

    $usernameSql = mineacle_identity_identifier(
        $usernameColumn
    );

    $uuidSql = $uuidColumn !== null
        ? mineacle_identity_identifier($uuidColumn)
        : null;

    $nicknameSql = $nicknameColumn !== null
        ? mineacle_identity_identifier($nicknameColumn)
        : null;

    if ($usernameSql === null) {
        mineacle_identity_response([
            'success' => true,
            'players' => [],
        ]);
    }

    $safeQuery = mineacle_identity_like_value($query);

    $where = [
        $usernameSql . ' LIKE :username_prefix',
        $usernameSql . ' LIKE :username_contains',
    ];

    $params = [
        ':username_prefix' => $safeQuery . '%',
        ':username_contains' => '%' . $safeQuery . '%',
        ':username_prefix_order' => $safeQuery . '%',
    ];

    if (
        $nicknameSql !== null
        && $nicknameSql !== $usernameSql
    ) {
        $where[] =
            $nicknameSql . ' LIKE :nickname_prefix';

        $where[] =
            $nicknameSql . ' LIKE :nickname_contains';

        $params[':nickname_prefix'] =
            $safeQuery . '%';

        $params[':nickname_contains'] =
            '%' . $safeQuery . '%';

        $params[':nickname_prefix_order'] =
            $safeQuery . '%';
    }

    /*
     * UUID lookup is enabled only for UUID-like searches of useful length,
     * avoiding an expensive broad scan for ordinary one-character queries.
     */
    $uuidSearch = strtolower(
        preg_replace('/[^a-fA-F0-9]/', '', $query)
        ?? ''
    );

    $searchUuid = (
        $uuidSql !== null
        && strlen($uuidSearch) >= 8
        && preg_match(
            '/^[a-f0-9]+$/',
            $uuidSearch
        ) === 1
    );

    if ($searchUuid) {
        $uuidExpression = sprintf(
            "REPLACE(LOWER(%s), '-', '')",
            $uuidSql
        );

        $where[] =
            $uuidExpression . ' LIKE :uuid_prefix';

        $params[':uuid_prefix'] =
            mineacle_identity_like_value(
                $uuidSearch
            ) . '%';
    }

    $select = [
        $usernameSql . ' AS username',
        $uuidSql !== null
            ? $uuidSql . ' AS uuid'
            : 'NULL AS uuid',
        $nicknameSql !== null
            ? $nicknameSql . ' AS nickname'
            : 'NULL AS nickname',
    ];

    $order = [
        'CASE WHEN '
            . $usernameSql
            . ' LIKE :username_prefix_order '
            . 'THEN 0 ELSE 1 END',
    ];

    if (
        $nicknameSql !== null
        && $nicknameSql !== $usernameSql
    ) {
        $order[] =
            'CASE WHEN '
            . $nicknameSql
            . ' LIKE :nickname_prefix_order '
            . 'THEN 0 ELSE 1 END';
    }

    $order[] = $usernameSql . ' ASC';

    $sql =
        'SELECT '
        . implode(', ', $select)
        . ' FROM '
        . $tableSql
        . ' WHERE '
        . implode(' OR ', $where)
        . ' ORDER BY '
        . implode(', ', $order)
        . ' LIMIT 8';

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    $players = [];
    $seen = [];

    foreach ($statement->fetchAll() as $row) {
        $username = trim(
            (string) ($row['username'] ?? '')
        );

        if (
            $username === ''
            || preg_match(
                '/^[A-Za-z0-9_]{1,16}$/',
                $username
            ) !== 1
        ) {
            continue;
        }

        $usernameKey = strtolower($username);

        if (isset($seen[$usernameKey])) {
            continue;
        }

        $uuid = trim(
            (string) ($row['uuid'] ?? '')
        );

        if ($uuid === '') {
            $uuid = null;
        }

        $nickname = trim(
            (string) ($row['nickname'] ?? '')
        );

        /*
         * If display_name simply mirrors the username, do not pretend that
         * the player has a nickname.
         */
        if (
            $nickname === ''
            || strcasecmp($nickname, $username) === 0
        ) {
            $nickname = null;
        }

        $skin = mineacle_stats_skin_assets(
            $uuid,
            $username
        );

        $head = is_string($skin['head'] ?? null)
            ? trim($skin['head'])
            : '';

        $players[] = [
            'uuid' => $uuid,
            'username' => $username,
            'nickname' => $nickname,
            'head' => $head !== ''
                ? $head
                : null,
        ];

        $seen[$usernameKey] = true;
    }

    mineacle_identity_response([
        'success' => true,
        'players' => $players,
    ]);
} catch (Throwable) {
    /*
     * Deliberately generic. Database and schema errors are not returned to
     * the client.
     */
    mineacle_identity_response([
        'success' => false,
        'players' => [],
    ]);
}
