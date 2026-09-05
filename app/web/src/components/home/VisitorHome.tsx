"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { AuthClient } from "@/components/auth/AuthClient";
import { homeContent } from "@/features/home/home-content";
import styles from "./VisitorHome.module.css";

const SERVER_ADDRESS = "mineacle.net";
const SEARCH_ICON = "/shared/images/icons/streamline/core-solid/search.svg";
const USER_ICON = "/shared/images/icons/streamline/core-solid/user.svg";
const ICON_ROOT = "/shared/images/icons/streamline/core-solid";
const JAVA_EDITION_ICON =
  "/images/home/visitorhome/edition-java.png";
const BEDROCK_EDITION_ICON =
  "/images/home/visitorhome/edition-bedrock.png";

type AuthMode = "login" | "create";
type AuthStage = "edition" | "form";

type PlayerSearchResult = {
  uuid: string;
  username: string;
  displayName: string;
  online: boolean;
  teamName: string | null;
};

export function VisitorHome() {
  const [copied, setCopied] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authStage, setAuthStage] = useState<AuthStage>("edition");

  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const modalOpen = joinOpen || authMode !== null;

  useEffect(() => {
    if (!modalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setJoinOpen(false);
        setAuthMode(null);
        setAuthStage("edition");
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalOpen]);

  useEffect(() => {
    function closeSearch(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", closeSearch);
    return () => document.removeEventListener("mousedown", closeSearch);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    if (!/^[A-Za-z0-9_]{2,16}$/.test(trimmed)) {
      setPlayers([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearching(true);

      try {
        const response = await fetch(
          `/api/players/search?q=${encodeURIComponent(trimmed)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          setPlayers([]);
          return;
        }

        const data = (await response.json()) as {
          players?: PlayerSearchResult[];
        };

        setPlayers(data.players || []);
        setSearchOpen(true);
      } catch {
        if (!controller.signal.aborted) {
          setPlayers([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  async function copyServerAddress() {
    try {
      await navigator.clipboard.writeText(SERVER_ADDRESS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  function submitPlayerSearch(event: FormEvent) {
    event.preventDefault();

    if (players[0]) {
      window.location.assign(
        `/player/${encodeURIComponent(players[0].username)}`,
      );
    }
  }

  function openAuth(mode: AuthMode) {
    setJoinOpen(false);
    setAuthMode(mode);
    setAuthStage("edition");
  }

  function closeAuth() {
    setAuthMode(null);
    setAuthStage("edition");
  }

  async function finishPlayerAuthentication() {
    try {
      await fetch("/api/admin/preview/exit", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      });
    } catch {
      // Normal public visitors may not have a preview cookie to clear.
    }

    window.location.replace("/");
  }

  return (
    <>
      <main className={styles.page}>
        <header className={styles.utilityBar}>
          <div className={styles.playerSearch} ref={searchRef}>
            <form
              className={styles.searchForm}
              onSubmit={submitPlayerSearch}
              role="search"
            >
              <img src={SEARCH_ICON} alt="" draggable={false} />

              <input
                aria-label="Search for a Mineacle player"
                autoComplete="off"
                maxLength={16}
                placeholder="Search for a player"
                spellCheck={false}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => {
                  if (query.trim().length >= 2) {
                    setSearchOpen(true);
                  }
                }}
              />

              {searching ? (
                <span className={styles.searching}>SEARCHING</span>
              ) : null}
            </form>

            {searchOpen && query.trim().length >= 2 ? (
              <div className={styles.searchResults}>
                {players.length > 0 ? (
                  players.map((player) => (
                    <a
                      href={`/player/${encodeURIComponent(player.username)}`}
                      key={player.uuid}
                    >
                      <span className={styles.resultIcon}>
                        <img src={USER_ICON} alt="" draggable={false} />
                      </span>

                      <span className={styles.resultCopy}>
                        <strong>
                          {player.displayName || player.username}
                        </strong>
                        <small>
                          {player.teamName
                            ? `${player.username} · ${player.teamName}`
                            : player.username}
                        </small>
                      </span>

                      <span
                        className={`${styles.resultStatus} ${
                          player.online ? styles.resultOnline : ""
                        }`}
                      >
                        {player.online ? "ONLINE" : "OFFLINE"}
                      </span>
                    </a>
                  ))
                ) : !searching ? (
                  <div className={styles.noResults}>
                    No Mineacle players found
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <nav className={styles.accountActions} aria-label="Account">
            <button
              className={styles.verifyLink}
              type="button"
              onClick={() => openAuth("create")}
            >
              Verify in-game account
            </button>

            <button
              className={styles.loginButton}
              type="button"
              onClick={() => openAuth("login")}
            >
              Login
            </button>
          </nav>
        </header>

        <section className={styles.hero} aria-label="Mineacle open beta">
          <video
            className={styles.heroVideo}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-label={homeContent.hero.mediaLabel}
          >
            <source src={homeContent.hero.media} type="video/mp4" />
          </video>

          <div className={styles.heroShade} aria-hidden="true" />

          <a
            className={styles.heroLogoLink}
            href="/"
            aria-label="Mineacle home"
          >
            <img
              className={styles.heroLogo}
              src="/shared/images/branding/mineacle-logo.png"
              alt="Mineacle"
              draggable={false}
            />
          </a>

          <div className={styles.heroFooter}>
            <div className={styles.heroCopy}>
              <h1>
                MINEACLE <span>OPEN BETA</span>
              </h1>
              <p>
                The world is open. Build your name, grow your wealth, compete
                with other players, and be part of Mineacle before the full
                release.
              </p>
            </div>

            <div className={styles.playGroup}>
              <button
                className={styles.joinGuide}
                type="button"
                onClick={() => setJoinOpen(true)}
              >
                How to join mineacle.net
              </button>

              <button
                className={`${styles.playButton} ${
                  copied ? styles.playButtonCopied : ""
                }`}
                type="button"
                onClick={copyServerAddress}
                aria-label={`Copy Mineacle server address: ${SERVER_ADDRESS}`}
              >
                {copied ? "COPIED" : "PLAY"}
              </button>
            </div>

            <div aria-hidden="true" />
          </div>
        </section>

        <section className={styles.cards} aria-label="Explore Mineacle">
          <a className={styles.mediaCard} href="/leaderboards">
            <span className={styles.cardMedia}>
              <img
                src="/images/home/leaderboards.jpg"
                alt=""
                draggable={false}
              />
              <span className={styles.mediaShade} />
            </span>

            <span className={styles.cardContent}>
              <small>COMPETE</small>
              <strong>Leaderboards</strong>
              <span>See the players and teams leading Mineacle.</span>
              <b>VIEW LEADERBOARDS →</b>
            </span>
          </a>

          <a className={styles.mediaCard} href="/vote">
            <span className={`${styles.cardMedia} ${styles.mediaFallback}`}>
              <img
                className={styles.fallbackIcon}
                src={`${ICON_ROOT}/rewards.svg`}
                alt=""
                draggable={false}
              />
            </span>

            <span className={styles.cardContent}>
              <small>REWARDS</small>
              <strong>Vote for Mineacle</strong>
              <span>Support the server and collect voting rewards.</span>
              <b>VIEW REWARDS →</b>
            </span>
          </a>

          <a className={styles.mediaCard} href="/punishments">
            <span className={`${styles.cardMedia} ${styles.mediaFallback}`}>
              <img
                className={styles.fallbackIcon}
                src={`${ICON_ROOT}/punishments.svg`}
                alt=""
                draggable={false}
              />
            </span>

            <span className={styles.cardContent}>
              <small>PUBLIC RECORDS</small>
              <strong>Punishments</strong>
              <span>Review public bans and player punishment history.</span>
              <b>VIEW PUNISHMENTS →</b>
            </span>
          </a>

          <a
            className={styles.mediaCard}
            href="https://store.mineacle.net/"
            target="_blank"
            rel="noreferrer"
          >
            <span className={styles.cardMedia}>
              <img
                src="/images/home/mineacle-plus.png"
                alt=""
                draggable={false}
              />
              <span className={styles.mediaShade} />
            </span>

            <span className={styles.cardContent}>
              <small>MARKETPLACE</small>
              <strong>Mineacle Store</strong>
              <span>Explore Mineacle+ and available server upgrades.</span>
              <b>OPEN MARKETPLACE ↗</b>
            </span>
          </a>
        </section>
      </main>

      {authMode ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeAuth();
            }
          }}
        >
          <section
            className={`${styles.popup} ${styles.authPopup}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              authMode === "login"
                ? "Log in to Mineacle"
                : "Verify your Mineacle account"
            }
          >
            <button
              className={styles.modalClose}
              type="button"
              onClick={closeAuth}
              aria-label="Close account window"
            >
              ×
            </button>

            {authStage === "edition" ? (
              <>
                <header className={styles.editionHeader}>
                  <small>
                    {authMode === "login"
                      ? "MINEACLE ACCOUNT"
                      : "PLAYER VERIFICATION"}
                  </small>
                  <h2>Choose your edition</h2>
                  <p>
                    Select the Minecraft edition connected to your Mineacle
                    account.
                  </p>
                </header>

                <div className={styles.editionGrid}>
                  <button
                    className={styles.javaEdition}
                    type="button"
                    onClick={() => setAuthStage("form")}
                  >
                    <span className={styles.editionVisual}>
                      <img
                        src={JAVA_EDITION_ICON}
                        alt=""
                        draggable={false}
                      />
                    </span>

                    <span className={styles.editionCopy}>
                      <strong>Java Edition</strong>
                      <small>SUPPORTED</small>
                    </span>

                    <span className={styles.editionArrow}>→</span>
                  </button>

                  <button
                    className={styles.bedrockEdition}
                    type="button"
                    disabled
                    aria-disabled="true"
                  >
                    <span className={styles.editionVisual}>
                      <img
                        src={BEDROCK_EDITION_ICON}
                        alt=""
                        draggable={false}
                      />
                    </span>

                    <span className={styles.editionCopy}>
                      <strong>Bedrock Edition</strong>
                      <small>NOT SUPPORTED YET</small>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  className={styles.authBack}
                  type="button"
                  onClick={() => setAuthStage("edition")}
                >
                  ← Change edition
                </button>

                <AuthClient
                  initialMode={authMode}
                  onAuthenticated={finishPlayerAuthentication}
                />
              </>
            )}
          </section>
        </div>
      ) : null}

      {joinOpen ? (
        <div
          className={styles.modalBackdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setJoinOpen(false);
            }
          }}
        >
          <section
            className={`${styles.popup} ${styles.joinModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-mineacle-title"
          >
            <button
              className={styles.modalClose}
              type="button"
              onClick={() => setJoinOpen(false)}
              aria-label="Close how to join"
            >
              ×
            </button>

            <header className={styles.modalHeader}>
              <span>HOW TO JOIN</span>
              <h2 id="join-mineacle-title">Join Mineacle</h2>
              <p>
                Mineacle Open Beta currently supports Minecraft: Java Edition.
              </p>
            </header>

            <ol className={styles.joinSteps}>
              <li>
                <span>1</span>
                <div>
                  <strong>Open Minecraft: Java Edition</strong>
                  <p>Launch Minecraft and choose Multiplayer.</p>
                </div>
              </li>

              <li>
                <span>2</span>
                <div>
                  <strong>Add Mineacle</strong>
                  <p>Choose Add Server and enter the address below.</p>
                </div>
              </li>

              <li>
                <span>3</span>
                <div>
                  <strong>Join the world</strong>
                  <p>Select Mineacle from your server list and connect.</p>
                </div>
              </li>
            </ol>

            <div className={styles.serverAddress}>
              <div>
                <small>JAVA SERVER ADDRESS</small>
                <strong>{SERVER_ADDRESS}</strong>
              </div>

              <button
                type="button"
                onClick={copyServerAddress}
                className={copied ? styles.copySuccess : ""}
              >
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>

            <footer className={styles.modalFooter}>
              <span>Already joined Mineacle?</span>
              <button type="button" onClick={() => openAuth("create")}>
                Verify your player →
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
