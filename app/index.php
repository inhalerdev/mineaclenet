<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestPath = is_string($requestPath) ? rtrim($requestPath, '/') : '';

if ($requestPath === '') {
    $requestPath = '/';
}

if (preg_match('#^/player/([A-Za-z0-9_-]{1,64})$#', $requestPath, $playerMatch) === 1) {
    $_GET['username'] = rawurldecode($playerMatch[1]);
    require __DIR__ . '/player.php';
    exit;
}

if ($requestPath === '/player') {
    require __DIR__ . '/player.php';
    exit;
}

if ($requestPath === '/leaderboards' || $requestPath === '/players') {
    require __DIR__ . '/leaderboards.php';
    exit;
}

?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Mineacle</title>
    <link rel="stylesheet" href="/assets/home-screen.css?rev=1648x1016">
</head>
<body class="home-viewport-page">
<main class="home-viewport" id="main-content">
    <section class="home-container" aria-label="Mineacle home"></section>
</main>
</body>
</html>
