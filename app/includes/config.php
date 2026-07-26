<?php

declare(strict_types=1);

$mineacleEnv = static function (array $keys, string $default = ''): string {
    foreach ($keys as $key) {
        $value = getenv($key);

        if (is_string($value) && $value !== '') {
            return $value;
        }

        $envValue = $_ENV[$key] ?? null;

        if (is_string($envValue) && $envValue !== '') {
            return $envValue;
        }

        $serverValue = $_SERVER[$key] ?? null;

        if (is_string($serverValue) && $serverValue !== '') {
            return $serverValue;
        }
    }

    return $default;
};

return [
    'site' => [
        'name' => $mineacleEnv(['SITE_NAME', 'site_name'], 'Mineacle'),
        'home_url' => $mineacleEnv(['HOME_URL', 'home_url'], 'https://mineacle.net/'),
        'stats_url' => $mineacleEnv(['STATS_URL', 'stats_url'], 'https://mineacle.net/leaderboards'),
        'store_url' => $mineacleEnv(['STORE_URL', 'store_url'], 'https://store.mineacle.net/'),
        'bans_url' => $mineacleEnv(['BANS_URL', 'bans_url'], '#'),
        'vote_url' => $mineacleEnv(['VOTE_URL', 'vote_url'], '#'),
        'staff_url' => $mineacleEnv(['STAFF_URL', 'staff_url'], '#'),
        'discord_url' => $mineacleEnv(['DISCORD_URL', 'discord_url'], '#'),
        'x_url' => $mineacleEnv(['X_URL', 'x_url'], '#'),
        'youtube_url' => $mineacleEnv(['YOUTUBE_URL', 'youtube_url'], '#'),
        'tiktok_url' => $mineacleEnv(['TIKTOK_URL', 'tiktok_url'], '#'),
        'terms_url' => $mineacleEnv(['TERMS_URL', 'terms_url'], '#'),
        'privacy_url' => $mineacleEnv(['PRIVACY_URL', 'privacy_url'], '#'),
        'refund_url' => $mineacleEnv(['REFUND_URL', 'refund_url'], '#'),
        'support_url' => $mineacleEnv(['SUPPORT_URL', 'support_url']),
        'support_email' => $mineacleEnv(['SUPPORT_EMAIL', 'support_email'], 'support@mineacle.net'),
        'minecraft_ip' => $mineacleEnv(['MINECRAFT_IP', 'minecraft_ip'], 'mineacle.net'),
    ],
    'mysql' => [
        'host' => $mineacleEnv(['DB_HOST', 'db_host'], '127.0.0.1'),
        'port' => (int) $mineacleEnv(['DB_PORT', 'db_port'], '3306'),
        'database' => $mineacleEnv(['DB_SITE_NAME', 'SITE_DB_NAME', 'DB_NAME', 'db_site_name', 'db_name'], 'mineacle_site'),
        'site_database' => $mineacleEnv(['DB_SITE_NAME', 'SITE_DB_NAME', 'DB_NAME', 'db_site_name', 'db_name'], 'mineacle_site'),
        'core_database' => $mineacleEnv(['DB_CORE_NAME', 'CORE_DB_NAME', 'db_core_name'], 'mineacle_core'),
        'litebans_database' => $mineacleEnv(['DB_LITEBANS_NAME', 'LITEBANS_DB_NAME', 'db_litebans_name'], 'mineacle_litebans'),
        'username' => $mineacleEnv(['DB_USERNAME', 'DB_USER', 'db_username', 'db_user'], 'website_user'),
        'password' => $mineacleEnv(['DB_PASSWORD', 'db_password']),
        'charset' => $mineacleEnv(['DB_CHARSET', 'db_charset'], 'utf8mb4'),
        'timeout' => (int) $mineacleEnv(['DB_TIMEOUT', 'db_timeout'], '2'),
    ],
    'tables' => [
        'sections' => $mineacleEnv(['HOME_SECTIONS_TABLE', 'home_sections_table'], 'home_sections'),
        'announcements' => $mineacleEnv(['HOME_ANNOUNCEMENTS_TABLE', 'home_announcements_table'], 'home_announcements'),
        'tiles' => $mineacleEnv(['HOME_TILES_TABLE', 'home_tiles_table'], 'home_feature_tiles'),
        'worlds' => $mineacleEnv(['HOME_WORLDS_TABLE', 'home_worlds_table'], 'home_world_stats'),
        'player_summary' => $mineacleEnv(['HOME_PLAYER_TABLE', 'home_player_table'], 'home_player_summary'),
        'social_links' => $mineacleEnv(['HOME_SOCIAL_TABLE', 'home_social_table'], 'home_social_links'),
        'player_profiles' => $mineacleEnv(['PLAYER_PROFILES_TABLE', 'player_profiles_table'], 'mineacle_web_profiles'),
        'teams' => $mineacleEnv(['TEAMS_TABLE', 'PLAYER_TEAMS_TABLE', 'teams_table'], 'mineacle_web_teams'),
        'fights' => $mineacleEnv(['PLAYER_FIGHTS_TABLE', 'player_fights_table'], 'mineacle_web_fights'),
        'litebans_bans' => $mineacleEnv(['LITEBANS_BANS_TABLE', 'litebans_bans_table'], 'litebans_bans'),
        'litebans_mutes' => $mineacleEnv(['LITEBANS_MUTES_TABLE', 'litebans_mutes_table'], 'litebans_mutes'),
    ],
    'home' => [
        'database_enabled' => strtolower($mineacleEnv(['HOME_DATABASE_ENABLED', 'home_database_enabled'])) === 'true',
    ],
    'creators' => [
        'youtube_api_key' => $mineacleEnv(['YOUTUBE_API_KEY', 'youtube_api_key']),
        'youtube_queries' => $mineacleEnv(['YOUTUBE_CREATOR_QUERIES', 'youtube_creator_queries'], '#mineacle,#mineaclenetwork,mineacle,mineaclenetwork'),
        'youtube_limit' => (int) $mineacleEnv(['YOUTUBE_CREATOR_LIMIT', 'youtube_creator_limit'], '8'),
        'youtube_results_per_query' => (int) $mineacleEnv(['YOUTUBE_CREATOR_RESULTS_PER_QUERY', 'youtube_creator_results_per_query'], '6'),
    ],
    'admin' => [
        'username' => $mineacleEnv(['ADMIN_USERNAME', 'admin_username']),
        'password' => $mineacleEnv(['ADMIN_PASSWORD', 'admin_password']),
        'password_hash' => $mineacleEnv(['ADMIN_PASSWORD_HASH', 'admin_password_hash']),
    ],
    'skins' => [
        'provider' => strtolower($mineacleEnv(['SKIN_PROVIDER', 'skin_provider'], 'mc-api')),
        'head_size' => (int) $mineacleEnv(['SKIN_HEAD_SIZE', 'skin_head_size'], '96'),
        'chest_size' => (int) $mineacleEnv(['SKIN_CHEST_SIZE', 'skin_chest_size'], '320'),
        'bust_size' => (int) $mineacleEnv(['SKIN_BUST_SIZE', 'skin_bust_size'], '512'),
    ],
    'security' => [
        'debug' => strtolower($mineacleEnv(['APP_DEBUG', 'app_debug'])) === 'true',
    ],
];
