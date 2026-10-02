"use client";

import { useEffect, useRef, useState } from "react";
import {
  HeroContent,
  type HeroQuickStat,
  type HeroStat,
} from "@/components/home/HeroContent";
import { IpCopiedToast } from "@/components/home/IpCopiedToast";
import { SiteHeader } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import { homeContent } from "@/features/home/home-content";
import type { DiscordStats } from "@/features/home/discord";
import type { HeroStats } from "@/features/home/hero-stats";
import type { WelcomeData } from "@/features/home/welcome";
import type { TopPlayer } from "@/features/players/top-players";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import frame from "@/components/site/SiteFrame.module.css";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = homeContent.join.address;
const heroText = homeContent.heroText;
const STATUS_CACHE_KEY = "mineacle:home-status:mineacle.net";
const STATUS_CACHE_MAX_AGE = 15_000;

type QuickLink = {
  title: string;
  /* Small line under the title (e.g. Discord member counts). */
  detail?: string;
  /* Shown when the card is hovered, e.g. "Open store". */
  cta: string;
  href: string;
  media: string;
  icon: string;
  card: string;
  external?: boolean;
};

/* The Discord card, or the Vote card if no invite is set. */
function communityCard(discordStats: DiscordStats | null): QuickLink {
  if (!homeContent.discord.invite) {
    return {
      title: "Vote / Earn a Reward",
      cta: "Vote now",
      href: "/vote",
      media: homeContent.rewards.media,
      icon: mineacleIcons.gift,
      card: "vote",
    };
  }

  return {
    title: "Join the Discord",
    detail: discordStats
      ? `${discordStats.members.toLocaleString()} members · ${discordStats.online.toLocaleString()} online`
      : "Find friends and squad up",
    cta: "Join server",
    href: homeContent.discord.invite,
    media: homeContent.community.media,
    icon: mineacleIcons.socialDiscord,
    card: "discord",
    external: true,
  };
}

/* A logged-in player's own numbers, as the hero's quick stats. */
function welcomeStats(welcome: WelcomeData): HeroQuickStat[] {
  const plural = (count: number, word: string) => `${word}${count === 1 ? "" : "s"}`;
  const votes = welcome.votes;
  const friends = welcome.friendsOnline;

  return [
    {
      icon: "emerald",
      color: "#11fc7b",
      href: "/leaderboards",
      value: welcome.balance || "$0",
      label: welcome.moneyRank > 0 ? `#${welcome.moneyRank} richest` : "Balance",
    },
    {
      icon: "key",
      color: "#fcd511",
      href: "/vote",
      value: !votes ? "Vote" : votes.left > 0 ? `${votes.left} of ${votes.total}` : "All in",
      label: !votes
        ? "Free crate keys"
        : votes.left > 0
          ? `${plural(votes.left, "vote")} left today`
          : "Votes today",
    },
    {
      icon: "friends",
      color: "#b078ff",
      href: "/following",
      value: friends === null ? "Friends" : String(friends),
      label: friends === null ? "See who's on" : `${plural(friends, "friend")} online`,
    },
  ];
}

const MARKETPLACE_CARD: QuickLink = {
  title: "Marketplace",
  detail: "The official Mineacle store",
  cta: "Open store",
  href: "/marketplace",
  media: homeContent.mineaclePlus.media,
  icon: mineacleIcons.crate,
  card: "marketplace",
};

const LEADERBOARDS_CARD: QuickLink = {
  title: "Leaderboards",
  detail: "Top 50 in balance, kills and more",
  cta: "See rankings",
  href: "/leaderboards",
  media: homeContent.competitive.media,
  icon: mineacleIcons.trophy,
  card: "leaderboards",
};

type ServerStatus = {
  online: boolean;
  currentlyPlaying: number;
  checked?: boolean;
  source?: string;
};

type VisitorHomeProps = {
  viewer?: Viewer | null;
  topPlayers?: TopPlayer[];
  heroStats?: HeroStats | null;
  discordStats?: DiscordStats | null;
  /* Set for logged-in players: their "Welcome back" hero. */
  welcome?: WelcomeData | null;
};

