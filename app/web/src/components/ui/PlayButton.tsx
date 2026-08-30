"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

type PlayButtonProps = {
  address: string;
  className?: string;
  compact?: boolean;
};

export function PlayButton({
  address,
  className = "",
  compact = false,
}: PlayButtonProps) {
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

  const playIconStyle: CSSProperties = {
    WebkitMaskImage:
      'url("/shared/icons/streamline/core-solid/play.svg")',
    maskImage:
      'url("/shared/icons/streamline/core-solid/play.svg")',
  };

  return (
    <button
      className={`cta-button ${
        compact ? "cta-button--compact" : ""
      } ${className}`.trim()}
      onClick={copyAddress}
      type="button"
    >
      <span
        className="cta-button__icon"
        style={playIconStyle}
        aria-hidden="true"
      />

      <span className="cta-button__copy">
        <span className="cta-button__label">Join Mineacle</span>
        <span className="cta-button__address">
          {copied ? "IP copied — open Minecraft" : `${address} · copy IP`}
        </span>
      </span>
    </button>
  );
}
