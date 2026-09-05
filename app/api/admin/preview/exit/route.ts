import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_PREVIEW_COOKIE } from "@/features/admin-gate/gate";

export const dynamic = "force-dynamic";

export async function POST() {
  const store = await cookies();
  store.delete(ADMIN_PREVIEW_COOKIE);

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
