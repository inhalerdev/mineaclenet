<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/auth.php';

mineacle_auth_private_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !mineacle_auth_verify_csrf($_POST['csrf'] ?? null)) {
    http_response_code(405);
    header('Allow: POST');
    echo 'Method not allowed.';
    exit;
}

mineacle_auth_logout_session();
header('Clear-Site-Data: "cache", "cookies", "storage"');
header('Location: /', true, 303);
exit;
