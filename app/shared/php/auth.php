<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

const MINEACLE_AUTH_SESSION_USER = 'mineacle_auth_user';
const MINEACLE_AUTH_SESSION_CSRF = 'mineacle_auth_csrf';
const MINEACLE_AUTH_SESSION_REGISTRATION = 'mineacle_auth_registration';
const MINEACLE_AUTH_CODE_LENGTH = 6;
const MINEACLE_AUTH_CODE_TTL = 600;

function mineacle_auth_boot(): void
{
    static $booted = false;

    if ($booted) {
        return;
    }

    $booted = true;

    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = isset($_SERVER['HTTPS'])
        && $_SERVER['HTTPS'] !== ''
        && strtolower((string) $_SERVER['HTTPS']) !== 'off';

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');

    session_name($secure ? '__Host-mineacle_session' : 'mineacle_session');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}

function mineacle_auth_private_headers(): void
{
    header('Cache-Control: no-store, private');
    header('Pragma: no-cache');
}

function mineacle_auth_table_name(string $key, string $fallback): string
{
    $config = mineacle_config();
    $auth = is_array($config['auth'] ?? null) ? $config['auth'] : [];
    $tables = is_array($config['tables'] ?? null) ? $config['tables'] : [];
    $value = trim((string) ($auth[$key] ?? $tables[$key] ?? $fallback));

    return preg_match('/^[A-Za-z0-9_]+$/', $value) === 1 ? $value : $fallback;
}

function mineacle_auth_accounts_table(): string
{
    return mineacle_auth_table_name('accounts', 'mineacle_web_accounts');
}

function mineacle_auth_verifications_table(): string
{
    return mineacle_auth_table_name('verifications', 'mineacle_web_verifications');
}

function mineacle_auth_limits_table(): string
{
    return mineacle_auth_table_name('auth_limits', 'mineacle_web_auth_limits');
}

function mineacle_auth_profiles_table(): string
{
    return mineacle_auth_table_name('player_profiles', 'mineacle_web_profiles');
}

function mineacle_auth_database(): PDO
{
    $pdo = mineacle_core_db();

    if (!$pdo instanceof PDO) {
        throw new RuntimeException('The Mineacle account database is unavailable.');
    }

    return $pdo;
}

