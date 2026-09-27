"use client";

import { useState, type FormEvent } from "react";
import block from "@/components/site/BlockButton.module.css";
import styles from "./FollowPlayer.module.css";

/* "Follow a player by name" box on /following. Reloads the page after a
   successful follow so the list shows the new player. */
export function FollowPlayer() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

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
        setMessage({ tone: "error", text: data.error || "Unable to follow that player" });
        return;
      }

      setMessage({ tone: "ok", text: `Following ${data.player?.username || username}` });
      setUsername("");
      window.setTimeout(() => window.location.reload(), 350);
    } catch {
      setMessage({ tone: "error", text: "Unable to connect to Mineacle" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>
        <span className={styles.srOnly}>Minecraft username</span>
        <input
          placeholder="Follow a player by username"
          maxLength={16}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          required
        />
      </label>
      <button className={`${block.button} ${block.primary}`} disabled={busy} type="submit">
        {busy ? "Adding..." : "Follow"}
      </button>
      {message ? (
        <p
          className={styles.message}
          data-tone={message.tone}
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
