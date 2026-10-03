import type { CSSProperties, ReactNode } from "react";
import { formatPrice, periodText, priceText } from "@/features/marketplace/format";
import type { MarketplacePackage } from "@/features/marketplace/tebex";
import styles from "./bits.module.css";

/*
 * Small shared pieces of the Marketplace: tags (Featured, free trial, Sale),
 * prices as Tebex lists them, and the gold check used for list items.
 */
export function Tag({
  tone,
  children,
}: {
  tone: "featured" | "trial" | "sale";
  children: ReactNode;
}) {
  return (
    <span className={styles.tag} data-tone={tone}>
      {tone === "featured" ? <PixelStar className={styles.tagStar} /> : null}
      {children}
    </span>
  );
}

/* Four-point pixel sparkle (7×7). */
export function PixelStar({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 7 7"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d="M3 0h1v2h1v1h2v1H5v1H4v2H3V5H2V4H0V3h2V2h1z" />
    </svg>
  );
}

/* Gold block with a pixel check, in front of list items. */
export function Check() {
  return <i className={styles.check} aria-hidden="true" />;
}

/*
 * The price as Tebex lists it: the sale price with the old one struck
 * through, "Free" at 0, and a subscription's renewal ("/ month").
 */
export function PriceTag({
  pkg,
  size = "card",
}: {
  pkg: MarketplacePackage;
  size?: "card" | "large";
}) {
  const onSale = pkg.basePrice > pkg.price;
  const period = periodText(pkg.period);

  return (
    <p className={styles.price} data-size={size}>
      {onSale ? (
        <s aria-label={`Was ${formatPrice(pkg.basePrice, pkg.currency)}`}>
          {formatPrice(pkg.basePrice, pkg.currency)}
        </s>
      ) : null}
      <strong>{priceText(pkg.price, pkg.currency)}</strong>
      {period ? <span>{period}</span> : null}
    </p>
  );
}
