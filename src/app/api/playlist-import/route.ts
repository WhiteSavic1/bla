import { NextResponse } from "next/server";

interface ImportedTrack {
  id: string;
  title: string;
  artist?: string;
  provider: "SPOTIFY" | "YOUTUBE";
  url: string;
  artworkUrl?: string;
}

function extractSpotifyPlaylistId(url: string): string | null {
  const m = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/([a-zA-Z0-9]+)/i);
  return m?.[1] || null;
}

function extractYouTubeListId(url: string): string | null {
  const m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  return m?.[1] || null;
}

function extractJsonAfterMarker(html: string, marker: string): unknown | null {
  const idx = html.indexOf(marker);
  if (idx === -1) return null;
  const start = html.indexOf("{", idx + marker.length);
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function collectYouTubeVideos(node: unknown, out: ImportedTrack[], seen: Set<string>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectYouTubeVideos(item, out, seen);
    return;
  }
  const obj = node as Record<string, unknown>;
  const r = obj.playlistVideoRenderer as Record<string, unknown> | undefined;
  if (r && typeof r.videoId === "string" && !seen.has(r.videoId)) {
    seen.add(r.videoId);
    const titleRuns = (r.title as { runs?: { text?: string }[]; simpleText?: string }) || {};
    const title =
      titleRuns.runs?.map((x) => x.text || "").join("").trim() ||
      titleRuns.simpleText ||
      "YouTube Şarkısı";
    const byline = (r.shortBylineText as { runs?: { text?: string }[] })?.runs
      ?.map((x) => x.text || "")
      .join("")
      .trim();
    const thumbs = (r.thumbnail as { thumbnails?: { url?: string }[] })?.thumbnails;
    const artworkUrl = thumbs?.[thumbs.length - 1]?.url;
    out.push({
      id: `yt_${r.videoId}_${out.length}`,
      title,
      artist: byline || undefined,
      provider: "YOUTUBE",
      url: `https://www.youtube.com/watch?v=${r.videoId}`,
      artworkUrl,
    });
    return;
  }
  for (const val of Object.values(obj)) {
    collectYouTubeVideos(val, out, seen);
  }
}

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    const cleanUrl = String(url || "").trim();
    if (!cleanUrl) {
      return NextResponse.json(
        { ok: false, error: "Lütfen geçerli bir Spotify veya YouTube çalma listesi linki gir." },
        { status: 400 }
      );
    }

    const spPlaylistId = extractSpotifyPlaylistId(cleanUrl);
    if (spPlaylistId) {
      const res = await fetch(`https://open.spotify.com/embed/playlist/${spPlaylistId}`, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
        },
        cache: "no-store",
      });
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: "Spotify listesi alınamadı (liste gizli olabilir)." },
          { status: 400 }
        );
      }
      const html = await res.text();
      const nextMatch = html.match(
        /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
      );
      if (!nextMatch?.[1]) {
        return NextResponse.json(
          { ok: false, error: "Spotify liste verisi çözümlenemedi." },
          { status: 400 }
        );
      }
      const parsed = JSON.parse(nextMatch[1]) as {
        props?: {
          pageProps?: {
            state?: {
              data?: {
                entity?: {
                  name?: string;
                  coverArt?: { sources?: { url?: string }[] };
                  trackList?: {
                    title?: string;
                    subtitle?: string;
                    uri?: string;
                  }[];
                };
              };
            };
          };
        };
      };
      const entity = parsed?.props?.pageProps?.state?.data?.entity;
      const listName = entity?.name || "Spotify Listesi";
      const cover = entity?.coverArt?.sources?.[0]?.url;
      const rawTracks = entity?.trackList || [];
      const tracks: ImportedTrack[] = rawTracks
        .filter((t) => Boolean(t.title))
        .map((t, idx) => {
          const trackId = t.uri?.split(":").pop() || "";
          return {
            id: `sp_${trackId || idx}_${Date.now()}`,
            title: t.title || "Spotify Şarkısı",
            artist: t.subtitle || undefined,
            provider: "SPOTIFY",
            url: trackId
              ? `https://open.spotify.com/track/${trackId}`
              : `https://open.spotify.com/search/${encodeURIComponent(
                  `${t.title} ${t.subtitle || ""}`.trim()
                )}`,
            artworkUrl: cover,
          };
        });

      if (tracks.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Spotify listesinde aktarılacak şarkı bulunamadı." },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, name: listName, tracks });
    }

    const ytListId = extractYouTubeListId(cleanUrl);
    if (ytListId) {
      const res = await fetch(
        `https://www.youtube.com/playlist?list=${encodeURIComponent(ytListId)}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
          },
          cache: "no-store",
        }
      );
      if (!res.ok) {
        return NextResponse.json(
          { ok: false, error: "YouTube listesi alınamadı (liste gizli olabilir)." },
          { status: 400 }
        );
      }
      const html = await res.text();
      const data = extractJsonAfterMarker(html, "var ytInitialData = ") as {
        metadata?: { playlistMetadataRenderer?: { title?: string } };
      } | null;
      if (!data) {
        return NextResponse.json(
          { ok: false, error: "YouTube liste verisi çözümlenemedi." },
          { status: 400 }
        );
      }
      const listName =
        data?.metadata?.playlistMetadataRenderer?.title || "YouTube Listesi";
      const tracks: ImportedTrack[] = [];
      collectYouTubeVideos(data, tracks, new Set<string>());
      if (tracks.length === 0) {
        return NextResponse.json(
          { ok: false, error: "YouTube listesinde aktarılacak şarkı bulunamadı." },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, name: listName, tracks });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Geçerli bir Spotify playlist veya YouTube playlist linki gir.",
      },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Müzik listesi aktarılırken hata oluştu." },
      { status: 500 }
    );
  }
}
