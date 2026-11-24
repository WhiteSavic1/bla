"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Music,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { extractSpotifyTrackId, extractYouTubeId, formatSeconds } from "@/lib/constants";

export function GlobalMiniPlayer() {
  const {
    activeSection,
    globalTrack,
    globalQueue,
    isGlobalPlaying,
    isLooping,
    toggleLoop,
    volume,
    setVolume,
    nextGlobalTrack,
    prevGlobalTrack,
    toggleGlobalPlay,
    stopGlobalTrack,
  } = useApp();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytIframeRef = useRef<HTMLIFrameElement | null>(null);
  const nextRef = useRef(nextGlobalTrack);
  nextRef.current = nextGlobalTrack;
  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;

  const [ytAttemptIdx, setYtAttemptIdx] = useState(0);
  const [usePreviewFallback, setUsePreviewFallback] = useState(false);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string | null>(
    null
  );
  const [fetchedAltIds, setFetchedAltIds] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setYtAttemptIdx(0);
    setUsePreviewFallback(false);
    setResolvedPreviewUrl(null);
    setFetchedAltIds([]);
    setCurrentTime(globalTrack?.startSec || 0);
    setDuration(0);
  }, [globalTrack?.id, globalTrack?.url, globalTrack?.startSec]);

  const ytCandidates = useMemo(() => {
    if (!globalTrack) return [];
    const primary =
      extractYouTubeId(globalTrack.url) || extractYouTubeId(globalTrack.title);
    return Array.from(
      new Set(
        [
          primary,
          ...(globalTrack.altYoutubeIds || []),
          ...fetchedAltIds,
        ].filter((id): id is string => Boolean(id))
      )
    );
  }, [globalTrack, fetchedAltIds]);

  const activeYtId =
    !usePreviewFallback && ytCandidates.length > 0
      ? ytCandidates[ytAttemptIdx] || null
      : null;
  const effectivePreviewUrl =
    globalTrack?.previewUrl || resolvedPreviewUrl || undefined;
  const shouldPlayPreviewAudio =
    Boolean(effectivePreviewUrl) && (!activeYtId || usePreviewFallback);

  const ytCandidatesLenRef = useRef(0);
  ytCandidatesLenRef.current = ytCandidates.length;
  const ytAttemptIdxRef = useRef(0);
  ytAttemptIdxRef.current = ytAttemptIdx;
  const globalTrackRef = useRef(globalTrack);
  globalTrackRef.current = globalTrack;
  const effectivePreviewRef = useRef(effectivePreviewUrl);
  effectivePreviewRef.current = effectivePreviewUrl;
  const queueLenRef = useRef(0);
  queueLenRef.current = globalQueue.length;
  const isPlayingRef = useRef(isGlobalPlaying);
  isPlayingRef.current = isGlobalPlaying;
  const togglePlayRef = useRef(toggleGlobalPlay);
  togglePlayRef.current = toggleGlobalPlay;

  const seekGlobalTo = (sec: number) => {
    const target = Math.max(0, sec);
    setCurrentTime(target);
    if (audioRef.current && shouldPlayPreviewAudio) {
      audioRef.current.currentTime = target;
    }
    if (ytIframeRef.current?.contentWindow) {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "seekTo", args: [target, true] }),
        "*"
      );
    }
  };

  const initialGlobalYtIdRef = useRef<string | null>(null);
  const lastLoadedGlobalYtIdRef = useRef<string | null>(null);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const activeYtKey = activeYtId ? `${activeYtId}_${globalTrack?.startSec || 0}` : null;
  if (activeYtId && !initialGlobalYtIdRef.current) {
    initialGlobalYtIdRef.current = activeYtId;
  }
  if (!activeYtId) {
    initialGlobalYtIdRef.current = null;
    lastLoadedGlobalYtIdRef.current = null;
  }

  useEffect(() => {
    if (!activeYtId || !activeYtKey) return;
    if (!lastLoadedGlobalYtIdRef.current) {
      lastLoadedGlobalYtIdRef.current = activeYtKey;
      return;
    }
    if (lastLoadedGlobalYtIdRef.current === activeYtKey) return;
    lastLoadedGlobalYtIdRef.current = activeYtKey;
    const win = ytIframeRef.current?.contentWindow;
    if (!win) return;
    const startSec = globalTrack?.startSec || 0;
    win.postMessage(
      JSON.stringify({
        event: "command",
        func: "loadVideoById",
        args: [{ videoId: activeYtId, startSeconds: startSec }],
      }),
      "*"
    );
    const ytVol =
      volumeRef.current <= 0
        ? 0
        : Math.max(1, Math.round(Math.pow(volumeRef.current / 100, 1.8) * 100));
    win.postMessage(
      JSON.stringify({ event: "command", func: "setVolume", args: [ytVol] }),
      "*"
    );
    if (!isGlobalPlaying) {
      win.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "*"
      );
    }
  }, [activeYtId, activeYtKey, globalTrack?.startSec, isGlobalPlaying]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.volume = Math.pow(Math.max(0, Math.min(100, volume)) / 100, 2);
    }
    if (ytIframeRef.current?.contentWindow) {
      const ytVol =
        volume <= 0 ? 0 : Math.max(1, Math.round(Math.pow(volume / 100, 1.8) * 100));
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setVolume", args: [ytVol] }),
        "*"
      );
    }
  }, [volume, globalTrack]);

  // Arka planda tarayıcı zamanlayıcıları yavaşlatsa bile şarkı bitince sıradakine geç
  useEffect(() => {
    if (!isGlobalPlaying || !globalTrack || duration <= 0) return;
    const endLimit =
      typeof globalTrack.endSec === "number" &&
      globalTrack.endSec > (globalTrack.startSec || 0)
        ? globalTrack.endSec
        : duration;
    const remSec = Math.max(0.5, endLimit - currentTime);
    const timer = setTimeout(() => {
      if (isLoopingRef.current) {
        ytIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [globalTrack.startSec || 0, true],
          }),
          "*"
        );
      } else {
        nextRef.current(true);
      }
    }, remSec * 1000);
    return () => clearTimeout(timer);
  }, [isGlobalPlaying, globalTrack?.id, duration, Math.floor(currentTime / 5)]);

  useEffect(() => {
    const el = audioRef.current;
    if (el && shouldPlayPreviewAudio) {
      el.volume = Math.pow(Math.max(0, Math.min(100, volume)) / 100, 2);
      if (isGlobalPlaying) {
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    }
    if (ytIframeRef.current?.contentWindow) {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: isGlobalPlaying ? "playVideo" : "pauseVideo",
          args: [],
        }),
        "*"
      );
    }
  }, [globalTrack, isGlobalPlaying, volume, shouldPlayPreviewAudio]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (
        typeof e.data !== "string" ||
        !e.origin.includes("youtube.com") ||
        e.source !== ytIframeRef.current?.contentWindow
      ) {
        return;
      }
      try {
        const msg = JSON.parse(e.data) as {
          event?: string;
          info?: number | { currentTime?: number; duration?: number };
        };
        if (msg.event === "infoDelivery" && msg.info && typeof msg.info === "object") {
          if (typeof msg.info.duration === "number" && msg.info.duration > 0) {
            setDuration(msg.info.duration);
          }
          if (typeof msg.info.currentTime === "number") {
            setCurrentTime(msg.info.currentTime);
            const trk = globalTrackRef.current;
            const endSec = trk?.endSec;
            const startSec = trk?.startSec || 0;
            if (
              typeof endSec === "number" &&
              endSec > startSec &&
              msg.info.currentTime >= endSec
            ) {
              if (isLoopingRef.current) {
                ytIframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: "command", func: "seekTo", args: [startSec, true] }),
                  "*"
                );
              } else if (queueLenRef.current > 1) {
                nextRef.current(true);
              } else if (isPlayingRef.current) {
                togglePlayRef.current();
              }
            }
          }
          return;
        }
        if (msg.event === "onError") {
          if (ytAttemptIdxRef.current + 1 < ytCandidatesLenRef.current) {
            setYtAttemptIdx((i) => i + 1);
            return;
          }
          const trk = globalTrackRef.current;
          if (!trk) return;
          if (effectivePreviewRef.current) {
            setUsePreviewFallback(true);
            return;
          }
          // Ne alternatif video ne previewUrl yoksa sunucudan alternatif YouTube + iTunes önizleme ara
          const q = `${trk.title} ${trk.artist || ""}`.trim();
          Promise.all([
            fetch(`/api/youtube-resolve?q=${encodeURIComponent(q)}`)
              .then((r) => r.json())
              .catch(() => null),
            fetch(`/api/music-search?q=${encodeURIComponent(q)}`)
              .then((r) => r.json())
              .catch(() => null),
          ]).then(([ytData, itunesData]) => {
            const newIds: string[] = Array.isArray(ytData?.videoIds)
              ? ytData.videoIds
              : [];
            const unseen = newIds.filter((id) => id && id !== ytCandidates[ytAttemptIdxRef.current]);
            const preview = itunesData?.results?.[0]?.previewUrl as
              | string
              | undefined;
            if (preview) setResolvedPreviewUrl(preview);
            if (unseen.length > 0 && ytCandidatesLenRef.current <= 1) {
              setFetchedAltIds(unseen);
              setYtAttemptIdx((i) => i + 1);
            } else if (preview) {
              setUsePreviewFallback(true);
            }
          });
          return;
        }
        if (msg.event === "onStateChange" && msg.info === 0) {
          const startSec = globalTrackRef.current?.startSec || 0;
          if (isLoopingRef.current) {
            ytIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "seekTo", args: [startSec, true] }),
              "*"
            );
            ytIframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ event: "command", func: "playVideo", args: [] }),
              "*"
            );
          } else {
            nextRef.current(true);
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!globalTrack) return null;

  const ytId = activeYtId;
  const spId =
    extractSpotifyTrackId(globalTrack.url) ||
    extractSpotifyTrackId(globalTrack.title);

  const isChat = activeSection === "CHAT";

  return (
    <div
      className={`${
        isChat
          ? "fixed bottom-20 left-1/2 -translate-x-1/2 md:bottom-3 md:left-3 md:translate-x-0 md:max-w-[340px]"
          : "fixed bottom-4 left-1/2 -translate-x-1/2 md:bottom-3 md:left-3 md:translate-x-0 max-w-[340px]"
      } z-30 w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#151821]/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-md space-y-2`}
    >
      {shouldPlayPreviewAudio && effectivePreviewUrl && (
        <audio
          ref={audioRef}
          src={effectivePreviewUrl}
          autoPlay
          loop={isLooping && typeof globalTrack.endSec !== "number"}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget;
            if (Number.isFinite(el.duration) && el.duration > 0) {
              setDuration(el.duration);
            }
            if (typeof globalTrack.startSec === "number" && globalTrack.startSec > 0) {
              el.currentTime = Math.min(globalTrack.startSec, el.duration || globalTrack.startSec);
              setCurrentTime(el.currentTime);
            }
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            setCurrentTime(el.currentTime);
            const endSec = globalTrack.endSec;
            const startSec = globalTrack.startSec || 0;
            if (typeof endSec === "number" && endSec > startSec && el.currentTime >= endSec) {
              if (isLooping) {
                el.currentTime = startSec;
              } else if (globalQueue.length > 1) {
                nextGlobalTrack(true);
              } else if (isGlobalPlaying) {
                toggleGlobalPlay();
              }
            }
          }}
          onEnded={() => {
            if (isLooping) {
              if (audioRef.current) {
                audioRef.current.currentTime = globalTrack.startSec || 0;
                audioRef.current.play().catch(() => {});
              }
            } else {
              nextGlobalTrack(true);
            }
          }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {globalTrack.artworkUrl ? (
            <img
              src={globalTrack.artworkUrl}
              alt={globalTrack.title}
              className="h-9 w-9 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ${
                isGlobalPlaying ? "animate-pulse" : ""
              }`}
            >
              <Music className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">
              {globalTrack.title}
            </div>
            {globalTrack.artist && (
              <div className="truncate text-[10px] text-gray-400">
                {globalTrack.artist}
              </div>
            )}
          </div>
        </div>

        {/* Ses Seviyesi Kaydırıcısı */}
        {!spId && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setVolume(volume === 0 ? 75 : 0)}
              title={volume === 0 ? "Sesi Aç" : "Sustur"}
              className="text-gray-400 hover:text-white"
            >
              {volume === 0 ? (
                <VolumeX className="h-4 w-4 text-rose-400" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Ses Seviyesi"
              className="w-16 sm:w-20 accent-emerald-500 cursor-pointer"
            />
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {!spId && (
            <button
              type="button"
              onClick={toggleLoop}
              title={isLooping ? "Tekrarı Kapat" : "Şarkıyı Tekrarla"}
              className={`rounded-lg p-1.5 transition ${
                isLooping
                  ? "bg-indigo-500/25 text-indigo-300 border border-indigo-500/40"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Repeat className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={prevGlobalTrack}
            disabled={globalQueue.length <= 1}
            title="Önceki Şarkı"
            className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          {!spId && (
            <button
              type="button"
              onClick={toggleGlobalPlay}
              title={isGlobalPlaying ? "Duraklat" : "Devam Et"}
              className="rounded-lg bg-emerald-500 p-2 text-black hover:bg-emerald-400"
            >
              {isGlobalPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => nextGlobalTrack(false)}
            disabled={globalQueue.length <= 1}
            title="Sonraki Şarkı"
            className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={stopGlobalTrack}
            title="Kapat"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Şarkı Süre & Sarma Çubuğu */}
      {!spId && (ytId || shouldPlayPreviewAudio) && (
        <div className="flex items-center gap-1 pt-0.5 min-w-0 w-full">
          <button
            type="button"
            onClick={() => seekGlobalTo(Math.max(0, currentTime - 5))}
            title="5 sn Geri"
            className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-gray-200 hover:bg-white/20 shrink-0"
          >
            -5sn
          </button>
          <span className="text-[10px] text-gray-400 tabular-nums shrink-0">
            {formatSeconds(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration > 0 ? Math.ceil(duration) : Math.max(180, Math.ceil(currentTime + 10))}
            value={Math.min(
              Math.floor(currentTime),
              duration > 0 ? Math.ceil(duration) : Math.max(180, Math.ceil(currentTime + 10))
            )}
            onChange={(e) => seekGlobalTo(Number(e.target.value))}
            aria-label="Şarkı konumu"
            className="h-1 min-w-0 flex-1 accent-emerald-400 cursor-pointer"
          />
          <span className="text-right text-[10px] text-gray-400 tabular-nums shrink-0">
            {duration > 0 ? formatSeconds(duration) : "--:--"}
          </span>
          <button
            type="button"
            onClick={() => seekGlobalTo(currentTime + 5)}
            title="5 sn İleri"
            className="rounded-md bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-gray-200 hover:bg-white/20 shrink-0"
          >
            +5sn
          </button>
        </div>
      )}

      {/* Gizli YouTube Ses Oynatıcı (Video kutusu gizli, sadece ses çalar; src sabit kalır ki durdur/başlat sıfırlamasın) */}
      {ytId && initialGlobalYtIdRef.current && (
        <div className="h-0 w-0 overflow-hidden opacity-0 pointer-events-none">
          <iframe
            ref={ytIframeRef}
            className="h-1 w-1"
            src={`https://www.youtube.com/embed/${initialGlobalYtIdRef.current}?autoplay=1&enablejsapi=1${
              typeof globalTrack.startSec === "number" && globalTrack.startSec > 0
                ? `&start=${Math.floor(globalTrack.startSec)}`
                : ""
            }`}
            title={globalTrack.title}
            allow="autoplay; encrypted-media"
            onLoad={() => {
              const win = ytIframeRef.current?.contentWindow;
              if (!win) return;
              win.postMessage(JSON.stringify({ event: "listening" }), "*");
              win.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "setVolume",
                  args: [volume],
                }),
                "*"
              );
              win.postMessage(
                JSON.stringify({
                  event: "command",
                  func: isGlobalPlaying ? "playVideo" : "pauseVideo",
                  args: [],
                }),
                "*"
              );
            }}
          />
        </div>
      )}

      {/* Gerçek Spotify Oynatıcı */}
      {spId && isGlobalPlaying && (
        <div className="overflow-hidden rounded-xl">
          <iframe
            className="h-20 w-full"
            src={`https://open.spotify.com/embed/track/${spId}?utm_source=generator&theme=0`}
            title={globalTrack.title}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          />
        </div>
      )}
    </div>
  );
}
