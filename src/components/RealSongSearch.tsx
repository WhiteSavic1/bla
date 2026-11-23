"use client";

import React, { useState } from "react";
import { Search, Music, Loader2 } from "lucide-react";
import { TrackInfo } from "@/types/persona";

export function RealSongSearch({
  onSelect,
  placeholder = "İstediğin gerçek şarkıyı veya sanatçıyı ara (örn: Duman, Sezen Aksu, Madrigal)...",
}: {
  onSelect: (track: TrackInfo) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrackInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSelectTrack = async (t: TrackInfo) => {
    setResolvingId(t.id);
    try {
      const res = await fetch(
        `/api/youtube-resolve?q=${encodeURIComponent(
          `${t.title} ${t.artist || ""}`
        )}`
      );
      const data = await res.json();
      if (data.youtubeUrl) {
        onSelect({
          ...t,
          url: data.youtubeUrl,
          altYoutubeIds: Array.isArray(data.videoIds) ? data.videoIds : undefined,
          previewUrl: t.previewUrl, // YouTube gömme engellerse yedek önizleme sesi kalsın
          provider: "YOUTUBE",
        });
      } else {
        onSelect(t);
      }
    } catch {
      onSelect(t);
    } finally {
      setResolvingId(null);
      setResults([]);
      setSearched(false);
    }
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/music-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder={placeholder}
            className="w-full rounded-lg border border-white/15 bg-[#151821] pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          <span>Ara</span>
        </button>
      </div>

      {results.length > 0 && (
        <div className="max-h-44 overflow-y-auto space-y-1 rounded-xl border border-white/10 bg-[#0F1115] p-1.5">
          {results.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={resolvingId !== null}
              onClick={() => handleSelectTrack(t)}
              className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition hover:bg-white/10 disabled:opacity-60"
            >
              {t.artworkUrl ? (
                <img
                  src={t.artworkUrl}
                  alt={t.title}
                  className="h-8 w-8 rounded object-cover shrink-0"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                  <Music className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-white">
                  {t.title}
                </div>
                <div className="truncate text-[10px] text-gray-400">
                  {t.artist}
                </div>
              </div>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                {resolvingId === t.id ? "Yükleniyor..." : "Seç"}
              </span>
            </button>
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="text-[11px] text-gray-400">
          Sonuç bulunamadı, farklı bir şarkı veya sanatçı adı deneyin.
        </div>
      )}
    </div>
  );
}
