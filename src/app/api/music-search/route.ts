import { NextRequest, NextResponse } from "next/server";

interface ItunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100?: string;
  previewUrl?: string;
  trackViewUrl?: string;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      q
    )}&media=music&entity=song&limit=8&country=TR`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ results: [], error: "Arama başarısız" });
    }
    const data = (await res.json()) as { results?: ItunesResult[] };
    const mapped = (data.results || [])
      .filter((r) => r.trackName && r.previewUrl)
      .map((r) => ({
        id: `itunes_${r.trackId}`,
        title: r.trackName,
        artist: r.artistName,
        artworkUrl: r.artworkUrl100,
        previewUrl: r.previewUrl,
        url: r.trackViewUrl,
        provider: "ITUNES" as const,
      }));

    return NextResponse.json({ results: mapped });
  } catch {
    return NextResponse.json({ results: [], error: "Ağ hatası" });
  }
}
