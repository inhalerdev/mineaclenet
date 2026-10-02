import type { ReactNode } from "react";
import styles from "./ContentPage.module.css";

/*
 * Top of a content page (vote, bans, leaderboards): colored tag, big
 * title, one line of text. `aside` sits on the right (e.g. a count tile);
 * `footer` goes under the text (e.g. a row of stat tiles).
 */
export function PageIntro({
  tag,
  tone = "gold",
  title,
  children,
  aside,
  footer,
}: {
  tag: string;
  tone?: "gold" | "red" | "purple";
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <header className={styles.intro}>
      <div className={styles.introText}>
        <span className={styles.tag} data-tone={tone}>
          {tag}
        </span>
        <h1>{title}</h1>
        <p>{children}</p>
        {footer}
      </div>
      {aside}
    </header>
  );
}

/* One stat tile: small label under a bigger value. Put these in a
   <dl className={content.stats}>. */
export function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
