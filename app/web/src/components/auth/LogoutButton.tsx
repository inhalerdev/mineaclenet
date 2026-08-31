"use client";

import { useState } from "react";

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
      className={`profile-logout ${className}`.trim()}
      disabled={busy}
      onClick={logout}
      type="button"
    >
      {busy ? "Logging out..." : "Log out"}
    </button>
  );
}
