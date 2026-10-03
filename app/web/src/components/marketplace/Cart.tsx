"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import block from "@/components/site/BlockButton.module.css";
import { formatPrice } from "@/features/marketplace/format";
import type { MarketplacePackage } from "@/features/marketplace/tebex";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { withReturnPath } from "@/shared/navigation/return-path";
import styles from "./MarketplacePage.module.css";
import { useTebexCheckout } from "./useTebexCheckout";

/*
 * Marketplace cart: kept in this browser (localStorage), checked out as one
 * Tebex basket. Limits match the server (api/marketplace/checkout):
 * 10 different items, 10 of each; Tebex "disable quantity" packages, 1.
 *
 *   <CartProvider packages={...} loggedIn featuredId>   around the page
 *   <AddToCartButton pkg={...} />            on each item card
 *   <CartButton />                           opens the cart panel
 *
 * The cart also offers the featured package (Mineacle+) when it isn't in
 * the cart yet, and on phones a bar along the bottom shows the cart's
 * count and total once something is in it.
 */

const STORAGE_KEY = "mineacle-marketplace-cart";
const MAX_LINES = 10;
const MAX_QUANTITY = 10;

type Lines = Record<number, number>;

type CartContextValue = {
  lines: Lines;
  packages: Map<number, MarketplacePackage>;
  loggedIn: boolean;
  featuredId: number | null;
  count: number;
  open: boolean;
  setOpen(open: boolean): void;
  add(pkg: MarketplacePackage): void;
  setQuantity(id: number, quantity: number): void;
  clear(): void;
};

const CartContext = createContext<CartContextValue | null>(null);

function useCart() {
  const cart = useContext(CartContext);

  if (!cart) {
    throw new Error("useCart outside CartProvider");
  }

  return cart;
}

function maxFor(pkg: MarketplacePackage | undefined) {
  return pkg?.single ? 1 : MAX_QUANTITY;
}

function readStored(): Lines {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Lines) : {};
  } catch {
    return {};
  }
}

export function CartProvider({
  packages: list,
  loggedIn,
  featuredId = null,
  children,
}: {
  packages: MarketplacePackage[];
  loggedIn: boolean;
  featuredId?: number | null;
  children: ReactNode;
}) {
  const packages = useMemo(() => new Map(list.map((pkg) => [pkg.id, pkg])), [list]);
  const [lines, setLines] = useState<Lines>({});
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  // Restore the saved cart, dropping items the store no longer sells
  useEffect(() => {
    const stored = readStored();
    const kept: Lines = {};

    for (const [id, quantity] of Object.entries(stored)) {
      const pkg = packages.get(Number(id));
      const amount = Math.floor(Number(quantity));

      if (pkg && amount > 0) {
        kept[pkg.id] = Math.min(amount, maxFor(pkg));
      }
    }

    setLines(kept);
    setLoaded(true);
  }, [packages]);

  useEffect(() => {
    if (!loaded) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // Private window or storage blocked: the cart lasts until the page closes
    }
  }, [lines, loaded]);

  const add = useCallback(
    (pkg: MarketplacePackage) => {
      setLines((current) => {
        if (!(pkg.id in current) && Object.keys(current).length >= MAX_LINES) {
          return current;
        }

        return { ...current, [pkg.id]: Math.min((current[pkg.id] ?? 0) + 1, maxFor(pkg)) };
      });
    },
    [],
  );

  const setQuantity = useCallback(
    (id: number, quantity: number) => {
      setLines((current) => {
        const next = { ...current };

        if (quantity <= 0) {
          delete next[id];
        } else {
          next[id] = Math.min(quantity, maxFor(packages.get(id)));
        }

        return next;
      });
    },
    [packages],
  );

  const clear = useCallback(() => setLines({}), []);
  const count = Object.values(lines).reduce((sum, quantity) => sum + quantity, 0);

  return (
    <CartContext.Provider
      value={{ lines, packages, loggedIn, featuredId, count, open, setOpen, add, setQuantity, clear }}
    >
      {children}
      <CartBar />
      <CartPanel />
    </CartContext.Provider>
  );
}

