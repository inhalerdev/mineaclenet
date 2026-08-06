<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/auth.php';

mineacle_auth_private_headers();
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$state = mineacle_auth_registration_state();
$status = (string) ($state['status'] ?? 'none');

http_response_code($status === 'unavailable' ? 503 : 200);
echo json_encode([
    'status' => $status,
    'username' => (string) ($state['username'] ?? ''),
    'expiresAt' => (int) ($state['expires_at'] ?? 0),
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
