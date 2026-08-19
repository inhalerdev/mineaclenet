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
    echo 'Session expired.';
    exit;
}

unset($_SESSION['player']);
session_regenerate_id(true);

header('Location: /', true, 303);
exit;
