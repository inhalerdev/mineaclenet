import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import type { FollowingPlayer } from "@/features/social/follows";
import { FollowPlayer } from "./FollowPlayer";
import { FollowToggle } from "./FollowToggle";
import styles from "./FollowingPage.module.css";
import { RankPrefix } from "@/components/players/RankPrefix";

export type FriendsTab = "following" | "followers";

/*
 * Friends (/following): add a player by name, then tabs for the players you
 * follow and the players who follow you. Each card shows their head and
 * status, with a Following button to unfollow, or Follow to follow back.
 * Data is loaded by app/following/page.tsx.
 */
export function FollowingPage({
  viewer,
  topPlayers,
  tab = "following",
  following,
  followers = [],
}: {
  viewer: Viewer;
  topPlayers: HomeLeaderboardPlayer[];
  tab?: FriendsTab;
  /* null when the database can't be reached. */
  following: FollowingPlayer[] | null;
  followers?: FollowingPlayer[] | null;
}) {
  const followingUuids = new Set(following?.map(({ profile }) => profile.uuid) ?? []);
  const list = tab === "followers" ? followers : following;

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath="/following"
      variant="content"
    >
      <div className={content.content}>
        <PageIntro
          tag="Social"
          title="Friends"
          footer={
            <div className={styles.add}>
              <FollowPlayer
                viewerUuid={viewer.uuid}
                followingUuids={[...followingUuids]}
              />
            </div>
          }
        >
          Keep up with your friends and rivals. Follow players here or from
          their profile.
        </PageIntro>

        <nav className={content.chips} aria-label="Friends">
          <a
            className={content.chip}
            href="/following"
            aria-current={tab === "following" ? "page" : undefined}
          >
            Following{following ? ` (${following.length})` : ""}
          </a>
          <a
            className={content.chip}
            href="/following?tab=followers"
            aria-current={tab === "followers" ? "page" : undefined}
          >
            Followers{followers ? ` (${followers.length})` : ""}
          </a>
        </nav>

        {!list ? (
          <div className={content.empty}>
            <strong>This list is unavailable right now</strong>
            <p>Please try again in a minute.</p>
          </div>
        ) : list.length === 0 ? (
          <div className={content.empty}>
            {tab === "followers" ? (
              <>
                <strong>No followers yet</strong>
                <p>When players follow you from your profile, they show up here.</p>
              </>
            ) : (
              <>
                <strong>You aren&apos;t following anyone yet</strong>
                <p>Follow a player above, or open a profile from the leaderboards.</p>
              </>
            )}
          </div>
        ) : (
          <ul
            className={styles.list}
            aria-label={tab === "followers" ? "Players who follow you" : "Players you follow"}
          >
            {list.map(({ profile }) => (
              <li className={styles.card} key={profile.uuid}>
                <a
                  className={styles.player}
                  href={`/player/${encodeURIComponent(profile.username)}`}
                >
                  <img
                    src={playerAvatarUrl(profile.uuid, 64)}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <span className={styles.playerText}>
                    <strong>
                      <RankPrefix rankKey={profile.rankKey} />
                      {profile.displayName || profile.username}
                    </strong>
                    <small data-online={profile.online || undefined}>
                      {profile.online
                        ? profile.worldName
                          ? `Online · ${profile.worldName}`
                          : "Online"
                        : profile.teamName || profile.rankName || "Player"}
                    </small>
                  </span>
                </a>
                <FollowToggle
                  uuid={profile.uuid}
                  username={profile.username}
                  initialFollowing={followingUuids.has(profile.uuid)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </FramedPage>
  );
}
