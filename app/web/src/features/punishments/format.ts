import type {
  PunishmentRecord,
  PunishmentStatus,
  PunishmentType,
} from "./repository";

/*
 * Filters and display text for the public records page (/punishments).
 * Shared by the route (which reads the URL) and the page component.
 */
export type PunishmentFilters = {
  q: string;
  type: PunishmentType | "all";
  status: PunishmentStatus;
};

export const punishmentTypes: Array<{ key: PunishmentType | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "ban", label: "Bans" },
  { key: "mute", label: "Mutes" },
  { key: "warning", label: "Warnings" },
  { key: "kick", label: "Kicks" },
];

export const punishmentStatuses: Array<{ key: PunishmentStatus; label: string }> = [
  { key: "all", label: "Any status" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Ended" },
];

type UrlValue = string | string[] | undefined;

/* First value of a URL parameter (?q=a&q=b gives an array). */
function one(value: UrlValue) {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/* Reads the page's URL values, falling back to defaults for anything odd. */
export function readPunishmentFilters(params: {
  q?: UrlValue;
  type?: UrlValue;
  status?: UrlValue;
  page?: UrlValue;
}): PunishmentFilters & { page: number } {
  const typeValue = one(params.type);
  const statusValue = one(params.status);

  return {
    q: one(params.q).trim().slice(0, 36),
    type: punishmentTypes.find((item) => item.key === typeValue)?.key ?? "all",
    status: punishmentStatuses.find((item) => item.key === statusValue)?.key ?? "all",
    page: Math.max(1, Number.parseInt(one(params.page), 10) || 1),
  };
}

/* Link to the page with these filters (page 1 is left out of the URL). */
export function punishmentsHref(filters: PunishmentFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.status !== "all") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/punishments?${query}` : "/punishments";
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Chicago",
});

const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Chicago",
  timeZoneName: "short",
});

export function formatDate(timestamp: number) {
  return timestamp ? dateFormat.format(new Date(timestamp)) : "Unknown";
}

export function formatTime(timestamp: number) {
  return timestamp ? timeFormat.format(new Date(timestamp)) : "";
}

/* 7d, 12h, 3mo... from the start and end of a punishment. */
function formatLength(ms: number) {
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (ms >= 365 * day) return `${Math.round(ms / (365 * day))}y`;
  if (ms >= 30 * day) return `${Math.round(ms / (30 * day))}mo`;
  if (ms >= day) return `${Math.round(ms / day)}d`;
  if (ms >= hour) return `${Math.round(ms / hour)}h`;
  return `${Math.max(1, Math.round(ms / minute))}m`;
}

/* How long it lasts. Kicks and warnings don't have a length. */
export function punishmentLength(record: PunishmentRecord) {
  if (record.type === "kick" || record.type === "warning") return null;
  if (record.permanent || !record.expiresAt) return "Permanent";
  return formatLength(record.expiresAt - record.createdAt);
}

/* Active / Removed / Expired. Kicks are one-off, so they have no status. */
export function punishmentState(
  record: PunishmentRecord,
): "active" | "removed" | "expired" | null {
  if (record.type === "kick") return null;
  if (record.active) return "active";
  return record.removedByName ? "removed" : "expired";
}
