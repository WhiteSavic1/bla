import { NextResponse } from "next/server";
import { isRedisConfigured, kvGetJson } from "@/lib/kvStore";

export async function POST(req: Request) {
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
      profile: unknown;
    }>(`accounts:${cleanEmail}`);

    if (!account || account.password !== password) {
      return NextResponse.json(
        { ok: false, error: "E-posta veya şifre hatalı." },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, account });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Giriş sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
