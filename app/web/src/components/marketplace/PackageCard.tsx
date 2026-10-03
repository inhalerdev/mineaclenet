"use client";

import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import type { MarketplacePackage } from "@/features/marketplace/tebex";
import { AddToCartButton } from "./Cart";
import { Price, useItemDetails } from "./ItemDetails";
import styles from "./MarketplacePage.module.css";

/*
 * One Marketplace item card: picture, name, a short description and the
 * price, all from the Tebex listing. The picture, the name or "More info"
 * opens the details pop-up (ItemDetails.tsx). The featured package gets a
 * gold frame and tag.
 */
export function PackageCard({ pkg }: { pkg: MarketplacePackage }) {
  const { openItem, featuredId } = useItemDetails();
  const onSale = pkg.basePrice > pkg.price;
  const featured = pkg.id === featuredId;
  const show = () => openItem(pkg.id);

  return (
    <li className={`${styles.card} ${featured ? styles.cardFeatured : ""}`.trim()}>
      <button
        type="button"
        className={styles.cardMedia}
        onClick={show}
        aria-label={`More info about ${pkg.name}`}
      >
        <img src={pkg.image || mineacleIcons.crate} alt="" loading="lazy" />
        {onSale ? <span className={styles.sale}>Sale</span> : null}
        {featured ? <span className={styles.featuredTag}>Featured</span> : null}
      </button>

      <div className={styles.cardText}>
        <h3>
          <button type="button" className={styles.cardName} onClick={show}>
            {pkg.name}
          </button>
        </h3>
        {pkg.description ? <p className={styles.cardBlurb}>{pkg.description.replace(/^• /gm, "")}</p> : null}
        <button type="button" className={styles.moreInfo} onClick={show}>
          More info
          <b aria-hidden="true" />
        </button>
      </div>

      <div className={styles.cardFooter}>
        <Price pkg={pkg} />
        <AddToCartButton pkg={pkg} />
      </div>
    </li>
  );
}
