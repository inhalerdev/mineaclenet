<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function mineacle_home_defaults(): array
{
    $site = mineacle_config()['site'] ?? [];

    return [
        'hero' => [
            'image_url' => '',
            'background_image_url' => '/assets/brand/hero-mov.m4v',
            'link_url' => '',
        ],
        'player' => [
            'username' => '',
            'uuid' => '',
            'skin_url' => '',
            'players_online' => 0,
            'max_players' => 0,
        ],
        'announcements' => [],
        'worlds' => [
            'overworld' => ['world_key' => 'overworld', 'players_online' => 0, 'max_players' => 0, 'image_url' => ''],
            'nether' => ['world_key' => 'nether', 'players_online' => 0, 'max_players' => 0, 'image_url' => ''],
            'end' => ['world_key' => 'end', 'players_online' => 0, 'max_players' => 0, 'image_url' => ''],
        ],
        'community' => [
            'image_url' => '',
            'background_image_url' => '',
        ],
        'social_links' => [
            ['platform_key' => 'discord', 'url' => (string) ($site['discord_url'] ?? '#')],
            ['platform_key' => 'x', 'url' => (string) ($site['x_url'] ?? '#')],
            ['platform_key' => 'youtube', 'url' => (string) ($site['youtube_url'] ?? '#')],
            ['platform_key' => 'tiktok', 'url' => (string) ($site['tiktok_url'] ?? '#')],
        ],
        'footer' => [
            'image_url' => '',
            'background_image_url' => '',
        ],
    ];
}

function mineacle_home_table(string $key): string
{
    $tables = mineacle_config()['tables'] ?? [];
    $table = (string) ($tables[$key] ?? $key);

    if (!preg_match('/^[a-zA-Z0-9_]+$/', $table)) {
        throw new RuntimeException('Invalid table name');
    }

    return $table;
}

function mineacle_home_first(PDO $pdo, string $sql, array $params = []): array
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $row = $statement->fetch();

    return is_array($row) ? $row : [];
}

function mineacle_home_all(PDO $pdo, string $sql, array $params = []): array
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
    $rows = $statement->fetchAll();

    return is_array($rows) ? $rows : [];
}

function mineacle_home_is_stock_announcement(array $announcement): bool
{
    $key = (string) ($announcement['announcement_key'] ?? '');
    $body = trim((string) ($announcement['body'] ?? ''));
    $stockBodies = [
        'network_update' => 'Mineacle announcements, launch notes, and important server updates will appear here.',
        'java_support' => 'Mineacle currently supports Java Edition clients from 1.21.11 to 26+.',
        'community' => 'Events, vote rewards, Discord updates, and player notices will be posted here.',
    ];

    return isset($stockBodies[$key]) && $body === $stockBodies[$key];
}

function mineacle_home_apply_announcements(array $data, PDO $pdo): array
{
    try {
        $announcements = mineacle_home_table('announcements');
        $announcementRows = mineacle_home_all(
            $pdo,
            "SELECT announcement_key, title, eyebrow, body, content, image_url, link_url FROM {$announcements} WHERE is_enabled = 1 ORDER BY sort_order ASC, id ASC LIMIT 12"
        );
        $announcementRows = array_values(array_filter($announcementRows, static function (array $announcement): bool {
            return !mineacle_home_is_stock_announcement($announcement);
        }));

        if ($announcementRows) {
            $data['announcements'] = $announcementRows;
        }
    } catch (Throwable) {
        // The announcements table may not exist on older installs yet.
    }

    return $data;
}

