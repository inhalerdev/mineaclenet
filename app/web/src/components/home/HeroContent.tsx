import type { CSSProperties, ReactNode } from "react";
import styles from "./HeroContent.module.css";

/*
 * Text block in the homepage hero, bottom-left over the background video:
 * a tag and a "What's new" line, a big headline (last part in purple), a
 * line of text, a row of small blocks, the buttons, and a thin live strip
 * (players online, players joined, IP).
 *
 * The small blocks are styled like the filter tabs on the other pages.
 * Visitors see the four things Mineacle is about (PvP, survival, trading,
 * friends); logged-in players see their own numbers there (leaderboard
 * spot, votes left, friends online), and each one is a link.
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

export type HeroPillarIcon = "sword" | "heart" | "emerald" | "friends" | "key";

export type HeroPillar = {
  icon: HeroPillarIcon;
  label: string;
  /** Shown when hovering the block. */
  detail: string;
  /** Icon color (the stat colors from the in-game tab list). */
  color: string;
  /** Makes the block a link. */
  href?: string;
};

export type HeroNews = {
  /** Small badge, e.g. "New". */
  label: string;
  text: string;
  /** Optional page to read more on. */
  href?: string;
};

/* Pixel icons drawn from little grids ("#" = filled pixel). */
const PIXEL_ICONS: Record<HeroPillarIcon, string[]> = {
  sword: [
    ".......##",
    "......###",
    ".....###.",
    "#...###..",
    ".#.###...",
    "..###....",
    "..##.....",
    ".#..#....",
    "#........",
  ],
  heart: [
    ".##...##.",
    "####.####",
    "#########",
    "#########",
    ".#######.",
    "..#####..",
    "...###...",
    "....#....",
  ],
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
  friends: [
    ".##...##.",
    ".##...##.",
    ".........",
    "####.####",
    "####.####",
    "####.####",
  ],
  key: [
    ".###.",
    ".#.#.",
    ".###.",
    "..#..",
    "..##.",
    "..#..",
    "..##.",
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

function PixelIcon({ icon }: { icon: HeroPillarIcon }) {
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

/* "What's new" line: plain text next to the tag, the label in gold. */
function NewsLine({ news }: { news: HeroNews }) {
  const inner = (
    <>
      <b>{news.label || "New"}</b>
      <span>{news.text}</span>
    </>
  );

  return news.href ? (
    <a className={styles.news} href={news.href}>
      {inner}
    </a>
  ) : (
    <span className={styles.news}>{inner}</span>
  );
}

type HeroContentProps = {
  tags: { label: string; tone: "gold" | "dark" }[];
  news?: HeroNews | null;
  headline: string;
  /** Shown after the headline in brand purple (e.g. "Rise."). */
  headlineAccent?: string;
  text: ReactNode;
  pillars?: HeroPillar[];
  action: ReactNode;
  stats?: HeroStat[];
};

export function HeroContent({
  tags,
  news = null,
  headline,
  headlineAccent,
  text,
  pillars = [],
  action,
  stats = [],
}: HeroContentProps) {
  return (
    <div className={styles.hero}>
      <div className={styles.content}>
        {tags.length > 0 || news?.text ? (
          <div className={styles.tags}>
            {tags.map((tag) => (
              <span className={styles.tag} data-tone={tag.tone} key={tag.label}>
                {tag.label}
              </span>
            ))}
            {news?.text ? <NewsLine news={news} /> : null}
          </div>
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
        <p className={styles.text}>{text}</p>

        {pillars.length > 0 ? (
          <ul className={styles.pillars}>
            {pillars.map((pillar) => {
              const inner = (
                <>
                  <span className={styles.pillarIcon}>
                    <PixelIcon icon={pillar.icon} />
                  </span>
                  <span>{pillar.label}</span>
                </>
              );

              return (
                <li key={pillar.icon} style={{ "--pillar": pillar.color } as CSSProperties}>
                  {pillar.href ? (
                    <a className={styles.pillar} href={pillar.href} title={pillar.detail}>
                      {inner}
                    </a>
                  ) : (
                    <span className={styles.pillar} title={pillar.detail}>
                      {inner}
                    </span>
                  )}
                </li>
              );
            })}
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
