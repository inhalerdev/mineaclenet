<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestPath = is_string($requestPath) ? rtrim($requestPath, '/') : '';
$requestPath = $requestPath === '' ? '/' : $requestPath;

if ($requestPath === '/' || $requestPath === '/index.php') {
    require __DIR__ . '/home/index.php';
    exit;
}

if ($requestPath === '/home' || $requestPath === '/home.php') {
    header('Location: /', true, 302);
    exit;
}

/*
 * Authentication/account routes must be handled explicitly by the same front
 * controller as the public pages. This keeps verification polling working even
 * when the web server rewrites every PHP request through app/index.php.
 */
if (in_array($requestPath, ['/login', '/login.php', '/login/index.php'], true)) {
    require __DIR__ . '/login/index.php';
    exit;
}

if (in_array($requestPath, ['/login/status', '/login/status.php', '/auth/status'], true)) {
    require __DIR__ . '/login/status.php';
    exit;
}

if (in_array($requestPath, ['/logout', '/logout/index.php'], true)) {
    require __DIR__ . '/logout/index.php';
    exit;
}

if (in_array($requestPath, ['/vote', '/vote.php', '/vote/index.php'], true)) {
    require __DIR__ . '/vote/index.php';
    exit;
}

if ($requestPath === '/players') {
    $queryString = trim((string) ($_SERVER['QUERY_STRING'] ?? ''));
    header('Location: /leaderboards' . ($queryString !== '' ? '?' . $queryString : ''), true, 302);
    exit;
}

if ($requestPath === '/leaderboards') {
    require __DIR__ . '/leaderboards/index.php';
    exit;
}

if ($requestPath === '/contact') {
    require __DIR__ . '/contact/index.php';
    exit;
}

if ($requestPath === '/player') {
    require __DIR__ . '/player/index.php';
    exit;
}

if (preg_match('#^/player/([A-Za-z0-9_-]{1,64})$#', $requestPath, $playerMatch) === 1) {
    $_GET['username'] = rawurldecode($playerMatch[1]);
    require __DIR__ . '/player/index.php';
    exit;
}

if ($requestPath === '/admin') {
    require __DIR__ . '/admin/index.php';
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
echo 'Not Found';