function mineacle_home_data(): array
{
    $data = mineacle_home_defaults();
    $config = mineacle_config();
    $useHomeDatabase = (bool) ($config['home']['database_enabled'] ?? false);
    $mysql = is_array($config['mysql'] ?? null) ? $config['mysql'] : [];
    $hasDatabaseConnection = trim((string) ($mysql['host'] ?? '')) !== ''
        && trim((string) ($mysql['database'] ?? '')) !== ''
        && trim((string) ($mysql['username'] ?? '')) !== '';

    if (!$useHomeDatabase && !$hasDatabaseConnection) {
        return $data;
    }

    $pdo = mineacle_site_db();

    if (!$pdo) {
        return $data;
    }

    $data = mineacle_home_apply_announcements($data, $pdo);

    if (!$useHomeDatabase) {
        return $data;
    }

    try {
        $sections = mineacle_home_table('sections');
        $worlds = mineacle_home_table('worlds');
        $playerSummary = mineacle_home_table('player_summary');
        $socialLinks = mineacle_home_table('social_links');

        $hero = mineacle_home_first(
            $pdo,
            "SELECT link_url FROM {$sections} WHERE section_key = :section_key AND is_enabled = 1 LIMIT 1",
            ['section_key' => 'hero']
        );

        if ($hero) {
            $data['hero'] = array_merge($data['hero'], array_filter($hero, static function (mixed $value): bool {
                $trimmed = trim((string) $value);

                return $trimmed !== '' && $trimmed !== '#';
            }));
        }

        $community = mineacle_home_first(
            $pdo,
            "SELECT image_url, background_image_url FROM {$sections} WHERE section_key = :section_key AND is_enabled = 1 LIMIT 1",
            ['section_key' => 'community']
        );

        if ($community) {
            $data['community'] = array_merge($data['community'], $community);
        }

        $footer = mineacle_home_first(
            $pdo,
            "SELECT image_url, background_image_url FROM {$sections} WHERE section_key = :section_key AND is_enabled = 1 LIMIT 1",
            ['section_key' => 'footer']
        );

        if ($footer) {
            $data['footer'] = array_merge($data['footer'], $footer);
        }

        $player = mineacle_home_first(
            $pdo,
            "SELECT username, uuid, skin_url, players_online, max_players FROM {$playerSummary} ORDER BY updated_at DESC LIMIT 1"
        );

        if ($player) {
            $data['player'] = array_merge($data['player'], $player);
        }

        $worldRows = mineacle_home_all(
            $pdo,
            "SELECT world_key, players_online, max_players, image_url FROM {$worlds} WHERE is_enabled = 1 ORDER BY sort_order ASC, id ASC LIMIT 3"
        );

        foreach ($worldRows as $world) {
            $key = (string) ($world['world_key'] ?? '');
            if ($key !== '') {
                $data['worlds'][$key] = array_merge($data['worlds'][$key] ?? [], $world);
            }
        }

        $socialRows = mineacle_home_all(
            $pdo,
            "SELECT platform_key, url FROM {$socialLinks} WHERE is_enabled = 1 ORDER BY sort_order ASC, id ASC LIMIT 4"
        );

        if ($socialRows) {
            $data['social_links'] = array_values(array_pad($socialRows, 4, ['platform_key' => 'link', 'url' => '#']));
        }
    } catch (Throwable) {
        return $data;
    }

    return $data;
}

function mineacle_home_safe_url(mixed $url): string
{
    $value = trim((string) $url);

    if ($value === '' || $value === '#') {
        return $value === '#' ? '#' : '';
    }

    if (str_starts_with($value, 'assets/')) {
        return '/' . $value;
    }

    if (str_starts_with($value, '/') || str_starts_with($value, './')) {
        return $value;
    }

    return filter_var($value, FILTER_VALIDATE_URL) ? $value : '';
}

function mineacle_home_link(mixed $url): string
{
    $safe = mineacle_home_safe_url($url);

    return $safe !== '' ? $safe : '#';
}

function mineacle_home_image_style(mixed $url, string $property = '--panel-image'): string
{
    $safe = mineacle_home_safe_url($url);

    if ($safe === '' || $safe === '#') {
        return '';
    }

    $safe = str_replace("'", '%27', $safe);

    return ' style="' . h($property) . ': url(\'' . h($safe) . '\')"';
}

function mineacle_home_ratio_style(mixed $current, mixed $max): string
{
    $currentValue = max(0, (int) $current);
    $maxValue = max(0, (int) $max);
    $ratio = $maxValue > 0 ? min(100, (int) round(($currentValue / $maxValue) * 100)) : 0;

    return ' style="--fill: ' . h((string) $ratio) . '%"';
}

function mineacle_home_panel_style(mixed $url, mixed $current = null, mixed $max = null): string
{
    $styles = [];

    if ($current !== null || $max !== null) {
        $currentValue = max(0, (int) $current);
        $maxValue = max(0, (int) $max);
        $ratio = $maxValue > 0 ? min(100, (int) round(($currentValue / $maxValue) * 100)) : 0;
        $styles[] = '--fill: ' . $ratio . '%';
    }

    $safe = mineacle_home_safe_url($url);

    if ($safe !== '' && $safe !== '#') {
        $safe = str_replace("'", '%27', $safe);
        $styles[] = "--panel-image: url('" . h($safe) . "')";
    }

    if (!$styles) {
        return '';
    }

    return ' style="' . implode('; ', $styles) . '"';
}
