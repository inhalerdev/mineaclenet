import { NextResponse } from "next/server";
import {
  consumeRateLimit,
  requestClientIp,
} from "@/features/auth/rate-limit";
import { beginVerification } from "@/features/auth/verification";

export const runtime = "nodejs";

const PAIR_POLICY = {
  maximum: 5,
  windowSeconds: 600,
  blockSeconds: 900,
};

const IP_POLICY = {
  maximum: 20,
  windowSeconds: 600,
  blockSeconds: 900,
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string };
    const username = (body.username || "").trim();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      return NextResponse.json(
        { error: "Enter your exact Minecraft username" },
        { status: 400 },
      );
    }

    const ip = requestClientIp(request);
    const pairState = await consumeRateLimit(
      "verify-start-pair",
      `${ip}|${username.toLowerCase()}`,
      PAIR_POLICY,
    );
    const ipState = await consumeRateLimit(
      "verify-start-ip",
      ip,
      IP_POLICY,
    );

    if (pairState.blocked || ipState.blocked) {
      const retryAfter = Math.max(
        pairState.retryAfter,
        ipState.retryAfter,
      );

      return NextResponse.json(
        {
          error:
            "Too many verification requests. Wait a few minutes and try again",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, retryAfter)),
          },
        },
      );
    }

    const result = await beginVerification(username);
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
