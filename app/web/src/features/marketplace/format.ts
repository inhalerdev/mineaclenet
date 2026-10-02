/* Prices as Tebex sends them, e.g. 8 USD → "$8.00". Used on the server
   (item cards) and in the browser (cart). */
export function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
