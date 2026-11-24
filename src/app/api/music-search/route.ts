import { NextRequest, NextResponse } from "next/server";

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
}

interface DeezerResult {
  id: number;
  title?: string;
  artist?: { name?: string };
  album?: { cover_medium?: string; cover_small?: string };
  preview?: string;
  link?: string;
}

async function searchItunes(q: string) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      q
    )}&media=music&entity=song&limit=8&country=TR`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: ItunesResult[] };
    return (data.results || [])
      .filter((r) => r.trackName)
      .map((r) => ({
        id: `itunes_${r.trackId}`,
        title: r.trackName,
        artist: r.artistName,
        artworkUrl: r.artworkUrl100,
        previewUrl: r.previewUrl,
        url: r.trackViewUrl,
        provider: "ITUNES" as const,
      }));
  } catch {
    return [];
  }
}

async function searchDeezer(q: string) {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=8`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: DeezerResult[] };
    return (data.data || [])
      .filter((r) => r.title)
      .map((r) => ({
        id: `deezer_${r.id}`,
        title: r.title!,
        artist: r.artist?.name,
        artworkUrl: r.album?.cover_medium || r.album?.cover_small,
        previewUrl: r.preview,
        url: r.link,
        provider: "ITUNES" as const,
      }));
  } catch {
    return [];
  }
}

async function searchYouTubeFallback(q: string) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${q} audio`
    )}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const html = await res.text();
    const matches = Array.from(
      html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)
    ).map((m) => m[1]);
    const videoIds = Array.from(new Set(matches)).slice(0, 5);
    const tracks = await Promise.all(
      videoIds.map(async (vid) => {
        const watchUrl = `https://www.youtube.com/watch?v=${vid}`;
        let title = `${q}`;
        let artist: string | undefined;
        let artworkUrl = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
        try {
          const oe = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(
              watchUrl
            )}&format=json`
          );
          if (oe.ok) {
            const meta = (await oe.json()) as {
              title?: string;
              author_name?: string;
              thumbnail_url?: string;
            };
            if (meta.title) title = meta.title;
            if (meta.author_name) artist = meta.author_name;
            if (meta.thumbnail_url) artworkUrl = meta.thumbnail_url;
          }
        } catch {
          // ignore oembed failure
        }
        return {
          id: `yt_${vid}`,
          title,
          artist,
          artworkUrl,
          url: watchUrl,
          altYoutubeIds: videoIds,
          provider: "YOUTUBE" as const,
        };
      })
    );
    return tracks;
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  let results: unknown[] = await searchItunes(q);
  if (results.length === 0) {
    results = await searchDeezer(q);
  }
  if (results.length === 0) {
    results = await searchYouTubeFallback(q);
  }

  return NextResponse.json({ results });
}
