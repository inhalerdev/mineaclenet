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

    $storeUrl = $resolveUrl($site['store_url'] ?? '', 'https://store.mineacle.net/');
    $discordUrl = $resolveUrl($site['discord_url'] ?? '', 'https://discord.gg/qmpJ4xMguT');
    $xUrl = $resolveUrl($site['x_url'] ?? '', 'https://x.com/mineaclenetwork');
    $youtubeUrl = $resolveUrl($site['youtube_url'] ?? '', 'https://www.youtube.com/@mineaclenetwork');
    $wikiUrl = $resolveUrl($site['wiki_url'] ?? '', '#');
    $appealsUrl = $resolveUrl($site['appeals_url'] ?? '', 'https://bans.mineacle.net/appeal');
    $supportEmail = trim((string) ($site['support_email'] ?? 'support@mineacle.net')) ?: 'support@mineacle.net';
    $contactUrl = '/contact';
    $assetVersion = rawurlencode(mineacle_page_asset_version());

    $quickLinks = [
        ['label' => 'Store', 'url' => $storeUrl, 'external' => true],
        ['label' => 'Discord', 'url' => $discordUrl, 'external' => true],
        ['label' => 'Vote', 'url' => '/vote', 'external' => false],
        ['label' => 'Leaderboards', 'url' => '/leaderboards', 'external' => false],
        ['label' => 'Wiki', 'url' => $wikiUrl, 'external' => true],
        ['label' => 'Ban Appeals', 'url' => $appealsUrl, 'external' => true],
    ];

    $legalLinks = [
        ['label' => 'Terms of Service', 'url' => (string) ($site['terms_url'] ?? '#')],
        ['label' => 'Privacy Policy', 'url' => (string) ($site['privacy_url'] ?? '#')],
        ['label' => 'Refund Policy', 'url' => (string) ($site['refund_url'] ?? '#')],
        ['label' => 'Server Rules', 'url' => (string) ($site['rules_url'] ?? '/rules')],
    ];

    $socialLinks = [
        ['key' => 'discord', 'label' => 'Mineacle Discord', 'url' => $discordUrl],
        ['key' => 'x', 'label' => 'Mineacle on X', 'url' => $xUrl],
        ['key' => 'youtube', 'label' => 'Mineacle on YouTube', 'url' => $youtubeUrl],
    ];
    ?>
    <footer class="compact-footer" aria-label="Mineacle footer">
        <div class="compact-footer__main">
            <section class="compact-footer__brand" aria-label="Mineacle Studios">
                <a class="compact-footer__studio-logo" href="/" aria-label="Mineacle home">
                    <img
                        src="/shared/assets/images/footer/studios-logo.webp?v=<?php echo h($assetVersion); ?>"
                        alt="Mineacle Studios"
                        draggable="false"
                    >
                </a>
                <p>Mineacle Studios is a small team of passionate Minecraft developers building fun, fair, and community-first servers since 2021.</p>
                <nav class="compact-footer__socials" aria-label="Mineacle social links">
                    <?php foreach ($socialLinks as $social): ?>
                        <?php if ($social['url'] === '#') continue; ?>
                        <a
                            class="compact-footer__social compact-footer__social--<?php echo h($social['key']); ?>"
                            href="<?php echo h($social['url']); ?>"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="<?php echo h($social['label']); ?>"
                        >
                            <img
                                src="/shared/assets/images/footer/<?php echo h($social['key']); ?>.png?v=<?php echo h($assetVersion); ?>"
                                alt=""
                                aria-hidden="true"
                                loading="lazy"
                                decoding="async"
                                draggable="false"
                            >
                        </a>
                    <?php endforeach; ?>
                </nav>
            </section>

            <section class="compact-footer__links-column" aria-labelledby="compact-footer-links-title">
                <h2 class="compact-footer__heading" id="compact-footer-links-title">Quick Links</h2>
                <nav class="compact-footer__links" aria-label="Quick links">
                    <?php foreach ($quickLinks as $link): ?>
                        <?php if ($link['url'] === '#') continue; ?>
                        <a
                            href="<?php echo h($link['url']); ?>"
                            <?php echo $link['external'] ? 'target="_blank" rel="noopener noreferrer"' : ''; ?>
                        ><?php echo h($link['label']); ?></a>
                    <?php endforeach; ?>
                </nav>
            </section>

            <section class="compact-footer__support" aria-labelledby="compact-footer-support-title">
                <h2 class="compact-footer__heading" id="compact-footer-support-title">Support</h2>
                <p>Reach us directly or open a ticket on our contact page.</p>
                <address class="compact-footer__support-address"><?php echo h($supportEmail); ?></address>
                <a class="compact-footer__support-button" href="<?php echo h($contactUrl); ?>">Go to Contact Page</a>
            </section>
        </div>

        <div class="compact-footer__bottom">
            <div class="compact-footer__copyright">
                <img src="/home/assets/images/static-logo.png?v=<?php echo h($assetVersion); ?>" alt="" aria-hidden="true" draggable="false">
                <span>© 2026 Mineacle Studios · Not affiliated with Mojang Studios or Microsoft</span>
            </div>

            <nav class="compact-footer__legal" aria-label="Legal links">
                <?php foreach ($legalLinks as $link): ?>
                    <?php $url = mineacle_page_public_link($link['url']); ?>
                    <?php if ($url === '#'): ?>
                        <span><?php echo h($link['label']); ?></span>
                    <?php else: ?>
                        <a href="<?php echo h($url); ?>"><?php echo h($link['label']); ?></a>
                    <?php endif; ?>
                <?php endforeach; ?>
            </nav>
        </div>
    </footer>
    <?php
}
