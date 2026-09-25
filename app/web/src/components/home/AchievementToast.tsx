"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./AchievementToast.module.css";

/**
 * Minecraft-style "Advancement Made!" toast.
 *
 * Two lines, like the in-game one. Slides in at the top right (silently),
 * then slides out. Click it to dismiss early. Render it with a new
 * `key` each time so the animation restarts.
 */

const VISIBLE_MS = 4_000;
const LEAVE_MS = 320;

export type AchievementToastProps = {
  kicker: string;
  title: string;
  iconSrc: string;
  onDone: () => void;
};

export function AchievementToast({
  kicker,
  title,
  iconSrc,
  onDone,
}: AchievementToastProps) {
  const [leaving, setLeaving] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const leaveTimer = window.setTimeout(
      () => setLeaving(true),
      VISIBLE_MS,
    );

    return () => window.clearTimeout(leaveTimer);
  }, []);

  useEffect(() => {
    if (!leaving) {
      return;
    }

    const doneTimer = window.setTimeout(
      () => onDoneRef.current(),
      LEAVE_MS,
    );

    return () => window.clearTimeout(doneTimer);
  }, [leaving]);

  return (
    <button
      type="button"
      className={styles.toast}
      data-leaving={leaving}
      onClick={() => setLeaving(true)}
      aria-label="Dismiss notification"
      style={
        {
          "--toast-visible": `${VISIBLE_MS}ms`,
          "--toast-leave": `${LEAVE_MS}ms`,
        } as CSSProperties
      }
    >
      <span className={styles.iconSlot} aria-hidden="true">
        <img src={iconSrc} alt="" draggable={false} />
      </span>

      <span className={styles.copy} aria-hidden="true">
        <span className={styles.kicker}>{kicker}</span>
        <strong className={styles.title}>{title}</strong>
      </span>
    </button>
  );
}
