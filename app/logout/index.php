<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/auth.php';

mineacle_auth_private_headers();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo 'Method not allowed.';
    exit;
}

if (!mineacle_auth_verify_csrf($_POST['csrf'] ?? null)) {
    http_response_code(403);
    echo 'Invalid logout request.';
    exit;
}

/*
 * Logout is deliberately lightweight.
 *
 * mineacle_auth_logout_session() clears the PHP session and expires the
 * Mineacle session cookie. Do not send Clear-Site-Data here: clearing the
 * entire origin cache/storage makes the following Home navigation perform a
 * cold reload and makes logout appear unnecessarily slow.
 */
mineacle_auth_logout_session();

header('Location: /', true, 303);
exit;
