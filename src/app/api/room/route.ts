import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { isRedisConfigured, kvGetJson, kvSetJson } from "@/lib/kvStore";

export async function GET(req: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const convId = searchParams.get("convId");
    const clientVersion = searchParams.get("v") || "";
    const key = convId ? `room:${convId}` : "shared:listeningRoom";
    const room = await kvGetJson(key);
    const serverNow = Date.now();
    if (room) {
      const v = createHash("sha1")
        .update(JSON.stringify(room))
        .digest("hex")
        .slice(0, 12);
      if (clientVersion && clientVersion === v) {
        return NextResponse.json(
          { ok: true, unchanged: true, serverNow, v },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
      return NextResponse.json(
        { ok: true, serverNow, v, listeningRoom: room },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      {
        ok: true,
        serverNow,
        listeningRoom: null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  try {
    const body = await req.json();
    const serverNow = Date.now();
    if (body && body.listeningRoom && typeof body.listeningRoom === "object") {
      const convId = body.convId || body.listeningRoom.roomConvId;
      const key = convId ? `room:${convId}` : "shared:listeningRoom";
      const stamped = body.stampPosition
        ? { ...body.listeningRoom, positionUpdatedAt: serverNow }
        : body.listeningRoom;
      await kvSetJson(key, stamped);
      return NextResponse.json({
        ok: true,
        serverNow,
        listeningRoom: stamped,
      });
    }
    return NextResponse.json({ ok: true, serverNow });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
