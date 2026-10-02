"use client";

import { useState, type FormEvent } from "react";
import block from "@/components/site/BlockButton.module.css";
import styles from "./AccountSettings.module.css";

type Message = { tone: "ok" | "error"; text: string } | null;

/* Change password card on /profile. Changing it logs out every other
   browser (the server revokes their sessions). */
export function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  async function changePassword(event: FormEvent) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({ tone: "error", text: "New passwords don't match" });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage({ tone: "error", text: data.error || "Unable to change password" });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ tone: "ok", text: "Password changed. Other browsers were logged out." });
    } catch {
      setMessage({ tone: "error", text: "Unable to connect to Mineacle" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="account-password">
      <h2 id="account-password">Change password</h2>
      <p className={styles.cardText}>At least 10 characters. Other browsers will be logged out.</p>

      <form className={styles.form} onSubmit={changePassword}>
        <label className={styles.field}>
          <span>Current password</span>
          <input
            autoComplete="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>New password</span>
          <input
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span>Confirm new password</span>
          <input
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>

        {message ? (
          <p className={styles.message} data-tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>
            {message.text}
          </p>
        ) : null}

        <button className={`${block.button} ${block.primary}`} disabled={busy} type="submit">
          {busy ? "Updating..." : "Change password"}
        </button>
      </form>
    </section>
  );
}

/* Active sessions card on /profile, with "Log out everywhere". */
export function SessionsCard({ sessionCount }: { sessionCount: number }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function revokeSessions() {
    if (busy) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/account/sessions/revoke", {
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setMessage(data.error || "Unable to log out everywhere");
        return;
      }

      window.location.replace("/login");
    } catch {
      setMessage("Unable to connect to Mineacle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="account-sessions">
      <h2 id="account-sessions">Sessions</h2>
      <p className={styles.cardText}>
        You&apos;re logged in on <b>{sessionCount}</b> browser{sessionCount === 1 ? "" : "s"}.
        Lost a device or used a shared computer? Log out of all of them,
        including this one.
      </p>

      {message ? (
        <p className={styles.message} data-tone="error" role="alert">
          {message}
        </p>
      ) : null}

      <button
        className={`${block.button} ${block.danger}`}
        disabled={busy}
        onClick={revokeSessions}
        type="button"
      >
        {busy ? "Logging out..." : "Log out everywhere"}
      </button>
    </section>
  );
}
