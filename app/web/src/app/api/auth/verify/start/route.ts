import { NextResponse } from "next/server";
import { beginVerification } from "@/features/auth/verification";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string };
    const result = await beginVerification(body.username || "");
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Verification is temporarily unavailable",
      },
      { status: 400 },
    );
  }
}
