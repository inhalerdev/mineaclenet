<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/stats-lib.php';

mineacle_security_headers();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

$query = trim((string) ($_GET['username'] ?? $_GET['name'] ?? $_GET['player'] ?? ''));

if ($query === '' || preg_match('/^[A-Za-z0-9_]{1,32}$/', $query) !== 1) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'error' => 'Missing or invalid player',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    $player = mineacle_stats_profile_by_username(substr($query, 0, 64));

    if (!$player) {
        http_response_code(404);
        echo json_encode([
            'ok' => false,
            'error' => 'Player not found',
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    echo json_encode([
        'ok' => true,
        'player' => $player,
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable) {
    http_response_code(503);
    echo json_encode([
        'ok' => false,
        'error' => 'Unable to load player stats right now',
    ], JSON_UNESCAPED_SLASHES);
}
