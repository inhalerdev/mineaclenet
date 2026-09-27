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

/*
 * Following (/following): add a player by name, then one card per player
 * you follow with their head, status and a Following button to unfollow.
 * Data is loaded by app/following/page.tsx.
 */
export function FollowingPage({
  viewer,
  topPlayers,
  following,
}: {
  viewer: Viewer;
  topPlayers: HomeLeaderboardPlayer[];
  /* null when the database can't be reached. */
  following: FollowingPlayer[] | null;
}) {
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
          title="Following"
          footer={
            <div className={styles.add}>
              <FollowPlayer
                viewerUuid={viewer.uuid}
                followingUuids={following?.map(({ profile }) => profile.uuid) ?? []}
              />
            </div>
          }
        >
          Keep up with your friends and rivals. Follow players here or from
          their profile.
        </PageIntro>

        {!following ? (
          <div className={content.empty}>
            <strong>Your list is unavailable right now</strong>
            <p>Please try again in a minute.</p>
          </div>
        ) : following.length === 0 ? (
          <div className={content.empty}>
            <strong>You aren&apos;t following anyone yet</strong>
            <p>Follow a player above, or open a profile from the leaderboards.</p>
          </div>
        ) : (
          <ul className={styles.list} aria-label="Players you follow">
            {following.map(({ profile }) => (
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
                    <strong>{profile.displayName || profile.username}</strong>
                    <small data-online={profile.online || undefined}>
                      {profile.online ? "Online" : profile.teamName || profile.rankName || "Player"}
                    </small>
                  </span>
                </a>
                <FollowToggle uuid={profile.uuid} username={profile.username} initialFollowing />
              </li>
            ))}
          </ul>
        )}
      </div>
    </FramedPage>
  );
}
