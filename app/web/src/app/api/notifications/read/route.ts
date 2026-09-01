import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/features/auth/session";
import { getCoreDb } from "@/lib/db";

export async function POST() {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401 });
  }

  const now = Math.floor(Date.now() / 1000);

  await getCoreDb().execute(
    `UPDATE mineacle_web_notifications
     SET read_at = ?
     WHERE account_id = ?
       AND read_at IS NULL`,
    [now, viewer.accountId],
  );

  return NextResponse.json({ ok: true });
}
