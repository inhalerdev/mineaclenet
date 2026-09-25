"use client";

import { useEffect, useRef, useState } from "react";
import { AchievementToast } from "@/components/home/AchievementToast";
import {
  SiteHeader,
  type HomeLeaderboardPlayer,
} from "@/components/home/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import { homeContent } from "@/features/home/home-content";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";
const STATUS_CACHE_KEY = "mineacle:home-status:mineacle.net";
const STATUS_CACHE_MAX_AGE = 15_000;

// Shown in the "Advancement Made!" toast when the IP is copied.
// A different one is picked each time (never the same twice in a row).
const IP_COPIED_ADVANCEMENTS = [
  "The Journey Begins",
  "Pack Your Bags",
  "Portal Primed",
  "Destination: Mineacle",
  "First Steps",
  "Adventure Awaits",
] as const;

const QUICK_LINKS = [
  {
    title: "Marketplace",
    href: "https://store.mineacle.net/",
    media: homeContent.mineaclePlus.media,
    icon: mineacleIcons.crate,
    card: "marketplace",
    external: true,
  },
  {
    title: "Vote / Earn a Reward",
    href: "/vote",
    media: "",
    icon: mineacleIcons.gift,
    card: "vote",
  },
  {
    title: "Leaderboards",
    href: "/leaderboards",
    media: homeContent.competitive.media,
    icon: mineacleIcons.trophy,
    card: "leaderboards",
  },
] as const;

export type { HomeLeaderboardPlayer };

type ServerStatus = {
  online: boolean;
  currentlyPlaying: number;
  checked?: boolean;
  source?: string;
};

type VisitorHomeProps = {
  viewer?: Viewer | null;
  topPlayers?: HomeLeaderboardPlayer[];
};

