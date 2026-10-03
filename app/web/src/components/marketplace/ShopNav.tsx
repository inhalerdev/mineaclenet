"use client";

import { type MouseEvent, useEffect, useState } from "react";
import { MarketImage } from "./Enchanted";
import styles from "./MarketplacePage.module.css";

/*
 * Jump links to the Marketplace's parts: the featured hero, then each
 * category section. On wide screens a sticky list in the sidebar ("rail")
 * that lights up the part you're looking at; narrower, a row of chips
 * above the sections. Links are #anchors, so they work without JavaScript;
 * with it they scroll smoothly and put ?category=<slug> in the address.
 */
export type ShopNavEntry = {
  /* Element id to scroll to: "featured" or "cat-<slug>" */
  id: string;
  slug: string | null;
  label: string;
  image: string | null;
  count: number | null;
  featured: boolean;
  sale: boolean;
};

export function ShopNav({
  entries,
  variant,
}: {
  entries: ShopNavEntry[];
  variant: "rail" | "chips";
}) {
  const [active, setActive] = useState(entries[0]?.id ?? "");

  /*
   * Light up the last part whose top has passed the middle of the screen
   * (the first part until then). The page scrolls inside the framed box on
   * wide screens and as a whole on phones, so scrolls are caught on the
   * document in the capture phase.
   */
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.5;
      let current = entries[0]?.id ?? "";

      for (const entry of entries) {
        const element = document.getElementById(entry.id);

        if (element && element.getBoundingClientRect().top <= line) {
          current = entry.id;
        }
      }

      setActive(current);
    };

    const schedule = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, [entries]);

  const jump = (event: MouseEvent<HTMLAnchorElement>, entry: ShopNavEntry) => {
    const target = document.getElementById(entry.id);

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });

    const url = new URL(window.location.href);
    url.hash = "";
    if (entry.slug) {
      url.searchParams.set("category", entry.slug);
    } else {
      url.searchParams.delete("category");
    }
    window.history.replaceState(null, "", url.pathname + url.search);
  };

  return (
    <nav
      className={variant === "rail" ? styles.railNav : styles.chips}
      aria-label="Marketplace sections"
    >
      {variant === "rail" ? <p className={styles.railTitle}>Browse</p> : null}
      {entries.map((entry) => (
        <a
          key={entry.id}
          className={variant === "rail" ? styles.railLink : styles.chip}
          href={`#${entry.id}`}
          onClick={(event) => jump(event, entry)}
          aria-current={entry.id === active ? "location" : undefined}
          data-featured={entry.featured || undefined}
        >
          <span className={styles.slot}>
            <MarketImage src={entry.image} width={32} eager />
          </span>
          <span className={styles.navLabel}>{entry.label}</span>
          {entry.sale ? <em className={styles.navSale}>Sale</em> : null}
          {entry.count !== null ? <small className={styles.navCount}>{entry.count}</small> : null}
        </a>
      ))}
    </nav>
  );
}

/* Scrolls to the section in ?category= once, when the page opens. */
export function JumpTo({ id }: { id: string }) {
  useEffect(() => {
    if (/^#item-\d+$/.test(window.location.hash)) {
      return;
    }

    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, [id]);

  return null;
}
