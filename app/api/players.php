<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/stats-lib.php';

mineacle_security_headers();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

try {
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 25;
    $offset = isset($_GET['offset']) ? (int) $_GET['offset'] : 0;
    $sort = isset($_GET['sort']) ? trim((string) $_GET['sort']) : 'playtime';
    $search = isset($_GET['search']) ? trim((string) $_GET['search']) : '';
    $players = mineacle_stats_players($limit, $offset, $sort, $search);

    echo json_encode([
        'ok' => true,
        'players' => $players,
    ], JSON_UNESCAPED_SLASHES);
} catch (Throwable) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Unable to load player stats right now',
    ], JSON_UNESCAPED_SLASHES);
}
