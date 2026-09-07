"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import styles from "./AuthClient.module.css";

type VerifyState = {
  challengeId: string;
  username: string;
  code: string;
  expiresAt: number;
};

type AuthMode = "login" | "create";

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
  const [busy, setBusy] = useState(false);
  const [commandCopied, setCommandCopied] = useState(false);

  useEffect(() => {
    const requestedMode =
      new URLSearchParams(window.location.search).get("mode");

    setMode(requestedMode === "create" ? "create" : initialMode);
    setStep("username");
    setUsername("");
    setVerification(null);
    setPassword("");
    setConfirm("");
    setError("");
    setCommandCopied(false);
  }, [initialMode]);

  async function finishAuthentication() {
    if (onAuthenticated) {
      await onAuthenticated();
      return;
    }

    window.location.replace("/");
  }

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
          setError("That verification code expired. Generate a new one");
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

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

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
        setMode("login");
        setStep("username");
        setVerification(null);
        setPassword("");
        setConfirm("");
        setCommandCopied(false);
        setError(
          data.error || "Account created. Log in with your new password",
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
    setCommandCopied(false);
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

  const createStepIndex =
    step === "username" ? 1 : step === "verify" ? 2 : 3;

  const verifyExpiresText = useMemo(() => {
    if (!verification?.expiresAt) {
      return null;
    }

    const expiresAt = new Date(verification.expiresAt);

    if (Number.isNaN(expiresAt.getTime())) {
      return null;
    }

    return expiresAt.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [verification]);

  return (
    <div className={styles.root}>
      <div className={styles.tabs} role="tablist" aria-label="Account access">
        <button
          className={mode === "login" ? styles.activeTab : ""}
          onClick={() => changeMode("login")}
          type="button"
        >
          Log in
        </button>

        <button
          className={mode === "create" ? styles.activeTab : ""}
          onClick={() => changeMode("create")}
          type="button"
        >
          Create account
        </button>
      </div>

      {mode === "create" ? (
        <ol className={styles.steps} aria-label="Create account steps">
          <li className={createStepIndex >= 1 ? styles.stepActive : ""}>
            <span>1</span>
            <strong>Player</strong>
          </li>
          <li className={createStepIndex >= 2 ? styles.stepActive : ""}>
            <span>2</span>
            <strong>Verify</strong>
          </li>
          <li className={createStepIndex >= 3 ? styles.stepActive : ""}>
            <span>3</span>
            <strong>Password</strong>
          </li>
        </ol>
      ) : null}

      {mode === "login" ? (
        <form className={styles.panel} onSubmit={login}>
          <header className={styles.header}>
            <small>MINEACLE ACCOUNT</small>
            <h1>Welcome back</h1>
            <p>
              Sign in with the Minecraft username tied to your
              Mineacle account.
            </p>
          </header>

          <div className={styles.fieldGroup}>
            <label className={styles.field}>
              <span>Minecraft username</span>
              <input
                autoComplete="username"
                maxLength={16}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter your Java username"
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
                placeholder="Enter your password"
                required
              />
            </label>
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.submit} disabled={busy} type="submit">
            {busy ? "Logging in..." : "Log in"}
          </button>
        </form>
      ) : null}

      {mode === "create" && step === "username" ? (
        <form className={styles.panel} onSubmit={start}>
          <header className={styles.header}>
            <small>PLAYER VERIFICATION</small>
            <h1>Connect your player</h1>
            <p>
              Enter the Java username that has already joined
              Mineacle. You will verify ownership in game before
              creating your website password.
            </p>
          </header>

          <div className={styles.note}>
            The player must have joined Mineacle at least once.
          </div>

          <label className={styles.field}>
            <span>Minecraft username</span>
            <input
              maxLength={16}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your Java username"
              required
            />
          </label>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.submit} disabled={busy} type="submit">
            {busy ? "Checking player..." : "Generate verification code"}
          </button>
        </form>
      ) : null}

      {mode === "create" && step === "verify" && verification ? (
        <div className={styles.panel}>
          <header className={styles.header}>
            <small>VERIFY IN MINECRAFT</small>
            <h1>Verify {verification.username}</h1>
            <p>
              Join Mineacle on Java Edition, run the command
              below, and this page will update automatically.
            </p>
          </header>

          <div className={styles.commandCard}>
            <div className={styles.commandLabel}>
              <small>IN-GAME COMMAND</small>
              {verifyExpiresText ? (
                <span>Expires around {verifyExpiresText}</span>
              ) : null}
            </div>

            <div className={styles.commandValue}>
              <strong>/verify {verification.code}</strong>
              <button
                className={styles.commandCopy}
                type="button"
                onClick={copyCommand}
              >
                {commandCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className={styles.verifyGrid}>
            <div className={styles.verifyCard}>
              <small>STEP 1</small>
              <strong>Join Mineacle</strong>
              <p>Connect using the same Java username shown above.</p>
            </div>

            <div className={styles.verifyCard}>
              <small>STEP 2</small>
              <strong>Run the command</strong>
              <p>Paste the verification command in Minecraft chat.</p>
            </div>

            <div className={styles.verifyCard}>
              <small>STEP 3</small>
              <strong>Return here</strong>
              <p>This window will continue automatically when verified.</p>
            </div>
          </div>

          <div className={styles.waiting}>
            <span className={styles.waitingDot} aria-hidden="true" />
            Waiting for verification
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}
        </div>
      ) : null}

      {mode === "create" && step === "password" && verification ? (
        <form className={styles.panel} onSubmit={complete}>
          <header className={styles.header}>
            <small>PLAYER VERIFIED</small>
            <h1>Create your password</h1>
            <p>
              {verification.username} is verified. Finish your
              Mineacle account by setting a password.
            </p>
          </header>

          <div className={styles.fieldGroup}>
            <label className={styles.field}>
              <span>Password</span>
              <input
                type="password"
                minLength={10}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                required
              />
            </label>

            <label className={styles.field}>
              <span>Confirm password</span>
              <input
                type="password"
                minLength={10}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Confirm your password"
                required
              />
            </label>
          </div>

          {error ? <div className={styles.error}>{error}</div> : null}

          <button className={styles.submit} disabled={busy} type="submit">
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
