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
 *   <CartProvider packages={...} loggedIn>   around the page
 *   <AddToCartButton pkg={...} />            on each item card
 *   <CartButton />                           opens the cart panel
 */

const STORAGE_KEY = "mineacle-marketplace-cart";
const MAX_LINES = 10;
const MAX_QUANTITY = 10;

type Lines = Record<number, number>;

type CartContextValue = {
  lines: Lines;
  packages: Map<number, MarketplacePackage>;
  loggedIn: boolean;
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
  children,
}: {
  packages: MarketplacePackage[];
  loggedIn: boolean;
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
      value={{ lines, packages, loggedIn, count, open, setOpen, add, setQuantity, clear }}
    >
      {children}
      <CartPanel />
    </CartContext.Provider>
  );
}

/* "Add to cart" on an item card; turns into "In cart (2)" once added. */
export function AddToCartButton({ pkg }: { pkg: MarketplacePackage }) {
  const { lines, add, setOpen } = useCart();
  const inCart = lines[pkg.id] ?? 0;
  const full = inCart >= maxFor(pkg);

  return (
    <button
      type="button"
      className={`${block.button} ${block.primary} ${styles.buyButton}`}
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
          <span className={styles.cartCount} aria-hidden="true">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </span>
      Cart
    </button>
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
  const { lines, packages, loggedIn, setOpen, setQuantity, clear } = useCart();
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
