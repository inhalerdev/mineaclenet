"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useToastRoot } from "@/components/site/useToastRoot";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./IpCopiedToast.module.css";

/*
 * Pop-up after Play Now copies the IP, in the same style as the "Friend
 * online" pop-up. Visitors who aren't logged in also get the three steps to
 * join (they may be new to servers); logged-in players just get a short
 * "see you in game". Hovering it pauses the timer; the X closes it.
 *
 * Give it a new `key` each time the IP is copied so the timer restarts.
 */
const SHOW_MS_STEPS = 12_000;
const SHOW_MS_SHORT = 5_000;
const LEAVE_MS = 320;

type IpCopiedToastProps = {
  address: string;
  /* Logged-in player's name, or null for visitors (shows the steps). */
  playerName: string | null;
  /* e.g. "1.21+" ("" to leave out). */
  javaVersion: string;
  onDone: () => void;
};

export function IpCopiedToast({
  address,
  playerName,
  javaVersion,
  onDone,
}: IpCopiedToastProps) {
  const toastRoot = useToastRoot();
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const showSteps = playerName === null;
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  // Leave after a while, unless the pointer is resting on it.
  useEffect(() => {
    if (paused || leaving) {
      return;
    }

    const timer = window.setTimeout(
      () => setLeaving(true),
      showSteps ? SHOW_MS_STEPS : SHOW_MS_SHORT,
    );
    return () => window.clearTimeout(timer);
  }, [paused, leaving, showSteps]);

  useEffect(() => {
    if (!leaving) {
      return;
    }

    const timer = window.setTimeout(() => onDoneRef.current(), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!toastRoot) {
    return null;
  }

  return createPortal(
    <div className={styles.region}>
      <div
        className={styles.toast}
        data-leaving={leaving || undefined}
        data-steps={showSteps || undefined}
        role="status"
        aria-live="polite"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <span className={styles.mark} aria-hidden="true">
          <img src="/shared/images/branding/mineacle-mark.png" alt="" draggable={false} />
        </span>
        <span className={styles.copy}>
          <span className={styles.kicker}>
            <i aria-hidden="true" />
            IP copied
          </span>
          <strong>{address}</strong>
          {showSteps ? null : <small>Paste it in Multiplayer. See you in game, {playerName}!</small>}
        </span>
        <button
          className={styles.close}
          type="button"
          aria-label="Close"
          onClick={() => setLeaving(true)}
        >
          <img src={mineacleIcons.close} alt="" draggable={false} />
        </button>

        {showSteps ? (
          <ol className={styles.steps} aria-label="How to join">
            <li>
              <b>1</b>
              <span>
                Open Minecraft: Java Edition{javaVersion ? ` ${javaVersion}` : ""}
              </span>
            </li>
            <li>
              <b>2</b>
              <span>Click Multiplayer, then Add Server</span>
            </li>
            <li>
              <b>3</b>
              <span>Paste the IP and join. See you there!</span>
            </li>
          </ol>
        ) : null}
      </div>
    </div>,
    toastRoot,
  );
}
