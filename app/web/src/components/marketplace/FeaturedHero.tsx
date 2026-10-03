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
 * The featured package (featuredPackageId in tebex.ts) as a compact banner
 * at the top of the Marketplace: the item over a rune ring with glyphs
 * drifting into it (like an enchanting table's bookshelves), its Tebex name,
 * the description's opening line, the first list in it as perks with gold
 * checks, and the price (with a subscription's renewal and Tebex free trial)
 * beside a gold button that adds it and opens the cart. Everything shown is
 * the Tebex listing; "View details" opens all of it.
 */
export function FeaturedHero({ pkg }: { pkg: MarketplacePackage }) {
  const { openItem } = useItemDetails();
  const { intro, perks, more } = splitFeature(pkg.details);
  const onSale = pkg.basePrice > pkg.price;
  const trial = trialText(pkg.trialDays);

  return (
    <section id="featured" className={styles.hero} aria-labelledby="featured-title">
      <EnchantedScene variant="hero" />

      <button
        type="button"
        className={styles.stage}
        onClick={() => openItem(pkg.id)}
        aria-label={`More about ${pkg.name}`}
      >
        <RuneCircle className={styles.circle} />
        <EnchantedArt src={pkg.image} width={220} float eager className={styles.art} />
        <Glyphs />
      </button>

      <div className={styles.copy}>
        <div className={styles.tags}>
          <Tag tone="featured">Featured</Tag>
          {trial ? <Tag tone="trial">{trial}</Tag> : null}
          {onSale ? <Tag tone="sale">Sale</Tag> : null}
        </div>

        <h2 id="featured-title" className={styles.title}>
          {pkg.name}
        </h2>

        {intro[0] ? (
          <p className={styles.intro}>
            <RichSpans spans={intro[0].spans} />
          </p>
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
      </div>

      <div className={styles.buy}>
        <PriceTag pkg={pkg} size="large" />
        <GetButton pkg={pkg} className={styles.get} />
        <button type="button" className={styles.details} onClick={() => openItem(pkg.id)}>
          {more || intro.length > 1 ? "All the details" : "View details"}
          <b aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
