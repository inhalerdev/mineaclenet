<?php

declare(strict_types=1);

$requestPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
$requestPath = is_string($requestPath) ? rawurldecode($requestPath) : '/';

if (
    preg_match('#(?:^|/)\.#', $requestPath) === 1
    || preg_match('#^/shared/(?:php|components)(?:/|$)#i', $requestPath) === 1
) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not Found';
    exit;
}

$documentRoot = realpath(__DIR__);
$requested = realpath(__DIR__ . $requestPath);

if (
    $requestPath !== '/'
    && $documentRoot !== false
    && $requested !== false
    && str_starts_with($requested, $documentRoot . DIRECTORY_SEPARATOR)
    && is_file($requested)
) {
    return false;
}

require __DIR__ . '/index.php';
