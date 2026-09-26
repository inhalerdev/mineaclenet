import type { ReactNode } from "react";
import styles from "./HeroContent.module.css";

/*
 * Text block in the homepage hero, bottom-left over the background video
 * (the minecraft.net layout): small tags, a big headline, a line of text,
 * the main button, and a row of live stat tiles under it.
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

type HeroContentProps = {
  tags: { label: string; tone: "gold" | "dark" }[];
  headline: string;
  text: ReactNode;
  action: ReactNode;
  stats?: HeroStat[];
};

export function HeroContent({
  tags,
  headline,
  text,
  action,
  stats = [],
}: HeroContentProps) {
  return (
    <div className={styles.hero}>
      <div className={styles.content}>
        {tags.length > 0 ? (
          <div className={styles.tags}>
            {tags.map((tag) => (
              <span className={styles.tag} data-tone={tag.tone} key={tag.label}>
                {tag.label}
              </span>
            ))}
          </div>
        ) : null}
        <h1 className={styles.headline}>{headline}</h1>
        <p className={styles.text}>{text}</p>
        <div className={styles.action}>{action}</div>

        {stats.length > 0 ? (
          <dl className={styles.stats}>
            {stats.map((stat) => (
              <div className={styles.stat} key={stat.key}>
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
