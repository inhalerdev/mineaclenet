"use client";

import { useState } from "react";
import block from "@/components/site/BlockButton.module.css";

/* Red "Log out" block button: ends this browser's session, then goes home. */
export function LogoutButton({
  className = "",
}: {
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      window.location.replace("/");
    }
  }

  return (
    <button
      className={`${block.button} ${block.danger} ${className}`.trim()}
      disabled={busy}
      onClick={logout}
      type="button"
    >
      {busy ? "Logging out..." : "Log out"}
    </button>
  );
}
