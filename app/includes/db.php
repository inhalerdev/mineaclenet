<?php

declare(strict_types=1);

function mineacle_config(): array
{
    static $config = null;

    if ($config !== null) {
        return $config;
    }

    $path = __DIR__ . '/config.php';

    if (!is_file($path)) {
        throw new RuntimeException('Missing includes/config.php');
    }

    $config = require $path;

    if (!is_array($config)) {
        throw new RuntimeException('includes/config.php must return an array');
    }

    return $config;
}

function h(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function mineacle_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()');
}

function mineacle_db(?string $database = null): ?PDO
{
    static $connections = [];

    $config = mineacle_config();
    $mysql = $config['mysql'] ?? [];

    $host = trim((string) ($mysql['host'] ?? ''));
    $databaseName = trim((string) ($database ?? ($mysql['site_database'] ?? $mysql['database'] ?? '')));
    $username = trim((string) ($mysql['username'] ?? ''));

    if ($host === '' || $databaseName === '' || $username === '') {
        return null;
    }

    $connectionKey = $host . ':' . (string) ($mysql['port'] ?? 3306) . '/' . $databaseName . '/' . $username;

    if (($connections[$connectionKey] ?? false) instanceof PDO) {
        return $connections[$connectionKey];
    }

    if (array_key_exists($connectionKey, $connections) && $connections[$connectionKey] === null) {
        return null;
    }

    $port = (int) ($mysql['port'] ?? 3306);
    $password = (string) ($mysql['password'] ?? '');
    $charset = trim((string) ($mysql['charset'] ?? 'utf8mb4'));
    $timeout = max(1, min(10, (int) ($mysql['timeout'] ?? 2)));
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $host, $port, $databaseName, $charset);

    try {
        $connections[$connectionKey] = new PDO($dsn, $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => $timeout,
        ]);
    } catch (PDOException) {
        $connections[$connectionKey] = null;
    }

    return $connections[$connectionKey] instanceof PDO ? $connections[$connectionKey] : null;
}

function mineacle_core_db(): ?PDO
{
    $config = mineacle_config();
    $mysql = $config['mysql'] ?? [];

    return mineacle_db((string) ($mysql['core_database'] ?? $mysql['database'] ?? 'mineacle_core'));
}

function mineacle_site_db(): ?PDO
{
    $config = mineacle_config();
    $mysql = $config['mysql'] ?? [];

    return mineacle_db((string) ($mysql['site_database'] ?? $mysql['database'] ?? 'mineacle_site'));
}

function mineacle_litebans_db(): ?PDO
{
    $config = mineacle_config();
    $mysql = $config['mysql'] ?? [];

    return mineacle_db((string) ($mysql['litebans_database'] ?? 'mineacle_litebans'));
}
