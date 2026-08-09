<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/php/auth.php';

mineacle_auth_private_headers();

$resolveReturnPath = static function (mixed $explicit, string $fallback = '/'): string {
    $explicitPath = trim((string) $explicit);

    if ($explicitPath !== '') {
        return mineacle_auth_safe_return_path($explicitPath, $fallback);
    }

    $referrer = trim((string) ($_SERVER['HTTP_REFERER'] ?? ''));

    if ($referrer === '') {
        return $fallback;
    }

    $parts = parse_url($referrer);

    if (!is_array($parts)) {
        return $fallback;
    }

    $referrerHost = strtolower(trim((string) ($parts['host'] ?? '')));
    $requestHost = strtolower(trim((string) ($_SERVER['HTTP_HOST'] ?? '')));
    $requestHost = (string) preg_replace('/:\d+$/', '', $requestHost);

    if (
        $referrerHost !== ''
        && ($requestHost === '' || !hash_equals($requestHost, $referrerHost))
    ) {
        return $fallback;
    }

    $candidate = (string) ($parts['path'] ?? '/');

    if (isset($parts['query']) && trim((string) $parts['query']) !== '') {
        $candidate .= '?' . (string) $parts['query'];
    }

    $candidatePath = (string) (parse_url($candidate, PHP_URL_PATH) ?? '/');

    if (in_array($candidatePath, ['/login', '/logout'], true)) {
        return $fallback;
    }

    return mineacle_auth_safe_return_path($candidate, $fallback);
};

$returnPath = $resolveReturnPath($_POST['return'] ?? '');

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

header('Location: ' . $returnPath, true, 303);
exit;
