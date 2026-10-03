"use client";

import type {
  MarketplaceCategory,
  MarketplacePackage,
} from "@/features/marketplace/tebex";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { AddToCartButton } from "./Cart";
import { descriptionBlocks, Price, useItemDetails } from "./ItemDetails";
import styles from "./MarketplacePage.module.css";

/*
 * The featured package (see featuredPackageId in tebex.ts), big at the top
 * of the Marketplace: its picture on a glowing pedestal, its name, the
 * opening lines of its description and the first list in it as a grid of
 * perks, the price and a gold Add to cart. All of it is the Tebex listing;
 * "See everything" opens the full pop-up.
 */
const MAX_PERKS = 8;

export function FeaturedBanner({
  pkg,
  category,
}: {
  pkg: MarketplacePackage;
  category: MarketplaceCategory;
}) {
  const { openItem } = useItemDetails();
  const blocks = descriptionBlocks(pkg.description);
  const firstList = blocks.findIndex((entry) => Array.isArray(entry));
  const intro = (firstList === -1 ? blocks : blocks.slice(0, firstList))
    .filter((entry): entry is string => typeof entry === "string")
    .slice(0, 2);
  const perks = firstList === -1 ? [] : (blocks[firstList] as string[]);
  const shownPerks = perks.slice(0, MAX_PERKS);
  const onSale = pkg.basePrice > pkg.price;

  return (
    <section className={styles.featured} aria-labelledby="featured-title">
      <span className={styles.featuredGlint} aria-hidden="true" />
      <span className={styles.sparkles} aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </span>

      <div className={styles.featuredText}>
        <p className={styles.featuredKicker}>
          <span className={styles.featuredTag}>Featured</span>
          {category.name}
          {onSale ? <span className={styles.sale}>Sale</span> : null}
        </p>

        <h2 id="featured-title">{pkg.name}</h2>

        {intro.map((line) => (
          <p key={line} className={styles.featuredIntro}>
            {line}
          </p>
        ))}

        {shownPerks.length ? (
          <ul className={styles.perks}>
            {shownPerks.map((perk) => (
              <li key={perk}>
                <i aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.featuredBuy}>
          <Price pkg={pkg} large />
          <div className={styles.featuredActions}>
            <AddToCartButton pkg={pkg} tone="gold" />
            <button
              type="button"
              className={styles.featuredMore}
              onClick={() => openItem(pkg.id)}
            >
              {perks.length > MAX_PERKS ? `See all ${perks.length}` : "See everything"}
              <b aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.featuredMedia}
        onClick={() => openItem(pkg.id)}
        aria-label={`More info about ${pkg.name}`}
      >
        <span className={styles.pedestal} aria-hidden="true" />
        <img src={pkg.image || mineacleIcons.crate} alt="" />
      </button>
    </section>
  );
}
