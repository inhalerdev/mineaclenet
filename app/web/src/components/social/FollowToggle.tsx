"use client";

import { useState } from "react";

export function FollowToggle({
  uuid,
  username,
  initialFollowing,
}: {
  uuid: string;
  username: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggle() {
    if (busy) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/follows", {
        method: following ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          following ? { uuid } : { username },
        ),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error || "Unable to update following");
        return;
      }

      setFollowing((value) => !value);
    } catch {
      setMessage("Unable to connect to Mineacle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="follow-toggle">
      <button
        className={following ? "is-following" : ""}
        disabled={busy}
        onClick={toggle}
        type="button"
      >
        {busy ? "Updating..." : following ? "Following" : "Follow"}
      </button>
      {message ? <small>{message}</small> : null}
    </div>
  );
}
