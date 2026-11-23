import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { isRedisConfigured, kvGetJson, SHARED_KEYS } from "@/lib/kvStore";

export async function GET(req: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Upstash Redis yapılandırılmamış." },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const keysParam = searchParams.get("keys");
    const hashesParam = searchParams.get("hashes") || "";

    const requestedKeys = keysParam
      ? keysParam
          .split(",")
          .filter((k): k is (typeof SHARED_KEYS)[number] =>
            (SHARED_KEYS as readonly string[]).includes(k)
          )
      : [...SHARED_KEYS];

    const clientHashes: Record<string, string> = {};
    if (hashesParam) {
      hashesParam.split(",").forEach((pair) => {
        const idx = pair.indexOf(":");
        if (idx > 0) {
          clientHashes[pair.slice(0, idx)] = pair.slice(idx + 1);
        }
      });
    }

    const result: Record<string, unknown> = {};
    const hashes: Record<string, string> = {};

    await Promise.all(
      requestedKeys.map(async (key) => {
        const val = await kvGetJson(`shared:${key}`);
        const normalized = val ?? (key === "adminPasswords" ? {} : []);
        const serialized = JSON.stringify(normalized);
        const h = createHash("sha1")
          .update(serialized)
          .digest("hex")
          .slice(0, 12);
        hashes[key] = h;
        if (clientHashes[key] !== h) {
          result[key] = normalized;
        }
      })
    );

    return NextResponse.json(
      { ...result, hashes },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}
