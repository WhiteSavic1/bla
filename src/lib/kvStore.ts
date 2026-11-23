import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "";
const REST_URL =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const REST_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

export const SHARED_KEYS = [
  "posts",
  "playlists",
  "friendRequests",
  "conversations",
  "reports",
  "supportTickets",
  "registeredProfiles",
  "adminEmails",
  "adminPasswords",
  "adminPasswordChangedEmails",
  "adminRequests",
  "bannedUserIds",
  "mutedUserIds",
] as const;

export function isRedisConfigured(): boolean {
  return Boolean(REDIS_URL || (REST_URL && REST_TOKEN));
}

const globalForRedis = globalThis as unknown as {
  __personaRedis?: Redis;
};

function getRedisClient(): Redis {
  if (!globalForRedis.__personaRedis) {
    globalForRedis.__personaRedis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return globalForRedis.__personaRedis;
}

async function restCommand<T = unknown>(
  args: (string | number)[]
): Promise<T | null> {
  const res = await fetch(REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Redis REST error: ${res.status}`);
  }
  const data = (await res.json()) as { result?: T; error?: string };
  if (data.error) throw new Error(data.error);
  return data.result ?? null;
}

export async function kvGetJson<T = unknown>(key: string): Promise<T | null> {
  if (!isRedisConfigured()) return null;
  let raw: string | null = null;
  if (REDIS_URL) {
    const client = getRedisClient();
    raw = await client.get(key);
  } else {
    raw = await restCommand<string | null>(["GET", key]);
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function kvSetJson(key: string, value: unknown): Promise<void> {
  if (!isRedisConfigured()) return;
  const serialized = JSON.stringify(value);
  if (REDIS_URL) {
    const client = getRedisClient();
    await client.set(key, serialized);
  } else {
    await restCommand(["SET", key, serialized]);
  }
}

export function mergeById<T extends { id?: string }>(
  base: T[],
  incoming: T[]
): T[] {
  const map = new Map<string, T>();
  for (const item of base) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of incoming) {
    if (!item || !item.id) continue;
    const prev = map.get(item.id);
    map.set(item.id, prev ? { ...prev, ...item } : item);
  }
  return Array.from(map.values());
}
