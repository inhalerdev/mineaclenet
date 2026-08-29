"use client";

import { useState } from "react";

export function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className="server-address"
      onClick={copyAddress}
      type="button"
      aria-label={`Copy server IP ${address}`}
    >
      <span className="server-address__copy">
        <small>Server IP</small>
        <strong>{copied ? "Copied" : address}</strong>
      </span>
      <span className="server-address__icon" aria-hidden="true" />
    </button>
  );
}
