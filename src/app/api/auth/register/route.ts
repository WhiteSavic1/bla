import { NextResponse } from "next/server";
import {
  isRedisConfigured,
  kvGetJson,
  kvSetJson,
  mergeById,
} from "@/lib/kvStore";
import {
  attachSessionCookie,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/security";

export async function POST(req: Request) {
  const rl = checkRateLimit(req, "auth_register", 20);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Upstash Redis yapılandırılmamış." },
      { status: 503 }
    );
  }

  try {
    const { email, password, profile } = (await req.json()) as {
      email?: string;
      password?: string;
      profile?: { id?: string };
    };
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !profile?.id) {
      return NextResponse.json(
        { ok: false, error: "Eksik bilgi." },
        { status: 400 }
      );
    }

    const existing = await kvGetJson(`accounts:${cleanEmail}`);
    if (existing) {
      return NextResponse.json({ ok: true, account: existing, existing: true });
    }

    const account = {
      id: `acc_${Date.now()}`,
      email: cleanEmail,
      password: password || "",
      profile,
    };
    await kvSetJson(`accounts:${cleanEmail}`, account);

    const profiles =
      (await kvGetJson<Array<{ id?: string }>>("shared:registeredProfiles")) ??
      [];
    await kvSetJson(
      "shared:registeredProfiles",
      mergeById(profiles, [profile])
    );

    const res = NextResponse.json({ ok: true, account, existing: false });
    return attachSessionCookie(res, {
      userId: profile.id,
      email: cleanEmail,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Kayıt sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