function mineacle_auth_ensure_schema(PDO $pdo): void
{
    static $ready = false;

    if ($ready) {
        return;
    }

    $accounts = mineacle_auth_accounts_table();
    $verifications = mineacle_auth_verifications_table();
    $limits = mineacle_auth_limits_table();

    $pdo->exec("CREATE TABLE IF NOT EXISTS `{$accounts}` (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        uuid CHAR(36) NOT NULL,
        username VARCHAR(16) NOT NULL,
        username_lower VARCHAR(16) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        verified_at BIGINT UNSIGNED NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        updated_at BIGINT UNSIGNED NOT NULL,
        last_login_at BIGINT UNSIGNED NOT NULL DEFAULT 0,
        disabled TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (id),
        UNIQUE KEY uq_mineacle_account_uuid (uuid),
        UNIQUE KEY uq_mineacle_account_username (username_lower),
        KEY idx_mineacle_account_disabled (disabled)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `{$verifications}` (
        challenge_id CHAR(32) NOT NULL,
        uuid CHAR(36) NOT NULL,
        username VARCHAR(16) NOT NULL,
        username_lower VARCHAR(16) NOT NULL,
        code_hash CHAR(64) NOT NULL,
        created_at BIGINT UNSIGNED NOT NULL,
        expires_at BIGINT UNSIGNED NOT NULL,
        verified_at BIGINT UNSIGNED NULL,
        verified_username VARCHAR(16) NULL,
        consumed_at BIGINT UNSIGNED NULL,
        PRIMARY KEY (challenge_id),
        KEY idx_mineacle_verification_code (code_hash),
        KEY idx_mineacle_verification_uuid (uuid),
        KEY idx_mineacle_verification_expiry (expires_at),
        KEY idx_mineacle_verification_state (verified_at, consumed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `{$limits}` (
        bucket_hash CHAR(64) NOT NULL,
        attempts INT UNSIGNED NOT NULL DEFAULT 0,
        window_started_at BIGINT UNSIGNED NOT NULL,
        blocked_until BIGINT UNSIGNED NOT NULL DEFAULT 0,
        updated_at BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (bucket_hash),
        KEY idx_mineacle_auth_limit_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $ready = true;
}

function mineacle_auth_csrf_token(): string
{
    mineacle_auth_boot();
    $token = $_SESSION[MINEACLE_AUTH_SESSION_CSRF] ?? null;

    if (!is_string($token) || strlen($token) < 32) {
        $token = bin2hex(random_bytes(32));
        $_SESSION[MINEACLE_AUTH_SESSION_CSRF] = $token;
    }

    return $token;
}

function mineacle_auth_verify_csrf(mixed $token): bool
{
    $expected = mineacle_auth_csrf_token();

    return is_string($token) && hash_equals($expected, $token);
}

function mineacle_auth_current_user(): ?array
{
    mineacle_auth_boot();
    $user = $_SESSION[MINEACLE_AUTH_SESSION_USER] ?? null;

    if (!is_array($user)) {
        return null;
    }

    $uuid = trim((string) ($user['uuid'] ?? ''));
    $username = trim((string) ($user['username'] ?? ''));

    if ($uuid === '' || $username === '') {
        unset($_SESSION[MINEACLE_AUTH_SESSION_USER]);

        return null;
    }

    return $user;
}

function mineacle_auth_is_logged_in(): bool
{
    return mineacle_auth_current_user() !== null;
}

function mineacle_auth_login_session(array $account): void
{
    mineacle_auth_boot();
    session_regenerate_id(true);

    $_SESSION[MINEACLE_AUTH_SESSION_USER] = [
        'account_id' => max(0, (int) ($account['id'] ?? $account['account_id'] ?? 0)),
        'uuid' => trim((string) ($account['uuid'] ?? '')),
        'username' => trim((string) ($account['username'] ?? '')),
        'verified_at' => max(0, (int) ($account['verified_at'] ?? time())),
        'logged_in_at' => time(),
    ];

    unset($_SESSION[MINEACLE_AUTH_SESSION_REGISTRATION]);
}

function mineacle_auth_logout_session(): void
{
    mineacle_auth_boot();
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => (string) ($params['path'] ?? '/'),
            'domain' => (string) ($params['domain'] ?? ''),
            'secure' => (bool) ($params['secure'] ?? false),
            'httponly' => (bool) ($params['httponly'] ?? true),
            'samesite' => (string) ($params['samesite'] ?? 'Lax'),
        ]);
    }

    session_destroy();
}

function mineacle_auth_safe_return_path(mixed $value, string $fallback = '/'): string
{
    $path = trim((string) $value);

    if ($path === '' || !str_starts_with($path, '/') || str_starts_with($path, '//')) {
        return $fallback;
    }

    $parts = parse_url($path);

    if (!is_array($parts) || isset($parts['scheme']) || isset($parts['host'])) {
        return $fallback;
    }

    return $path;
}

function mineacle_auth_require_login(string $returnPath = '/'): array
{
    $user = mineacle_auth_current_user();

    if ($user !== null) {
        return $user;
    }

    $safeReturn = mineacle_auth_safe_return_path($returnPath, '/');
    header('Location: /login?return=' . rawurlencode($safeReturn), true, 302);
    exit;
}

function mineacle_auth_client_ip(): string
{
    $ip = trim((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));

    return strlen($ip) <= 64 ? $ip : substr($ip, 0, 64);
}

function mineacle_auth_bucket(string $action, string $identity): string
{
    return hash('sha256', strtolower(trim($action)) . '|' . strtolower(trim($identity)));
}

function mineacle_auth_rate_is_blocked(PDO $pdo, string $action, string $identity): bool
{
    mineacle_auth_ensure_schema($pdo);
    $table = mineacle_auth_limits_table();
    $statement = $pdo->prepare("SELECT blocked_until FROM `{$table}` WHERE bucket_hash = ? LIMIT 1");
    $statement->execute([mineacle_auth_bucket($action, $identity)]);
    $row = $statement->fetch();

    return is_array($row) && (int) ($row['blocked_until'] ?? 0) > time();
}

function mineacle_auth_rate_failure(
    PDO $pdo,
    string $action,
    string $identity,
    int $maximum = 6,
    int $windowSeconds = 900,
    int $blockSeconds = 900
): void {
    mineacle_auth_ensure_schema($pdo);
    $table = mineacle_auth_limits_table();
    $bucket = mineacle_auth_bucket($action, $identity);
    $now = time();

    $pdo->beginTransaction();

    try {
        $statement = $pdo->prepare("SELECT attempts, window_started_at, blocked_until FROM `{$table}` WHERE bucket_hash = ? FOR UPDATE");
        $statement->execute([$bucket]);
        $row = $statement->fetch();
        $attempts = 0;
        $windowStartedAt = $now;
        $blockedUntil = 0;

        if (is_array($row)) {
            $attempts = (int) ($row['attempts'] ?? 0);
            $windowStartedAt = (int) ($row['window_started_at'] ?? $now);
            $blockedUntil = (int) ($row['blocked_until'] ?? 0);

            if ($windowStartedAt + $windowSeconds <= $now) {
                $attempts = 0;
                $windowStartedAt = $now;
                $blockedUntil = 0;
            }
        }

        $attempts++;

        if ($attempts >= $maximum) {
            $blockedUntil = max($blockedUntil, $now + $blockSeconds);
        }

        $upsert = $pdo->prepare("INSERT INTO `{$table}` (bucket_hash, attempts, window_started_at, blocked_until, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), window_started_at = VALUES(window_started_at),
            blocked_until = VALUES(blocked_until), updated_at = VALUES(updated_at)");
        $upsert->execute([$bucket, $attempts, $windowStartedAt, $blockedUntil, $now]);
        $pdo->commit();
    } catch (Throwable $exception) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $exception;
    }
}

function mineacle_auth_rate_clear(PDO $pdo, string $action, string $identity): void
{
    mineacle_auth_ensure_schema($pdo);
    $table = mineacle_auth_limits_table();
    $statement = $pdo->prepare("DELETE FROM `{$table}` WHERE bucket_hash = ?");
    $statement->execute([mineacle_auth_bucket($action, $identity)]);
}

function mineacle_auth_normalize_username(mixed $value): string
{
    $username = trim((string) $value);

    return preg_match('/^[A-Za-z0-9_]{3,16}$/', $username) === 1 ? $username : '';
}

function mineacle_auth_profile_by_username(PDO $pdo, string $username): ?array
{
    $table = mineacle_auth_profiles_table();
    $statement = $pdo->prepare("SELECT uuid, username, display_name FROM `{$table}` WHERE LOWER(username) = LOWER(?) LIMIT 1");
    $statement->execute([$username]);
    $profile = $statement->fetch();

    return is_array($profile) ? $profile : null;
}

function mineacle_auth_profile_by_uuid(PDO $pdo, string $uuid): ?array
{
    $table = mineacle_auth_profiles_table();
    $statement = $pdo->prepare("SELECT uuid, username, display_name, rank_name, rank_color, online FROM `{$table}` WHERE uuid = ? LIMIT 1");
    $statement->execute([$uuid]);
    $profile = $statement->fetch();

    return is_array($profile) ? $profile : null;
}

function mineacle_auth_account_by_username(PDO $pdo, string $username): ?array
{
    mineacle_auth_ensure_schema($pdo);
    $table = mineacle_auth_accounts_table();
    $statement = $pdo->prepare("SELECT * FROM `{$table}` WHERE username_lower = LOWER(?) LIMIT 1");
    $statement->execute([$username]);
    $account = $statement->fetch();

    return is_array($account) ? $account : null;
}

function mineacle_auth_generate_code(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $lastIndex = strlen($alphabet) - 1;
    $code = '';

    for ($index = 0; $index < MINEACLE_AUTH_CODE_LENGTH; $index++) {
        $code .= $alphabet[random_int(0, $lastIndex)];
    }

    return $code;
}

function mineacle_auth_hash_code(string $code): string
{
    return hash('sha256', strtoupper(trim($code)));
}

function mineacle_auth_start_registration(mixed $usernameValue): array
{
    $username = mineacle_auth_normalize_username($usernameValue);

    if ($username === '') {
        return ['ok' => false, 'message' => 'Enter the exact Minecraft username you use on Mineacle.'];
    }

    try {
        $pdo = mineacle_auth_database();
        mineacle_auth_ensure_schema($pdo);
        $identity = mineacle_auth_client_ip() . '|' . strtolower($username);

        if (mineacle_auth_rate_is_blocked($pdo, 'register', $identity)) {
            return ['ok' => false, 'message' => 'Too many verification requests. Wait a few minutes and try again.'];
        }

        $profile = mineacle_auth_profile_by_username($pdo, $username);

        if ($profile === null) {
            mineacle_auth_rate_failure($pdo, 'register', $identity, 5, 900, 900);

            return ['ok' => false, 'message' => 'That player has not joined Mineacle yet. Join the server once, then try again.'];
        }

        $canonicalUsername = trim((string) ($profile['username'] ?? $username));
        $uuid = trim((string) ($profile['uuid'] ?? ''));

        if ($uuid === '') {
            return ['ok' => false, 'message' => 'That player profile cannot be verified right now.'];
        }

        if (mineacle_auth_account_by_username($pdo, $canonicalUsername) !== null) {
            return ['ok' => false, 'message' => 'That player already has an account. Log in instead.'];
        }

        $challengeId = bin2hex(random_bytes(16));
        $now = time();
        $expiresAt = $now + MINEACLE_AUTH_CODE_TTL;
        $table = mineacle_auth_verifications_table();
        $code = '';

        for ($attempt = 0; $attempt < 8; $attempt++) {
            $candidate = mineacle_auth_generate_code();
            $collision = $pdo->prepare("SELECT 1 FROM `{$table}` WHERE code_hash = ? AND consumed_at IS NULL AND expires_at >= ? LIMIT 1");
            $collision->execute([mineacle_auth_hash_code($candidate), $now]);

            if (!$collision->fetch()) {
                $code = $candidate;
                break;
            }
        }

        if ($code === '') {
            throw new RuntimeException('Could not create a unique verification code.');
        }

        $pdo->beginTransaction();

        try {
            $invalidate = $pdo->prepare("UPDATE `{$table}` SET consumed_at = ? WHERE uuid = ? AND consumed_at IS NULL");
            $invalidate->execute([$now, $uuid]);

            $insert = $pdo->prepare("INSERT INTO `{$table}`
                (challenge_id, uuid, username, username_lower, code_hash, created_at, expires_at)
                VALUES (?, ?, ?, LOWER(?), ?, ?, ?)");
            $insert->execute([
                $challengeId,
                $uuid,
                $canonicalUsername,
                $canonicalUsername,
                mineacle_auth_hash_code($code),
                $now,
                $expiresAt,
            ]);

            $pdo->commit();
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            throw $exception;
        }

        $_SESSION[MINEACLE_AUTH_SESSION_REGISTRATION] = [
            'challenge_id' => $challengeId,
            'uuid' => $uuid,
            'username' => $canonicalUsername,
            'code' => $code,
            'expires_at' => $expiresAt,
        ];

        mineacle_auth_rate_clear($pdo, 'register', $identity);

        return ['ok' => true, 'message' => 'Verification created.'];
    } catch (Throwable) {
        return ['ok' => false, 'message' => 'Account verification is temporarily unavailable.'];
    }
}

function mineacle_auth_registration_state(): array
{
    mineacle_auth_boot();
    $session = $_SESSION[MINEACLE_AUTH_SESSION_REGISTRATION] ?? null;

    if (!is_array($session)) {
        return ['status' => 'none'];
    }

    $challengeId = trim((string) ($session['challenge_id'] ?? ''));
    $uuid = trim((string) ($session['uuid'] ?? ''));
    $username = trim((string) ($session['username'] ?? ''));
    $code = trim((string) ($session['code'] ?? ''));
    $expiresAt = (int) ($session['expires_at'] ?? 0);

    if ($challengeId === '' || $uuid === '' || $username === '' || $code === '') {
        unset($_SESSION[MINEACLE_AUTH_SESSION_REGISTRATION]);

        return ['status' => 'none'];
    }

    try {
        $pdo = mineacle_auth_database();
        mineacle_auth_ensure_schema($pdo);
        $table = mineacle_auth_verifications_table();
        $statement = $pdo->prepare("SELECT verified_at, consumed_at, expires_at FROM `{$table}` WHERE challenge_id = ? LIMIT 1");
        $statement->execute([$challengeId]);
        $row = $statement->fetch();

        if (!is_array($row) || (int) ($row['consumed_at'] ?? 0) > 0) {
            return ['status' => 'none'];
        }

        $databaseExpiry = (int) ($row['expires_at'] ?? $expiresAt);
        $verifiedAt = (int) ($row['verified_at'] ?? 0);
        $status = $verifiedAt > 0 ? 'verified' : ($databaseExpiry <= time() ? 'expired' : 'pending');

        return [
            'status' => $status,
            'challenge_id' => $challengeId,
            'uuid' => $uuid,
            'username' => $username,
            'code' => $code,
            'command' => '/verify ' . $code,
            'expires_at' => $databaseExpiry,
            'verified_at' => $verifiedAt,
        ];
    } catch (Throwable) {
        return [
            'status' => 'unavailable',
            'uuid' => $uuid,
            'username' => $username,
            'code' => $code,
            'command' => '/verify ' . $code,
            'expires_at' => $expiresAt,
        ];
    }
}

function mineacle_auth_cancel_registration(): void
{
    $state = mineacle_auth_registration_state();

    if (($state['challenge_id'] ?? '') !== '') {
        try {
            $pdo = mineacle_auth_database();
            mineacle_auth_ensure_schema($pdo);
            $table = mineacle_auth_verifications_table();
            $statement = $pdo->prepare("UPDATE `{$table}` SET consumed_at = ? WHERE challenge_id = ? AND consumed_at IS NULL");
            $statement->execute([time(), (string) $state['challenge_id']]);
        } catch (Throwable) {
            // Session cleanup still proceeds when the database is unavailable.
        }
    }

    unset($_SESSION[MINEACLE_AUTH_SESSION_REGISTRATION]);
}

function mineacle_auth_validate_password(mixed $passwordValue, mixed $confirmationValue): ?string
{
    $password = (string) $passwordValue;
    $confirmation = (string) $confirmationValue;
    $length = strlen($password);

    if ($length < 10) {
        return 'Use at least 10 characters for your password.';
    }

    if ($length > 128) {
        return 'Your password must be 128 characters or fewer.';
    }

    if (!hash_equals($password, $confirmation)) {
        return 'The passwords do not match.';
    }

    return null;
}

function mineacle_auth_complete_registration(mixed $passwordValue, mixed $confirmationValue): array
{
    $password = (string) $passwordValue;
    $passwordError = mineacle_auth_validate_password($password, $confirmationValue);

    if ($passwordError !== null) {
        return ['ok' => false, 'message' => $passwordError];
    }

    $state = mineacle_auth_registration_state();

    if (($state['status'] ?? '') !== 'verified') {
        return ['ok' => false, 'message' => 'Verify this account in game before creating a password.'];
    }

    try {
        $pdo = mineacle_auth_database();
        mineacle_auth_ensure_schema($pdo);
        $accounts = mineacle_auth_accounts_table();
        $verifications = mineacle_auth_verifications_table();
        $now = time();
        $uuid = (string) $state['uuid'];
        $username = (string) $state['username'];
        $challengeId = (string) $state['challenge_id'];
        $hash = password_hash($password, PASSWORD_DEFAULT);

        if (!is_string($hash) || $hash === '') {
            throw new RuntimeException('Password hashing failed.');
        }

        $pdo->beginTransaction();

        try {
            $lock = $pdo->prepare("SELECT verified_at, consumed_at, expires_at FROM `{$verifications}` WHERE challenge_id = ? FOR UPDATE");
            $lock->execute([$challengeId]);
            $challenge = $lock->fetch();

            if (
                !is_array($challenge)
                || (int) ($challenge['verified_at'] ?? 0) <= 0
                || (int) ($challenge['consumed_at'] ?? 0) > 0
                || ((int) ($challenge['verified_at'] ?? 0) + 900) < $now
            ) {
                throw new RuntimeException('Verification is no longer valid.');
            }

            $existing = $pdo->prepare("SELECT id FROM `{$accounts}` WHERE uuid = ? OR username_lower = LOWER(?) LIMIT 1");
            $existing->execute([$uuid, $username]);

            if ($existing->fetch()) {
                throw new RuntimeException('An account already exists for this player.');
            }

            $insert = $pdo->prepare("INSERT INTO `{$accounts}`
                (uuid, username, username_lower, password_hash, verified_at, created_at, updated_at, last_login_at)
                VALUES (?, ?, LOWER(?), ?, ?, ?, ?, ?)");
            $insert->execute([$uuid, $username, $username, $hash, $now, $now, $now, $now]);
            $accountId = (int) $pdo->lastInsertId();

            $consume = $pdo->prepare("UPDATE `{$verifications}` SET consumed_at = ? WHERE challenge_id = ?");
            $consume->execute([$now, $challengeId]);
            $pdo->commit();

            mineacle_auth_login_session([
                'id' => $accountId,
                'uuid' => $uuid,
                'username' => $username,
                'verified_at' => $now,
            ]);

            return ['ok' => true, 'message' => 'Account created.'];
        } catch (Throwable $exception) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }

            throw $exception;
        }
    } catch (Throwable $exception) {
        return ['ok' => false, 'message' => $exception->getMessage() ?: 'The account could not be created.'];
    }
}

function mineacle_auth_attempt_login(mixed $usernameValue, mixed $passwordValue): array
{
    $username = mineacle_auth_normalize_username($usernameValue);
    $password = (string) $passwordValue;

    if ($username === '' || $password === '') {
        return ['ok' => false, 'message' => 'Enter your Minecraft username and password.'];
    }

    try {
        $pdo = mineacle_auth_database();
        mineacle_auth_ensure_schema($pdo);
        $identity = mineacle_auth_client_ip() . '|' . strtolower($username);

        if (mineacle_auth_rate_is_blocked($pdo, 'login', $identity)) {
            return ['ok' => false, 'message' => 'Too many login attempts. Wait a few minutes and try again.'];
        }

        $account = mineacle_auth_account_by_username($pdo, $username);
        $valid = is_array($account)
            && (int) ($account['disabled'] ?? 0) === 0
            && password_verify($password, (string) ($account['password_hash'] ?? ''));

        if (!$valid) {
            mineacle_auth_rate_failure($pdo, 'login', $identity, 6, 900, 900);

            return ['ok' => false, 'message' => 'The username or password is incorrect.'];
        }

        $hash = (string) ($account['password_hash'] ?? '');
        $now = time();
        $table = mineacle_auth_accounts_table();

        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            $newHash = password_hash($password, PASSWORD_DEFAULT);
            $statement = $pdo->prepare("UPDATE `{$table}` SET password_hash = ?, updated_at = ?, last_login_at = ? WHERE id = ?");
            $statement->execute([$newHash, $now, $now, (int) $account['id']]);
        } else {
            $statement = $pdo->prepare("UPDATE `{$table}` SET last_login_at = ? WHERE id = ?");
            $statement->execute([$now, (int) $account['id']]);
        }

        mineacle_auth_rate_clear($pdo, 'login', $identity);
        mineacle_auth_login_session($account);

        return ['ok' => true, 'message' => 'Logged in.'];
    } catch (Throwable) {
        return ['ok' => false, 'message' => 'Login is temporarily unavailable.'];
    }
}

function mineacle_auth_bust_url(string $uuid, string $username = '', int $size = 256): string
{
    $cleanUuid = preg_replace('/[^a-f0-9]/', '', strtolower($uuid));
    $safeSize = max(64, min(512, $size));

    if (is_string($cleanUuid) && $cleanUuid !== '') {
        return 'https://mc-api.io/render/bust/' . rawurlencode($cleanUuid) . '?size=' . $safeSize;
    }

    return 'https://mc-api.io/render/bust/' . rawurlencode($username) . '/java?size=' . $safeSize;
}

mineacle_auth_boot();
