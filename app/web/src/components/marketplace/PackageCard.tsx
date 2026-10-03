"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import block from "@/components/site/BlockButton.module.css";
import { formatPrice } from "@/features/marketplace/format";
import type { MarketplacePackage } from "@/features/marketplace/tebex";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { AddToCartButton } from "./Cart";
import styles from "./MarketplacePage.module.css";

/*
 * One Marketplace item: a card in the grid with a short description, and a
 * details pop-up (bigger picture, the full description, price and Add to
 * cart) opened from the picture, the name or "More info". Everything shown
 * comes from the Tebex listing; nothing is added here.
 *
 * The open item is kept in the address as #item-<id>, so a link to it opens
 * it straight away (e.g. shared on Discord). Esc, the X or a click outside
 * closes it.
 */
export function PackageCard({ pkg }: { pkg: MarketplacePackage }) {
  const [open, setOpen] = useState(false);
  const onSale = pkg.basePrice > pkg.price;
  const hash = `#item-${pkg.id}`;

  const show = useCallback(() => {
    setOpen(true);
    window.history.replaceState(null, "", hash);
  }, [hash]);

  const hide = useCallback(() => {
    setOpen(false);
    if (window.location.hash === hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, [hash]);

  // Opened from a shared link (on load, or when only the #item-… changes)
  useEffect(() => {
    const sync = () => window.location.hash === hash && setOpen(true);

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [hash]);

  return (
    <li className={styles.card}>
      <button
        type="button"
        className={styles.cardMedia}
        onClick={show}
        aria-label={`More info about ${pkg.name}`}
      >
        <img src={pkg.image || mineacleIcons.crate} alt="" loading="lazy" />
        {onSale ? <span className={styles.sale}>Sale</span> : null}
      </button>

      <div className={styles.cardText}>
        <h3>
          <button type="button" className={styles.cardName} onClick={show}>
            {pkg.name}
          </button>
        </h3>
        {pkg.description ? <p className={styles.cardBlurb}>{pkg.description}</p> : null}
        <button type="button" className={styles.moreInfo} onClick={show}>
          More info
          <b aria-hidden="true" />
        </button>
      </div>

      <div className={styles.cardFooter}>
        <Price pkg={pkg} />
        <AddToCartButton pkg={pkg} />
      </div>

      {open ? <PackageDetails pkg={pkg} onClose={hide} /> : null}
    </li>
  );
}

function Price({ pkg, large = false }: { pkg: MarketplacePackage; large?: boolean }) {
  const onSale = pkg.basePrice > pkg.price;

  return (
    <p className={`${styles.price} ${large ? styles.priceLarge : ""}`.trim()}>
      {onSale ? <s>{formatPrice(pkg.basePrice, pkg.currency)}</s> : null}
      <span>{formatPrice(pkg.price, pkg.currency)}</span>
    </p>
  );
}

/* The full description: paragraphs, and "• " lines as a pixel-bullet list. */
function Description({ text }: { text: string }) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const blocks: (string | string[])[] = [];

  for (const line of lines) {
    if (line.startsWith("• ")) {
      const last = blocks[blocks.length - 1];
      const item = line.slice(2);

      if (Array.isArray(last)) {
        last.push(item);
      } else {
        blocks.push([item]);
      }
    } else {
      blocks.push(line);
    }
  }

  return (
    <div className={styles.detailText}>
      {blocks.map((entry, index) =>
        Array.isArray(entry) ? (
          <ul key={index}>
            {entry.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={index}>{entry}</p>
        ),
      )}
    </div>
  );
}

function PackageDetails({ pkg, onClose }: { pkg: MarketplacePackage; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const onSale = pkg.basePrice > pkg.price;
  const titleId = `item-${pkg.id}-title`;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const key = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const scroll = document.body.style.overflow;

    // Focus the pop-up itself (not the X, which would show it raised as
    // if hovered), so Tab moves on from here and screen readers read it
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", key);

    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = scroll;
      opener?.focus?.();
    };
  }, [onClose]);

  // On <body>, so it covers the site header too (like the cart)
  return createPortal(
    <div className={styles.detailLayer}>
      <button
        type="button"
        className={styles.cartBackdrop}
        onClick={onClose}
        aria-label="Close"
        tabIndex={-1}
      />
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={styles.detail}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          className={`${block.button} ${block.square} ${styles.detailClose}`}
          onClick={onClose}
          aria-label="Close"
        >
          <img src={mineacleIcons.close} alt="" />
        </button>

        <div className={styles.detailMedia}>
          <img src={pkg.image || mineacleIcons.crate} alt="" />
          {onSale ? <span className={styles.sale}>Sale</span> : null}
        </div>

        <div className={styles.detailBody}>
          <h2 id={titleId}>{pkg.name}</h2>
          {pkg.description ? <Description text={pkg.description} /> : null}
        </div>

        <footer className={styles.detailFooter}>
          <Price pkg={pkg} large />
          <AddToCartButton pkg={pkg} />
        </footer>
      </section>
    </div>,
    document.body,
  );
}
