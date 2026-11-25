import { NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  isRedisConfigured,
  kvGetJson,
  kvMGetJson,
  SHARED_KEYS,
} from "@/lib/kvStore";
import { readSessionFromRequest } from "@/lib/security";

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

    const session = readSessionFromRequest(req);
    const needsAdminCheck = requestedKeys.some(
      (k) => k === "adminPasswords" || k === "adminPasswordChangedEmails"
    );
    const values = await kvMGetJson(requestedKeys.map((k) => `shared:${k}`));

    let isAdmin = false;
    if (needsAdminCheck && session?.email) {
      const adminIdx = requestedKeys.indexOf("adminEmails");
      const rawAdmins =
        adminIdx >= 0
          ? (values[adminIdx] as string[] | null)
          : await kvGetJson<string[]>("shared:adminEmails");
      const adminSet = new Set(
        Array.isArray(rawAdmins)
          ? rawAdmins.map((e) => String(e).trim().toLowerCase())
          : []
      );
      adminSet.add("whitesavic1@gmail.com");
      isAdmin = adminSet.has(session.email.trim().toLowerCase());
    }

    const result: Record<string, unknown> = {};
    const hashes: Record<string, string> = {};

    requestedKeys.forEach((key, idx) => {
      if (
        (key === "adminPasswords" || key === "adminPasswordChangedEmails") &&
        !isAdmin
      ) {
        return;
      }
      const val = values[idx];
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
    });

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
