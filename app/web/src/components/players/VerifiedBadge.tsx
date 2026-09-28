import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./VerifiedBadge.module.css";

/*
 * Purple check block next to a player's name when their Minecraft account
 * is linked to a Mineacle website account (features/players/verified.ts).
 *   size="large"  next to the big name on a profile
 *   size="small"  next to names in lists (leaderboards)
 * Hovering the badge shows a Minecraft-style tooltip with
 * `label`.
 */
export function VerifiedBadge({
  size = "small",
  label = "In-game account verified",
}: {
  size?: "small" | "large";
  label?: string;
}) {
  return (
    <span className={styles.badge} data-size={size} role="img" aria-label={label}>
      <img src={mineacleIcons.check} alt="" draggable={false} />
      <span className={styles.tip} aria-hidden="true">
        {label}
      </span>
    </span>
  );
}
