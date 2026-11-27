"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Headphones,
  Pause,
  Phone,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { extractYouTubeId } from "@/lib/constants";
import { startRing } from "@/lib/callSounds";

export function ListeningRoomAudioHost() {
  const {
    activeSection,
    setActiveSection,
    conversations,
    activeConversationId,
    setActiveConversationId,
    apiBaseUrl,
    listeningRoom,
    currentUser,
    volume,
    setVolume,
    roomClockOffsetMs,
    roomDurationSec,
    setRoomDurationSec,
    toggleRoomPlay,
    prevRoomTrack,
    skipRoomTrack,
    leaveListeningRoom,
    muteUiSounds,
  } = useApp();

  const roomAudioRef = useRef<HTMLAudioElement | null>(null);
  const roomYoutubeRef = useRef<HTMLIFrameElement | null>(null);
  const initialRoomYtIdRef = useRef<string | null>(null);
  const lastLoadedRoomYtIdRef = useRef<string | null>(null);
  const actualPlayerSecRef = useRef<number>(0);
  const lastSeekNonceRef = useRef<number>(0);
  const lastTrackIdRef = useRef<string | undefined>(undefined);
  const lastAutoSkipKeyRef = useRef<string>("");
  const handledRingCallRef = useRef<string>("");
  const ignoredLeftCallsRef = useRef<Map<string, number>>(new Map());
  const [ytAttemptIdx, setYtAttemptIdx] = useState(0);
  const [usePreviewFallback, setUsePreviewFallback] = useState(false);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string | null>(
    null
  );
  const [fetchedAltIds, setFetchedAltIds] = useState<string[]>([]);
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    convId: string;
    hostId: string;
    participants: { id: string; nickname: string }[];
  } | null>(null);
  const [dismissedCallId, setDismissedCallId] = useState<string | null>(null);
  const convIdsKey = conversations
    .filter(
      (c) =>
        c.isGroup ||
        c.initiatorId === currentUser.id ||
        c.peerId === currentUser.id ||
        (c.memberIds || []).includes(currentUser.id)
    )
    .map((c) => c.id)
    .join(",");

  // Aramadan yeni çıkıldıysa aynı callId için tekrar çalma/yönlendirme yapma
  useEffect(() => {
    const onLeft = (e: Event) => {
      const cid = (e as CustomEvent<{ callId?: string }>).detail?.callId;
      if (cid) {
        ignoredLeftCallsRef.current.set(cid, Date.now() + 8000);
        setIncomingCall((prev) => (prev?.callId === cid ? null : prev));
      }
    };
    window.addEventListener("satir_arasi_left_call", onLeft);
    return () => window.removeEventListener("satir_arasi_left_call", onLeft);
  }, []);

  // Herhangi bir sayfadayken gelen aramada otomatik olarak ilgili sohbete geç ve bildirim göster
  useEffect(() => {
    if (!currentUser.id || currentUser.id === "u_me") {
      setIncomingCall(null);
      return;
    }
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/call?userId=${encodeURIComponent(
            currentUser.id
          )}&convIds=${encodeURIComponent(convIdsKey)}`,
          { cache: "no-store" }
        );
        if (!res.ok || !active) return;
        const data = (await res.json()) as {
          activeCalls?: {
            callId: string;
            convId: string;
            hostId: string;
            participants: { id: string; nickname: string }[];
          }[];
        };
        const incoming = (data.activeCalls || []).find(
          (c) =>
            c.hostId !== currentUser.id &&
            !c.participants.some((p) => p.id === currentUser.id) &&
            (ignoredLeftCallsRef.current.get(c.callId) || 0) <= Date.now()
        );
        setIncomingCall(incoming ?? null);
        if (incoming && handledRingCallRef.current !== incoming.callId) {
          handledRingCallRef.current = incoming.callId;
          setActiveConversationId(incoming.convId);
          setActiveSection("CHAT");
        }
      } catch {
        // ignore
      }
    };
    poll();
    const t = setInterval(poll, 2400);
    return () => {
      active = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convIdsKey, currentUser.id, apiBaseUrl]);

  // Sohbet paneli açık değilse veya başka bir sohbetteyse gelen arama sesi çalsın
  const isViewingIncomingChat =
    activeSection === "CHAT" &&
    incomingCall &&
    activeConversationId === incomingCall.convId;

  useEffect(() => {
    if (
      muteUiSounds ||
      !incomingCall ||
      isViewingIncomingChat ||
      dismissedCallId === incomingCall.callId
    ) {
      return;
    }
    const stop = startRing("incoming");
    return stop;
  }, [muteUiSounds, incomingCall, isViewingIncomingChat, dismissedCallId]);

  const skipRoomTrackRef = useRef(skipRoomTrack);
  skipRoomTrackRef.current = skipRoomTrack;
  const listeningRoomRef = useRef(listeningRoom);
  listeningRoomRef.current = listeningRoom;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  const isJoinedRoom = (listeningRoom.participantIds || []).includes(
    currentUser.id
  );

  const computeSyncedSec = () => {
    const base = listeningRoom.positionSec ?? 0;
    if (!listeningRoom.isPlaying || !listeningRoom.positionUpdatedAt) {
      return Math.max(0, Math.floor(base));
    }
    const serverNow = Date.now() + roomClockOffsetMs;
    const elapsed = Math.max(
      0,
      (serverNow - listeningRoom.positionUpdatedAt) / 1000
    );
    const raw = Math.floor(base + elapsed);
    return roomDurationSec > 0 ? Math.min(roomDurationSec, raw) : raw;
  };

  const seekPlayerTo = (target: number) => {
    const safe = Math.max(0, Math.floor(target));
    actualPlayerSecRef.current = safe;
    if (roomAudioRef.current) {
      roomAudioRef.current.currentTime = safe;
    }
    if (roomYoutubeRef.current?.contentWindow) {
      roomYoutubeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [safe, true],
        }),
        "*"
      );
    }
  };

  const toYoutubeVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    if (clamped <= 0) return 0;
    return Math.max(1, Math.round(Math.pow(clamped / 100, 1.8) * 100));
  };

  const toHtmlAudioVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    return Math.pow(clamped / 100, 2.0);
  };

  useEffect(() => {
    const nextId = listeningRoom.currentTrack?.id;
    if (nextId !== lastTrackIdRef.current) {
      lastTrackIdRef.current = nextId;
      actualPlayerSecRef.current = 0;
      setYtAttemptIdx(0);
      setUsePreviewFallback(false);
      setResolvedPreviewUrl(null);
      setFetchedAltIds([]);
      setRoomDurationSec(listeningRoom.currentTrack?.previewUrl ? 30 : 0);
    }
  }, [
    listeningRoom.currentTrack?.id,
    listeningRoom.currentTrack?.previewUrl,
    setRoomDurationSec,
  ]);

  // Spotify veya doğrudan ses linki olmayan şarkıları otomatik YouTube / önizleme sesine çöz
  useEffect(() => {
    const trk = listeningRoom.currentTrack;
    if (!isJoinedRoom || !trk) return;
    const primaryYt = extractYouTubeId(trk.url);
    const hasAltYt = Array.isArray(trk.altYoutubeIds) && trk.altYoutubeIds.length > 0;
    if (primaryYt || hasAltYt || trk.previewUrl || fetchedAltIds.length > 0 || resolvedPreviewUrl) {
      return;
    }
    let cancelled = false;
    const q = `${trk.title} ${trk.artist || ""}`.trim();
    if (!q) return;
    Promise.all([
      fetch(`/api/youtube-resolve?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`/api/music-search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .catch(() => null),
    ]).then(([ytData, itunesData]) => {
      if (cancelled) return;
      const newIds: string[] = Array.isArray(ytData?.videoIds)
        ? ytData.videoIds
        : [];
      const preview = itunesData?.results?.[0]?.previewUrl as string | undefined;
      if (preview) setResolvedPreviewUrl(preview);
      if (newIds.length > 0) {
        setFetchedAltIds(newIds);
      } else if (preview) {
        setUsePreviewFallback(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    isJoinedRoom,
    listeningRoom.currentTrack?.id,
    listeningRoom.currentTrack?.url,
    listeningRoom.currentTrack?.title,
    listeningRoom.currentTrack?.artist,
    listeningRoom.currentTrack?.previewUrl,
    fetchedAltIds.length,
    resolvedPreviewUrl,
  ]);

  const roomYtCandidates = React.useMemo(() => {
    const trk = listeningRoom.currentTrack;
    if (!trk) return [];
    const primary = extractYouTubeId(trk.url);
    return Array.from(
      new Set(
        [primary, ...(trk.altYoutubeIds || []), ...fetchedAltIds].filter(
          (id): id is string => Boolean(id)
        )
      )
    );
  }, [listeningRoom.currentTrack, fetchedAltIds]);
  const roomYtLenRef = useRef(0);
  roomYtLenRef.current = roomYtCandidates.length;
  const roomYtIdxRef = useRef(0);
  roomYtIdxRef.current = ytAttemptIdx;
  const roomPreviewRef = useRef<string | undefined>(undefined);
  roomPreviewRef.current =
    listeningRoom.currentTrack?.previewUrl || resolvedPreviewUrl || undefined;

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (typeof ev.data !== "string") return;
      try {
        const data = JSON.parse(ev.data);
        if (data?.event === "onReady") {
          const win = roomYoutubeRef.current?.contentWindow;
          const cur = listeningRoomRef.current;
          if (win && cur.currentTrack) {
            win.postMessage(
              JSON.stringify({
                event: "command",
                func: "setVolume",
                args: [toYoutubeVolume(volumeRef.current)],
              }),
              "*"
            );
            win.postMessage(
              JSON.stringify({
                event: "command",
                func: cur.isPlaying ? "playVideo" : "pauseVideo",
                args: [],
              }),
              "*"
            );
          }
          return;
        }
        if (data?.event === "onError") {
          if (roomYtIdxRef.current + 1 < roomYtLenRef.current) {
            setYtAttemptIdx((i) => i + 1);
            return;
          }
          if (roomPreviewRef.current) {
            setUsePreviewFallback(true);
            return;
          }
          const trk = listeningRoomRef.current.currentTrack;
          if (trk) {
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
              const preview = itunesData?.results?.[0]?.previewUrl as
                | string
                | undefined;
              if (preview) setResolvedPreviewUrl(preview);
              if (newIds.length > 0 && roomYtLenRef.current <= 1) {
                setFetchedAltIds(newIds);
                setYtAttemptIdx((i) => i + 1);
              } else if (preview) {
                setUsePreviewFallback(true);
              }
            });
          }
          return;
        }
        if (data?.event === "onStateChange" && data?.info === 0) {
          const cur = listeningRoomRef.current;
          const joined = (cur.participantIds || []).includes(currentUser.id);
          const key = `${cur.currentTrack?.id || ""}_${cur.positionUpdatedAt || 0}`;
          if (joined && cur.isPlaying && lastAutoSkipKeyRef.current !== key) {
            lastAutoSkipKeyRef.current = key;
            skipRoomTrackRef.current(true);
          }
          return;
        }
        if (data?.event === "infoDelivery" && data?.info) {
          if (typeof data.info.currentTime === "number") {
            actualPlayerSecRef.current = data.info.currentTime;
          }
          if (typeof data.info.duration === "number" && data.info.duration > 0) {
            setRoomDurationSec(Math.floor(data.info.duration));
          }
          if (data.info.playerState === 0) {
            const cur = listeningRoomRef.current;
            const joined = (cur.participantIds || []).includes(currentUser.id);
            const key = `${cur.currentTrack?.id || ""}_${cur.positionUpdatedAt || 0}`;
            if (
              joined &&
              cur.isPlaying &&
              lastAutoSkipKeyRef.current !== key
            ) {
              lastAutoSkipKeyRef.current = key;
              skipRoomTrackRef.current(true);
            }
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [currentUser.id, setRoomDurationSec]);

  useEffect(() => {
    if (!isJoinedRoom || !listeningRoom.currentTrack) return;
    const tick = () => {
      const target = computeSyncedSec();
      if (
        listeningRoom.isPlaying &&
        roomDurationSec > 0 &&
        target >= roomDurationSec
      ) {
        const key = `${listeningRoom.currentTrack?.id || ""}_${listeningRoom.positionUpdatedAt || 0}`;
        if (lastAutoSkipKeyRef.current !== key) {
          lastAutoSkipKeyRef.current = key;
          skipRoomTrackRef.current(true);
          return;
        }
      }
      if (
        listeningRoom.isPlaying &&
        Math.abs(actualPlayerSecRef.current - target) >= 2.5
      ) {
        seekPlayerTo(target);
      }
    };
    tick();
    const t = setInterval(tick, 300);
    // Arka planda setInterval yavaşlatılsa bile süre dolunca otomatik sonraki şarkıya geç
    let endTimer: ReturnType<typeof setTimeout> | null = null;
    if (listeningRoom.isPlaying && roomDurationSec > 0) {
      const remMs = Math.max(250, (roomDurationSec - computeSyncedSec()) * 1000);
      endTimer = setTimeout(tick, remMs);
    }
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(t);
      if (endTimer) clearTimeout(endTimer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [
    isJoinedRoom,
    listeningRoom.currentTrack?.id,
    listeningRoom.isPlaying,
    listeningRoom.positionSec,
    listeningRoom.positionUpdatedAt,
    listeningRoom.queue.length,
    roomClockOffsetMs,
    roomDurationSec,
  ]);

  useEffect(() => {
    if (!isJoinedRoom || !listeningRoom.currentTrack) return;
    const nonce = listeningRoom.seekNonce || 0;
    if (nonce !== lastSeekNonceRef.current) {
      lastSeekNonceRef.current = nonce;
      seekPlayerTo(computeSyncedSec());
    }
  }, [listeningRoom.seekNonce, isJoinedRoom, listeningRoom.currentTrack?.id]);

  const trk = isJoinedRoom ? listeningRoom.currentTrack : null;
  const ytId =
    trk && !usePreviewFallback ? roomYtCandidates[ytAttemptIdx] || null : null;
  if (ytId && !initialRoomYtIdRef.current) {
    initialRoomYtIdRef.current = ytId;
  }
  if (!ytId) {
    initialRoomYtIdRef.current = null;
    lastLoadedRoomYtIdRef.current = null;
  }

  // Mevcut YouTube iframe'i kapatmadan sonraki şarkıyı loadVideoById ile yükle (arka planda ses kesilmez)
  useEffect(() => {
    if (!ytId) return;
    if (!lastLoadedRoomYtIdRef.current) {
      lastLoadedRoomYtIdRef.current = ytId;
      return;
    }
    if (lastLoadedRoomYtIdRef.current === ytId) return;
    lastLoadedRoomYtIdRef.current = ytId;
    const win = roomYoutubeRef.current?.contentWindow;
    if (!win) return;
    const target = computeSyncedSec();
    actualPlayerSecRef.current = target;
    win.postMessage(JSON.stringify({ event: "listening" }), "*");
    win.postMessage(
      JSON.stringify({
        event: "command",
        func: "loadVideoById",
        args: [{ videoId: ytId, startSeconds: target }],
      }),
      "*"
    );
    win.postMessage(
      JSON.stringify({
        event: "command",
        func: "setVolume",
        args: [toYoutubeVolume(volumeRef.current)],
      }),
      "*"
    );
    if (!listeningRoom.isPlaying) {
      win.postMessage(
        JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
        "*"
      );
    }
  }, [ytId, listeningRoom.isPlaying]);

  useEffect(() => {
    const el = roomAudioRef.current;
    if (el) {
      el.volume = toHtmlAudioVolume(volume);
      if (
        isJoinedRoom &&
        listeningRoom.isPlaying &&
        (listeningRoom.currentTrack?.previewUrl || resolvedPreviewUrl)
      ) {
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    }
    if (roomYoutubeRef.current?.contentWindow) {
      roomYoutubeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "setVolume",
          args: [toYoutubeVolume(volume)],
        }),
        "*"
      );
      roomYoutubeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func:
            isJoinedRoom && listeningRoom.isPlaying
              ? "playVideo"
              : "pauseVideo",
          args: [],
        }),
        "*"
      );
    }
  }, [
    isJoinedRoom,
    listeningRoom.isPlaying,
    listeningRoom.currentTrack?.id,
    ytId,
    resolvedPreviewUrl,
    usePreviewFallback,
    volume,
  ]);

  if (!isJoinedRoom || !listeningRoom.currentTrack || !trk) return null;

  const effectivePreviewUrl =
    trk.previewUrl || resolvedPreviewUrl || undefined;
  const shouldPlayPreviewAudio =
    Boolean(effectivePreviewUrl) && (!ytId || usePreviewFallback);

  return (
    <>
      <div className="h-0 w-0 overflow-hidden opacity-0 pointer-events-none">
        {shouldPlayPreviewAudio && effectivePreviewUrl && (
          <audio
            ref={roomAudioRef}
            src={effectivePreviewUrl}
            autoPlay={listeningRoom.isPlaying}
            onTimeUpdate={(e) => {
              actualPlayerSecRef.current = e.currentTarget.currentTime;
            }}
            onLoadedMetadata={(e) => {
              if (e.currentTarget.duration) {
                setRoomDurationSec(Math.floor(e.currentTarget.duration));
              }
              const target = computeSyncedSec();
              if (target > 0) {
                e.currentTarget.currentTime = target;
                actualPlayerSecRef.current = target;
              }
            }}
            onEnded={() => skipRoomTrack(true)}
            className="hidden"
          />
        )}
        {ytId && initialRoomYtIdRef.current && (
          <iframe
            ref={roomYoutubeRef}
            src={`https://www.youtube.com/embed/${initialRoomYtIdRef.current}?autoplay=1&enablejsapi=1`}
            title={trk.title}
            allow="autoplay; encrypted-media"
            onLoad={() => {
              const win = roomYoutubeRef.current?.contentWindow;
              if (!win) return;
              const target = computeSyncedSec();
              actualPlayerSecRef.current = target;
              win.postMessage(JSON.stringify({ event: "listening" }), "*");
              win.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "setVolume",
                  args: [toYoutubeVolume(volume)],
                }),
                "*"
              );
              if (target > 0) {
                win.postMessage(
                  JSON.stringify({
                    event: "command",
                    func: "seekTo",
                    args: [target, true],
                  }),
                  "*"
                );
              }
              win.postMessage(
                JSON.stringify({
                  event: "command",
                  func: listeningRoom.isPlaying ? "playVideo" : "pauseVideo",
                  args: [],
                }),
                "*"
              );
            }}
            className="h-1 w-1"
          />
        )}
      </div>

      {/* Başka sekmedeyken altta çıkan küçük Dinleme Odası bilgi kartı */}
      {activeSection !== "CHAT" && (
        <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-2xl border border-emerald-500/30 bg-[#12191C]/95 px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveSection("CHAT")}
              title="Dinleme Odasına Dön"
              className="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-85 transition"
            >
              {trk.artworkUrl ? (
                <img
                  src={trk.artworkUrl}
                  alt={trk.title}
                  className="h-9 w-9 shrink-0 rounded-xl object-cover border border-white/10"
                />
              ) : (
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 ${
                    listeningRoom.isPlaying ? "animate-pulse" : ""
                  }`}
                >
                  <Headphones className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                  Dinleme Odası
                </div>
                <div className="truncate text-xs font-semibold text-white">
                  {trk.title}
                </div>
                {trk.artist && (
                  <div className="truncate text-[10px] text-gray-400">
                    {trk.artist}
                  </div>
                )}
              </div>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setVolume(volume === 0 ? 75 : 0)}
                className="text-gray-400 hover:text-white"
              >
                {volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5 text-rose-400" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-16 accent-emerald-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={prevRoomTrack}
                disabled={!(listeningRoom.history && listeningRoom.history.length > 0)}
                title="Önceki Şarkı"
                className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 disabled:opacity-30"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleRoomPlay()}
                title={listeningRoom.isPlaying ? "Duraklat" : "Oynat"}
                className="rounded-lg bg-emerald-500 p-1.5 text-black hover:bg-emerald-400"
              >
                {listeningRoom.isPlaying ? (
                  <Pause className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Play className="h-3.5 w-3.5 fill-current" />
                )}
              </button>
              <button
                type="button"
                onClick={() => skipRoomTrack(false)}
                disabled={listeningRoom.queue.length === 0}
                title="Sonraki Şarkı"
                className="rounded-lg p-1.5 text-gray-300 hover:bg-white/10 disabled:opacity-30"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={leaveListeningRoom}
                title="Odadan Ayrıl"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-500/20 hover:text-rose-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* İlgili sohbet açık değilken gelen arama bildirimi */}
      {incomingCall &&
        !isViewingIncomingChat &&
        dismissedCallId !== incomingCall.callId && (
          <div className="fixed right-4 top-16 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-[#0F1716]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white">
                Gelen Sesli Arama
              </div>
              <div className="truncate text-[11px] text-emerald-300">
                {incomingCall.participants.map((p) => p.nickname).join(", ")}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveConversationId(incomingCall.convId);
                setActiveSection("CHAT");
              }}
              className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400"
            >
              Sohbete Git
            </button>
            <button
              type="button"
              onClick={() => {
                const targetCid = incomingCall.convId;
                const targetCallId = incomingCall.callId;
                ignoredLeftCallsRef.current.set(targetCallId, Date.now() + 8000);
                setDismissedCallId(targetCallId);
                setIncomingCall(null);
                fetch(`${apiBaseUrl}/api/call`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "END",
                    convId: targetCid,
                    userId: currentUser.id,
                  }),
                }).catch(() => {});
              }}
              title="Aramayı Reddet / Sonlandır"
              className="rounded-xl bg-rose-500/20 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30"
            >
              Reddet
            </button>
          </div>
        )}
    </>
  );
}
