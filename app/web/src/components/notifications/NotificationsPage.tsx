import content from "@/components/site/ContentPage.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import { PageIntro } from "@/components/site/PageIntro";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import type { AccountNotification } from "@/features/notifications/repository";
import { profileDate, timeAgo } from "@/features/players/profile-format";
import { MarkNotificationsRead } from "./MarkNotificationsRead";
import styles from "./NotificationsPage.module.css";

/*
 * Notifications (/notifications): your newest 50, newest first; unread
 * ones are lit up. Data is loaded by app/notifications/page.tsx.
 */
export function NotificationsPage({
  viewer,
  topPlayers,
  notifications,
}: {
  viewer: Viewer;
  topPlayers: HomeLeaderboardPlayer[];
  /* null when the database can't be reached. */
  notifications: AccountNotification[] | null;
}) {
  const unread = notifications?.filter((item) => item.unread).length ?? 0;

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath="/notifications"
      variant="content"
    >
      <div className={content.content}>
        <PageIntro
          tag="Activity"
          title="Notifications"
          aside={<MarkNotificationsRead hasUnread={unread > 0} />}
        >
          {unread > 0
            ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}.`
            : "You're all caught up."}
        </PageIntro>

        {!notifications ? (
          <div className={content.empty}>
            <strong>Notifications are unavailable right now</strong>
            <p>Please try again in a minute.</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={content.empty}>
            <strong>Nothing here yet</strong>
            <p>News about your account and the players you follow will show up here.</p>
          </div>
        ) : (
          <ol className={styles.list}>
            {notifications.map((item) => (
              <li
                key={item.id}
                className={styles.item}
                data-unread={item.unread || undefined}
              >
                <span className={styles.dot} aria-hidden="true" />
                <div className={styles.text}>
                  <div className={styles.meta}>
                    {item.category ? (
                      <span className={styles.category}>{item.category}</span>
                    ) : null}
                    {item.unread ? <span className={content.srOnly}>Unread.</span> : null}
                    <time
                      dateTime={
                        item.createdAt
                          ? new Date(item.createdAt * 1000).toISOString()
                          : undefined
                      }
                      title={profileDate(item.createdAt)}
                    >
                      {timeAgo(item.createdAt)}
                    </time>
                  </div>
                  <strong>{item.title}</strong>
                  {item.body ? <p>{item.body}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </FramedPage>
  );
}
