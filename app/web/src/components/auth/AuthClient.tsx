"use client";

import { useEffect, useState, type FormEvent } from "react";

type VerifyState = {
  challengeId: string;
  username: string;
  code: string;
  expiresAt: number;
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

export function AuthClient() {
  const [mode, setMode] = useState<"login" | "create">("login");
  const [step, setStep] = useState<"username" | "verify" | "password">("username");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [verification, setVerification] = useState<VerifyState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const requestedMode = new URLSearchParams(window.location.search).get("mode");

    if (requestedMode === "create") {
      setMode("create");
    }
  }, []);

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
        setError("Login was accepted, but the browser session was not established");
        return;
      }

      window.location.replace("/");
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
        setError(data.error || "Account created. Log in with your new password");
        return;
      }

      if (!(await confirmBrowserSession())) {
        setError("Account was created, but the browser session was not established");
        return;
      }

      window.location.replace("/");
    } catch {
      setError("Unable to connect to Mineacle");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(next: "login" | "create") {
    setMode(next);
    setStep("username");
    setVerification(null);
    setPassword("");
    setConfirm("");
    setError("");
  }

  return (
    <div className="auth-card">
      <div className="auth-tabs">
        <button
          className={mode === "login" ? "is-active" : ""}
          onClick={() => changeMode("login")}
          type="button"
        >
          Log in
        </button>
        <button
          className={mode === "create" ? "is-active" : ""}
          onClick={() => changeMode("create")}
          type="button"
        >
          Create account
        </button>
      </div>

      {mode === "login" ? (
        <form className="auth-form" onSubmit={login}>
          <header>
            <small>MINEACLE ACCOUNT</small>
            <h1>Welcome back</h1>
            <p>Your verified Minecraft account is your Mineacle.net identity.</p>
          </header>

          <label>
            Minecraft username
            <input
              autoComplete="username"
              maxLength={16}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-submit" disabled={busy} type="submit">
            {busy ? "Logging in..." : "Log in"}
          </button>
        </form>
      ) : null}

      {mode === "create" && step === "username" ? (
        <form className="auth-form" onSubmit={start}>
          <header>
            <small>PLAYER VERIFICATION</small>
            <h1>Connect your player</h1>
            <p>
              Use a player that has joined Mineacle. You will prove ownership
              in-game before creating a password.
            </p>
          </header>

          <label>
            Minecraft username
            <input
              maxLength={16}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-submit" disabled={busy} type="submit">
            {busy ? "Checking player..." : "Generate verification code"}
          </button>
        </form>
      ) : null}

      {mode === "create" && step === "verify" && verification ? (
        <div className="auth-form">
          <header>
            <small>VERIFY IN MINECRAFT</small>
            <h1>{verification.username}</h1>
            <p>Join Mineacle and enter this command. The page will update automatically.</p>
          </header>

          <div className="auth-command">
            <small>IN GAME</small>
            <strong>/verify {verification.code}</strong>
          </div>

          <div className="auth-wait">
            <span />
            Waiting for verification
          </div>

          {error ? <div className="auth-error">{error}</div> : null}
        </div>
      ) : null}

      {mode === "create" && step === "password" && verification ? (
        <form className="auth-form" onSubmit={complete}>
          <header>
            <small>PLAYER VERIFIED</small>
            <h1>Finish your account</h1>
            <p>{verification.username} is verified. Create your Mineacle.net password.</p>
          </header>

          <label>
            Password
            <input
              type="password"
              minLength={10}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              minLength={10}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-submit" disabled={busy} type="submit">
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
