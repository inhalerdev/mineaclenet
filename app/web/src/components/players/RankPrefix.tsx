import type { CSSProperties } from "react";
import { rankPrefix } from "@/features/players/rank-prefix";
import styles from "./RankPrefix.module.css";

/*
 * The rank prefix before a player's name ("+", camera, BUILDER, DEV...),
 * from their LuckPerms group (features/players/rank-prefix.ts). Renders
 * nothing for default players. Sizes itself to the text around it.
 */
export function RankPrefix({ rankKey }: { rankKey: string | null | undefined }) {
  const prefix = rankPrefix(rankKey);

  if (!prefix) {
    return null;
  }

  const common = {
    className: styles.prefix,
    "data-kind": prefix.kind,
    style: { "--rank-color": prefix.color } as CSSProperties,
    title: prefix.label,
  };

  if (prefix.kind === "camera") {
    return (
      <span {...common} role="img" aria-label={prefix.label}>
        {/* Media rank icon: 13 x 9 pixel camera */}
        <svg viewBox="0 0 13 9" aria-hidden="true" shapeRendering="crispEdges">
          <path d="M12 0h1v1H12zM10 1h2v1H10zM3 2h9v1H3zM0 3h1v1H0zM3 3h8v1H3zM12 3h1v1H12zM0 4h11v1H0zM0 5h11v1H0zM0 6h11v1H0zM0 7h1v1H0zM3 7h8v1H3zM3 8h8v1H3z" />
        </svg>
      </span>
    );
  }

  return (
    <span {...common} aria-label={prefix.label}>
      <span aria-hidden="true">{prefix.text}</span>
    </span>
  );
}
