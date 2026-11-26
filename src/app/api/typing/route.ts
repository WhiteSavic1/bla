import { NextResponse } from "next/server";
import { emitRealtimeEvent } from "@/lib/realtimeBus";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";

export async function POST(req: Request) {
  const rl = checkRateLimit(req, "typing", 180);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  try {
    const { convId, userId, nickname } = (await req.json()) as {
      convId?: string;
      userId?: string;
      nickname?: string;
    };
    if (!convId || !userId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    emitRealtimeEvent({
      type: "typing",
      convId: String(convId),
      userId: String(userId),
      nickname: String(nickname || "Kullanıcı").slice(0, 40),
      ts: Date.now(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
