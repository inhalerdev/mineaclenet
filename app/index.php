<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestPath = is_string($requestPath) ? rawurldecode($requestPath) : '/';
$requestPath = rtrim($requestPath, '/') ?: '/';

$routes = [
    '/' => __DIR__ . '/home/index.php',
    '/home' => __DIR__ . '/home/index.php',
    '/vote' => __DIR__ . '/vote/index.php',
    '/leaderboard' => __DIR__ . '/leaderboard/index.php',
    '/leaderboards' => __DIR__ . '/leaderboard/index.php',
    '/bans' => __DIR__ . '/bans/index.php',
    '/player' => __DIR__ . '/player/index.php',
    '/login' => __DIR__ . '/login/index.php',
    '/logout' => __DIR__ . '/logout/index.php',
    '/store' => __DIR__ . '/store/index.php',
];

if (isset($routes[$requestPath])) {
    require $routes[$requestPath];
    exit;
}

if (preg_match('#^/player/([A-Za-z0-9_]{3,16})$#', $requestPath, $match) === 1) {
    $_GET['username'] = $match[1];
    require __DIR__ . '/player/index.php';
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
echo 'Not Found';
