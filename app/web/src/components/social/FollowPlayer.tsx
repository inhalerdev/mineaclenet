"use client";

import { useState, type FormEvent } from "react";

export function FollowPlayer() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = (await response.json()) as {
        error?: string;
        player?: { username: string };
      };

      if (!response.ok) {
        setMessage(data.error || "Unable to follow that player");
        return;
      }

      setMessage(`Following ${data.player?.username || username}`);
      setUsername("");
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      setMessage("Unable to connect to Mineacle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="follow-form" onSubmit={submit}>
      <input
        placeholder="Minecraft username"
        maxLength={16}
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        required
      />
      <button disabled={busy} type="submit">
        {busy ? "Adding..." : "Follow player"}
      </button>
      {message ? <span>{message}</span> : null}
    </form>
  );
}
