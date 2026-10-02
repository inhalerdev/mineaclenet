"use client";

import { useState } from "react";
import block from "@/components/site/BlockButton.module.css";
import styles from "./MarketplacePage.module.css";

/*
 * Buy: asks our server for a Tebex basket (api/marketplace/checkout), then
 * opens Tebex.js checkout over the page. Tebex.js loads on the first click.
 * On phones Tebex opens checkout in a new tab instead of over the page.
 */

type TebexCheckout = {
  init(options: {
    ident: string;
    theme?: "light" | "dark" | "auto" | "default";
    colors?: { name: "primary" | "secondary"; color: string }[];
  }): void;
  launch(): void;
  on(event: string, callback: (event?: unknown) => void): void;
};

declare global {
  interface Window {
    Tebex?: { checkout: TebexCheckout };
  }
}

const TEBEX_JS = "https://js.tebex.io/v/1.js";

let tebexLoading: Promise<TebexCheckout> | null = null;
let completeListener = false;

function loadTebex(): Promise<TebexCheckout> {
  if (window.Tebex) {
    return Promise.resolve(window.Tebex.checkout);
  }

  tebexLoading ??= new Promise<TebexCheckout>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TEBEX_JS;
    script.async = true;
    script.onload = () =>
      window.Tebex ? resolve(window.Tebex.checkout) : reject(new Error("Tebex.js missing"));
    script.onerror = () => {
      tebexLoading = null;
      script.remove();
      reject(new Error("Tebex.js failed to load"));
    };
    document.head.appendChild(script);
  });

  return tebexLoading;
}

export function BuyButton({ packageId, label }: { packageId: number; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    setBusy(true);
    setError("");

    try {
      const [checkout, response] = await Promise.all([
        loadTebex(),
        fetch("/api/marketplace/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId }),
        }),
      ]);
      const result = (await response.json().catch(() => ({}))) as {
        ident?: string;
        error?: string;
      };

      if (!response.ok || !result.ident) {
        throw new Error(result.error || "Checkout is unavailable right now");
      }

      checkout.init({
        ident: result.ident,
        theme: "dark",
        colors: [
          { name: "primary", color: "#B078FF" },
          { name: "secondary", color: "#D0AFFF" },
        ],
      });
      if (!completeListener) {
        completeListener = true;
        checkout.on("payment:complete", () => {
          window.location.assign("/marketplace?purchased=1");
        });
      }
      checkout.launch();
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.includes("Tebex.js")
          ? "Checkout couldn't load. Turn off ad blockers for mineacle.net and try again."
          : caught instanceof Error
            ? caught.message
            : "Checkout is unavailable right now",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.buy}>
      <button
        type="button"
        className={`${block.button} ${block.primary} ${styles.buyButton}`}
        onClick={buy}
        disabled={busy}
        aria-label={`Buy ${label}`}
      >
        {busy ? "Opening checkout…" : "Buy"}
      </button>
      {error ? (
        <p className={styles.buyError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
