<?php

declare(strict_types=1);

require_once __DIR__ . '/layout.php';
require_once __DIR__ . '/auth.php';

/**
 * Shared top utility header used across Mineacle pages.
 *
 * The page owns grid placement. This component owns player search,
 * autocomplete hooks, authentication state, and future header utilities.
 *
 * @param array<string,mixed> $options
 */
function mineacle_site_header(array $options = []): void
{
    $user = mineacle_auth_current_user();

    $searchPlaceholder = trim(
        (string) ($options['search_placeholder'] ?? 'Search player usernames, nicknames, uuids...')
    ) ?: 'Search player usernames, nicknames, uuids...';

    $searchAsset = __DIR__ . '/../assets/images/search/search.png';
    $userAsset = __DIR__ . '/../assets/images/navigation/user.png';

    $assetVersion = max(
        is_file($searchAsset)
            ? (int) (filemtime($searchAsset) ?: 1)
            : 1,
        is_file($userAsset)
            ? (int) (filemtime($userAsset) ?: 1)
            : 1
    );

    $rev = rawurlencode((string) $assetVersion);
    ?>
    <header
        class="site-header"
        data-site-header
        aria-label="Mineacle utility header"
    >
        <div
            class="site-header__search-shell"
            data-site-player-search
        >
            <form
                class="site-header__search"
                action="/player"
                method="get"
                role="search"
                autocomplete="off"
            >
                <img
                    class="site-header__search-icon"
                    src="/shared/assets/images/search/search.png?rev=<?php echo h($rev); ?>"
                    alt=""
                    aria-hidden="true"
                    width="18"
                    height="18"
                >

                <input
                    type="search"
                    name="q"
                    placeholder="<?php echo h($searchPlaceholder); ?>"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    aria-label="<?php echo h($searchPlaceholder); ?>"
                    data-site-search-input
                >
            </form>

            <div
                class="site-header__search-results"
                data-site-search-results
                hidden
            ></div>
        </div>

        <div class="site-header__actions">
            <?php if ($user === null): ?>
                <a
                    class="site-header__account"
                    href="/login"
                >
                    <span
                        class="site-header__account-icon"
                        aria-hidden="true"
                    ></span>
                    <span>Log in / Sign up</span>
                </a>
            <?php else: ?>
                <form
                    class="site-header__logout-form"
                    action="/logout"
                    method="post"
                >
                    <input
                        type="hidden"
                        name="csrf"
                        value="<?php echo h(mineacle_auth_csrf_token()); ?>"
                    >

                    <button
                        class="site-header__account site-header__account--logout"
                        type="submit"
                    >
                        <span
                            class="site-header__account-icon"
                            aria-hidden="true"
                        ></span>
                        <span>Logout</span>
                    </button>
                </form>
            <?php endif; ?>
        </div>
    </header>
    <?php
}
