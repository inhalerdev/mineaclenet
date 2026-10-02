import type { RowDataPacket } from "mysql2";
import { getCoreDb } from "@/lib/db";

/*
 * "Verified" players: their Minecraft account is linked to a Mineacle
 * website account (they ran /verify in game). Shown as a check badge next
 * to their name.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/* Which of these players are verified. Never throws: if the database can't
   be reached, nobody gets the badge. */
export async function getVerifiedUuids(uuids: string[]): Promise<Set<string>> {
  const unique = [...new Set(uuids.map((uuid) => uuid.trim().toLowerCase()))].filter((uuid) =>
    UUID_PATTERN.test(uuid),
  );

  if (!unique.length) {
    return new Set();
  }

  try {
    const [rows] = await getCoreDb().execute<RowDataPacket[]>(
      `SELECT uuid
       FROM mineacle_web_accounts
       WHERE disabled = 0
         AND uuid IN (${unique.map(() => "?").join(", ")})`,
      unique,
    );

    return new Set(rows.map((row) => String(row.uuid).toLowerCase()));
  } catch (error) {
    console.error("[mineacle-players] Could not load verified players", error);
    return new Set();
  }
}

export async function isVerifiedPlayer(uuid: string) {
  return (await getVerifiedUuids([uuid])).has(uuid.trim().toLowerCase());
}
