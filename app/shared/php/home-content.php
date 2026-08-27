<?php

declare(strict_types=1);

/**
 * Mineacle Home content source.
 *
 * The public Home page reads only this normalized structure. A future admin
 * editor can call mineacle_home_content_save() after its existing
 * authorization and CSRF checks. Nothing in this file exposes a public write
 * route.
 */

function mineacle_home_content_path(): string
{
    $configured = trim(
        (string) (getenv('MINEACLE_HOME_CONTENT_PATH') ?: '')
    );

    return $configured !== ''
        ? $configured
        : '/var/lib/mineacle/home-content.json';
}

/**
 * @return array<string,array<string,mixed>>
 */
function mineacle_home_content_defaults(): array
{
    return [
        'hero' => [
            'is_new' => false,
            'published_at' => '',
            'media_type' => 'video',
            'media_url' =>
                'https://pub-a87f1944ab6f4788a1974177e59cf562.r2.dev/hero-bg.mp4',
            'title' => 'Build a world worth competing for.',
            'description' =>
                'Mineacle is a player-driven survival server where economy, teams, PvP, and progression all connect.',
            'primary_label' => 'View Leaderboards',
            'primary_url' => '/leaderboards',
            'secondary_label' => 'Earn Rewards',
            'secondary_url' => '/vote',
        ],
        'duels' => [
            'enabled' => true,
            'order' => 10,
            'is_new' => false,
            'published_at' => '',
            'media_type' => 'image',
            'media_url' => '/home/assets/images/duels-slot.png',
            'title' => 'Prove it in combat.',
            'description' =>
                'Fight fast PvP matches and climb Mineacle’s global kill rankings.',
            'button_label' => 'View Top Kills',
            'button_url' =>
                '/leaderboards?category=players&view=kills&order=desc',
        ],
        'plus' => [
            'enabled' => true,
            'order' => 20,
            'is_new' => false,
            'published_at' => '',
            'media_type' => 'image',
            'media_url' => '/home/assets/images/mineacle-plus-slot.png',
            'title' => 'Play with fewer limits.',
            'description' =>
                'Mineacle+ gives you more freedom to travel, trade, build, and personalize how you play.',
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
        return mb_substr($url, 0, 700, 'UTF-8');
    }

    if (
        filter_var($url, FILTER_VALIDATE_URL) !== false
        && str_starts_with(strtolower($url), 'https://')
    ) {
        return mb_substr($url, 0, 700, 'UTF-8');
    }

    return $fallback;
}

function mineacle_home_content_clean_date(
    mixed $value
): string {
    $date = trim((string) $value);

    if ($date === '') {
        return '';
    }

    try {
        $resolved = new DateTimeImmutable($date);
    } catch (Throwable) {
        return '';
    }

    return $resolved->format(DATE_ATOM);
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

    if (array_key_exists('enabled', $defaults)) {
        $normalized['enabled'] = filter_var(
            $input['enabled'] ?? $defaults['enabled'],
            FILTER_VALIDATE_BOOL
        );
    }

    if (array_key_exists('order', $defaults)) {
        $normalized['order'] = max(
            0,
            min(
                1000,
                (int) ($input['order'] ?? $defaults['order'])
            )
        );
    }

    $normalized['is_new'] = filter_var(
        $input['is_new'] ?? $defaults['is_new'] ?? false,
        FILTER_VALIDATE_BOOL
    );

    $normalized['published_at'] =
        mineacle_home_content_clean_date(
            $input['published_at']
            ?? $defaults['published_at']
            ?? ''
        );

    $allowedMediaTypes = ['image', 'video'];
    $mediaType = strtolower(
        trim(
            (string) (
                $input['media_type']
                ?? $defaults['media_type']
                ?? 'image'
            )
        )
    );

    $normalized['media_type'] = in_array(
        $mediaType,
        $allowedMediaTypes,
        true
    )
        ? $mediaType
        : (string) ($defaults['media_type'] ?? 'image');

    $normalized['media_url'] =
        mineacle_home_content_clean_url(
            $input['media_url']
            ?? $defaults['media_url']
            ?? '',
            (string) ($defaults['media_url'] ?? '')
        );

    foreach (
        [
            'title' => 90,
            'description' => 240,
            'primary_label' => 40,
            'secondary_label' => 40,
            'button_label' => 40,
        ] as $field => $maxLength
    ) {
        if (!array_key_exists($field, $defaults)) {
            continue;
        }

        $normalized[$field] =
            mineacle_home_content_clean_text(
                $input[$field] ?? $defaults[$field],
                $maxLength
            );
    }

    foreach (
        [
            'primary_url',
            'secondary_url',
            'button_url',
        ] as $field
    ) {
        if (!array_key_exists($field, $defaults)) {
            continue;
        }

        $normalized[$field] =
            mineacle_home_content_clean_url(
                $input[$field] ?? $defaults[$field],
                (string) $defaults[$field]
            );
    }

    if (array_key_exists('perks', $defaults)) {
        $perks = is_array($input['perks'] ?? null)
            ? $input['perks']
            : $defaults['perks'];

        $cleanPerks = [];

        foreach (array_slice($perks, 0, 10) as $perk) {
            $clean = mineacle_home_content_clean_text(
                $perk,
                40
            );

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

    if (!is_string($raw) || trim($raw) === '') {
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

        $result[$slot] =
            mineacle_home_content_normalize_slot(
                $slotInput,
                $slotDefaults
            );
    }

    return $result;
}

/**
 * A future-dated feature stays hidden until its publish time.
 *
 * @param array<string,mixed> $slot
 */
function mineacle_home_content_is_visible(
    array $slot
): bool {
    if (
        array_key_exists('enabled', $slot)
        && !$slot['enabled']
    ) {
        return false;
    }

    $publishedAt = trim(
        (string) ($slot['published_at'] ?? '')
    );

    if ($publishedAt === '') {
        return true;
    }

    try {
        return new DateTimeImmutable($publishedAt)
            <= new DateTimeImmutable('now');
    } catch (Throwable) {
        return true;
    }
}

/**
 * Server-side persistence hook for the future admin Home editor.
 *
 * IMPORTANT:
 * The admin route must perform authorization + CSRF validation before
 * calling this function.
 *
 * @param array<string,mixed> $input
 */
function mineacle_home_content_save(
    array $input
): bool {
    $defaults = mineacle_home_content_defaults();
    $normalized = [];

    foreach ($defaults as $slot => $slotDefaults) {
        $slotInput = is_array($input[$slot] ?? null)
            ? $input[$slot]
            : [];

        $normalized[$slot] =
            mineacle_home_content_normalize_slot(
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

        $temporary =
            $path
            . '.tmp-'
            . bin2hex(random_bytes(6));
    } catch (Throwable) {
        return false;
    }

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
