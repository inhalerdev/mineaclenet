import { memoryCache } from "@/shared/server/memory-cache";
import { UserFacingError } from "@/shared/server/user-error";

/*
 * Tebex Headless API, server side only.
 *
 *   https://docs.tebex.io/developers/headless-api/introduction
 *
 * TEBEX_PUBLIC_TOKEN lists the store and creates baskets.
 * TEBEX_PRIVATE_KEY (optional, server env only) lets basket creation pass
 * the player's IP address: Tebex only accepts ip_address with the key
 * (HTTP Basic auth). Without it the basket is tied to the web server's IP,
 * which still works but weakens Tebex's fraud and region checks. The key
 * never leaves this file: nothing here is sent to browsers.
 *
 * Checkout flow: the page lists categories and packages from Tebex (kept in
 * memory for a minute). Checkout creates a basket for the logged-in
 * player's Minecraft name, adds the cart's packages and returns the basket
 * ident; the browser opens Tebex.js checkout with it (useTebexCheckout.ts).
 * Tebex's plugin on the game server then runs the packages' commands.
 */

const API = "https://headless.tebex.io/api";

export type MarketplacePackage = {
  id: number;
  name: string;
  /** Plain text (Tebex descriptions are HTML; tags are stripped). */
  description: string;
  image: string | null;
  /** Price the buyer pays, e.g. 8.99. */
  price: number;
  /** Price before a sale, when there is one. */
  basePrice: number;
  currency: string;
  /** Tebex "disable quantity": at most one per checkout. */
  single: boolean;
};

export type MarketplaceCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  packages: MarketplacePackage[];
};

type TebexPackage = {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  base_price?: number;
  total_price?: number;
  discount?: number;
  currency?: string;
  order?: number;
  disable_quantity?: boolean;
};

type TebexCategory = {
  id: number;
  name: string;
  slug?: string | null;
  description?: string | null;
  image_url?: string | null;
  order?: number;
  dynamic?: boolean;
  tiered?: boolean;
  packages?: TebexPackage[] | null;
};

export function tebexConfigured() {
  return Boolean(publicToken());
}

function publicToken() {
  return (process.env.TEBEX_PUBLIC_TOKEN || "").trim();
}

function privateKey() {
  return (process.env.TEBEX_PRIVATE_KEY || "").trim();
}

function basicAuth() {
  return `Basic ${Buffer.from(`${publicToken()}:${privateKey()}`).toString("base64")}`;
}

function accountUrl(path: string) {
  return `${API}/accounts/${encodeURIComponent(publicToken())}${path}`;
}

/* Tebex HTML → readable plain text (no markup from the store reaches the
   page). List items keep a "• " in front, so the item pop-up can show them
   as a list again (PackageCard.tsx). */
function plainText(html: string | null | undefined) {
  return (html || "")
    .replace(/<\s*li(\s[^>]*)?>/gi, "\n• ")
    .replace(/<\s*(br|\/p|\/div|\/li|\/ul|\/ol)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function slugOf(category: TebexCategory) {
  const slug = (category.slug || category.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || String(category.id);
}

async function tebexFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Tebex ${response.status} ${url.replace(publicToken(), "…")}: ${detail.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

async function loadCategories(): Promise<MarketplaceCategory[]> {
  if (!tebexConfigured()) {
    return [];
  }

  const { data } = await tebexFetch<{ data: TebexCategory[] }>(
    accountUrl("/categories?includePackages=1"),
  );

  return (data || [])
    // Dynamic (per-basket) and tiered (subscription) categories need a
    // basket or login to list; this page sells one-off packages.
    .filter((category) => !category.dynamic && !category.tiered)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: slugOf(category),
      description: plainText(category.description),
      image: category.image_url || null,
      packages: (category.packages || [])
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          description: plainText(pkg.description),
          image: pkg.image || null,
          price: Number(pkg.total_price ?? pkg.base_price ?? 0),
          basePrice: Number(pkg.base_price ?? pkg.total_price ?? 0),
          currency: pkg.currency || "USD",
          single: Boolean(pkg.disable_quantity),
        })),
    }))
    .filter((category) => category.packages.length > 0);
}

/** Categories with their packages; a minute old at most. Empty if Tebex is unreachable. */
export const getMarketplaceCategories = memoryCache<MarketplaceCategory[]>(
  60_000,
  loadCategories,
  [],
);

export type CartLine = { packageId: number; quantity: number };

export const MAX_CART_LINES = 10;
export const MAX_LINE_QUANTITY = 10;

/**
 * Creates a Tebex basket for this player with the cart's packages and
 * returns its ident for Tebex.js. Only packages listed on the page can be
 * bought.
 */
export async function createCheckout({
  username,
  uuid,
  lines,
  ipAddress,
}: {
  username: string;
  uuid: string;
  lines: CartLine[];
  ipAddress: string;
}) {
  if (!tebexConfigured()) {
    throw new UserFacingError("The marketplace isn't open yet");
  }

  if (!lines.length) {
    throw new UserFacingError("Your cart is empty");
  }

  const categories = await getMarketplaceCategories();
  const listed = new Map(
    categories.flatMap((category) => category.packages.map((pkg) => [pkg.id, pkg] as const)),
  );

  for (const line of lines) {
    if (!listed.has(line.packageId)) {
      throw new UserFacingError("An item in your cart isn't available anymore");
    }
  }

  const site = (process.env.SITE_URL || "https://mineacle.net").replace(/\/+$/, "");
  const withKey = Boolean(privateKey());
  const { data: basket } = await tebexFetch<{
    data: { ident: string; username_id?: number | string };
  }>(accountUrl("/baskets"), {
    method: "POST",
    headers: withKey ? { Authorization: basicAuth() } : undefined,
    body: JSON.stringify({
      // Minecraft store: the basket belongs to this player's account
      username,
      complete_url: `${site}/marketplace?purchased=1`,
      cancel_url: `${site}/marketplace`,
      complete_auto_redirect: false,
      // The player's address, for Tebex's fraud checks (needs the private key)
      ...(withKey && ipAddress && ipAddress !== "unknown" ? { ip_address: ipAddress } : {}),
      custom: { mineacle_uuid: uuid },
    }),
  });

  for (const line of lines) {
    const single = listed.get(line.packageId)?.single;

    await tebexFetch(
      `${API}/baskets/${encodeURIComponent(basket.ident)}/packages`,
      {
        method: "POST",
        body: JSON.stringify({
          package_id: String(line.packageId),
          quantity: single ? 1 : line.quantity,
          ...(basket.username_id
            ? { variable_data: { username_id: String(basket.username_id) } }
            : {}),
        }),
      },
    );
  }

  return basket.ident;
}
