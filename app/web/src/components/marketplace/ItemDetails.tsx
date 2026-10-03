"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import block from "@/components/site/BlockButton.module.css";
import { formatPrice } from "@/features/marketplace/format";
import type {
  MarketplaceCategory,
  MarketplacePackage,
} from "@/features/marketplace/tebex";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { AddToCartButton } from "./Cart";
import styles from "./MarketplacePage.module.css";

/*
 * The item details pop-up, one for the whole page: opened from an item card,
 * the featured banner or another item's "More from" row. Everything in it
 * comes from the Tebex listing (picture, name, description, prices).
 *
 * The open item is kept in the address as #item-<id>, so a link to it opens
 * it straight away (e.g. shared on Discord). Esc, the X or a click outside
 * closes it, and focus goes back to what opened it.
 */

type ItemDetailsValue = {
  openItem(id: number): void;
  featuredId: number | null;
};

const ItemDetailsContext = createContext<ItemDetailsValue | null>(null);

export function useItemDetails() {
  const value = useContext(ItemDetailsContext);

  if (!value) {
    throw new Error("useItemDetails outside ItemDetailsProvider");
  }

  return value;
}

const ITEM_HASH = /^#item-(\d+)$/;

export function ItemDetailsProvider({
  categories,
  featuredId,
  children,
}: {
  categories: MarketplaceCategory[];
  featuredId: number | null;
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const lookup = useMemo(() => {
    const map = new Map<number, { pkg: MarketplacePackage; category: MarketplaceCategory }>();

    for (const category of categories) {
      for (const pkg of category.packages) {
        map.set(pkg.id, { pkg, category });
      }
    }

    return map;
  }, [categories]);

  const openItem = useCallback(
    (id: number) => {
      if (!lookup.has(id)) {
        return;
      }

      setOpenId(id);
      window.history.replaceState(null, "", `#item-${id}`);
    },
    [lookup],
  );

  const close = useCallback(() => {
    setOpenId(null);

    if (ITEM_HASH.test(window.location.hash)) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // Opened from a shared link (on load, or when only the #item-… changes)
  useEffect(() => {
    const sync = () => {
      const match = ITEM_HASH.exec(window.location.hash);
      const id = match ? Number(match[1]) : null;

      setOpenId(id !== null && lookup.has(id) ? id : null);
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [lookup]);

  const value = useMemo(() => ({ openItem, featuredId }), [openItem, featuredId]);
  const entry = openId !== null ? lookup.get(openId) : undefined;

  return (
    <ItemDetailsContext.Provider value={value}>
      {children}
      {entry ? (
        <DetailsLayer onClose={close}>
          <DetailsContent
            key={entry.pkg.id}
            pkg={entry.pkg}
            category={entry.category}
            featured={entry.pkg.id === featuredId}
            onOpen={openItem}
          />
        </DetailsLayer>
      ) : null}
    </ItemDetailsContext.Provider>
  );
}

/* Price as on Tebex: the sale price, with the old price struck through. */
export function Price({ pkg, large = false }: { pkg: MarketplacePackage; large?: boolean }) {
  const onSale = pkg.basePrice > pkg.price;

  return (
    <p className={`${styles.price} ${large ? styles.priceLarge : ""}`.trim()}>
      {onSale ? <s>{formatPrice(pkg.basePrice, pkg.currency)}</s> : null}
      <span>{formatPrice(pkg.price, pkg.currency)}</span>
    </p>
  );
}

/*
 * A Tebex description as blocks: paragraphs, and "• " lines (Tebex list
 * items, see tebex.ts) grouped into lists.
 */
export function descriptionBlocks(text: string) {
  const blocks: (string | string[])[] = [];

  for (const line of text.split("\n").map((value) => value.trim()).filter(Boolean)) {
    if (line.startsWith("• ")) {
      const last = blocks[blocks.length - 1];

      if (Array.isArray(last)) {
        last.push(line.slice(2));
      } else {
        blocks.push([line.slice(2)]);
      }
    } else {
      blocks.push(line);
    }
  }

  return blocks;
}

function Description({ text }: { text: string }) {
  const blocks = descriptionBlocks(text);

  if (!blocks.length) {
    return null;
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

const CloseContext = createContext<() => void>(() => {});

/* Backdrop, Esc, scroll lock and focus, kept while switching items. */
function DetailsLayer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const key = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const scroll = document.body.style.overflow;

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
      <CloseContext.Provider value={onClose}>{children}</CloseContext.Provider>
    </div>,
    document.body,
  );
}

function DetailsContent({
  pkg,
  category,
  featured,
  onOpen,
}: {
  pkg: MarketplacePackage;
  category: MarketplaceCategory;
  featured: boolean;
  onOpen(id: number): void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const onSale = pkg.basePrice > pkg.price;
  const titleId = `item-${pkg.id}-title`;
  const more = category.packages.filter((other) => other.id !== pkg.id).slice(0, 3);

  // Focus the pop-up itself (not the X, which would show it raised as if
  // hovered), so Tab moves on from here and screen readers read it
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <section
      ref={dialogRef}
      tabIndex={-1}
      className={`${styles.detail} ${featured ? styles.detailFeatured : ""}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <CloseButton />

      <div className={styles.detailMedia}>
        <img src={pkg.image || mineacleIcons.crate} alt="" />
        {onSale ? <span className={styles.sale}>Sale</span> : null}
        {featured ? <span className={styles.featuredTag}>Featured</span> : null}
      </div>

      <div className={styles.detailBody}>
        <h2 id={titleId}>{pkg.name}</h2>
        {pkg.description ? <Description text={pkg.description} /> : null}

        {more.length ? (
          <div className={styles.more}>
            <h3>More from {category.name}</h3>
            <ul>
              {more.map((other) => (
                <li key={other.id}>
                  <button type="button" onClick={() => onOpen(other.id)}>
                    <img src={other.image || mineacleIcons.crate} alt="" />
                    <span>{other.name}</span>
                    <small>{formatPrice(other.price, other.currency)}</small>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <footer className={styles.detailFooter}>
        <Price pkg={pkg} large />
        <AddToCartButton pkg={pkg} tone={featured ? "gold" : "primary"} />
      </footer>
    </section>
  );
}

function CloseButton() {
  const close = useContext(CloseContext);

  return (
    <button
      type="button"
      className={`${block.button} ${block.square} ${styles.detailClose}`}
      onClick={close}
      aria-label="Close"
    >
      <img src={mineacleIcons.close} alt="" />
    </button>
  );
}
