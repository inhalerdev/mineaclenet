<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: /', true, 302);
    exit;
}

if (!valid_csrf($_POST['csrf'] ?? null)) {
    http_response_code(419);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Session expired. Return to the site and try again.';
    exit;
}

$username = trim((string) ($_POST['username'] ?? ''));

if (preg_match('/^[A-Za-z0-9_]{3,16}$/', $username) !== 1) {
    http_response_code(422);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Enter a valid Minecraft username using 3-16 letters, numbers or underscores.';
    exit;
}

session_regenerate_id(true);

$_SESSION['player'] = [
    'username' => $username,
    'signed_in_at' => time(),
];

$return = safe_return_path($_POST['return'] ?? '/', '/');
header('Location: ' . $return, true, 303);
exit;
