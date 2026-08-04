<?php

declare(strict_types=1);

function mineacle_compact_footer(array $site): void
{
    $resolveUrl = static function (mixed $value, string $fallback = '#'): string {
        $resolved = mineacle_page_public_link($value);

        if ($resolved === '#' && $fallback !== '#') {
            return mineacle_page_public_link($fallback);
        }

        return $resolved;
    };
    $quickLinks = [
        ['label' => 'Home', 'url' => '/'],
        ['label' => 'Vote', 'url' => '/vote'],
        ['label' => 'Leaderboards', 'url' => '/leaderboards'],
        ['label' => 'Bans', 'url' => '/bans'],
        ['label' => 'Store', 'url' => (string) ($site['store_url'] ?? '#')],
        ['label' => 'Contact', 'url' => '/contact'],
    ];
    $socialLinks = [
        [
            'key' => 'discord',
            'label' => 'Mineacle Discord',
            'url' => $resolveUrl($site['discord_url'] ?? '', 'https://discord.gg/qmpJ4xMguT'),
        ],
        [
            'key' => 'x',
            'label' => 'Mineacle on X',
            'url' => $resolveUrl($site['x_url'] ?? '', 'https://x.com/mineaclenetwork'),
        ],
        [
            'key' => 'youtube',
            'label' => 'Mineacle on YouTube',
            'url' => $resolveUrl($site['youtube_url'] ?? '', 'https://www.youtube.com/@mineaclenetwork'),
        ],
    ];

    echo '<footer class="compact-footer" aria-label="Mineacle footer">';
    echo '<div class="compact-footer__main">';

    echo '<div class="compact-footer__brand">';
    echo '<a class="compact-footer__brand-link" href="/">Mineacle</a>';
    echo '<span>The original survival server, built by Mineacle Studios.</span>';
    echo '</div>';

    echo '<div class="compact-footer__navigation">';
    echo '<nav class="compact-footer__links" aria-label="Quick links">';
    foreach ($quickLinks as $link) {
        $url = $resolveUrl($link['url']);

        if ($url !== '#') {
            echo '<a href="' . h($url) . '">' . h($link['label']) . '</a>';
        }
    }
    echo '</nav>';

    echo '<nav class="compact-footer__socials" aria-label="Social links">';
    foreach ($socialLinks as $link) {
        $url = (string) $link['url'];
        $key = (string) $link['key'];

        if ($url !== '#') {
            $iconPath = __DIR__ . '/../assets/images/footer/' . $key . '.png';
            $iconRevision = (string) (is_file($iconPath) ? (filemtime($iconPath) ?: mineacle_page_asset_version()) : mineacle_page_asset_version());

            echo '<a class="compact-footer__social compact-footer__social--' . h($key) . '" href="' . h($url) . '" target="_blank" rel="noopener noreferrer" aria-label="' . h((string) $link['label']) . '">';
            echo '<img src="/shared/assets/images/footer/' . h($key) . '.png?rev=' . h(rawurlencode($iconRevision)) . '" alt="" aria-hidden="true" loading="lazy" decoding="async" draggable="false">';
            echo '</a>';
        }
    }
    echo '</nav>';
    echo '</div>';
    echo '</div>';

    echo '<div class="compact-footer__legal">';
    echo '<span>© 2026 Mineacle Studios</span>';
    echo '<span>Not affiliated with Mojang Studios or Microsoft.</span>';
    echo '</div>';
    echo '</footer>';
}
