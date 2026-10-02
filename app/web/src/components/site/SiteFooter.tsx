import { homeContent } from "@/features/home/home-content";
import { legalDocuments } from "@/features/legal/legal-content";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import block from "./BlockButton.module.css";
import styles from "./SiteFooter.module.css";

/*
 * Footer under the framed box on every page except the homepage
 * (FramedPage.tsx). Kept to one quiet line so the eye stays on the box:
 * the copyright, the disclaimer the Minecraft Usage Guidelines require on
 * community sites (https://www.minecraft.net/en-us/usage-guidelines), the
 * Terms / Privacy / Refunds links and two small social buttons. The pages
 * themselves are in the header.
 */
const STUDIO_X_URL = "https://x.com/mineaclestudios";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const discord = homeContent.discord.invite;

  return (
    <footer className={styles.footer}>
      <p className={styles.legal}>
        © {year}{" "}
        <a href={STUDIO_X_URL} target="_blank" rel="noopener noreferrer">
          Mineacle Studios
        </a>
        <span className={styles.dot} aria-hidden="true" />
        Not an official Minecraft service. Not approved by or associated with
        Mojang or Microsoft.
      </p>

      <nav className={styles.policies} aria-label="Legal">
        {legalDocuments.map((doc) => (
          <a key={doc.slug} href={doc.path}>
            {doc.label}
          </a>
        ))}
      </nav>

      <div className={styles.social}>
        {discord ? (
          <a
            className={`${block.button} ${block.square}`}
            href={discord}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Mineacle on Discord (opens in a new tab)"
          >
            <img src={mineacleIcons.socialDiscord} alt="" />
          </a>
        ) : null}
        <a
          className={`${block.button} ${block.square}`}
          href={STUDIO_X_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Mineacle Studios on X (opens in a new tab)"
        >
          <img src={mineacleIcons.socialX} alt="" />
        </a>
      </div>
    </footer>
  );
}
