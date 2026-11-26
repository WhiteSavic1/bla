import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";

const globalForPresence = globalThis as unknown as {
  __personaPresence?: Map<string, number>;
};

function getPresenceMap(): Map<string, number> {
  if (!globalForPresence.__personaPresence) {
    globalForPresence.__personaPresence = new Map<string, number>();
  }
  return globalForPresence.__personaPresence;
}

function getActiveIds(): string[] {
  const now = Date.now();
  const map = getPresenceMap();
  const active: string[] = [];
  for (const [uid, ts] of map.entries()) {
    if (now - ts <= 45_000) {
      active.push(uid);
    } else {
      map.delete(uid);
    }
  }
  return active;
}

export async function GET() {
  return NextResponse.json(
    { ok: true, onlineUserIds: getActiveIds() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const rl = checkRateLimit(req, "presence", 60);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  try {
    const { userId } = (await req.json()) as { userId?: string };
    if (userId && userId !== "u_me") {
      getPresenceMap().set(String(userId), Date.now());
    }
    return NextResponse.json({ ok: true, onlineUserIds: getActiveIds() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
