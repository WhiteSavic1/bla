import { NextResponse } from "next/server";
import { isRedisConfigured, kvGetJson } from "@/lib/kvStore";
import {
  attachSessionCookie,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/security";

export async function POST(req: Request) {
  const rl = checkRateLimit(req, "auth_login", 20);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Upstash Redis yapılandırılmamış." },
      { status: 503 }
    );
  }

  try {
    const { email, password } = (await req.json()) as {
      email?: string;
      password?: string;
    };
    const cleanEmail = String(email || "").trim().toLowerCase();
    const account = await kvGetJson<{
      email: string;
      password: string;
      profile: { id?: string };
    }>(`accounts:${cleanEmail}`);

    if (!account || account.password !== password) {
      return NextResponse.json(
        { ok: false, error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true, account });
    return attachSessionCookie(res, {
      userId: account.profile?.id || cleanEmail,
      email: cleanEmail,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Giriş sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
