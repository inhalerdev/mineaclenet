import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { ensureAuthSchema } from "@/features/auth/schema";
import { getCoreDb } from "@/lib/db";

type Row = RowDataPacket & {
  username: string;
  expires_at: number;
  verified_at: number | null;
  consumed_at: number | null;
};

export async function GET(request: Request) {
  const challenge =
    new URL(request.url).searchParams.get("challenge") || "";

  if (!/^[a-f0-9]{32}$/.test(challenge)) {
    return NextResponse.json(
      { error: "Invalid verification challenge" },
      { status: 400 },
    );
  }

  try {
    await ensureAuthSchema();

    const [rows] = await getCoreDb().execute<Row[]>(
      `SELECT username, expires_at, verified_at, consumed_at
       FROM mineacle_web_verifications
       WHERE challenge_id = ?
       LIMIT 1`,
      [challenge],
    );

    const row = rows[0];

    if (!row) {
      return NextResponse.json(
        { error: "Verification challenge not found" },
        { status: 404 },
      );
    }

    const now = Math.floor(Date.now() / 1000);

    return NextResponse.json({
      username: row.username,
      verified: Number(row.verified_at || 0) > 0,
      expired: Number(row.expires_at) <= now,
      consumed: Number(row.consumed_at || 0) > 0,
    });
  } catch {
    return NextResponse.json(
      { error: "Account database is unavailable" },
      { status: 503 },
    );
  }
}
