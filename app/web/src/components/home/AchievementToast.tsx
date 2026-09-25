"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./AchievementToast.module.css";

/**
 * Minecraft-style "Advancement Made!" toast.
 *
 * Slides in at the top right, plays a short chime, shows a draining timer
 * bar, then slides out. Click it to dismiss early. Render it with a new
 * `key` each time so the animation restarts.
 */

const VISIBLE_MS = 4_800;
const LEAVE_MS = 320;

// Set to false to turn the chime off.
const PLAY_SOUND = true;

let audioContext: AudioContext | null = null;

function playChime() {
  if (!PLAY_SOUND || typeof window === "undefined") {
    return;
  }

  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtor) {
      return;
    }

    audioContext ??= new AudioCtor();
    const context = audioContext;
    const start = context.currentTime + 0.02;

    // Three quick rising "block" notes: E5, G5, C6.
    [659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + index * 0.085;

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.045, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);

      oscillator.connect(gain).connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.18);
    });
  } catch {
    // Sound is decoration only.
  }
}

export type AchievementToastProps = {
  kicker: string;
  title: string;
  detail: string;
  playersOnline?: string | null;
  iconSrc: string;
  onDone: () => void;
};

export function AchievementToast({
  kicker,
  title,
  detail,
  playersOnline = null,
  iconSrc,
  onDone,
}: AchievementToastProps) {
  const [leaving, setLeaving] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    playChime();

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
        <span className={styles.detail}>{detail}</span>
        {playersOnline ? (
          <span className={styles.players}>
            <i />
            {playersOnline}
          </span>
        ) : null}
      </span>

      <span className={styles.timer} aria-hidden="true" />
    </button>
  );
}
