"use client";

import { useState, type FormEvent } from "react";

export function AccountSecurity({
  sessionCount,
}: {
  sessionCount: number;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"password" | "sessions" | "">("");

  async function changePassword(event: FormEvent) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match");
      return;
    }

    setBusy("password");
    setMessage("");

    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error || "Unable to change password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed. Other sessions were revoked");
    } catch {
      setMessage("Unable to connect to Mineacle");
    } finally {
      setBusy("");
    }
  }

  async function revokeSessions() {
    if (busy) {
      return;
    }

    setBusy("sessions");
    setMessage("");

    try {
      const response = await fetch("/api/account/sessions/revoke", {
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setMessage(data.error || "Unable to revoke sessions");
        return;
      }

      window.location.replace("/login");
    } catch {
      setMessage("Unable to connect to Mineacle");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="account-security">
      <div className="account-security__section">
        <small>SECURITY</small>
        <h2>Change password</h2>

        <form onSubmit={changePassword}>
          <label>
            Current password
            <input
              autoComplete="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>

          <label>
            New password
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

          <label>
            Confirm new password
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

          <button disabled={Boolean(busy)} type="submit">
            {busy === "password" ? "Updating..." : "Change password"}
          </button>
        </form>
      </div>

      <div className="account-security__section">
        <small>SESSIONS</small>
        <h2>{sessionCount} active session{sessionCount === 1 ? "" : "s"}</h2>
        <p>
          Revoke every browser session for this account, including this one.
        </p>
        <button
          className="is-secondary"
          disabled={Boolean(busy)}
          onClick={revokeSessions}
          type="button"
        >
          {busy === "sessions" ? "Revoking..." : "Log out everywhere"}
        </button>
      </div>

      {message ? <p className="account-security__message">{message}</p> : null}
    </section>
  );
}
