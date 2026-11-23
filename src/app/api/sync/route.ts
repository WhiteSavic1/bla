import { NextResponse } from "next/server";
import {
  isRedisConfigured,
  kvGetJson,
  kvSetJson,
  mergeById,
  SHARED_KEYS,
} from "@/lib/kvStore";

type AnyItem = { id?: string; [k: string]: unknown };

function mergeConversations(
  existing: AnyItem[],
  incoming: AnyItem[],
  deletedSet: Set<string>
): AnyItem[] {
  const map = new Map<string, AnyItem>();
  for (const c of existing) {
    if (c?.id && !deletedSet.has(c.id)) map.set(c.id, c);
  }
  for (const c of incoming) {
    if (!c?.id || deletedSet.has(c.id)) continue;
    const prev = map.get(c.id);
    if (!prev) {
      const msgs = Array.isArray(c.messages)
        ? (c.messages as AnyItem[]).filter((m) => m?.id && !deletedSet.has(m.id))
        : [];
      map.set(c.id, { ...c, messages: msgs });
    } else {
      const prevMsgs = Array.isArray(prev.messages)
        ? (prev.messages as AnyItem[])
        : [];
      const incMsgs = Array.isArray(c.messages)
        ? (c.messages as AnyItem[])
        : [];
      const msgMap = new Map<string, AnyItem>();
      for (const m of prevMsgs) {
        if (m?.id && !deletedSet.has(m.id)) msgMap.set(m.id, m);
      }
      for (const m of incMsgs) {
        if (!m?.id || deletedSet.has(m.id)) continue;
        const pm = msgMap.get(m.id);
        msgMap.set(m.id, pm ? { ...pm, ...m } : m);
      }
      const mergedMsgs = Array.from(msgMap.values());
      map.set(c.id, {
        ...prev,
        ...c,
        status:
          prev.status === "ACTIVE" || c.status === "ACTIVE"
            ? "ACTIVE"
            : c.status || prev.status,
        messages: mergedMsgs,
      });
    }
  }
  return Array.from(map.values());
}

function mergePosts(
  existing: AnyItem[],
  incoming: AnyItem[],
  deletedSet: Set<string>
): AnyItem[] {
  const map = new Map<string, AnyItem>();
  for (const p of existing) {
    if (p?.id && !deletedSet.has(p.id)) map.set(p.id, p);
  }
  for (const p of incoming) {
    if (!p?.id || deletedSet.has(p.id)) continue;
    const prev = map.get(p.id);
    if (!prev) {
      map.set(p.id, p);
    } else {
      const prevComments = Array.isArray(prev.comments)
        ? (prev.comments as AnyItem[])
        : [];
      const incComments = Array.isArray(p.comments)
        ? (p.comments as AnyItem[])
        : [];
      const mergedComments = mergeById(prevComments, incComments)
        .filter((c) => c?.id && !deletedSet.has(c.id))
        .map((c) => {
          const ic = incComments.find((x) => x?.id === c.id);
          return ic ? { ...c, ...ic } : c;
        });
      const prevHighlights = Array.isArray(prev.highlights)
        ? (prev.highlights as AnyItem[])
        : [];
      const incHighlights = Array.isArray(p.highlights)
        ? (p.highlights as AnyItem[])
        : [];
      const mergedHighlights = mergeById(prevHighlights, incHighlights).filter(
        (h) => h?.id && !deletedSet.has(h.id)
      );
      const incRepostedBy = Array.isArray(p.repostedBy)
        ? (p.repostedBy as string[])
        : [];
      const cleanedRepostedBy = Array.from(new Set(incRepostedBy)).filter(
        (uid) => !deletedSet.has(`unrepost:${p.id}:${uid}`)
      );
      map.set(p.id, {
        ...prev,
        ...p,
        comments: mergedComments,
        highlights: mergedHighlights,
        repostedBy: cleanedRepostedBy,
      });
    }
  }
  return Array.from(map.values());
}

export async function POST(req: Request) {
  if (!isRedisConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Redis yapılandırılmamış." },
      { status: 503 }
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const existingDeleted =
      (await kvGetJson<string[]>("shared:deletedIds")) ?? [];
    const incomingDeleted = Array.isArray(body.deletedIds)
      ? (body.deletedIds as string[])
      : [];
    const deletedList = Array.from(
      new Set([...existingDeleted, ...incomingDeleted])
    ).slice(-500);
    if (incomingDeleted.length > 0) {
      await kvSetJson("shared:deletedIds", deletedList);
    }
    const deletedSet = new Set(deletedList);

    await Promise.all(
      SHARED_KEYS.map(async (key) => {
        if (body[key] === undefined) return;
        const incoming = body[key];

        if (key === "conversations" && Array.isArray(incoming)) {
          const existing =
            (await kvGetJson<AnyItem[]>(`shared:${key}`)) ?? [];
          const merged = mergeConversations(
            existing,
            incoming as AnyItem[],
            deletedSet
          );
          await kvSetJson(`shared:${key}`, merged);
          return;
        }

        if (key === "posts" && Array.isArray(incoming)) {
          const existing =
            (await kvGetJson<AnyItem[]>(`shared:${key}`)) ?? [];
          const merged = mergePosts(
            existing,
            incoming as AnyItem[],
            deletedSet
          );
          await kvSetJson(`shared:${key}`, merged);
          return;
        }

        if (
          (key === "registeredProfiles" ||
            key === "playlists" ||
            key === "friendRequests" ||
            key === "reports" ||
            key === "supportTickets" ||
            key === "adminRequests") &&
          Array.isArray(incoming)
        ) {
          const existing =
            (await kvGetJson<AnyItem[]>(`shared:${key}`)) ?? [];
          if (key === "registeredProfiles") {
            const removedProfiles = existing.filter(
              (x) => x?.id && deletedSet.has(x.id)
            );
            await Promise.all(
              removedProfiles.map((p) => {
                const em =
                  typeof p.email === "string" ? p.email.trim().toLowerCase() : "";
                return em ? kvSetJson(`accounts:${em}`, null) : Promise.resolve();
              })
            );
          }
          const merged = mergeById(existing, incoming as AnyItem[]).filter(
            (x) => !x?.id || !deletedSet.has(x.id)
          );
          await kvSetJson(`shared:${key}`, merged);
          return;
        }

        await kvSetJson(`shared:${key}`, incoming);
      })
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Geçersiz JSON veya sunucu hatası" },
      { status: 400 }
    );
  }
}
