<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/db.php';

mineacle_security_headers();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=600');
@set_time_limit(6);

$startedAt = microtime(true);

function mineacle_creator_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function mineacle_creator_queries(mixed $value): array
{
    $queries = array_map('trim', explode(',', (string) $value));
    $queries = array_values(array_filter($queries, static fn (string $query): bool => $query !== ''));

    return $queries !== [] ? $queries : ['#mineacle', '#mineaclenetwork', 'mineacle', 'mineaclenetwork'];
}

function mineacle_creator_fetch_json(string $url): ?array
{
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 1.2,
            'header' => "Accept: application/json\r\nUser-Agent: Mineacle-Web/1.0\r\n",
        ],
    ]);

    $response = @file_get_contents($url, false, $context);

    if (!is_string($response) || $response === '') {
        return null;
    }

    $data = json_decode($response, true);

    return is_array($data) ? $data : null;
}

function mineacle_creator_thumbnail(array $snippet): string
{
    $thumbnails = $snippet['thumbnails'] ?? [];

    foreach (['maxres', 'standard', 'high', 'medium', 'default'] as $key) {
        $url = $thumbnails[$key]['url'] ?? '';

        if (is_string($url) && filter_var($url, FILTER_VALIDATE_URL)) {
            return $url;
        }
    }

    return '';
}

$config = mineacle_config();
$creatorConfig = $config['creators'] ?? [];
$apiKey = trim((string) ($creatorConfig['youtube_api_key'] ?? ''));

if ($apiKey === '') {
    mineacle_creator_response([
        'configured' => false,
        'videos' => [],
        'message' => 'YouTube API key is not configured.',
    ]);
}

$queries = mineacle_creator_queries($creatorConfig['youtube_queries'] ?? '');
$limit = max(1, min(12, (int) ($creatorConfig['youtube_limit'] ?? 8)));
$perQuery = max(1, min(10, (int) ($creatorConfig['youtube_results_per_query'] ?? 6)));
$videos = [];

foreach ($queries as $query) {
    if (microtime(true) - $startedAt > 4.2) {
        break;
    }

    $url = 'https://www.googleapis.com/youtube/v3/search'
        . '?part=snippet'
        . '&type=video'
        . '&order=date'
        . '&safeSearch=none'
        . '&maxResults=' . rawurlencode((string) $perQuery)
        . '&q=' . rawurlencode($query)
        . '&key=' . rawurlencode($apiKey);

    $data = mineacle_creator_fetch_json($url);

    if (!is_array($data)) {
        continue;
    }

    foreach (($data['items'] ?? []) as $item) {
        if (!is_array($item)) {
            continue;
        }

        $videoId = trim((string) ($item['id']['videoId'] ?? ''));
        $snippet = is_array($item['snippet'] ?? null) ? $item['snippet'] : [];

        if ($videoId === '' || isset($videos[$videoId])) {
            continue;
        }

        $videos[$videoId] = [
            'id' => $videoId,
            'title' => trim((string) ($snippet['title'] ?? 'Mineacle creator video')),
            'channel' => trim((string) ($snippet['channelTitle'] ?? 'YouTube')),
            'published_at' => trim((string) ($snippet['publishedAt'] ?? '')),
            'thumbnail' => mineacle_creator_thumbnail($snippet),
            'url' => 'https://www.youtube.com/watch?v=' . rawurlencode($videoId),
        ];
    }
}

$videos = array_values($videos);
usort($videos, static function (array $a, array $b): int {
    return strcmp((string) ($b['published_at'] ?? ''), (string) ($a['published_at'] ?? ''));
});

mineacle_creator_response([
    'configured' => true,
    'videos' => array_slice($videos, 0, $limit),
]);
