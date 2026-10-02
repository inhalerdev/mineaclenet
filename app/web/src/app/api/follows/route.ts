import { NextResponse } from "next/server";
import { getCurrentViewer } from "@/features/auth/session";
import {
  followByUsername,
  unfollowByUuid,
} from "@/features/social/follows";
import {
  publicMessage,
  readJsonBody,
  textField,
  UserFacingError,
} from "@/shared/server/user-error";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const username = textField(body, "username").trim();

  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    return NextResponse.json(
      { error: "Enter a valid Minecraft username" },
      { status: 400 },
    );
  }

  try {
    const player = await followByUsername(
      viewer.accountId,
      viewer.uuid,
      username,
    );

    return NextResponse.json({
      ok: true,
      player: {
        uuid: player.uuid,
        username: player.username,
      },
    });
  } catch (error) {
    if (!(error instanceof UserFacingError)) {
      console.error("[mineacle-social] Follow failed", error);
    }

    return NextResponse.json(
      { error: publicMessage(error, "Unable to follow that player right now") },
      { status: error instanceof UserFacingError ? 400 : 503 },
    );
  }
}

export async function DELETE(request: Request) {
  const viewer = await getCurrentViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Log in required" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  const uuid = textField(body, "uuid").trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uuid,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid player UUID" },
      { status: 400 },
    );
  }

  await unfollowByUuid(viewer.accountId, uuid);

  return NextResponse.json({ ok: true });
}
