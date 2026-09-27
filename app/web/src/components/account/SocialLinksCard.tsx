"use client";

import { useState, type FormEvent } from "react";
import block from "@/components/site/BlockButton.module.css";
import {
  SOCIAL_ORDER,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from "@/features/social/social-platforms";
import styles from "./AccountSettings.module.css";

type Message = { tone: "ok" | "error"; text: string } | null;

/* "Social links" card on /profile: one box per platform. Paste a username
   or a full profile link; leave a box empty to remove that link. */
export function SocialLinksCard({
  initial,
}: {
  initial: Partial<Record<SocialPlatform, string>>;
}) {
  const [values, setValues] = useState<Partial<Record<SocialPlatform, string>>>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/account/socials", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as {
        error?: string;
        handles?: Partial<Record<SocialPlatform, string>>;
      };

      if (!response.ok) {
        setMessage({ tone: "error", text: data.error || "Unable to save" });
        return;
      }

      // Show the cleaned-up usernames (e.g. a pasted link becomes the name).
      setValues(data.handles ?? values);
      setMessage({ tone: "ok", text: "Saved. They're on your public profile now." });
    } catch {
      setMessage({ tone: "error", text: "Unable to connect to Mineacle" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby="account-socials">
      <h2 id="account-socials">Social links</h2>
      <p className={styles.cardText}>
        Shown on your public profile. Paste your username or a link to your
        page; leave a box empty to remove it.
      </p>

      <form className={styles.form} onSubmit={save}>
        {SOCIAL_ORDER.map((platform) => {
          const rule = SOCIAL_PLATFORMS[platform];

          return (
            <label className={styles.field} key={platform}>
              <span>{rule.label}</span>
              <input
                value={values[platform] ?? ""}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [platform]: event.target.value }))
                }
                placeholder={rule.placeholder}
                maxLength={120}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          );
        })}

        {message ? (
          <p className={styles.message} data-tone={message.tone} role={message.tone === "error" ? "alert" : "status"}>
            {message.text}
          </p>
        ) : null}

        <button className={`${block.button} ${block.primary}`} disabled={busy} type="submit">
          {busy ? "Saving..." : "Save links"}
        </button>
      </form>
    </section>
  );
}
