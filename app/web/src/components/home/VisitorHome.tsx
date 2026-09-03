"use client";

import { useState } from "react";
import { homeContent } from "@/features/home/home-content";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";

const QUICK_LINKS = [
  {
    label: "Leaderboards",
    href: "/leaderboards",
    icon: "/shared/images/icons/streamline/core-solid/leaderboards.svg",
  },
  {
    label: "Punishments",
    href: "/punishments",
    icon: "/shared/images/icons/streamline/core-solid/punishments.svg",
  },
  {
    label: "Search players",
    href: "/leaderboards",
    icon: "/shared/images/icons/streamline/core-solid/search.svg",
  },
] as const;

const SOCIAL_LINKS = [
  {
    label: "Discord",
    href: "#",
    icon: "/shared/images/icons/streamline/logos/discord.svg",
  },
  {
    label: "X",
    href: "#",
    icon: "/shared/images/icons/streamline/logos/x.svg",
  },
] as const;

export function VisitorHome() {
  const [copied, setCopied] = useState(false);

  async function copyServerAddress() {
    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.frame}>
        <video
          className={styles.video}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-label={homeContent.hero.mediaLabel}
        >
          <source src={homeContent.hero.media} type="video/mp4" />
        </video>

        <div className={styles.scrim} aria-hidden="true" />

        <header className={styles.header}>
          <a className={styles.brand} href="/" aria-label="Mineacle home">
            <img
              className={styles.brandMark}
              src="/shared/images/branding/mineacle-mark.png"
              alt=""
              draggable={false}
            />
            <img
              className={styles.brandWordmark}
              src="/shared/images/branding/mineacle-logo.png"
              alt="Mineacle"
              draggable={false}
            />
          </a>

          <div className={styles.auth}>
            <a className={styles.authSecondary} href="/login">
              Log in
            </a>
            <a className={styles.authPrimary} href="/login">
              Sign up
            </a>
          </div>
        </header>

        <nav className={styles.quickLinks} aria-label="Explore Mineacle">
          {QUICK_LINKS.map((item) => (
            <a className={styles.quickLink} href={item.href} key={item.label}>
              <img src={item.icon} alt="" draggable={false} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <div className={styles.socials} aria-label="Mineacle social links">
          {SOCIAL_LINKS.map((social) => (
            <a
              className={styles.social}
              href={social.href}
              key={social.label}
              aria-label={social.label}
            >
              <img src={social.icon} alt="" draggable={false} />
            </a>
          ))}
        </div>

        <button
          className={`${styles.play} ${copied ? styles.playCopied : ""}`}
          type="button"
          onClick={copyServerAddress}
          aria-label={`Copy Mineacle server address: ${SERVER_ADDRESS}`}
        >
          <img
            src="/shared/images/icons/streamline/core-solid/play.svg"
            alt=""
            draggable={false}
          />
          <span>{copied ? "Copied" : "Play"}</span>
        </button>
      </section>
    </main>
  );
}
