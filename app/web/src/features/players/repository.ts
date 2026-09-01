import type { RowDataPacket } from "mysql2";
import type {
  LeaderboardSort,
  PlayerProfile,
} from "@/features/players/types";
import { getCoreDb } from "@/lib/db";

const PROFILE_TABLE = "mineacle_web_profiles";

const DEFAULTS = {
  uuid: "''",
  username: "''",
  display_name: "''",
  rank_key: "''",
  rank_name: "''",
  rank_prefix: "''",
  rank_color: "''",
  rank_weight: "0",
  online: "0",
  world_key: "''",
  world_name: "''",
  world_group: "''",
  team_id: "''",
  team_name: "''",
  team_role: "''",
  team_joined_at: "0",
  balance_cents: "0",
  balance_formatted: "''",
  playtime_seconds: "0",
  playtime_formatted: "''",
  kills: "0",
  deaths: "0",
  kd_ratio: "0",
  money_rank: "0",
  kills_rank: "0",
  playtime_rank: "0",
  first_joined_at: "0",
  last_seen: "0",
  updated_at: "0",
} as const;

let columnsPromise: Promise<Set<string>> | null = null;

function quoteIdentifier(value: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error("Invalid database identifier");
  }

  return `\`${value}\``;
}

async function profileColumns() {
  if (!columnsPromise) {
    columnsPromise = (async () => {
      const [rows] = await getCoreDb().query<RowDataPacket[]>(
        `SHOW COLUMNS FROM ${quoteIdentifier(PROFILE_TABLE)}`,
      );

      return new Set(
        rows
          .map((row) => String(row.Field || "").toLowerCase())
          .filter(Boolean),
      );
    })();
  }

  return columnsPromise;
}

async function selectList() {
  const columns = await profileColumns();

  return Object.entries(DEFAULTS)
    .map(([alias, fallback]) => {
      const source = columns.has(alias)
        ? quoteIdentifier(alias)
        : fallback;

      return `${source} AS ${quoteIdentifier(alias)}`;
    })
    .join(", ");
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown) {
  return typeof value === "string" ? value : String(value || "");
}

function formatBalance(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function mapPlayer(row: RowDataPacket): PlayerProfile {
  const balanceCents = numberValue(row.balance_cents);
  const balanceFormatted = textValue(row.balance_formatted);

  return {
    uuid: textValue(row.uuid),
    username: textValue(row.username),
    displayName:
      textValue(row.display_name) || textValue(row.username),
    rankKey: textValue(row.rank_key),
    rankName: textValue(row.rank_name),
    rankPrefix: textValue(row.rank_prefix),
    rankColor: textValue(row.rank_color),
    rankWeight: numberValue(row.rank_weight),
    online: numberValue(row.online) > 0,
    worldKey: textValue(row.world_key),
    worldName: textValue(row.world_name),
    worldGroup: textValue(row.world_group),
    teamId: textValue(row.team_id),
    teamName: textValue(row.team_name),
    teamRole: textValue(row.team_role),
    teamJoinedAt: numberValue(row.team_joined_at),
    balanceCents,
    balanceFormatted:
      balanceFormatted || formatBalance(balanceCents),
    playtimeSeconds: numberValue(row.playtime_seconds),
    playtimeFormatted: textValue(row.playtime_formatted),
    kills: numberValue(row.kills),
    deaths: numberValue(row.deaths),
    kdRatio: numberValue(row.kd_ratio),
    moneyRank: numberValue(row.money_rank),
    killsRank: numberValue(row.kills_rank),
    playtimeRank: numberValue(row.playtime_rank),
    firstJoinedAt: numberValue(row.first_joined_at),
    lastSeen: numberValue(row.last_seen),
    updatedAt: numberValue(row.updated_at),
  };
}

export async function getPlayerByUsername(
  usernameValue: string,
): Promise<PlayerProfile | null> {
  const username = usernameValue.trim();

  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    return null;
  }

  const columns = await profileColumns();

  if (!columns.has("username")) {
    return null;
  }

  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT ${await selectList()}
     FROM ${quoteIdentifier(PROFILE_TABLE)}
     WHERE LOWER(${quoteIdentifier("username")}) = LOWER(?)
     LIMIT 1`,
    [username],
  );

  return rows[0] ? mapPlayer(rows[0]) : null;
}

export async function getPlayerByUuid(
  uuid: string,
): Promise<PlayerProfile | null> {
  const columns = await profileColumns();

  if (!columns.has("uuid")) {
    return null;
  }

  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT ${await selectList()}
     FROM ${quoteIdentifier(PROFILE_TABLE)}
     WHERE ${quoteIdentifier("uuid")} = ?
     LIMIT 1`,
    [uuid],
  );

  return rows[0] ? mapPlayer(rows[0]) : null;
}

export async function getPlayersByUuids(
  uuids: string[],
): Promise<PlayerProfile[]> {
  const unique = [...new Set(uuids.filter(Boolean))].slice(0, 50);

  if (!unique.length) {
    return [];
  }

  const columns = await profileColumns();

  if (!columns.has("uuid")) {
    return [];
  }

  const placeholders = unique.map(() => "?").join(", ");
  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT ${await selectList()}
     FROM ${quoteIdentifier(PROFILE_TABLE)}
     WHERE ${quoteIdentifier("uuid")} IN (${placeholders})`,
    unique,
  );

  return rows.map(mapPlayer);
}

const SORT_COLUMNS: Record<LeaderboardSort, string> = {
  balance: "balance_cents",
  kd: "kd_ratio",
  kills: "kills",
  playtime: "playtime_seconds",
};

export async function getPlayerLeaderboard(
  sort: LeaderboardSort,
  limitValue = 50,
): Promise<PlayerProfile[]> {
  const sortColumn = SORT_COLUMNS[sort] || SORT_COLUMNS.balance;
  const limit = Math.max(1, Math.min(100, Math.floor(limitValue)));

  const [rows] = await getCoreDb().query<RowDataPacket[]>(
    `SELECT *
     FROM (
       SELECT ${await selectList()}
       FROM ${quoteIdentifier(PROFILE_TABLE)}
     ) profiles
     WHERE uuid <> ''
     ORDER BY ${quoteIdentifier(sortColumn)} DESC, username ASC
     LIMIT ${limit}`,
  );

  return rows.map(mapPlayer);
}

export async function searchPlayers(
  queryValue: string,
  limitValue = 8,
): Promise<PlayerProfile[]> {
  const query = queryValue.trim();

  if (!/^[A-Za-z0-9_]{2,16}$/.test(query)) {
    return [];
  }

  const columns = await profileColumns();

  if (!columns.has("username")) {
    return [];
  }

  const limit = Math.max(1, Math.min(20, Math.floor(limitValue)));

  const [rows] = await getCoreDb().execute<RowDataPacket[]>(
    `SELECT ${await selectList()}
     FROM ${quoteIdentifier(PROFILE_TABLE)}
     WHERE ${quoteIdentifier("username")} LIKE ?
     ORDER BY ${quoteIdentifier("username")} ASC
     LIMIT ${limit}`,
    [`${query}%`],
  );

  return rows.map(mapPlayer);
}