/* "Add to cart" on an item card; turns into "In cart (2)" once added. */
export function AddToCartButton({
  pkg,
  tone = "primary",
}: {
  pkg: MarketplacePackage;
  tone?: "primary" | "gold";
}) {
  const { lines, add, setOpen } = useCart();
  const inCart = lines[pkg.id] ?? 0;
  const full = inCart >= maxFor(pkg);

  return (
    <button
      type="button"
      className={`${block.button} ${block[tone]} ${styles.buyButton}`}
      onClick={() => (full ? setOpen(true) : add(pkg))}
      aria-label={full ? `${pkg.name} is in your cart, view cart` : `Add ${pkg.name} to cart`}
    >
      <img className={styles.buttonIcon} src={mineacleIcons.cart} alt="" />
      {inCart ? (full ? `In cart (${inCart})` : `Add another (${inCart})`) : "Add to cart"}
    </button>
  );
}

/* Cart button with the number of items; opens the cart panel. */
export function CartButton() {
  const { count, setOpen } = useCart();

  return (
    <button
      type="button"
      className={`${block.button} ${styles.cartButton}`}
      onClick={() => setOpen(true)}
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <span className={styles.cartIcon}>
        <img src={mineacleIcons.cart} alt="" />
        {count ? (
          // Keyed by the count so it pops each time something is added
          <span key={count} className={styles.cartCount} aria-hidden="true">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </span>
      Cart
    </button>
  );
}

/* The featured package, offered in the cart until it's in it. */
function CartOffer({ featured }: { featured: MarketplacePackage | undefined }) {
  const { lines, add } = useCart();

  if (!featured || lines[featured.id]) {
    return null;
  }

  const onSale = featured.basePrice > featured.price;

  return (
    <section className={styles.cartOffer} aria-label={`Add ${featured.name}`}>
      <span className={styles.featuredTag}>Featured</span>
      <div className={styles.cartOfferRow}>
        <img src={featured.image || mineacleIcons.crate} alt="" />
        <div>
          <strong>{featured.name}</strong>
          <span>
            {onSale ? <s>{formatPrice(featured.basePrice, featured.currency)}</s> : null}{" "}
            {formatPrice(featured.price, featured.currency)}
          </span>
        </div>
        <button
          type="button"
          className={`${block.button} ${block.gold} ${styles.cartOfferAdd}`}
          onClick={() => add(featured)}
          aria-label={`Add ${featured.name} to cart`}
        >
          Add
        </button>
      </div>
    </section>
  );
}

/* Phones: a bar along the bottom with the cart's count and total. */
function CartBar() {
  const { lines, packages, count, open, setOpen } = useCart();

  if (!count || open) {
    return null;
  }

  let total = 0;
  let currency = "USD";

  for (const [id, quantity] of Object.entries(lines)) {
    const pkg = packages.get(Number(id));

    if (pkg) {
      total += pkg.price * quantity;
      currency = pkg.currency;
    }
  }

  return (
    <div className={styles.cartBar}>
      <span className={styles.cartIcon}>
        <img src={mineacleIcons.cart} alt="" />
        <span key={count} className={styles.cartCount} aria-hidden="true">
          {count > 99 ? "99+" : count}
        </span>
      </span>
      <p>
        <span>
          {count} item{count === 1 ? "" : "s"}
        </span>
        <strong>{formatPrice(total, currency)}</strong>
      </p>
      <button
        type="button"
        className={`${block.button} ${block.green}`}
        onClick={() => setOpen(true)}
      >
        View cart
      </button>
    </div>
  );
}

function CartPanel() {
  const { open, setOpen } = useCart();

  useEffect(() => {
    if (!open) {
      return;
    }

    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open, setOpen]);

  if (!open) {
    return null;
  }

  // On <body>, so it covers the site header too (the page area stacks below it)
  return createPortal(<CartPanelContent />, document.body);
}

function CartPanelContent() {
  const { lines, packages, loggedIn, featuredId, setOpen, setQuantity, clear } = useCart();
  const { checkout, busy, error } = useTebexCheckout(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing saved
    }
  });
  const items = Object.entries(lines)
    .map(([id, quantity]) => ({ pkg: packages.get(Number(id)), quantity }))
    .filter((item): item is { pkg: MarketplacePackage; quantity: number } => Boolean(item.pkg));
  const currency = items[0]?.pkg.currency ?? "USD";
  const total = items.reduce((sum, item) => sum + item.pkg.price * item.quantity, 0);

  return (
    <div className={styles.cartLayer}>
      <button
        type="button"
        className={styles.cartBackdrop}
        aria-label="Close cart"
        onClick={() => setOpen(false)}
      />
      <section className={styles.cartPanel} role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <header className={styles.cartHeader}>
          <h2 id="cart-title">
            <img className={styles.buttonIcon} src={mineacleIcons.cart} alt="" />
            Your cart
          </h2>
          <button
            type="button"
            className={`${block.button} ${block.square} ${styles.cartClose}`}
            onClick={() => setOpen(false)}
            aria-label="Close cart"
          >
            <img src={mineacleIcons.close} alt="" />
          </button>
        </header>

        <div className={styles.cartBody}>
        {items.length === 0 ? (
          <p className={styles.cartEmpty}>Your cart is empty. Add something from the marketplace.</p>
        ) : (
          <ul className={styles.cartLines}>
            {items.map(({ pkg, quantity }) => (
              <li key={pkg.id} className={styles.cartLine}>
                <img src={pkg.image || mineacleIcons.crate} alt="" />
                <div>
                  <strong>{pkg.name}</strong>
                  <span>{formatPrice(pkg.price * quantity, pkg.currency)}</span>
                </div>
                <div className={styles.quantity}>
                  <button
                    type="button"
                    className={`${block.button} ${block.square} ${styles.quantityButton}`}
                    onClick={() => setQuantity(pkg.id, quantity - 1)}
                    aria-label={quantity === 1 ? `Remove ${pkg.name}` : `One less ${pkg.name}`}
                  >
                    −
                  </button>
                  <span aria-label="Quantity">{quantity}</span>
                  <button
                    type="button"
                    className={`${block.button} ${block.square} ${styles.quantityButton}`}
                    onClick={() => setQuantity(pkg.id, quantity + 1)}
                    disabled={quantity >= maxFor(pkg)}
                    aria-label={`One more ${pkg.name}`}
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <CartOffer featured={featuredId !== null ? packages.get(featuredId) : undefined} />
        </div>

        {items.length ? (
          <footer className={styles.cartFooter}>
            <p className={styles.cartTotal}>
              <span>Total</span>
              <strong>{formatPrice(total, currency)}</strong>
            </p>
            {loggedIn ? (
              <button
                type="button"
                className={`${block.button} ${block.green} ${styles.buyButton}`}
                onClick={() =>
                  checkout(items.map(({ pkg, quantity }) => ({ packageId: pkg.id, quantity })))
                }
                disabled={busy}
              >
                {busy ? "Opening checkout…" : "Checkout"}
              </button>
            ) : (
              <a
                className={`${block.button} ${block.green} ${styles.buyButton}`}
                href={withReturnPath("/login", "/marketplace")}
              >
                Log in to check out
              </a>
            )}
            {error ? (
              <p className={styles.buyError} role="alert">
                {error}
              </p>
            ) : null}
            <p className={styles.cartLegal}>
              Payments are handled by Tebex, our official reseller. By checking out you
              agree to our <a href="/terms">Terms</a> and{" "}
              <a href="/refunds">Refund Policy</a>.
            </p>
            <button type="button" className={styles.cartClear} onClick={clear}>
              Empty cart
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
