<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestPath = is_string($requestPath) ? rtrim($requestPath, '/') : '';
$requestPath = $requestPath === '' ? '/' : $requestPath;

if ($requestPath === '/' || $requestPath === '/index.php') {
    require __DIR__ . '/home.php';
    exit;
}

if ($requestPath === '/home' || $requestPath === '/home.php') {
    header('Location: /', true, 302);
    exit;
}

if ($requestPath === '/players') {
    $queryString = trim((string) ($_SERVER['QUERY_STRING'] ?? ''));
    header('Location: /leaderboards' . ($queryString !== '' ? '?' . $queryString : ''), true, 302);
    exit;
}

if ($requestPath === '/leaderboards') {
    require __DIR__ . '/leaderboards.php';
    exit;
}

if ($requestPath === '/contact') {
    require __DIR__ . '/contact.php';
    exit;
}

if ($requestPath === '/player') {
    require __DIR__ . '/player.php';
    exit;
}

if (preg_match('#^/player/([A-Za-z0-9_-]{1,64})$#', $requestPath, $playerMatch) === 1) {
    $_GET['username'] = rawurldecode($playerMatch[1]);
    require __DIR__ . '/player.php';
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
echo 'Not Found';