export function VisitorHome({
  viewer = null,
  topPlayers = [],
}: VisitorHomeProps) {
  const [copied, setCopied] = useState(false);
  const [achievement, setAchievement] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const [playHovered, setPlayHovered] = useState(false);
  const [serverStatus, setServerStatus] =
    useState<ServerStatus | null>(null);

  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let requestActive = false;

    function normalizeStatus(
      value: ServerStatus | null,
    ): ServerStatus | null {
      if (!value || typeof value !== "object") {
        return null;
      }

      const count = Number(value.currentlyPlaying || 0);

      return {
        online: value.online === true,
        currentlyPlaying:
          Number.isFinite(count) && count > 0
            ? Math.floor(count)
            : 0,
        checked: value.checked !== false,
        source:
          typeof value.source === "string" ? value.source : "",
      };
    }

    function readCachedStatus() {
      try {
        const cached = JSON.parse(
          window.localStorage.getItem(STATUS_CACHE_KEY) || "null",
        ) as
          | (ServerStatus & {
              updatedAt?: number;
            })
          | null;

        if (
          !cached ||
          typeof cached.updatedAt !== "number" ||
          Date.now() - cached.updatedAt > STATUS_CACHE_MAX_AGE
        ) {
          return null;
        }

        return normalizeStatus(cached);
      } catch {
        return null;
      }
    }

    function writeCachedStatus(status: ServerStatus) {
      try {
        window.localStorage.setItem(
          STATUS_CACHE_KEY,
          JSON.stringify({
            ...status,
            updatedAt: Date.now(),
          }),
        );
      } catch {
        // Storage may be unavailable in private browsing.
      }
    }

    async function loadServerStatus() {
      if (requestActive) {
        return;
      }

      requestActive = true;

      try {
        const controller = new AbortController();
        const timeout = window.setTimeout(
          () => controller.abort(),
          2_400,
        );

        try {
          const response = await fetch(
            `/api/server/status?t=${Date.now()}`,
            {
              cache: "no-store",
              signal: controller.signal,
            },
          );

          if (!response.ok) {
            return;
          }

          const status = normalizeStatus(
            (await response.json()) as ServerStatus,
          );

          if (status && status.checked !== false && !cancelled) {
            setServerStatus(status);
            writeCachedStatus(status);
          }
        } finally {
          window.clearTimeout(timeout);
        }
      } catch {
        // Keep the last known state on transient failures.
      } finally {
        requestActive = false;
      }
    }

    const cached = readCachedStatus();

    if (cached) {
      setServerStatus(cached);
    }

    loadServerStatus();

    const timer = window.setInterval(() => {
      if (!document.hidden) {
        loadServerStatus();
      }
    }, 15_000);

    const onFocus = () => loadServerStatus();
    const onVisibilityChange = () => {
      if (!document.hidden) {
        loadServerStatus();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener(
      "visibilitychange",
      onVisibilityChange,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
    };
  }, []);

  async function copyServerAddress() {
    let copiedSuccessfully = false;

    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      copiedSuccessfully = true;
    } catch {
      const input = document.createElement("textarea");
      input.value = SERVER_ADDRESS;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      copiedSuccessfully = document.execCommand("copy");
      input.remove();
    }

    setCopied(copiedSuccessfully);

    if (copiedSuccessfully) {
      setAchievement((previous) => {
        const choices = IP_COPIED_ADVANCEMENTS.filter(
          (title) => title !== previous?.title,
        );

        return {
          id: Date.now(),
          title:
            choices[Math.floor(Math.random() * choices.length)] ??
            IP_COPIED_ADVANCEMENTS[0],
        };
      });
    }

    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }

    copyTimerRef.current = window.setTimeout(
      () => setCopied(false),
      1_800,
    );
  }

  const currentlyPlaying = serverStatus
    ? serverStatus.currentlyPlaying.toLocaleString()
    : "—";
  const playState = copied
    ? "copied"
    : playHovered
      ? "players"
      : "idle";

  return (
    <div className={styles.page}>
      <section className={styles.heroFrame}>
        <SiteHeader
          viewer={viewer}
          topPlayers={topPlayers}
          currentPath="/"
        />

        <div className={styles.hero}>
          <video
            className={styles.heroVideo}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={homeContent.hero.poster || undefined}
            aria-label={homeContent.hero.mediaLabel}
          >
            <source src={homeContent.hero.media} type="video/mp4" />
          </video>
          <div className={styles.heroShade} aria-hidden="true" />

          <button
            className={styles.playButton}
            data-state={playState}
            type="button"
            aria-label={
              copied
                ? "Mineacle IP copied"
                : playHovered
                  ? `${currentlyPlaying} players currently playing. Copy Mineacle IP`
                  : "Copy Mineacle IP"
            }
            onClick={copyServerAddress}
            onMouseEnter={() => setPlayHovered(true)}
            onMouseLeave={() => setPlayHovered(false)}
            onFocus={() => setPlayHovered(true)}
            onBlur={() => setPlayHovered(false)}
          >
            <span className={styles.playButtonContent} aria-hidden="true">
              <span
                className={styles.playButtonState}
                data-active={playState === "idle"}
              >
                <img src={mineacleIcons.play} alt="" draggable={false} />
                <span>PLAY NOW</span>
              </span>
              <span
                className={styles.playButtonState}
                data-active={playState === "players"}
              >
                <img src={mineacleIcons.copy} alt="" draggable={false} />
                <span>{currentlyPlaying} Currently Playing</span>
              </span>
              <span
                className={styles.playButtonState}
                data-active={playState === "copied"}
              >
                <img src={mineacleIcons.check} alt="" draggable={false} />
                <span>IP Copied</span>
              </span>
            </span>
          </button>
        </div>
      </section>

      <section
        className={styles.quickGrid}
        aria-label="Mineacle quick links"
      >
        {QUICK_LINKS.map((item) => (
          <a
            className={styles.quickCard}
            data-card={item.card}
            href={item.href}
            key={item.title}
            {...("external" in item && item.external
              ? {
                  target: "_blank",
                  rel: "noreferrer",
                }
              : {})}
          >
            {item.media ? (
              <img
                className={styles.quickCardMedia}
                src={item.media}
                alt=""
                draggable={false}
              />
            ) : null}
            <span className={styles.quickCardShade} aria-hidden="true" />
            <span className={styles.quickCardIcon} aria-hidden="true">
              <img
                src={item.icon}
                alt=""
                draggable={false}
              />
            </span>
            <strong>{item.title}</strong>
          </a>
        ))}
      </section>

      {achievement ? (
        <AchievementToast
          key={achievement.id}
          kicker="Advancement Made!"
          title={achievement.title}
          iconSrc="/shared/images/branding/mineacle-mark.png"
          onDone={() => setAchievement(null)}
        />
      ) : null}

      <span className={styles.copyStatus} role="status" aria-live="polite">
        {copied ? `${SERVER_ADDRESS} copied to clipboard` : ""}
      </span>
    </div>
  );
}
