<?php

declare(strict_types=1);

/**
 * Homepage content source.
 *
 * Home renders from this normalized structure instead of hardcoding tile
 * copy in app/home/index.php.
 *
 * The admin UI can later call mineacle_home_content_save() after its own
 * authorization + CSRF checks. This file deliberately exposes no route.
 */

function mineacle_home_content_path(): string
{
    $configured = trim(
        (string) (getenv('MINEACLE_HOME_CONTENT_PATH') ?: '')
    );

    if ($configured !== '') {
        return $configured;
    }

    return '/var/lib/mineacle/home-content.json';
}

/**
 * @return array<string,array<string,mixed>>
 */
function mineacle_home_content_defaults(): array
{
    return [
        'hero' => [
            'is_new' => false,
            'title' => 'A survival world shaped by players.',
            'description' =>
                'Build, trade, form teams, and compete in a persistent world powered by a player-driven economy.',
            'primary_label' => 'View Leaderboards',
            'primary_url' => '/leaderboards',
            'secondary_label' => 'Earn Rewards',
            'secondary_url' => '/vote',
        ],
        'duels' => [
            'is_new' => false,
            'title' => 'Climb the combat rankings.',
            'description' =>
                'Take on fast PvP fights, improve your record, and see how you stack up against Mineacle’s top killers.',
            'button_label' => 'View Top Kills',
            'button_url' => '/leaderboards?metric=kills',
        ],
        'plus' => [
            'is_new' => false,
            'title' => 'More freedom with Mineacle+.',
            'description' =>
                'Move faster, keep more homes, unlock spawn flight, and expand the way you trade and play.',
            'perks' => [
                '5 Homes',
                'Faster Teleports',
                'Priority RTP',
                'Spawn Flight',
                '25 Orders',
                '45 Auction Slots',
                'Nicknames',
            ],
            'button_label' => 'Visit Store',
            'button_url' => 'https://store.mineacle.net/',
        ],
    ];
}

function mineacle_home_content_clean_text(
    mixed $value,
    int $maxLength
): string {
    $text = trim(strip_tags((string) $value));
    $text = preg_replace('/\s+/u', ' ', $text) ?? '';

    return mb_substr($text, 0, $maxLength, 'UTF-8');
}

function mineacle_home_content_clean_url(
    mixed $value,
    string $fallback
): string {
    $url = trim((string) $value);

    if ($url === '') {
        return $fallback;
    }

    if (
        str_starts_with($url, '/')
        && !str_starts_with($url, '//')
    ) {
        return mb_substr($url, 0, 500, 'UTF-8');
    }

    if (
        filter_var($url, FILTER_VALIDATE_URL) !== false
        && str_starts_with(strtolower($url), 'https://')
    ) {
        return mb_substr($url, 0, 500, 'UTF-8');
    }

    return $fallback;
}

/**
 * @param array<string,mixed> $input
 * @param array<string,mixed> $defaults
 * @return array<string,mixed>
 */
function mineacle_home_content_normalize_slot(
    array $input,
    array $defaults
): array {
    $normalized = $defaults;

    $normalized['is_new'] = filter_var(
        $input['is_new'] ?? $defaults['is_new'] ?? false,
        FILTER_VALIDATE_BOOL
    );

    foreach (
        [
            'title' => 90,
            'description' => 220,
            'primary_label' => 40,
            'secondary_label' => 40,
            'button_label' => 40,
        ] as $field => $maxLength
    ) {
        if (array_key_exists($field, $defaults)) {
            $normalized[$field] = mineacle_home_content_clean_text(
                $input[$field] ?? $defaults[$field],
                $maxLength
            );
        }
    }

    foreach (
        [
            'primary_url',
            'secondary_url',
            'button_url',
        ] as $field
    ) {
        if (array_key_exists($field, $defaults)) {
            $normalized[$field] = mineacle_home_content_clean_url(
                $input[$field] ?? $defaults[$field],
                (string) $defaults[$field]
            );
        }
    }

    if (array_key_exists('perks', $defaults)) {
        $perks = is_array($input['perks'] ?? null)
            ? $input['perks']
            : $defaults['perks'];

        $cleanPerks = [];

        foreach (array_slice($perks, 0, 10) as $perk) {
            $clean = mineacle_home_content_clean_text($perk, 40);

            if ($clean !== '') {
                $cleanPerks[] = $clean;
            }
        }

        $normalized['perks'] = $cleanPerks;
    }

    return $normalized;
}

/**
 * @return array<string,array<string,mixed>>
 */
function mineacle_home_content(): array
{
    $defaults = mineacle_home_content_defaults();
    $path = mineacle_home_content_path();

    if (!is_file($path) || !is_readable($path)) {
        return $defaults;
    }

    $raw = file_get_contents($path);

    if (!is_string($raw) || $raw === '') {
        return $defaults;
    }

    try {
        $decoded = json_decode(
            $raw,
            true,
            64,
            JSON_THROW_ON_ERROR
        );
    } catch (Throwable) {
        return $defaults;
    }

    if (!is_array($decoded)) {
        return $defaults;
    }

    $result = $defaults;

    foreach ($defaults as $slot => $slotDefaults) {
        $slotInput = is_array($decoded[$slot] ?? null)
            ? $decoded[$slot]
            : [];

        $result[$slot] = mineacle_home_content_normalize_slot(
            $slotInput,
            $slotDefaults
        );
    }

    return $result;
}

/**
 * Server-side persistence hook for the future admin editor.
 *
 * IMPORTANT:
 * The admin route must perform authorization and CSRF validation before
 * calling this function. This helper does not make itself web-accessible.
 *
 * @param array<string,mixed> $input
 */
function mineacle_home_content_save(array $input): bool
{
    $defaults = mineacle_home_content_defaults();
    $normalized = [];

    foreach ($defaults as $slot => $slotDefaults) {
        $slotInput = is_array($input[$slot] ?? null)
            ? $input[$slot]
            : [];

        $normalized[$slot] = mineacle_home_content_normalize_slot(
            $slotInput,
            $slotDefaults
        );
    }

    $path = mineacle_home_content_path();
    $directory = dirname($path);

    if (
        !is_dir($directory)
        || !is_writable($directory)
    ) {
        return false;
    }

    try {
        $json = json_encode(
            $normalized,
            JSON_PRETTY_PRINT
            | JSON_UNESCAPED_SLASHES
            | JSON_UNESCAPED_UNICODE
            | JSON_THROW_ON_ERROR
        );
    } catch (Throwable) {
        return false;
    }

    $temporary = $path . '.tmp-' . bin2hex(random_bytes(6));

    if (
        file_put_contents(
            $temporary,
            $json . PHP_EOL,
            LOCK_EX
        ) === false
    ) {
        return false;
    }

    @chmod($temporary, 0640);

    if (!rename($temporary, $path)) {
        @unlink($temporary);

        return false;
    }

    return true;
}
