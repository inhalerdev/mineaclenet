"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import block from "@/components/site/BlockButton.module.css";
import { useToastRoot } from "@/components/site/useToastRoot";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./VoteThanksToast.module.css";

/*
 * "Thanks for voting!" pop-up on /vote, shown when a vote the player just
 * made arrives from the voting site (VoteSites.tsx). Same look as the other
 * pop-ups (friend online, IP copied), with the key in a blue frame. Stays
 * about 6 seconds; hovering pauses it, the X closes it.
 */
const SHOW_MS = 6_000;
const LEAVE_MS = 320;

export function VoteThanksToast({
  siteNames,
  reward,
  onDone,
}: {
  siteNames: string[];
  reward: string;
  onDone: () => void;
}) {
  const toastRoot = useToastRoot();
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (paused || leaving) return;
    const timer = window.setTimeout(() => setLeaving(true), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [paused, leaving]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => onDoneRef.current(), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!toastRoot) return null;

  const count = siteNames.length;

  return createPortal(
    <div className={styles.region}>
      <div
        className={styles.toast}
        data-leaving={leaving || undefined}
        role="status"
        aria-live="polite"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <span className={styles.mark} aria-hidden="true">
          <img src={mineacleIcons.key} alt="" draggable={false} />
        </span>
        <span className={styles.copy}>
          <span className={styles.kicker}>Thanks for voting!</span>
          <strong>
            +{count} {reward}
            {count === 1 ? "" : "s"}
          </strong>
          <small>
            From {siteNames.join(", ")}. {count === 1 ? "It's" : "They're"} on the way to you in-game.
          </small>
        </span>
        <button
          className={`${block.button} ${block.square} ${styles.close}`}
          type="button"
          aria-label="Close"
          onClick={() => setLeaving(true)}
        >
          <img src={mineacleIcons.close} alt="" draggable={false} />
        </button>
      </div>
    </div>,
    toastRoot,
  );
}
