import { NextResponse } from "next/server";
import { isRedisConfigured, kvGetJson, kvSetJson } from "@/lib/kvStore";
import {
  attachSessionCookie,
  checkRateLimit,
  rateLimitResponse,
} from "@/lib/security";

interface GoogleUserInfo {
  email?: string;
  name?: string;
  picture?: string;
}

interface StoredAccount {
  id?: string;
  email: string;
  password: string;
  profile: {
    id: string;
    email?: string;
    nickname: string;
    [key: string]: unknown;
  };
}

export async function POST(req: Request) {
  const rl = checkRateLimit(req, "auth_google", 25);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  try {
    const { accessToken } = (await req.json()) as { accessToken?: string };
    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: "Google access token eksik." },
        { status: 400 }
      );
    }

    const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!userRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Google kullanıcı bilgileri doğrulanamadı." },
        { status: 401 }
      );
    }

    const userinfo = (await userRes.json()) as GoogleUserInfo;
    if (!userinfo?.email) {
      return NextResponse.json(
        { ok: false, error: "Google hesabında e-posta bulunamadı." },
        { status: 400 }
      );
    }

    const cleanEmail = userinfo.email.trim().toLowerCase();

    if (!isRedisConfigured()) {
      return NextResponse.json({
        ok: true,
        found: false,
        email: cleanEmail,
        name: userinfo.name,
        picture: userinfo.picture,
      });
    }

    const account = await kvGetJson<StoredAccount>(`accounts:${cleanEmail}`);
    if (account?.profile?.id) {
      const res = NextResponse.json({
        ok: true,
        found: true,
        email: cleanEmail,
        name: userinfo.name,
        picture: userinfo.picture,
        profile: { ...account.profile, email: account.profile.email || cleanEmail },
      });
      return attachSessionCookie(res, {
        userId: account.profile.id,
        email: cleanEmail,
      });
    }

    // Hesap anahtarı yoksa shared:registeredProfiles içinden e-posta ile eşleşen profili ara
    const profiles =
      (await kvGetJson<Array<{ id: string; email?: string; nickname: string }>>(
        "shared:registeredProfiles"
      )) ?? [];
    const matchedProfile = profiles.find(
      (p) => p.email?.trim().toLowerCase() === cleanEmail
    );

    if (matchedProfile) {
      // Gelecek girişler için accounts:${cleanEmail} kaydını da oluştur
      await kvSetJson(`accounts:${cleanEmail}`, {
        id: `acc_g_${Date.now()}`,
        email: cleanEmail,
        password: "__google_oauth__",
        profile: matchedProfile,
      });
      const res = NextResponse.json({
        ok: true,
        found: true,
        email: cleanEmail,
        name: userinfo.name,
        picture: userinfo.picture,
        profile: matchedProfile,
      });
      return attachSessionCookie(res, {
        userId: matchedProfile.id,
        email: cleanEmail,
      });
    }

    const res = NextResponse.json({
      ok: true,
      found: false,
      email: cleanEmail,
      name: userinfo.name,
      picture: userinfo.picture,
    });
    return attachSessionCookie(res, {
      userId: cleanEmail,
      email: cleanEmail,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Google giriş kontrolü sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
