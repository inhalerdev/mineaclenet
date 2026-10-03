import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro, StatTile } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import type { MarketplaceCategory } from "@/features/marketplace/tebex";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { CartButton, CartProvider, CartSummary } from "./Cart";
import { MarketImage } from "./Enchanted";
import { FeaturedHero } from "./FeaturedHero";
import { ItemDetailsProvider } from "./ItemDetails";
import styles from "./MarketplacePage.module.css";
import { PackageCard } from "./PackageCard";
import { RichBlocks } from "./RichText";
import { JumpTo, ShopNav, type ShopNavEntry } from "./ShopNav";

/*
 * Marketplace (/marketplace), everything from Tebex
 * (features/marketplace/tebex.ts):
 *
 *   - The featured package (Mineacle+, featuredPackageId) as the hero.
 *   - Every category as a section of item cards (PackageCard.tsx). A
 *     category holding only the featured package is the hero already.
 *   - A sticky sidebar on wide screens with jump links to each part (the
 *     part on screen lights up) and the cart's total with Check out; chips
 *     above the sections on narrower screens.
 *
 * Cards and the hero open a details pop-up (ItemDetails.tsx); items go into
 * the cart (Cart.tsx), which checks out as one Tebex basket over the page.
 * ?category=<slug> scrolls to that category when the page opens.
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
  const allPackages = categories.flatMap((category) => category.packages);
  const featuredCategory = categories.find((category) =>
    category.packages.some((pkg) => pkg.id === featuredId),
  );
  const featured = featuredCategory?.packages.find((pkg) => pkg.id === featuredId) ?? null;
  // A category with nothing but the featured package is shown by the hero
  const sections = categories.filter(
    (category) => !(featured && category.packages.length === 1 && category === featuredCategory),
  );
  const hasSale = (category: MarketplaceCategory) =>
    category.packages.some((pkg) => pkg.basePrice > pkg.price);

  const nav: ShopNavEntry[] = [
    ...(featured
      ? [{
          id: "featured",
          slug: null,
          label: featured.name,
          image: featured.image,
          count: null,
          featured: true,
          sale: featured.basePrice > featured.price,
        }]
      : []),
    ...sections.map((category) => ({
      id: `cat-${category.slug}`,
      slug: category.slug,
      label: category.name,
      image: category.image,
      count: category.packages.length,
      featured: false,
      sale: hasSale(category),
    })),
  ];

  const jumpTarget = activeSlug
    ? sections.some((category) => category.slug === activeSlug)
      ? `cat-${activeSlug}`
      : featuredCategory?.slug === activeSlug && featured
        ? "featured"
        : null
    : null;

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
          aside={categories.length ? <CartButton /> : undefined}
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

        {!categories.length ? (
          <section className={content.empty}>
            <strong>The marketplace is restocking</strong>
            <p>Check back in a few minutes.</p>
          </section>
        ) : (
          <>
            {featured ? <FeaturedHero pkg={featured} /> : null}

            {sections.length ? (
              <div className={styles.shop}>
                <aside className={styles.rail}>
                  <ShopNav entries={nav} variant="rail" />
                  <CartSummary />
                </aside>

                <div className={styles.main}>
                  {nav.length > 1 ? <ShopNav entries={nav} variant="chips" /> : null}

                  {sections.map((category) => (
                    <section
                      key={category.id}
                      id={`cat-${category.slug}`}
                      className={styles.section}
                      aria-labelledby={`cat-${category.slug}-title`}
                    >
                      <header className={styles.sectionHead}>
                        <span className={styles.slot} data-size="large">
                          <MarketImage src={category.image} width={40} />
                        </span>
                        <div className={styles.sectionTitle}>
                          <h2 id={`cat-${category.slug}-title`}>{category.name}</h2>
                          {category.details.length ? <RichBlocks blocks={category.details} /> : null}
                        </div>
                        <span className={styles.sectionCount}>
                          {category.packages.length}{" "}
                          {category.packages.length === 1 ? "item" : "items"}
                        </span>
                      </header>

                      <ul className={styles.grid}>
                        {category.packages.map((pkg) => (
                          <PackageCard key={pkg.id} pkg={pkg} />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            ) : null}

            {jumpTarget ? <JumpTo id={jumpTarget} /> : null}
          </>
        )}
      </div>
      </ItemDetailsProvider>
      </CartProvider>
    </FramedPage>
  );
}
