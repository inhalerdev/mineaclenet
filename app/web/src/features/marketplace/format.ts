import type { BillingPeriod } from "./tebex";

/* Prices as Tebex sends them, e.g. 8 USD → "$8.00". Used on the server
   and in the browser (cards, cart). */
export function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/* A price to show on the page: "Free" when Tebex lists it at 0. */
export function priceText(value: number, currency: string) {
  return value === 0 ? "Free" : formatPrice(value, currency);
}

/* A subscription's renewal from Tebex's expiry period: "/ month",
   "/ 3 months"; empty for one-off packages. */
export function periodText(period: BillingPeriod | null) {
  if (!period) {
    return "";
  }

  return period.count === 1 ? `/ ${period.unit}` : `/ ${period.count} ${period.unit}s`;
}

/* Tebex's free trial on a subscription: "3-day free trial". */
export function trialText(days: number) {
  return days > 0 ? `${days}-day free trial` : "";
}
