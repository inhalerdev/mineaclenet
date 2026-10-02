import { homeContent } from "@/features/home/home-content";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import { siteNavigation } from "@/shared/navigation/site-navigation";
import styles from "./SiteFooter.module.css";

/*
 * Footer under the framed box on every page except the homepage
 * (FramedPage.tsx), laid out like Minecraft.net's: brand and server IP,
 * link columns, social buttons, then a legal bar with the copyright, the
 * studio credit ("Mineacle Studios" links to @mineaclestudios on X) and the
 * disclaimer the Minecraft Usage Guidelines require on community sites
 * (https://www.minecraft.net/en-us/usage-guidelines).
 */
const STUDIO_X_URL = "https://x.com/mineaclestudios";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const discord = homeContent.discord.invite;
  const pages = siteNavigation.filter((item) => item.href !== "/");

  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <a href="/" className={styles.logo} aria-label="Mineacle home">
            <img src="/shared/images/branding/mineacle-logo.png" alt="" draggable={false} />
          </a>
          <p>Fight. Trade. Rise.</p>
          <p className={styles.ip}>
            <span>Java IP</span>
            <b>{homeContent.join.address}</b>
          </p>
        </div>

        <nav className={styles.links} aria-label="Footer">
          <div>
            <h2>Explore</h2>
            <ul>
              {pages.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Community</h2>
            <ul>
              {discord ? (
                <li>
                  <a href={discord} target="_blank" rel="noopener noreferrer">
                    Discord
                  </a>
                </li>
              ) : null}
              <li>
                <a href={STUDIO_X_URL} target="_blank" rel="noopener noreferrer">
                  X (Twitter)
                </a>
              </li>
              <li>
                <a href="/vote">Vote for keys</a>
              </li>
            </ul>
          </div>
        </nav>

        <div className={styles.social}>
          {discord ? (
            <a
              href={discord}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Mineacle on Discord (opens in a new tab)"
            >
              <img src={mineacleIcons.socialDiscord} alt="" />
            </a>
          ) : null}
          <a
            href={STUDIO_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Mineacle Studios on X (opens in a new tab)"
          >
            <img src={mineacleIcons.socialX} alt="" />
          </a>
        </div>
      </div>

      <div className={styles.legal}>
        <p>
          © {year} Mineacle Studios. All rights reserved. Developed by{" "}
          <a href={STUDIO_X_URL} target="_blank" rel="noopener noreferrer">
            Mineacle Studios
          </a>
          .
        </p>
        <p className={styles.disclaimer}>
          Not an official Minecraft service. Not approved by or associated with
          Mojang or Microsoft.
        </p>
      </div>
    </footer>
  );
}
