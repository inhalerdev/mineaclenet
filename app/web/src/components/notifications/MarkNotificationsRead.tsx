"use client";

import { useState } from "react";
import block from "@/components/site/BlockButton.module.css";

/* "Mark all read" button on /notifications. Reloads the page when done so
   the list and the header bell update together. */
export function MarkNotificationsRead({
  hasUnread,
}: {
  hasUnread: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function markRead() {
    setBusy(true);
    setFailed(false);

    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
      });

      if (response.ok) {
        window.location.reload();
        return;
      }

      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (!hasUnread) {
    return null;
  }

  return (
    <button
      className={block.button}
      disabled={busy}
      onClick={markRead}
      type="button"
    >
      {busy ? "Updating..." : failed ? "Try again" : "Mark all read"}
    </button>
  );
}
