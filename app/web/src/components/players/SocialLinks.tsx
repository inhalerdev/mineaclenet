import { SOCIAL_PLATFORMS, type SocialLink } from "@/features/social/social-platforms";
import { VerifiedBadge } from "./VerifiedBadge";
import styles from "./SocialLinks.module.css";

/*
 * A player's social links on their profile: small block chips with the
 * platform name and their handle. Links open in a new tab; Discord has no
 * profile links, so it just shows the username. Verified links (proven to be
 * theirs) get the purple check.
 */
export function SocialLinks({ links }: { links: SocialLink[] }) {
  if (!links.length) {
    return null;
  }

  return (
    <ul className={styles.links} aria-label="Social links">
      {links.map((link) => {
        const rule = SOCIAL_PLATFORMS[link.platform];
        const url = rule.url?.(link.handle);
        const inner = (
          <>
            <span className={styles.platform}>{rule.label}</span>
            <span className={styles.handle}>{rule.display(link.handle)}</span>
            {link.verified ? <VerifiedBadge /> : null}
          </>
        );

        return (
          <li key={link.platform}>
            {url ? (
              <a
                className={styles.link}
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                data-platform={link.platform}
              >
                {inner}
              </a>
            ) : (
              <span className={styles.link} data-platform={link.platform}>
                {inner}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
