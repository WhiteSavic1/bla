import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ videoId: null });
  }

  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${q} audio`
    )}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ videoId: null });
    }

    const html = await res.text();
    const matches = Array.from(
      html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)
    ).map((m) => m[1]);
    const videoIds = Array.from(new Set(matches)).slice(0, 6);
    const videoId = videoIds[0] || null;

    return NextResponse.json({
      videoId,
      videoIds,
      youtubeUrl: videoId
        ? `https://www.youtube.com/watch?v=${videoId}`
        : null,
    });
  } catch {
    return NextResponse.json({ videoId: null });
  }
}
