import { AppSidebar } from "@/components/shell/AppSidebar";
import { getCurrentViewer } from "@/features/auth/session";
import { getPunishments, type PunishmentStatus, type PunishmentType } from "@/features/punishments/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Punishments | Mineacle",
  description: "Search Mineacle bans, mutes, warnings, and kicks.",
};

const TYPES: Array<{ key: PunishmentType | "all"; label: string }> = [
  { key: "all", label: "All" }, { key: "ban", label: "Bans" },
  { key: "mute", label: "Mutes" }, { key: "warning", label: "Warnings" },
  { key: "kick", label: "Kicks" },
];
const STATUSES: Array<{ key: PunishmentStatus; label: string }> = [
  { key: "all", label: "Any status" }, { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

function validType(value: string): PunishmentType | "all" {
  return TYPES.some((item) => item.key === value) ? value as PunishmentType | "all" : "all";
}
function validStatus(value: string): PunishmentStatus {
  return STATUSES.some((item) => item.key === value) ? value as PunishmentStatus : "all";
}
function formatDate(timestamp: number) {
  if (!timestamp) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Chicago", timeZoneName: "short",
  }).format(new Date(timestamp));
}
function expiryText(record: Awaited<ReturnType<typeof getPunishments>>["records"][number]) {
  if (!record.active) return "Inactive";
  if (record.permanent) return "Permanent";
  if (!record.expiresAt) return "Active";
  return `Until ${formatDate(record.expiresAt)}`;
}
function queryHref({ q, type, status, page }: { q: string; type: PunishmentType | "all"; status: PunishmentStatus; page: number }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (type !== "all") params.set("type", type);
  if (status !== "all") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/punishments?${query}` : "/punishments";
}

export default async function PunishmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; status?: string; page?: string }> }) {
  const params = await searchParams;
  const q = (params.q || "").trim().slice(0, 36);
  const type = validType(params.type || "all");
  const status = validStatus(params.status || "all");
  const requestedPage = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const viewerPromise = getCurrentViewer();
  let data: Awaited<ReturnType<typeof getPunishments>> | null = null;
  let unavailable = false;
  try {
    data = await getPunishments({ search: q, type, status, page: requestedPage, pageSize: 30 });
  } catch (error) {
    unavailable = true;
    console.error("[mineacle-punishments] Failed to load LiteBans data", error);
  }
  const viewer = await viewerPromise;

  return (
    <div className="mineacle-app">
      <AppSidebar viewer={viewer} />
      <main className="system-page">
        <section className="system-card punishments-shell">
          <header className="system-page-header punishments-header">
            <div><small>PUBLIC RECORDS</small><h1>Punishments</h1><p>Search bans, mutes, warnings, and kicks recorded by Mineacle.</p></div>
            {data ? <div className="punishments-count"><strong>{data.total.toLocaleString()}</strong><small>{data.total === 1 ? "record" : "records"}</small></div> : null}
          </header>

          <form className="punishments-filters" action="/punishments" method="get">
            <label className="punishments-search"><span>Player</span><input defaultValue={q} maxLength={36} name="q" placeholder="Minecraft username" spellCheck={false} /></label>
            <label><span>Type</span><select defaultValue={type} name="type">{TYPES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
            <label><span>Status</span><select defaultValue={status} name="status">{STATUSES.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
            <button type="submit">Search</button>
            {q || type !== "all" || status !== "all" ? <a href="/punishments">Clear</a> : null}
          </form>

          {unavailable ? (
            <div className="punishments-empty"><strong>Punishment records are temporarily unavailable</strong><p>Please try again shortly.</p></div>
          ) : data && data.records.length ? (
            <>
              {q ? <div className="punishments-result-context">Showing records for <strong>{data.matchedPlayer || q}</strong></div> : null}
              <div className="punishments-list">
                {data.records.map((record) => (
                  <article className="punishment-row" key={record.key}>
                    <div className={`punishment-type is-${record.type}`}>{record.type}</div>
                    <div className="punishment-main">
                      <div className="punishment-title">
                        <a href={record.username === "Unknown player" ? "/punishments" : `/player/${encodeURIComponent(record.username)}`}>{record.username}</a>
                        <span className={record.active ? "punishment-status is-active" : "punishment-status"}>{record.active ? "Active" : "Inactive"}</span>
                      </div>
                      <p>{record.reason}</p>
                      <div className="punishment-meta"><span>Issued by <strong>{record.staffName}</strong></span><span>{formatDate(record.createdAt)}</span><span>{expiryText(record)}</span></div>
                      {!record.active && record.removedByName ? <div className="punishment-removed">Removed by {record.removedByName}{record.removedReason ? ` · ${record.removedReason}` : ""}</div> : null}
                    </div>
                    <div className="punishment-id">#{record.id}</div>
                  </article>
                ))}
              </div>
              {data.totalPages > 1 ? (
                <nav className="punishments-pagination" aria-label="Punishment pages">
                  {data.page > 1 ? <a href={queryHref({ q, type, status, page: data.page - 1 })}>Previous</a> : <span />}
                  <small>Page {data.page.toLocaleString()} of {data.totalPages.toLocaleString()}</small>
                  {data.page < data.totalPages ? <a href={queryHref({ q, type, status, page: data.page + 1 })}>Next</a> : <span />}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="punishments-empty"><strong>No punishment records found</strong><p>{q ? `No LiteBans history matched ${q} with these filters.` : "There are no records matching these filters."}</p></div>
          )}
        </section>
      </main>
    </div>
  );
}
