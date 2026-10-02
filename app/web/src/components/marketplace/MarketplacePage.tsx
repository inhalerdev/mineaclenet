import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import block from "@/components/site/BlockButton.module.css";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro, StatTile } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import type {
  MarketplaceCategory,
  MarketplacePackage,
} from "@/features/marketplace/tebex";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { withReturnPath } from "@/shared/navigation/return-path";
import { BuyButton } from "./BuyButton";
import styles from "./MarketplacePage.module.css";

/*
 * Marketplace (/marketplace): categories in a panel on the left, the chosen
 * category's items on the right. Items and prices come from Tebex
 * (features/marketplace/tebex.ts); Buy opens Tebex checkout over the page
 * (BuyButton.tsx). Categories are links (?category=slug), so each one has
 * its own address and works without JavaScript. On phones the panel
 * becomes a row of tabs above the items.
 */
export function MarketplacePage({
  viewer,
  topPlayers,
  categories,
  activeSlug,
  purchased,
}: {
  viewer: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  categories: MarketplaceCategory[];
  activeSlug: string | null;
  purchased: boolean;
}) {
  const active =
    categories.find((category) => category.slug === activeSlug) ?? categories[0] ?? null;
  const returnPath = active ? `/marketplace?category=${active.slug}` : "/marketplace";

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath="/marketplace"
      variant="content"
    >
      <div className={content.content}>
        <PageIntro
          tag="Marketplace"
          tone="purple"
          title="Mineacle Marketplace"
          footer={
            viewer ? (
              <dl className={content.stats}>
                <StatTile label="Buying for">
                  <img
                    src={playerAvatarUrl(viewer.uuid, 40)}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                  <span>{viewer.username}</span>
                </StatTile>
              </dl>
            ) : null
          }
        >
          Pick what you want. It's delivered in-game to the Minecraft account
          linked to your Mineacle login.
        </PageIntro>

        {purchased ? (
          <section className={styles.notice} role="status">
            <img src={mineacleIcons.check} alt="" />
            <div>
              <strong>Thanks for supporting Mineacle!</strong>
              <p>
                Your purchase arrives in-game within a minute. If you're
                offline, it's waiting for you next time you join.
              </p>
            </div>
          </section>
        ) : null}

        {!active ? (
          <section className={content.empty}>
            <strong>The marketplace is restocking</strong>
            <p>Check back in a few minutes.</p>
          </section>
        ) : (
          <div className={styles.layout}>
            <nav className={styles.panel} aria-label="Marketplace categories">
              <h2 className={styles.panelTitle}>Categories</h2>
              <ul className={styles.categories}>
                {categories.map((category) => (
                  <li key={category.id}>
                    <a
                      className={styles.category}
                      href={`/marketplace?category=${category.slug}`}
                      aria-current={category.id === active.id ? "page" : undefined}
                    >
                      {category.image ? (
                        <img src={category.image} alt="" loading="lazy" />
                      ) : (
                        <img src={mineacleIcons.crate} alt="" />
                      )}
                      <span>{category.name}</span>
                      <small>{category.packages.length}</small>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <section className={styles.items} aria-labelledby="marketplace-category">
              <header className={styles.itemsHeader}>
                <h2 id="marketplace-category">{active.name}</h2>
                {active.description ? <p>{active.description}</p> : null}
              </header>

              <ul className={styles.grid}>
                {active.packages.map((pkg) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    loggedIn={Boolean(viewer)}
                    returnPath={returnPath}
                  />
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </FramedPage>
  );
}

function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function PackageCard({
  pkg,
  loggedIn,
  returnPath,
}: {
  pkg: MarketplacePackage;
  loggedIn: boolean;
  returnPath: string;
}) {
  const onSale = pkg.basePrice > pkg.price;

  return (
    <li className={styles.card}>
      <div className={styles.cardMedia}>
        <img src={pkg.image || mineacleIcons.crate} alt="" loading="lazy" />
        {onSale ? <span className={styles.sale}>Sale</span> : null}
      </div>

      <div className={styles.cardText}>
        <h3>{pkg.name}</h3>
        {pkg.description ? <p>{pkg.description}</p> : null}
      </div>

      <div className={styles.cardFooter}>
        <p className={styles.price}>
          {onSale ? <s>{formatPrice(pkg.basePrice, pkg.currency)}</s> : null}
          <span>{formatPrice(pkg.price, pkg.currency)}</span>
        </p>

        {loggedIn ? (
          <BuyButton packageId={pkg.id} label={pkg.name} />
        ) : (
          <a
            className={`${block.button} ${block.primary} ${styles.buyButton}`}
            href={withReturnPath("/login", returnPath)}
          >
            Log in to buy
          </a>
        )}
      </div>
    </li>
  );
}