export function VisitorHome({
  viewer = null,
  topPlayers = [],
  heroStats = null,
  discordStats = null,
  welcome = null,
}: VisitorHomeProps) {
  const [copied, setCopied] = useState(false);
  // The "IP copied" pop-up; a new id each copy restarts it.
  const [copyToast, setCopyToast] = useState<number | null>(null);
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
      setCopyToast(Date.now());
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
  // Live strip under the buttons. An item is left out until its number is
  // known (e.g. while the first status check runs, or if the database is
  // unreachable).
  const heroTiles: HeroStat[] = [
    ...(serverStatus
      ? [
          !serverStatus.online
            ? { key: "online", value: "Offline", label: "Server" }
            : serverStatus.currentlyPlaying > 0
              ? {
                  key: "online",
                  value: currentlyPlaying,
                  label: "Playing now",
                  live: true,
                }
              : // Nobody on: don't show a 0, invite them in instead.
                {
                  key: "online",
                  value: "Online",
                  label: "Be the first in today",
                  live: true,
                },
        ]
      : []),
    ...(heroStats
      ? [
          {
            key: "joined",
            value: heroStats.playersJoined.toLocaleString(),
            label: "Players joined",
          },
        ]
      : []),
    { key: "ip", value: SERVER_ADDRESS, label: "Java IP" },
  ];

  const playState = copied
    ? "copied"
    : playHovered
      ? "players"
      : "idle";
  // Hovering Play Now shows the player count, or "Copy Server IP" when
  // nobody's on (or the count isn't known yet).
  const hoverLabel =
    serverStatus && serverStatus.currentlyPlaying > 0
      ? `${currentlyPlaying} Currently Playing`
      : "Copy Server IP";

  const quickLinks = [MARKETPLACE_CARD, communityCard(discordStats), LEADERBOARDS_CARD];
  // Small tag on the Vote button: "Free" for visitors, votes left for
  // logged-in players.
  const votes = welcome?.votes ?? null;
  const voteCount = !votes ? "Free" : votes.left > 0 ? `${votes.left} left` : "Done";

  return (
    <div className={`${frame.page} ${styles.homePage}`}>
      <section className={`${frame.heroFrame} ${styles.heroSection}`}>
        <SiteHeader
          viewer={viewer}
          topPlayers={topPlayers}
          currentPath="/"
        />

        <div className={frame.hero}>
          <video
            className={frame.heroVideo}
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
          <div className={frame.heroShade} aria-hidden="true" />

          <HeroContent
            tag={heroText.tag}
            news={heroText.news}
            {...(welcome
              ? {
                  headline: "Welcome back,",
                  headlineAccent: `${welcome.name}.`,
                  text: "Your world is waiting. Here's where you stand today.",
                  quickStats: welcomeStats(welcome),
                }
              : {
                  headline: heroText.headline,
                  headlineAccent: heroText.headlineAccent,
                  text: heroText.text,
                  highlights: heroText.highlights,
                })}
            action={
              <>
              <button
                className={styles.playButton}
                data-state={playState}
                type="button"
                aria-label={
                  copied
                    ? "Mineacle IP copied"
                    : playHovered && serverStatus && serverStatus.currentlyPlaying > 0
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
                    <span>{hoverLabel}</span>
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
              <a className={styles.voteButton} href="/vote">
                <img src={mineacleIcons.key} alt="" draggable={false} />
                <span>Vote for Keys</span>
                {voteCount ? (
                  <em className={styles.voteCount} data-done={votes?.left === 0 || undefined}>
                    {voteCount}
                  </em>
                ) : null}
              </a>
              </>
            }
            stats={heroTiles}
          />
        </div>
      </section>

      <section
        className={styles.quickGrid}
        aria-label="Mineacle quick links"
      >
        {quickLinks.map((item) => (
          <a
            className={styles.quickCard}
            data-card={item.card}
            href={item.href}
            key={item.title}
            {...(item.external
              ? {
                  target: "_blank",
                  rel: "noopener noreferrer",
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
            <span className={styles.quickCardCaption}>
              <span className={styles.quickCardIcon} aria-hidden="true">
                <img src={item.icon} alt="" draggable={false} />
              </span>
              <span className={styles.quickCardText}>
                <strong>{item.title}</strong>
                {item.detail ? (
                  <small className={styles.quickCardDetail}>{item.detail}</small>
                ) : null}
              </span>
            </span>
            <span className={styles.quickCardCta} aria-hidden="true">
              {item.cta}
            </span>
          </a>
        ))}
      </section>

      {copyToast !== null ? (
        <IpCopiedToast
          key={copyToast}
          address={SERVER_ADDRESS}
          playerName={viewer ? (welcome?.name ?? viewer.username) : null}
          javaVersion={homeContent.join.javaVersion}
          onDone={() => setCopyToast(null)}
        />
      ) : null}

      <span className={styles.copyStatus} role="status" aria-live="polite">
        {copied ? `${SERVER_ADDRESS} copied to clipboard` : ""}
      </span>
    </div>
  );
}
