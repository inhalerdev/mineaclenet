"use client";

import { useState } from "react";

type PlayButtonProps = {
  address: string;
  className?: string;
  compact?: boolean;
};

export function PlayButton({ address, className = "", compact = false }: PlayButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className={`cta-button ${compact ? "cta-button--compact" : ""} ${className}`.trim()}
      onClick={copyAddress}
      type="button"
    >
      <span className="cta-button__dot" aria-hidden="true" />
      {copied ? "IP Copied" : "Play Mineacle"}
    </button>
  );
}
