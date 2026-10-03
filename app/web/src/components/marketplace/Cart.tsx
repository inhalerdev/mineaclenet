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
import { formatPrice, periodText, priceText } from "@/features/marketplace/format";
import type { MarketplacePackage } from "@/features/marketplace/tebex";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { withReturnPath } from "@/shared/navigation/return-path";
import { Tag } from "./bits";
import { MarketImage } from "./Enchanted";
import styles from "./MarketplacePage.module.css";
import { useTebexCheckout } from "./useTebexCheckout";

/*
 * Marketplace cart: kept in this browser (localStorage), checked out as one
 * Tebex basket. Limits match the server (api/marketplace/checkout):
 * 10 different items, 10 of each; Tebex "disable quantity" packages and
 * subscriptions, 1.
 *
 *   <CartProvider packages={...} loggedIn featuredId>   around the page
 *   <AddToCartButton pkg={...} />            on each item card
 *   <GetButton pkg={...} />                  adds and opens the cart (hero)
 *   <CartButton />                           opens the cart panel
 *   <CartSummary />                          count, total and Checkout (sidebar)
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
  return pkg?.single || pkg?.subscription ? 1 : MAX_QUANTITY;
}

/* The cart's lines with their packages, and the total. */
function useCartTotals() {
  const { lines, packages } = useCart();
  const items = Object.entries(lines)
    .map(([id, quantity]) => ({ pkg: packages.get(Number(id)), quantity }))
    .filter((item): item is { pkg: MarketplacePackage; quantity: number } => Boolean(item.pkg));
  const currency = items[0]?.pkg.currency ?? "USD";
  const total = items.reduce((sum, item) => sum + item.pkg.price * item.quantity, 0);

  return { items, currency, total };
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

/*
 * "Add to cart" on an item; turns into "Add another (1)", and "In cart" once
 * no more fit (which opens the cart).
 */
export function AddToCartButton({
  pkg,
  tone = "primary",
  className,
}: {
  pkg: MarketplacePackage;
  tone?: "primary" | "gold";
  className?: string;
}) {
  const { lines, add, setOpen } = useCart();
  const inCart = lines[pkg.id] ?? 0;
  const max = maxFor(pkg);
  const full = inCart >= max;
  const label = !inCart
    ? "Add to cart"
    : full
      ? max === 1 ? "In cart" : `In cart (${inCart})`
      : `Add another (${inCart})`;

  return (
    <button
      type="button"
      className={`${block.button} ${block[tone]} ${styles.buyButton} ${className ?? ""}`.trim()}
      data-tone={tone}
      onClick={() => (full ? setOpen(true) : add(pkg))}
      aria-label={full ? `${pkg.name} is in your cart, view cart` : `Add ${pkg.name} to cart`}
    >
      <img className={styles.buttonIcon} src={mineacleIcons.cart} alt="" />
      {label}
    </button>
  );
}

/* The hero's button: "Get Mineacle+" adds it and opens the cart. */
export function GetButton({ pkg, className }: { pkg: MarketplacePackage; className?: string }) {
  const { lines, add, setOpen } = useCart();
  const inCart = Boolean(lines[pkg.id]);

  return (
    <button
      type="button"
      className={`${block.button} ${block.gold} ${styles.buyButton} ${className ?? ""}`.trim()}
      data-tone="gold"
      onClick={() => {
        if (!inCart) {
          add(pkg);
        }
        setOpen(true);
      }}
    >
      <img className={styles.buttonIcon} src={mineacleIcons.cart} alt="" />
      {inCart ? "In cart · Check out" : `Get ${pkg.name}`}
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
  const period = periodText(featured.period);

  return (
    <section className={styles.cartOffer} aria-label={`Add ${featured.name}`}>
      <span className={styles.cartOfferTag}>
        <Tag tone="featured">Featured</Tag>
      </span>
      <div className={styles.cartOfferRow}>
        <MarketImage src={featured.image} width={44} eager className={styles.cartThumb} />
        <div>
          <strong>{featured.name}</strong>
          <span>
            {onSale ? <s>{formatPrice(featured.basePrice, featured.currency)}</s> : null}{" "}
            {priceText(featured.price, featured.currency)}
            {period ? <small> {period}</small> : null}
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
  const { count, open, setOpen } = useCart();
  const { total, currency } = useCartTotals();

  if (!count || open) {
    return null;
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

/* Desktop sidebar: what's in the cart, the total and Checkout. */
export function CartSummary() {
  const { count, setOpen } = useCart();
  const { items, total, currency } = useCartTotals();

  return (
    <section className={styles.summary} aria-labelledby="cart-summary-title">
      <h2 id="cart-summary-title">
        <img className={styles.buttonIcon} src={mineacleIcons.cart} alt="" />
        Your cart
        {count ? (
          <span key={count} className={styles.summaryCount}>
            {count}
          </span>
        ) : null}
      </h2>
      {items.length ? (
        <>
          <ul>
            {items.slice(0, 4).map(({ pkg, quantity }) => (
              <li key={pkg.id}>
                <span>{pkg.name}</span>
                <small>{quantity > 1 ? `×${quantity}` : priceText(pkg.price, pkg.currency)}</small>
              </li>
            ))}
            {items.length > 4 ? <li className={styles.summaryMore}>+{items.length - 4} more</li> : null}
          </ul>
          <p className={styles.summaryTotal}>
            <span>Total</span>
            <strong>{formatPrice(total, currency)}</strong>
          </p>
          <button
            type="button"
            className={`${block.button} ${block.green} ${styles.buyButton}`}
            onClick={() => setOpen(true)}
          >
            Check out
          </button>
        </>
      ) : (
        <p className={styles.summaryEmpty}>Nothing here yet.</p>
      )}
    </section>
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
  const { packages, loggedIn, featuredId, setOpen, setQuantity, clear } = useCart();
  const { checkout, busy, error } = useTebexCheckout(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing saved
    }
  });
  const { items, currency, total } = useCartTotals();

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
                <MarketImage src={pkg.image} width={44} eager className={styles.cartThumb} />
                <div>
                  <strong>{pkg.name}</strong>
                  <span>
                    {priceText(pkg.price * quantity, pkg.currency)}
                    {pkg.period ? <small> {periodText(pkg.period)}</small> : null}
                  </span>
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
