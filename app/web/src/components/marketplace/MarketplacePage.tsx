import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro, StatTile } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import type { MarketplaceCategory } from "@/features/marketplace/tebex";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { CartButton, CartProvider } from "./Cart";
import { FeaturedBanner } from "./FeaturedBanner";
import { ItemDetailsProvider } from "./ItemDetails";
import styles from "./MarketplacePage.module.css";
import { PackageCard } from "./PackageCard";

/*
 * Marketplace (/marketplace): categories in a panel on the left, the chosen
 * category's items on the right. Items and prices come from Tebex
 * (features/marketplace/tebex.ts). Items go into the cart (Cart.tsx), which
 * checks out as one Tebex basket over the page. Each card opens a details
 * pop-up with the full description (ItemDetails.tsx). The featured package
 * (Mineacle+, see featuredPackageId in tebex.ts) gets a banner on top,
 * a gold card and a spot in the cart. Categories are links (?category=slug), so each one has
 * its own address and works without JavaScript. On phones the panel
 * becomes a row of tabs above the items.
 */
export function MarketplacePage({
  viewer,
  topPlayers,
  categories,
  featuredId,
  activeSlug,
  purchased,
}: {
  viewer: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  categories: MarketplaceCategory[];
  featuredId: number | null;
  activeSlug: string | null;
  purchased: boolean;
}) {
  const active =
    categories.find((category) => category.slug === activeSlug) ?? categories[0] ?? null;
  const allPackages = categories.flatMap((category) => category.packages);
  const featuredCategory = categories.find((category) =>
    category.packages.some((pkg) => pkg.id === featuredId),
  );
  const featured = featuredCategory?.packages.find((pkg) => pkg.id === featuredId);

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath="/marketplace"
      variant="content"
    >
      <CartProvider packages={allPackages} loggedIn={Boolean(viewer)} featuredId={featuredId}>
      <ItemDetailsProvider categories={categories} featuredId={featuredId}>
      <div className={content.content}>
        <PageIntro
          tag="Marketplace"
          tone="purple"
          title="Mineacle Marketplace"
          aside={active ? <CartButton /> : undefined}
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
          <>
          {featured && featuredCategory ? (
            <FeaturedBanner pkg={featured} category={featuredCategory} />
          ) : null}
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
                      {category.packages.some((pkg) => pkg.basePrice > pkg.price) ? (
                        <em className={styles.categorySale}>Sale</em>
                      ) : null}
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
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </ul>
            </section>
          </div>
          </>
        )}
      </div>
      </ItemDetailsProvider>
      </CartProvider>
    </FramedPage>
  );
}
