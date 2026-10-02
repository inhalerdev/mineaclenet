"use client";

import { useState } from "react";

/*
 * Opens Tebex checkout for a list of items: asks our server for a Tebex
 * basket (api/marketplace/checkout), then shows Tebex.js checkout over the
 * page. Tebex.js loads on the first checkout. On phones Tebex opens
 * checkout in a new tab instead of over the page.
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
let onComplete: (() => void) | null = null;
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

export type CheckoutItem = { packageId: number; quantity: number };

export function useTebexCheckout(completed?: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function checkout(items: CheckoutItem[]) {
    setBusy(true);
    setError("");

    try {
      const [tebex, response] = await Promise.all([
        loadTebex(),
        fetch("/api/marketplace/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        }),
      ]);
      const result = (await response.json().catch(() => ({}))) as {
        ident?: string;
        error?: string;
      };

      if (!response.ok || !result.ident) {
        throw new Error(result.error || "Checkout is unavailable right now");
      }

      tebex.init({
        ident: result.ident,
        theme: "dark",
        colors: [
          { name: "primary", color: "#B078FF" },
          { name: "secondary", color: "#D0AFFF" },
        ],
      });
      onComplete = completed ?? null;

      if (!completeListener) {
        completeListener = true;
        tebex.on("payment:complete", () => {
          onComplete?.();
          window.location.assign("/marketplace?purchased=1");
        });
      }

      tebex.launch();
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

  return { checkout, busy, error };
}
