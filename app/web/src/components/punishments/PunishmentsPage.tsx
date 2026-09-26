import { playerAvatarUrl } from "@/components/players/PlayerAvatar";
import block from "@/components/site/BlockButton.module.css";
import { FramedPage } from "@/components/site/FramedPage";
import type { HomeLeaderboardPlayer } from "@/components/site/SiteHeader";
import type { Viewer } from "@/features/auth/types";
import {
  formatDate,
  formatTime,
  punishmentLength,
  punishmentState,
  punishmentStatuses,
  punishmentTypes,
  punishmentsHref,
  type PunishmentFilters,
} from "@/features/punishments/format";
import type { PunishmentPage } from "@/features/punishments/repository";
import { mineacleIcons } from "@/shared/icons/mineacle-icons";
import styles from "./PunishmentsPage.module.css";

const TYPE_LABEL = { ban: "Ban", mute: "Mute", warning: "Warning", kick: "Kick" } as const;
const STATE_LABEL = { active: "Active", removed: "Removed", expired: "Expired" } as const;

/*
 * Public records (/punishments): bans, mutes, warnings and kicks from
 * LiteBans. Search by player, filter by type and status; everything is in
 * the URL, so filters work without JavaScript and can be shared as links.
 * The data is loaded by app/punishments/page.tsx.
 */
export function PunishmentsPage({
  viewer,
  topPlayers,
  filters,
  data,
}: {
  viewer: Viewer | null;
  topPlayers: HomeLeaderboardPlayer[];
  filters: PunishmentFilters;
  /* null when the records database can't be reached. */
  data: PunishmentPage | null;
}) {
  const filtered = Boolean(filters.q) || filters.type !== "all" || filters.status !== "all";

  return (
    <FramedPage
      viewer={viewer}
      topPlayers={topPlayers}
      currentPath="/punishments"
      align="top"
    >
      <div className={styles.records}>
        <header className={styles.intro}>
          <div>
            <span className={styles.tag}>Public Records</span>
            <h1>Bans &amp; Punishments</h1>
            <p>Every ban, mute, warning and kick on Mineacle, newest first.</p>
          </div>
          {data ? (
            <p className={styles.total}>
              <strong>{data.total.toLocaleString()}</strong>
              <span>{data.total === 1 ? "record" : "records"}</span>
            </p>
          ) : null}
        </header>

        <div className={styles.filters}>
          <form className={styles.search} action="/punishments" method="get" role="search">
            <label htmlFor="records-player" className={styles.srOnly}>
              Player
            </label>
            <img src={mineacleIcons.search} alt="" />
            <input
              id="records-player"
              name="q"
              defaultValue={filters.q}
              maxLength={36}
              placeholder="Search a player"
              autoComplete="off"
              spellCheck={false}
            />
            {filters.type !== "all" ? <input type="hidden" name="type" value={filters.type} /> : null}
            {filters.status !== "all" ? <input type="hidden" name="status" value={filters.status} /> : null}
            <button className={`${block.button} ${block.primary}`} type="submit">
              Search
            </button>
          </form>

          <nav className={styles.chips} aria-label="Type">
            {punishmentTypes.map((item) => (
              <a
                key={item.key}
                className={styles.chip}
                href={punishmentsHref({ ...filters, type: item.key })}
                aria-current={filters.type === item.key ? "true" : undefined}
                data-type={item.key}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <nav className={styles.chips} aria-label="Status">
            {punishmentStatuses.map((item) => (
              <a
                key={item.key}
                className={styles.chip}
                href={punishmentsHref({ ...filters, status: item.key })}
                aria-current={filters.status === item.key ? "true" : undefined}
              >
                {item.label}
              </a>
            ))}
            {filtered ? (
              <a className={styles.clear} href="/punishments">
                Clear
              </a>
            ) : null}
          </nav>
        </div>

        {!data ? (
          <div className={styles.empty}>
            <strong>Records are unavailable right now</strong>
            <p>Please try again in a minute.</p>
          </div>
        ) : data.records.length === 0 ? (
          <div className={styles.empty}>
            <strong>No records found</strong>
            <p>
              {filters.q
                ? `Nothing on record for ${filters.q} with these filters.`
                : "Nothing matches these filters."}
            </p>
          </div>
        ) : (
          <>
            {filters.q ? (
              <p className={styles.context}>
                Showing records for <strong>{data.matchedPlayer || filters.q}</strong>
              </p>
            ) : null}

            <div className={styles.table}>
              <div className={styles.head} aria-hidden="true">
                <span>Player</span>
                <span>Type</span>
                <span>Reason</span>
                <span>Staff</span>
                <span>Date</span>
                <span>Length</span>
              </div>

              <ol className={styles.list}>
                {data.records.map((record) => {
                  const state = punishmentState(record);
                  const length = punishmentLength(record);
                  const known = record.username !== "Unknown player";

                  return (
                    <li className={styles.row} key={record.key}>
                      <div className={styles.player}>
                        <img
                          src={playerAvatarUrl(record.uuid || "", 40)}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                        {known ? (
                          <a href={`/player/${encodeURIComponent(record.username)}`}>
                            {record.username}
                          </a>
                        ) : (
                          <span>{record.username}</span>
                        )}
                      </div>

                      <div className={styles.type}>
                        <span className={styles.badge} data-type={record.type}>
                          {TYPE_LABEL[record.type]}
                        </span>
                        {state ? (
                          <span className={styles.state} data-state={state}>
                            {STATE_LABEL[state]}
                          </span>
                        ) : null}
                      </div>

                      <div className={styles.reason}>
                        <p>{record.reason}</p>
                        <small className={styles.staffInline}>By {record.staffName}</small>
                        {state === "removed" ? (
                          <small>
                            Removed by {record.removedByName}
                            {record.removedReason ? `: ${record.removedReason}` : ""}
                          </small>
                        ) : null}
                      </div>

                      <div className={styles.cell} data-label="Staff">
                        {record.staffName}
                      </div>

                      <div className={styles.cell} data-label="Date">
                        <time dateTime={record.createdAt ? new Date(record.createdAt).toISOString() : undefined}>
                          {formatDate(record.createdAt)}
                        </time>
                        <small>{formatTime(record.createdAt)}</small>
                      </div>

                      <div className={styles.cell} data-label="Length">
                        {length ?? <span className={styles.none}>–</span>}
                        <small>#{record.id}</small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {data.totalPages > 1 ? (
              <nav className={styles.pages} aria-label="Pages">
                {data.page > 1 ? (
                  <a className={block.button} href={punishmentsHref(filters, data.page - 1)}>
                    Previous
                  </a>
                ) : (
                  <span />
                )}
                <small>
                  Page {data.page.toLocaleString()} of {data.totalPages.toLocaleString()}
                </small>
                {data.page < data.totalPages ? (
                  <a className={block.button} href={punishmentsHref(filters, data.page + 1)}>
                    Next
                  </a>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        )}
      </div>
    </FramedPage>
  );
}
