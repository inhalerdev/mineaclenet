<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/auth.php';

mineacle_auth_private_headers();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0, private');
header('Pragma: no-cache');
header('Expires: 0');

$state = mineacle_auth_registration_state();
$status = (string) ($state['status'] ?? 'none');

if (session_status() === PHP_SESSION_ACTIVE) {
    /*
     * Release the PHP session lock immediately. The browser may poll this
     * endpoint while the main login page is also loading.
     */
    session_write_close();
}

http_response_code($status === 'unavailable' ? 503 : 200);

echo json_encode([
    'status' => $status,
    'username' => (string) ($state['username'] ?? ''),
    'expiresAt' => (int) ($state['expires_at'] ?? 0),
    'verifiedAt' => (int) ($state['verified_at'] ?? 0),
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
