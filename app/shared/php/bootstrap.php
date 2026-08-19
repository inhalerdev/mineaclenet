<?php

declare(strict_types=1);

$config = require __DIR__ . '/config.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';

    session_set_cookie_params([
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Lax',
        'path' => '/',
    ]);

    session_start();
}

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

function config(string $key, mixed $fallback = null): mixed
{
    global $config;
    return $config[$key] ?? $fallback;
}

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function current_player(): ?array
{
    $player = $_SESSION['player'] ?? null;
    return is_array($player) ? $player : null;
}

function csrf_token(): string
{
    if (!isset($_SESSION['csrf']) || !is_string($_SESSION['csrf']) || strlen($_SESSION['csrf']) < 32) {
        $_SESSION['csrf'] = bin2hex(random_bytes(24));
    }

    return $_SESSION['csrf'];
}

function valid_csrf(?string $token): bool
{
    $stored = $_SESSION['csrf'] ?? '';
    return is_string($stored) && is_string($token) && hash_equals($stored, $token);
}

function safe_return_path(?string $path, string $fallback = '/'): string
{
    if (!is_string($path) || $path === '' || !str_starts_with($path, '/') || str_starts_with($path, '//')) {
        return $fallback;
    }

    return $path;
}

function nav_items(): array
{
    return [
        ['key' => 'home', 'label' => 'Home', 'href' => '/', 'icon' => 'home.png'],
        ['key' => 'vote', 'label' => 'Vote', 'href' => '/vote', 'icon' => 'vote.png'],
        ['key' => 'leaderboard', 'label' => 'Leaderboard', 'href' => '/leaderboard', 'icon' => 'leaderboard.png'],
        ['key' => 'player', 'label' => 'Player stats', 'href' => '/player', 'icon' => 'player.svg'],
        ['key' => 'bans', 'label' => 'Bans', 'href' => '/bans', 'icon' => 'bans.png'],
        ['key' => 'store', 'label' => 'Store', 'href' => '/store', 'icon' => 'store.png'],
    ];
}
