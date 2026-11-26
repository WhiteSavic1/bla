import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";

export interface SyncedLyricLine {
  timeSec: number;
  text: string;
}

function cleanTrackPart(raw: string): string {
  return raw
    .replace(/\([^)]*(official|video|audio|lyrics|hd|4k|live|remaster|clip|feat\.?|ft\.?)[^)]*\)/gi, "")
    .replace(/\[[^\]]*\]/gi, "")
    .replace(/\s*[-–|]\s*Topic$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseLrc(lrc: string): SyncedLyricLine[] {
  const lines: SyncedLyricLine[] = [];
  const regex = /^\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]\s*(.*)$/;
  for (const rawLine of lrc.split(/\r?\n/)) {
    const m = rawLine.trim().match(regex);
    if (!m) continue;
    const min = Number(m[1]);
    const sec = Number(m[2]);
    const msPart = m[3] ? Number(m[3].padEnd(3, "0").slice(0, 3)) / 1000 : 0;
    const text = m[4].trim();
    if (!text) continue;
    lines.push({ timeSec: min * 60 + sec + msPart, text });
  }
  return lines.sort((a, b) => a.timeSec - b.timeSec);
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, "lyrics", 60);
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterSec);

  const rawTitle = req.nextUrl.searchParams.get("title")?.trim() || "";
  const rawArtist = req.nextUrl.searchParams.get("artist")?.trim() || "";
  if (!rawTitle) {
    return NextResponse.json({ ok: false, synced: [], plain: null });
  }

  const title = cleanTrackPart(rawTitle);
  const artist = cleanTrackPart(rawArtist);

  try {
    const searchParams = new URLSearchParams({ track_name: title });
    if (artist) searchParams.set("artist_name", artist);

    let match: { syncedLyrics?: string; plainLyrics?: string } | null = null;

    const getRes = await fetch(
      `https://lrclib.net/api/get?${searchParams.toString()}`,
      { cache: "no-store" }
    );
    if (getRes.ok) {
      match = (await getRes.json()) as {
        syncedLyrics?: string;
        plainLyrics?: string;
      };
    }

    if (!match?.syncedLyrics && !match?.plainLyrics) {
      const q = `${title} ${artist}`.trim();
      const sRes = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );
      if (sRes.ok) {
        const list = (await sRes.json()) as Array<{
          syncedLyrics?: string;
          plainLyrics?: string;
        }>;
        if (Array.isArray(list) && list.length > 0) {
          match =
            list.find((x) => Boolean(x.syncedLyrics)) ||
            list.find((x) => Boolean(x.plainLyrics)) ||
            null;
        }
      }
    }

    if (match?.syncedLyrics || match?.plainLyrics) {
      const synced = match.syncedLyrics ? parseLrc(match.syncedLyrics) : [];
      return NextResponse.json({
        ok: true,
        synced,
        plain: match.plainLyrics || null,
      });
    }

    if (artist) {
      const ovhRes = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(
          artist
        )}/${encodeURIComponent(title)}`,
        { cache: "no-store" }
      );
      if (ovhRes.ok) {
        const ovh = (await ovhRes.json()) as { lyrics?: string };
        if (ovh?.lyrics) {
          return NextResponse.json({
            ok: true,
            synced: [],
            plain: ovh.lyrics.trim(),
          });
        }
      }
    }

    return NextResponse.json({ ok: true, synced: [], plain: null });
  } catch {
    return NextResponse.json({ ok: false, synced: [], plain: null });
  }
}
