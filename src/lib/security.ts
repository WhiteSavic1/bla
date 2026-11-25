import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "satir_arasi_session";

interface SessionPayload {
  userId: string;
  email?: string;
  isGuest?: boolean;
  exp: number;
}

function getSigningSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.REDIS_URL ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    "satir-arasi-default-dev-secret"
  );
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  req: Request,
  bucket: string,
  limitPerMinute: number
): { allowed: boolean; retryAfterSec: number } {
  const ip = getClientIp(req);
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const windowMs = 60_000;

  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets.entries()) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }

  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  existing.count += 1;
  if (existing.count > limitPerMinute) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

export function rateLimitResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      ok: false,
      error: `Çok fazla istek gönderildi. ${retryAfterSec} saniye sonra tekrar dene.`,
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    }
  );
}

export function signSessionToken(
  payload: Omit<SessionPayload, "exp">,
  ttlMs = 30 * 24 * 60 * 60 * 1000
): string {
  const full: SessionPayload = { ...payload, exp: Date.now() + ttlMs };
  const data = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = createHmac("sha256", getSigningSecret())
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (!data || !sig) return null;

  const expected = createHmac("sha256", getSigningSecret())
    .update(data)
    .digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as SessionPayload;
    if (!parsed || typeof parsed.exp !== "number" || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readSessionFromRequest(req: Request): SessionPayload | null {
  const cookieHeader = req.headers.get("cookie") || "";
  if (!cookieHeader) return null;
  const prefix = `${SESSION_COOKIE_NAME}=`;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));
  if (!match) return null;
  return verifySessionToken(decodeURIComponent(match.slice(prefix.length)));
}

export function attachSessionCookie(
  res: NextResponse,
  payload: Omit<SessionPayload, "exp">
): NextResponse {
  const token = signSessionToken(payload);
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
