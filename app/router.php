<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestPath = is_string($requestPath) ? rawurldecode($requestPath) : '/';
$isPrivatePath = preg_match(
    '#(?:^|/)\.|^/(?:includes|database|secrets)(?:/|$)#i',
    $requestPath
) === 1;

if ($isPrivatePath) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo 'Not Found';
    exit;
}

$requestedFile = realpath(__DIR__ . $requestPath);
$documentRoot = realpath(__DIR__);

if (
    $requestPath !== '/'
    && $requestedFile !== false
    && $documentRoot !== false
    && str_starts_with($requestedFile, $documentRoot . DIRECTORY_SEPARATOR)
    && is_file($requestedFile)
) {
    return false;
}

require __DIR__ . '/index.php';
