import styles from "./SiteFooter.module.css";

/*
 * Footer under the framed box on every page except the homepage
 * (FramedPage.tsx): copyright, who made the site ("Mineacle Studios" links
 * to the studio's X profile, @mineaclestudios), and the disclaimer the
 * Minecraft Usage Guidelines require on community servers and websites
 * (https://www.minecraft.net/en-us/usage-guidelines).
 */
const STUDIO_X_URL = "https://x.com/mineaclestudios";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <p className={styles.credits}>
        <span>© {year} Mineacle Studios. All rights reserved.</span>
        <span>
          Developed by{" "}
          <a href={STUDIO_X_URL} target="_blank" rel="noopener noreferrer">
            Mineacle Studios
            <span className={styles.srOnly}> (X profile, opens in a new tab)</span>
          </a>
        </span>
      </p>
      <p className={styles.disclaimer}>
        NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH
        MOJANG OR MICROSOFT.
      </p>
    </footer>
  );
}
