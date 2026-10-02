import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroContent.module.css";

/*
 * Text block in the homepage hero, bottom-left over the background video:
 *
 *   [OPEN BETA] Now open for Java Edition     (gold tag + quiet news)
 *   Big headline, last part in purple
 *   A line of text. For visitors the words for what Mineacle is about
 *   (fight, survive, trade, friends) are in their in-game stat colors.
 *   Quick stats (logged-in players only): their leaderboard spot, votes
 *   left and friends online, as small tiles that link to those pages.
 *   Play Now + Vote for Keys
 *   Thin live strip (players online, players joined, IP)
 */

export type HeroStat = {
  key: string;
  value: ReactNode;
  label: string;
  /** Optional small image before the value (e.g. a player head). */
  image?: string;
  /** Green light before the value (e.g. players online). */
  live?: boolean;
};

export type HeroIcon = "emerald" | "key" | "friends";

export type HeroQuickStat = {
  icon: HeroIcon;
  /** Icon color (the stat colors from the in-game tab list). */
  color: string;
  value: string;
  label: string;
  href: string;
};

export type HeroHighlight = {
  /** A word in the text to color, e.g. "trade". */
  word: string;
  color: string;
};

export type HeroNews = {
  text: string;
  /** Optional page to read more on. */
  href?: string;
};

/* Pixel icons drawn from little grids ("#" = filled pixel). */
const PIXEL_ICONS: Record<HeroIcon, string[]> = {
  emerald: [
    "...##...",
    "..####..",
    ".######.",
    "########",
    "########",
    ".######.",
    "..####..",
    "...##...",
  ],
  key: [
    "..########............",
    "..########............",
    "##........##..........",
    "##........############",
    "##..####..############",
    "##..####............##",
    "##..####............##",
    "##..####..######..####",
    "##........######..####",
    "##........##..##..##..",
    "..########......####..",
    "..########......####..",
  ],
  friends: [
    ".##...##.",
    ".##...##.",
    ".........",
    "####.####",
    "####.####",
    "####.####",
  ],
};

function pixelPath(rows: string[]) {
  let path = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === "#") {
        path += `M${x} ${y}h1v1H${x}z`;
      }
    }
  });
  return path;
}

function PixelIcon({ icon }: { icon: HeroIcon }) {
  const rows = PIXEL_ICONS[icon];
  return (
    <svg
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      aria-hidden="true"
      focusable="false"
      shapeRendering="crispEdges"
    >
      <path d={pixelPath(rows)} />
    </svg>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* The text with each highlight word (whole words, any case) colored. */
function highlightText(text: string, highlights: HeroHighlight[]): ReactNode {
  const words = highlights.map((item) => item.word).filter(Boolean);

  if (!words.length) {
    return text;
  }

  const colors = new Map(highlights.map((item) => [item.word.toLowerCase(), item.color]));
  const pattern = new RegExp(`\\b(${words.map(escapeRegExp).join("|")})\\b`, "gi");

  return text.split(pattern).map((part, index) => {
    const color = colors.get(part.toLowerCase());
    return color ? (
      <b key={index} style={{ color }}>
        {part}
      </b>
    ) : (
      part
    );
  });
}

type HeroContentProps = {
  /** Short status word, e.g. "Open Beta". */
  tag: string;
  news?: HeroNews | null;
  headline: string;
  /** Shown after the headline in brand purple (e.g. "Rise."). */
  headlineAccent?: string;
  text: string;
  highlights?: HeroHighlight[];
  quickStats?: HeroQuickStat[];
  action: ReactNode;
  stats?: HeroStat[];
};

export function HeroContent({
  tag,
  news = null,
  headline,
  headlineAccent,
  text,
  highlights = [],
  quickStats = [],
  action,
  stats = [],
}: HeroContentProps) {
  return (
    <div className={styles.hero}>
      <div className={styles.content}>
        {tag || news?.text ? (
          <p className={styles.eyebrow}>
            {tag ? <span className={styles.tag}>{tag}</span> : null}
            {news?.text ? (
              news.href ? (
                <a className={styles.news} href={news.href}>
                  {news.text}
                </a>
              ) : (
                <span className={styles.news}>{news.text}</span>
              )
            ) : null}
          </p>
        ) : null}

        <h1 className={styles.headline}>
          {headline}
          {headlineAccent ? (
            <>
              {" "}
              <span className={styles.accent}>{headlineAccent}</span>
            </>
          ) : null}
        </h1>
        <p className={styles.text}>{highlightText(text, highlights)}</p>

        {quickStats.length > 0 ? (
          <ul className={styles.quickStats}>
            {quickStats.map((stat) => (
              <li key={stat.icon}>
                <a
                  className={styles.quickStat}
                  href={stat.href}
                  style={{ "--quick": stat.color } as CSSProperties}
                >
                  <span className={styles.quickIcon}>
                    <PixelIcon icon={stat.icon} />
                  </span>
                  <span className={styles.quickText}>
                    <strong>{stat.value}</strong>
                    <small>{stat.label}</small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.action}>{action}</div>

        {stats.length > 0 ? (
          <dl className={styles.stats}>
            {stats.map((stat) => (
              <div className={styles.stat} data-key={stat.key} key={stat.key}>
                <dd>
                  {stat.live ? (
                    <i className={styles.live} aria-hidden="true" />
                  ) : null}
                  {stat.image ? (
                    <img
                      src={stat.image}
                      alt=""
                      referrerPolicy="no-referrer"
                      draggable={false}
                    />
                  ) : null}
                  <span>{stat.value}</span>
                </dd>
                <dt>{stat.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </div>
  );
}
