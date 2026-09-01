"use client";

import { useState } from "react";

export function MarkNotificationsRead({
  hasUnread,
}: {
  hasUnread: boolean;
}) {
  const [visible, setVisible] = useState(hasUnread);
  const [busy, setBusy] = useState(false);

  async function markRead() {
    setBusy(true);

    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
      });

      if (response.ok) {
        setVisible(false);
        window.setTimeout(() => window.location.reload(), 250);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!visible) {
    return null;
  }

  return (
    <button
      className="system-inline-action"
      disabled={busy}
      onClick={markRead}
      type="button"
    >
      {busy ? "Updating..." : "Mark all read"}
    </button>
  );
}
