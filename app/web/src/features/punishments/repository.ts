import type { RowDataPacket } from "mysql2/promise";
import { getLiteBansDb } from "@/lib/litebans-db";

export type PunishmentType = "ban" | "mute" | "warning" | "kick";
export type PunishmentStatus = "all" | "active" | "inactive";

export type PunishmentRecord = {
  key: string;
  id: number;
  type: PunishmentType;
  uuid: string | null;
  username: string;
  reason: string;
  staffName: string;
  createdAt: number;
  expiresAt: number | null;
  permanent: boolean;
  active: boolean;
  removedByName: string | null;
  removedReason: string | null;
};

export type PunishmentPage = {
  records: PunishmentRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  matchedPlayer: string | null;
};

type RawPunishmentRow = RowDataPacket & {
  id: number | string;
  type: PunishmentType;
  uuid: string | null;
  reason: string | null;
  staff_name: string | null;
  time: number | string;
  until: number | string;
  active: unknown;
  removed_by_name: string | null;
  removed_reason: string | null;
};

const TYPE_TABLES: Record<PunishmentType, string> = {
  ban: "litebans_bans",
  mute: "litebans_mutes",
  warning: "litebans_warnings",
  kick: "litebans_kicks",
};
const ALL_TYPES = Object.keys(TYPE_TABLES) as PunishmentType[];

function normalizeEpoch(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
}

function bitValue(value: unknown) {
  if (Buffer.isBuffer(value)) return value.length > 0 && value[value.length - 1] !== 0;
  return Number(value) === 1 || value === true;
}

function statusSql(status: PunishmentStatus) {
  if (status === "active") return " AND active = b'1'";
  if (status === "inactive") return " AND active = b'0'";
  return "";
}

function selectSql(type: PunishmentType, uuidCount: number, status: PunishmentStatus, countOnly = false) {
  const table = TYPE_TABLES[type];
  const uuidSql = uuidCount > 0
    ? ` AND uuid IN (${Array.from({ length: uuidCount }, () => "?").join(", ")})`
    : "";
  if (countOnly) {
    return `SELECT id FROM ${table} WHERE 1 = 1 ${uuidSql} ${statusSql(status)}`;
  }
  const removed = type === "kick"
    ? "NULL AS removed_by_name, NULL AS removed_reason"
    : "removed_by_name, removed_by_reason AS removed_reason";
  return `
    SELECT id, '${type}' AS type, uuid, reason,
           banned_by_name AS staff_name, time, until, active, ${removed}
    FROM ${table}
    WHERE 1 = 1 ${uuidSql} ${statusSql(status)}
  `;
}

async function resolvePlayerUuids(search: string) {
  const value = search.trim();
  if (!value) return { uuids: [] as string[], matchedPlayer: null as string | null };
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return { uuids: [value.toLowerCase()], matchedPlayer: value };
  }
  if (!/^[A-Za-z0-9_]{3,16}$/.test(value)) {
    return { uuids: [] as string[], matchedPlayer: value };
  }
  const [rows] = await getLiteBansDb().execute<RowDataPacket[]>(
    `SELECT uuid, name FROM litebans_history
     WHERE LOWER(name) = LOWER(?) AND uuid IS NOT NULL
     ORDER BY id DESC LIMIT 20`,
    [value],
  );
  const uuids: string[] = [];
  let matchedPlayer: string | null = null;
  for (const row of rows) {
    const uuid = String(row.uuid || "").trim();
    if (!uuid || uuids.includes(uuid)) continue;
    uuids.push(uuid);
    if (!matchedPlayer && row.name) matchedPlayer = String(row.name);
  }
  return { uuids, matchedPlayer: matchedPlayer || value };
}

async function latestNames(uuids: string[]) {
  const names = new Map<string, string>();
  if (!uuids.length) return names;
  const placeholders = uuids.map(() => "?").join(", ");
  const [rows] = await getLiteBansDb().execute<RowDataPacket[]>(
    `SELECT uuid, name FROM litebans_history
     WHERE uuid IN (${placeholders}) AND name IS NOT NULL
     ORDER BY id DESC`,
    uuids,
  );
  for (const row of rows) {
    const uuid = String(row.uuid || "");
    const name = String(row.name || "");
    if (uuid && name && !names.has(uuid)) names.set(uuid, name);
  }
  return names;
}

export async function getPunishments({
  search = "",
  type = "all",
  status = "all",
  page = 1,
  pageSize = 30,
}: {
  search?: string;
  type?: PunishmentType | "all";
  status?: PunishmentStatus;
  page?: number;
  pageSize?: number;
}): Promise<PunishmentPage> {
  const db = getLiteBansDb();
  const currentPage = Math.max(1, Math.min(10_000, Math.floor(Number(page) || 1)));
  const safePageSize = Math.max(10, Math.min(50, Math.floor(pageSize)));
  const selectedTypes = type === "all" ? ALL_TYPES : [type];
  const hasSearch = Boolean(search.trim());
  const { uuids, matchedPlayer } = await resolvePlayerUuids(search);

  if (hasSearch && uuids.length === 0) {
    return { records: [], total: 0, page: 1, pageSize: safePageSize, totalPages: 1, matchedPlayer };
  }

  const uuidParams = selectedTypes.flatMap(() => uuids);
  const countSql = selectedTypes.map((item) => selectSql(item, uuids.length, status, true));
  const [countRows] = await db.execute<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM (${countSql.join(" UNION ALL ")}) AS punishment_count`,
    uuidParams,
  );
  const total = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const boundedPage = Math.min(currentPage, totalPages);
  const offset = (boundedPage - 1) * safePageSize;

  const rowSql = selectedTypes.map((item) => selectSql(item, uuids.length, status));
  const [rows] = await db.execute<RawPunishmentRow[]>(
    `SELECT * FROM (${rowSql.join(" UNION ALL ")}) AS punishments
     ORDER BY time DESC, id DESC LIMIT ? OFFSET ?`,
    [...uuidParams, safePageSize, offset],
  );

  const recordUuids = Array.from(new Set(rows.map((row) => row.uuid?.trim()).filter((uuid): uuid is string => Boolean(uuid))));
  const names = await latestNames(recordUuids);

  const records = rows.map((row): PunishmentRecord => {
    const rawUntil = Number(row.until);
    const permanent = rawUntil < 0;
    const uuid = row.uuid?.trim() || null;
    return {
      key: `${row.type}:${row.id}`,
      id: Number(row.id),
      type: row.type,
      uuid,
      username: (uuid && names.get(uuid)) || "Unknown player",
      reason: row.reason?.trim() || "No reason provided",
      staffName: row.staff_name?.trim() || "Console",
      createdAt: normalizeEpoch(row.time),
      expiresAt: permanent ? null : normalizeEpoch(rawUntil),
      permanent,
      active: bitValue(row.active),
      removedByName: row.removed_by_name?.trim() || null,
      removedReason: row.removed_reason?.trim() || null,
    };
  });

  return { records, total, page: boundedPage, pageSize: safePageSize, totalPages, matchedPlayer };
}
