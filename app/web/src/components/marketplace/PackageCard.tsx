"use client";

import type { MarketplacePackage } from "@/features/marketplace/tebex";
import { PriceTag, Tag } from "./bits";
import { AddToCartButton } from "./Cart";
import { EnchantedArt } from "./Enchanted";
import { useItemDetails } from "./ItemDetails";
import styles from "./PackageCard.module.css";

/*
 * One Marketplace item: its Tebex picture on a glowing display, name,
 * opening line, price and Add to cart. Hovering lifts the card and runs the
 * enchantment glint over the picture; the picture or the name opens the
 * details pop-up (ItemDetails.tsx). The featured package gets a gold tag.
 */
export function PackageCard({ pkg }: { pkg: MarketplacePackage }) {
  const { openItem, featuredId } = useItemDetails();
  const onSale = pkg.basePrice > pkg.price;
  const featured = pkg.id === featuredId;
  const show = () => openItem(pkg.id);

  return (
    <li className={styles.card} data-featured={featured || undefined} data-glint-trigger="">
      <button
        type="button"
        className={styles.media}
        onClick={show}
        aria-label={`More about ${pkg.name}`}
      >
        <EnchantedArt src={pkg.image} width={300} glint="hover" className={styles.art} />
        {onSale || featured ? (
          <span className={styles.tags}>
            {featured ? <Tag tone="featured">Featured</Tag> : null}
            {onSale ? <Tag tone="sale">Sale</Tag> : null}
          </span>
        ) : null}
      </button>

      <div className={styles.body}>
        <h3 className={styles.name}>
          <button type="button" onClick={show}>
            {pkg.name}
          </button>
        </h3>
        {pkg.summary ? <p className={styles.summary}>{pkg.summary}</p> : null}
      </div>

      <div className={styles.foot}>
        <PriceTag pkg={pkg} />
        <AddToCartButton pkg={pkg} tone={featured ? "gold" : "primary"} />
      </div>
    </li>
  );
}
