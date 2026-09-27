import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./VerifiedBadge.module.css";

/*
 * Purple check block next to a player's name when their Minecraft account
 * is linked to a Mineacle website account (features/players/verified.ts).
 *   size="large"  next to the big name on a profile
 *   size="small"  next to names in lists (leaderboards)
 */
export function VerifiedBadge({ size = "small" }: { size?: "small" | "large" }) {
  const label = "Verified: linked to their Minecraft account";

  return (
    <span className={styles.badge} data-size={size} role="img" aria-label={label} title={label}>
      <img src={mineacleIcons.check} alt="" draggable={false} />
    </span>
  );
}
