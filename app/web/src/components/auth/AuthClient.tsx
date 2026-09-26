"use client";

import { useEffect, useState, type FormEvent } from "react";
import block from "@/components/site/BlockButton.module.css";
import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./AuthClient.module.css";

/*
 * Log in / create account panel.
 *
 * Create account runs in three steps:
 *   1. Player:   enter a Java username that has joined Mineacle
 *   2. Verify:   run /verify <code> in game (this page polls until done)
 *   3. Password: set the website password
 *
 * Styled like the homepage menus (game-UI panel, block buttons from
 * site/BlockButton.module.css). Rendered inside the site frame's `.page`.
 */

const SERVER_ADDRESS = "mineacle.net";

type VerifyState = {
  challengeId: string;
  username: string;
  code: string;
  expiresAt: number;
};

export type AuthMode = "login" | "create";

type AuthClientProps = {
  initialMode?: AuthMode;
  onAuthenticated?: () => void | Promise<void>;
};

async function confirmBrowserSession() {
  const response = await fetch("/api/auth/me", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as {
    authenticated?: boolean;
  };

  return data.authenticated === true;
}

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const blockButton = block.button;
const primaryButton = `${block.button} ${block.primary}`;

export function AuthClient({
  initialMode = "login",
  onAuthenticated,
}: AuthClientProps = {}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [step, setStep] = useState<"username" | "verify" | "password">(
    "username",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [verification, setVerification] = useState<VerifyState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [commandCopied, setCommandCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  async function finishAuthentication() {
    if (onAuthenticated) {
      await onAuthenticated();
      return;
    }

    window.location.replace("/");
  }

  // Poll until the player has run /verify in game.
  useEffect(() => {
    if (!verification || step !== "verify") {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(
          `/api/auth/verify/status?challenge=${verification.challengeId}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          verified?: boolean;
          expired?: boolean;
        };

        if (data.expired) {
          setError("That code expired. Generate a new one.");
          setVerification(null);
          setStep("username");
        } else if (data.verified) {
          setError("");
          setStep("password");
        }
      } catch {
        // Poll again.
      }
    }, 1800);

    return () => window.clearInterval(timer);
  }, [verification, step]);

  // Countdown shown next to the verify code.
  useEffect(() => {
    if (step !== "verify") {
      return;
    }

    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [step]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error || "Unable to log in");
        return;
      }

      if (!(await confirmBrowserSession())) {
        setError(
          "Login was accepted, but the browser session was not established",
        );
        return;
      }

      await finishAuthentication();
    } catch {
      setError("Unable to connect to Mineacle");
    } finally {
      setBusy(false);
    }
  }

  async function start(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/verify/start", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = (await response.json()) as VerifyState & {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error || "Unable to start verification");
        return;
      }

      setVerification(data);
      setCommandCopied(false);
      setStep("verify");
    } catch {
      setError("Unable to connect to Mineacle");
    } finally {
      setBusy(false);
    }
  }

  async function complete(event: FormEvent) {
    event.preventDefault();

    if (!verification) {
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengeId: verification.challengeId,
          password,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        session?: boolean;
      };

      if (!response.ok) {
        setError(data.error || "Unable to create account");
        return;
      }

      if (data.session === false) {
        changeMode("login");
        setNotice(
          data.error || "Account created. Log in with your new password.",
        );
        return;
      }

      if (!(await confirmBrowserSession())) {
        setError(
          "Account was created, but the browser session was not established",
        );
        return;
      }

      await finishAuthentication();
    } catch {
      setError("Unable to connect to Mineacle");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: AuthMode) {
    setMode(next);
    setStep("username");
    setVerification(null);
    setPassword("");
    setConfirm("");
    setError("");
    setNotice("");
    setCommandCopied(false);

    // Keep the address bar in sync so refresh / back work as expected.
    const path = next === "create" ? "/register" : "/login";

    if (!onAuthenticated && window.location.pathname !== path) {
      window.history.replaceState(null, "", path);
      document.title =
        next === "create" ? "Create account | Mineacle" : "Log in | Mineacle";
    }
  }

  async function copyCommand() {
    if (!verification) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`/verify ${verification.code}`);
      setCommandCopied(true);
      window.setTimeout(() => setCommandCopied(false), 1400);
    } catch {
      setCommandCopied(false);
    }
  }

  const stepIndex = step === "username" ? 1 : step === "verify" ? 2 : 3;
  const remainingMs = verification?.expiresAt
    ? new Date(verification.expiresAt).getTime() - now
    : Number.NaN;

  const messages = (
    <>
      {notice ? (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  return (
    <div className={styles.card}>
      <div className={styles.tabs} role="tablist" aria-label="Account">
        <button
          className={styles.tab}
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => changeMode("login")}
          type="button"
        >
          Log in
        </button>

        <button
          className={styles.tab}
          role="tab"
          aria-selected={mode === "create"}
          onClick={() => changeMode("create")}
          type="button"
        >
          Create account
        </button>
      </div>

      <div className={styles.body}>
        {mode === "create" ? (
          <ol className={styles.steps} aria-label="Create account steps">
            {["Player", "Verify", "Password"].map((label, index) => {
              const number = index + 1;
              const state =
                number < stepIndex
                  ? "done"
                  : number === stepIndex
                    ? "current"
                    : "todo";

              return (
                <li
                  key={label}
                  data-state={state}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className={styles.stepNumber} aria-hidden="true">
                    {state === "done" ? (
                      <img src={mineacleIcons.check} alt="" draggable={false} />
                    ) : (
                      number
                    )}
                  </span>
                  <span>{label}</span>
                </li>
              );
            })}
          </ol>
        ) : null}

        {mode === "login" ? (
          <form className={styles.form} onSubmit={login}>
            <header className={styles.header}>
              <span className={styles.kicker}>Mineacle account</span>
              <h1>Welcome back</h1>
              <p>Log in with your Minecraft username.</p>
            </header>

            <label className={styles.field}>
              <span>Minecraft username</span>
              <input
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={16}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Your Java username"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                required
              />
            </label>

            {messages}

            <button className={primaryButton} disabled={busy} type="submit">
              {busy ? "Logging in..." : "Log in"}
            </button>

            <p className={styles.switch}>
              New to the website?{" "}
              <button type="button" onClick={() => changeMode("create")}>
                Create an account
              </button>
            </p>
          </form>
        ) : null}

        {mode === "create" && step === "username" ? (
          <form className={styles.form} onSubmit={start}>
            <header className={styles.header}>
              <span className={styles.kicker}>Step 1 of 3</span>
              <h1>Link your player</h1>
              <p>
                Enter the Java username you play with. You&apos;ll confirm
                it&apos;s you with a quick command in game.
              </p>
            </header>

            <label className={styles.field}>
              <span>Minecraft username</span>
              <input
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={16}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Your Java username"
                required
              />
            </label>

            <p className={styles.hint}>
              You need to have joined <b>{SERVER_ADDRESS}</b> at least once.
            </p>

            {messages}

            <button className={primaryButton} disabled={busy} type="submit">
              {busy ? "Checking player..." : "Get my code"}
            </button>
          </form>
        ) : null}

        {mode === "create" && step === "verify" && verification ? (
          <div className={styles.form}>
            <header className={styles.header}>
              <span className={styles.kicker}>Step 2 of 3</span>
              <h1>Verify in game</h1>
              <p>
                Join <b>{SERVER_ADDRESS}</b> as{" "}
                <b>{verification.username}</b> and type this in chat:
              </p>
            </header>

            <div className={styles.command}>
              <img
                className={styles.commandAvatar}
                src={playerAvatarUrl(verification.username, 64)}
                alt=""
                referrerPolicy="no-referrer"
                draggable={false}
              />
              <code>/verify {verification.code}</code>
              <button
                className={`${blockButton} ${styles.copyButton}`}
                type="button"
                onClick={copyCommand}
                aria-label="Copy command"
              >
                <img
                  src={commandCopied ? mineacleIcons.check : mineacleIcons.copy}
                  alt=""
                  draggable={false}
                />
                <span>{commandCopied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className={styles.waiting} role="status">
              <span className={styles.liveDot} aria-hidden="true" />
              <span>Waiting for you in game</span>
              {Number.isFinite(remainingMs) ? (
                <span className={styles.expires}>
                  Code expires in {formatRemaining(remainingMs)}
                </span>
              ) : null}
            </div>

            <p className={styles.hint}>
              This page moves on by itself once you&apos;ve run the command.
            </p>

            {messages}

            <button
              className={blockButton}
              type="button"
              onClick={() => changeMode("create")}
            >
              Use a different username
            </button>
          </div>
        ) : null}

        {mode === "create" && step === "password" && verification ? (
          <form className={styles.form} onSubmit={complete}>
            <header className={styles.header}>
              <span className={styles.kicker}>Step 3 of 3</span>
              <h1>Set a password</h1>
            </header>

            <div className={styles.verified}>
              <img
                src={playerAvatarUrl(verification.username, 64)}
                alt=""
                referrerPolicy="no-referrer"
                draggable={false}
              />
              <span>
                <b>{verification.username}</b>
                <small>Verified</small>
              </span>
            </div>

            {/* Lets password managers save the username with the password. */}
            <input
              type="text"
              autoComplete="username"
              value={verification.username}
              readOnly
              hidden
            />

            <label className={styles.field}>
              <span>Password</span>
              <input
                autoComplete="new-password"
                type="password"
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 10 characters"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                type="password"
                minLength={10}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Type it again"
                required
              />
            </label>

            {messages}

            <button className={primaryButton} disabled={busy} type="submit">
              {busy ? "Creating account..." : "Create account"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
