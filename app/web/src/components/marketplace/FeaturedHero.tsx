"use client";

import { splitFeature } from "@/features/marketplace/rich-text";
import { trialText } from "@/features/marketplace/format";
import type { MarketplacePackage } from "@/features/marketplace/tebex";
import { Check, PriceTag, Tag } from "./bits";
import { GetButton } from "./Cart";
import { EnchantedArt, EnchantedScene, Glyphs, RuneCircle } from "./Enchanted";
import { useItemDetails } from "./ItemDetails";
import { RichSpans } from "./RichText";
import styles from "./FeaturedHero.module.css";

/*
 * The featured package (featuredPackageId in tebex.ts) as the Marketplace's
 * hero: the item floating over a rune circle in an enchanted scene, its
 * Tebex name, the description's opening text, the first list in it as
 * perks with gold checks, the price (with a subscription's renewal and
 * Tebex free trial) and a gold button that adds it and opens the cart.
 * Everything shown is the Tebex listing.
 */
export function FeaturedHero({ pkg }: { pkg: MarketplacePackage }) {
  const { openItem } = useItemDetails();
  const { intro, perks, more } = splitFeature(pkg.details);
  const onSale = pkg.basePrice > pkg.price;
  const trial = trialText(pkg.trialDays);

  return (
    <section id="featured" className={styles.hero} aria-labelledby="featured-title">
      <EnchantedScene variant="hero" />

      <div className={styles.copy}>
        <div className={styles.tags}>
          <Tag tone="featured">Featured</Tag>
          {trial ? <Tag tone="trial">{trial}</Tag> : null}
          {onSale ? <Tag tone="sale">Sale</Tag> : null}
        </div>

        <h2 id="featured-title" className={styles.title}>
          {pkg.name}
        </h2>

        {intro.length ? (
          <div className={styles.intro}>
            {intro.map((block, index) => (
              <p key={index}>
                <RichSpans spans={block.spans} />
              </p>
            ))}
          </div>
        ) : null}

        {perks.length ? (
          <ul className={styles.perks}>
            {perks.map((perk, index) => (
              <li key={index}>
                <Check />
                <span>
                  <RichSpans spans={perk.spans} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.buy}>
          <PriceTag pkg={pkg} size="hero" />
          <div className={styles.actions}>
            <GetButton pkg={pkg} className={styles.get} />
            <button type="button" className={styles.details} onClick={() => openItem(pkg.id)}>
              {more ? "All the details" : "View details"}
              <b aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.stage}
        onClick={() => openItem(pkg.id)}
        aria-label={`More about ${pkg.name}`}
      >
        <RuneCircle className={styles.circle} />
        <EnchantedArt src={pkg.image} width={420} float eager className={styles.art} />
        <Glyphs />
      </button>
    </section>
  );
}
