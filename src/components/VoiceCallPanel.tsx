"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Headphones,
  VolumeX,
  Monitor,
  MonitorOff,
  Maximize2,
  Volume2,
  X,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { callSfx, startRing } from "@/lib/callSounds";

interface CallParticipant {
  id: string;
  nickname: string;
  isMuted?: boolean;
  isDeafened?: boolean;
}

interface PairSignalData {
  offererId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  renegotiateNonce?: number;
  renegotiateFrom?: string;
  renegotiateOffer?: RTCSessionDescriptionInit;
  renegotiateAnswer?: RTCSessionDescriptionInit;
  peerCandidates: RTCIceCandidateInit[];
}

interface RemoteCallData {
  callId: string;
  convId: string;
  hostId: string;
  status: "ACTIVE" | "ENDED";
  participants: CallParticipant[];
  handshakeId: string;
  pairSignals?: Record<string, PairSignalData>;
  offererId?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  renegotiateNonce?: number;
  renegotiateFrom?: string;
  renegotiateOffer?: RTCSessionDescriptionInit;
  renegotiateAnswer?: RTCSessionDescriptionInit;
  candidatesByUser: Record<string, RTCIceCandidateInit[]>;
  updatedAt: number;
}

interface PeerEntry {
  callId: string;
  peerId: string;
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
  extraAudioEls?: HTMLAudioElement[];
  audioCtx?: AudioContext;
  gainNode?: GainNode;
  remoteAnalyser?: AnalyserNode;
  screenSender: RTCRtpSender | null;
  screenAudioSender: RTCRtpSender | null;
  sentOffer: boolean;
  appliedOffer: boolean;
  appliedAnswer: boolean;
  appliedCandCount: number;
  handledRenegNonce: number;
  appliedRenegAnswerNonce: number;
  pendingCands: RTCIceCandidateInit[];
  candFlushTimer: ReturnType<typeof setTimeout> | null;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
  connected: boolean;
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  iceCandidatePoolSize: 8,
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export function VoiceCallPanel() {
  const {
    currentUser,
    showToast,
    volume,
    apiBaseUrl,
    activeSection,
    setActiveSection,
    activeConversationId,
    setActiveConversationId,
    conversations,
    users,
    callRequest,
    globalTrack,
  } = useApp();
  const callApi = `${apiBaseUrl}/api/call`;

  const [activeCallConvId, setActiveCallConvId] = useState<string | null>(null);
  const [activeCallPeerName, setActiveCallPeerName] = useState<string>("");
  const [activeTargetUserIds, setActiveTargetUserIds] = useState<string[]>([]);

  const myFirstConvId =
    conversations.find((c) =>
      c.isGroup
        ? !c.memberIds || c.memberIds.includes(currentUser.id)
        : c.initiatorId === currentUser.id ||
          c.peerId === currentUser.id ||
          Boolean(c.memberIds?.includes(currentUser.id))
    )?.id || null;
  const viewedConvId =
    activeSection === "CHAT" ? activeConversationId || myFirstConvId : null;
  const convId = activeCallConvId || viewedConvId || "";
  const convIdRef = useRef(convId);
  convIdRef.current = convId;

  const activeConvObj = conversations.find((c) => c.id === convId);
  const derivedPeerName = activeConvObj
    ? activeConvObj.isGroup
      ? activeConvObj.groupName || "Grup Sohbeti"
      : users.find(
          (u) =>
            u.id ===
            (activeConvObj.peerId === currentUser.id &&
            activeConvObj.initiatorId &&
            activeConvObj.initiatorId !== currentUser.id
              ? activeConvObj.initiatorId
              : activeConvObj.memberIds?.find((id) => id !== currentUser.id) ||
                activeConvObj.peerId)
        )?.nickname || "Kullanıcı"
    : activeCallPeerName || "Görüşme";
  const peerName = activeCallPeerName || derivedPeerName;
  const targetUserIds = activeTargetUserIds;

  const [remoteCall, setRemoteCall] = useState<RemoteCallData | null>(null);
  const [viewedChatCall, setViewedChatCall] = useState<RemoteCallData | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isNoiseSuppression, setIsNoiseSuppression] = useState(true);
  const isNoiseSuppressionRef = useRef<boolean>(true);
  isNoiseSuppressionRef.current = isNoiseSuppression;
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenQuality, setScreenQuality] = useState<
    "720p" | "1080p" | "1440p" | "4K"
  >("1080p");
  const [screenFps, setScreenFps] = useState<30 | 60 | 90 | 120>(60);
  const [shareSystemAudio, setShareSystemAudio] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [remoteStreamerIds, setRemoteStreamerIds] = useState<string[]>([]);
  const [watchedStreamerId, setWatchedStreamerId] = useState<string | null>(null);
  const [isWatchingRemoteStream, setIsWatchingRemoteStream] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStreamUiIdle, setIsStreamUiIdle] = useState(false);
  const streamIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [streamVolume, setStreamVolume] = useState(100);
  const [streamMuted, setStreamMuted] = useState(false);
  const [streamCtxMenu, setStreamCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [activePeerVolId, setActivePeerVolId] = useState<string | null>(null);
  const remoteVideoStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamsByPeerRef = useRef<Map<string, MediaStream>>(new Map());
  const streamAudioGainNodesRef = useRef<GainNode[]>([]);
  const streamVolumeRef = useRef(100);
  streamVolumeRef.current = streamVolume;
  const streamMutedRef = useRef(false);
  streamMutedRef.current = streamMuted;
  const [peerVolumes, setPeerVolumes] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem("satir_arasi_call_volumes_v1");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const peerVolumesRef = useRef<Record<string, number>>(peerVolumes);
  peerVolumesRef.current = peerVolumes;
  const getPeerVol = (pid: string) => peerVolumesRef.current[pid] ?? 140;
  const setPeerVol = (pid: string, val: number) => {
    const clamped = Math.max(0, Math.min(200, val));
    setPeerVolumes((prev) => {
      const next = { ...prev, [pid]: clamped };
      try {
        localStorage.setItem("satir_arasi_call_volumes_v1", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    const entry = peersRef.current.get(pid);
    if (entry) {
      if (entry.gainNode) {
        entry.gainNode.gain.value = isDeafenedRef.current ? 0 : clamped / 100;
      } else {
        entry.audioEl.volume = isDeafenedRef.current
          ? 0
          : Math.min(1, clamped / 100);
      }
    }
  };
  const [callSeconds, setCallSeconds] = useState(0);
  const [mutedRingCallId, setMutedRingCallId] = useState<string | null>(null);
  const [speakingIds, setSpeakingIds] = useState<Record<string, boolean>>({});
  const [callPingMs, setCallPingMs] = useState<number | null>(null);
  const [showPingMs, setShowPingMs] = useState(false);

  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const rawMicStreamRef = useRef<MediaStream | null>(null);
  const micProcessorRef = useRef<{
    ctx: AudioContext;
    intervalId: ReturnType<typeof setInterval>;
    gateGain: GainNode;
  } | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenAudioProcessorRef = useRef<{
    ctx: AudioContext;
    intervalId: ReturnType<typeof setInterval>;
    stream: MediaStream;
  } | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenContainerRef = useRef<HTMLDivElement | null>(null);
  const localScreenPreviewRef = useRef<HTMLVideoElement | null>(null);

  const postChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const isInCallRef = useRef<boolean>(false);
  isInCallRef.current = isInCall;

  // Konuşan kişi yeşil halka algılama (VAD) ve canlı WebRTC ping (ms) ölçümü
  useEffect(() => {
    if (!isInCall) {
      setSpeakingIds({});
      setCallPingMs(null);
      return;
    }

    let localCtx: AudioContext | null = null;
    let localAnalyser: AnalyserNode | null = null;
    let localSrcStream: MediaStream | null = null;
    const peerAnalysers = new Map<
      string,
      { stream: MediaStream; analyser: AnalyserNode; ctx: AudioContext }
    >();
    const buf = new Uint8Array(64);

    const sampleLevel = (analyser: AnalyserNode): number => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const d = (buf[i] - 128) / 128;
        sum += d * d;
      }
      return Math.sqrt(sum / buf.length);
    };

    const vadTimer = setInterval(() => {
      const nextSpeaking: Record<string, boolean> = {};
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!isMuted && rawMicStreamRef.current && Ctor) {
        try {
          if (localSrcStream !== rawMicStreamRef.current) {
            localSrcStream = rawMicStreamRef.current;
            if (!localCtx || localCtx.state === "closed") {
              localCtx = new Ctor();
            }
            if (localCtx.state === "suspended") {
              localCtx.resume().catch(() => {});
            }
            const src = localCtx.createMediaStreamSource(localSrcStream);
            localAnalyser = localCtx.createAnalyser();
            localAnalyser.fftSize = 128;
            src.connect(localAnalyser);
          }
          if (localAnalyser && sampleLevel(localAnalyser) > 0.03) {
            nextSpeaking[currentUser.id] = true;
          }
        } catch {
          // ignore
        }
      }

      if (!isDeafened && Ctor) {
        peersRef.current.forEach((entry, pid) => {
          const stream = entry.audioEl.srcObject as MediaStream | null;
          if (!stream || stream.getAudioTracks().length === 0) return;
          try {
            let rec = peerAnalysers.get(pid);
            if (!rec || rec.stream !== stream) {
              const ctx =
                entry.audioCtx && entry.audioCtx.state !== "closed"
                  ? entry.audioCtx
                  : new Ctor();
              if (ctx.state === "suspended") ctx.resume().catch(() => {});
              const src = ctx.createMediaStreamSource(stream);
              const analyser = ctx.createAnalyser();
              analyser.fftSize = 128;
              src.connect(analyser);
              rec = { stream, analyser, ctx };
              peerAnalysers.set(pid, rec);
            }
            if (sampleLevel(rec.analyser) > 0.03) {
              nextSpeaking[pid] = true;
            }
          } catch {
            // ignore
          }
        });
      }

      setSpeakingIds((prev) => {
        const pk = Object.keys(prev);
        const nk = Object.keys(nextSpeaking);
        if (pk.length === nk.length && nk.every((k) => prev[k])) return prev;
        return nextSpeaking;
      });
    }, 150);

    const pingTimer = setInterval(async () => {
      let bestRttMs: number | null = null;
      for (const entry of peersRef.current.values()) {
        try {
          const stats = await entry.pc.getStats();
          stats.forEach((rep) => {
            if (
              rep.type === "candidate-pair" &&
              rep.state === "succeeded" &&
              typeof rep.currentRoundTripTime === "number"
            ) {
              const ms = Math.round(rep.currentRoundTripTime * 1000);
              if (bestRttMs === null || ms < bestRttMs) {
                bestRttMs = ms;
              }
            }
          });
        } catch {
          // ignore
        }
      }
      setCallPingMs(bestRttMs);
    }, 2500);

    return () => {
      clearInterval(vadTimer);
      clearInterval(pingTimer);
      if (localCtx && localCtx.state !== "closed") {
        localCtx.close().catch(() => {});
      }
    };
  }, [isInCall, isMuted, isDeafened, currentUser.id]);
  const isDeafenedRef = useRef<boolean>(false);
  isDeafenedRef.current = isDeafened;
  const volumeRef = useRef<number>(volume);
  volumeRef.current = volume;
  const isStartingRef = useRef<boolean>(false);
  const isPollingRef = useRef<boolean>(false);
  const callJoinGuardUntilRef = useRef<number>(0);
  const consecutiveNullPollsRef = useRef<number>(0);
  const lastTriggerRef = useRef<number>(0);
  const recentlyLeftCallsRef = useRef<Map<string, number>>(new Map());

  const postSignal = (payload: Record<string, unknown>) => {
    postChainRef.current = postChainRef.current.then(() =>
      fetch(callApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {})
    );
    return postChainRef.current;
  };

  const recomputePeerConnected = () => {
    let any = false;
    peersRef.current.forEach((p) => {
      if (p.connected) any = true;
    });
    setPeerConnected(any);
  };

  const closePeerEntry = (peerId: string) => {
    const entry = peersRef.current.get(peerId);
    if (!entry) return;
    if (entry.candFlushTimer) clearTimeout(entry.candFlushTimer);
    if (entry.disconnectTimer) clearTimeout(entry.disconnectTimer);
    entry.pc.onicecandidate = null;
    entry.pc.ontrack = null;
    entry.pc.onconnectionstatechange = null;
    entry.pc.oniceconnectionstatechange = null;
    entry.pc.close();
    entry.audioEl.srcObject = null;
    entry.audioEl.remove();
    entry.extraAudioEls?.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    if (entry.audioCtx) {
      entry.audioCtx.close().catch(() => {});
    }
    peersRef.current.delete(peerId);
  };

  const closePeerConnectionOnly = () => {
    Array.from(peersRef.current.keys()).forEach(closePeerEntry);
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setPeerConnected(false);
    setHasRemoteVideo(false);
    setRemoteStreamerIds([]);
    setWatchedStreamerId(null);
    setIsWatchingRemoteStream(false);
    remoteVideoStreamRef.current = null;
    remoteStreamsByPeerRef.current.clear();
    streamAudioGainNodesRef.current = [];
    setStreamCtxMenu(null);
  };

  const leaveCallLocal = (notifyServer: boolean) => {
    if (isInCallRef.current) {
      callSfx.ended();
    }
    const leftConvId = remoteCall?.convId || convIdRef.current;
    const leftCallId = remoteCall?.callId;
    if (leftCallId) {
      recentlyLeftCallsRef.current.set(leftCallId, Date.now() + 8000);
      setMutedRingCallId(leftCallId);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("satir_arasi_left_call", {
            detail: { callId: leftCallId },
          })
        );
      }
    }
    isInCallRef.current = false;
    setIsInCall(false);
    setRemoteCall((prev) => {
      if (!prev) return null;
      const remaining = (prev.participants || []).filter(
        (p) => p.id !== currentUser.id
      );
      return remaining.length > 0 ? { ...prev, participants: remaining } : null;
    });
    setActiveCallConvId(null);
    setActiveCallPeerName("");
    setActiveTargetUserIds([]);
    setIsMuted(false);
    setIsDeafened(false);
    setIsScreenSharing(false);
    setCallSeconds(0);
    closePeerConnectionOnly();
    if (notifyServer && leftConvId) {
      fetch(callApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LEAVE",
          convId: leftConvId,
          userId: currentUser.id,
        }),
      }).catch(() => {});
    }
    if (micProcessorRef.current) {
      clearInterval(micProcessorRef.current.intervalId);
      micProcessorRef.current.ctx.close().catch(() => {});
      micProcessorRef.current = null;
    }
    if (rawMicStreamRef.current) {
      rawMicStreamRef.current.getTracks().forEach((t) => t.stop());
      rawMicStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenAudioProcessorRef.current) {
      clearInterval(screenAudioProcessorRef.current.intervalId);
      screenAudioProcessorRef.current.stream.getTracks().forEach((t) => t.stop());
      screenAudioProcessorRef.current.ctx.close().catch(() => {});
      screenAudioProcessorRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localScreenPreviewRef.current) {
      localScreenPreviewRef.current.srcObject = null;
    }
  };

  // Yalnızca component tamamen unmount olduğunda veya sayfa yenilenirken/kapanırken ayrıl; sohbet değişiminde düşme!
  useEffect(() => {
    const onUnload = () => {
      if (isInCallRef.current && convIdRef.current) {
        const payload = JSON.stringify({
          action: "LEAVE",
          convId: convIdRef.current,
          userId: currentUser.id,
        });
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(
            callApi,
            new Blob([payload], { type: "application/json" })
          );
        } else {
          fetch(callApi, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      }
    };
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      onUnload();
      leaveCallLocal(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isInCall || !peerConnected) {
      if (!isInCall) setCallSeconds(0);
      return;
    }
    const t = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isInCall, peerConnected]);

  // 5 dakika (300 sn) boyunca kimse katılmazsa aramayı kapat ve sadece kullanıcıya özel mesaj bırak
  useEffect(() => {
    if (!isInCall) return;
    const count = remoteCall?.participants?.length ?? 1;
    if (count >= 2 || peerConnected) return;
    const timer = setTimeout(() => {
      if (!isInCallRef.current) return;
      const endedConvId = convIdRef.current;
      leaveCallLocal(true);
      if (endedConvId && currentUser.id) {
        try {
          const storageKey = `satir_arasi_call_notices_${currentUser.id}`;
          const prev = JSON.parse(localStorage.getItem(storageKey) || "[]");
          const next = [
            ...(Array.isArray(prev) ? prev : []),
            {
              id: `cn_${Date.now()}`,
              convId: endedConvId,
              text: "5 dakika boyunca kimse katılmadığı için arama sonlandırıldı.",
              createdAt: new Date().toLocaleTimeString("tr-TR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
            },
          ].slice(-30);
          localStorage.setItem(storageKey, JSON.stringify(next));
          window.dispatchEvent(new Event("satir_arasi_call_notices_updated"));
        } catch {
          // ignore
        }
      }
      showToast("Kimse katılmadığı için arama 5 dk sonunda sonlandı.");
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInCall, remoteCall?.participants?.length, peerConnected]);

  // Bağlantı 7 saniyeden uzun süre "Bağlanıyor..." durumunda takılırsa otomatik ICE restart dener
  useEffect(() => {
    if (
      !isInCall ||
      !remoteCall ||
      remoteCall.participants.length < 2
    ) {
      return;
    }
    const timer = setInterval(() => {
      peersRef.current.forEach((entry, peerId) => {
        if (currentUser.id >= peerId) return;
        if (entry.connected) return;
        const pc = entry.pc;
        if (
          pc.connectionState !== "connected" &&
          pc.iceConnectionState !== "connected" &&
          pc.iceConnectionState !== "completed"
        ) {
          pc.createOffer({ iceRestart: true })
            .then(async (offer) => {
              await pc.setLocalDescription(offer);
              await fetch(callApi, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "PAIR_RENEGOTIATE_OFFER",
                  convId,
                  callId: entry.callId,
                  userId: currentUser.id,
                  peerId,
                  sdp: offer,
                }),
              }).catch(() => {});
            })
            .catch(() => {});
        }
      });
    }, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInCall, remoteCall?.participants?.length, currentUser.id, convId]);

  useEffect(() => {
    const onFs = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const v = Math.max(0, Math.min(1, volume / 100));
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isDeafened;
      remoteAudioRef.current.volume = v;
    }
    peersRef.current.forEach((entry, pid) => {
      const pVol = getPeerVol(pid);
      entry.audioEl.muted = isDeafened;
      if (entry.gainNode) {
        entry.gainNode.gain.value = isDeafened ? 0 : pVol / 100;
        entry.audioEl.volume = 0.01;
      } else {
        entry.audioEl.volume = isDeafened ? 0 : Math.min(1, pVol / 100);
      }
    });
  }, [isDeafened, volume]);

  useEffect(() => {
    if (isWatchingRemoteStream && hasRemoteVideo && remoteVideoRef.current) {
      const targetStream =
        (watchedStreamerId &&
          remoteStreamsByPeerRef.current.get(watchedStreamerId)) ||
        remoteVideoStreamRef.current ||
        Array.from(remoteStreamsByPeerRef.current.values())[0] ||
        null;
      if (targetStream) {
        remoteVideoRef.current.srcObject = targetStream;
        remoteVideoRef.current.play().catch(() => {});
      }
    }
  }, [isWatchingRemoteStream, hasRemoteVideo, watchedStreamerId, remoteStreamerIds]);

  useEffect(() => {
    const effectiveGain = isDeafened || streamMuted ? 0 : streamVolume / 100;
    streamAudioGainNodesRef.current.forEach((g) => {
      try {
        g.gain.value = effectiveGain;
      } catch {
        // ignore
      }
    });
    peersRef.current.forEach((entry) => {
      entry.extraAudioEls?.forEach((el) => {
        el.muted = isDeafened || streamMuted;
        if (!entry.audioCtx || entry.audioCtx.state !== "running") {
          el.volume = isDeafened || streamMuted ? 0 : Math.min(1, streamVolume / 100);
        }
      });
    });
  }, [streamVolume, streamMuted, isDeafened]);

  useEffect(() => {
    if (!streamCtxMenu) return;
    const close = () => setStreamCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [streamCtxMenu]);

  const incomingCallId =
    !isInCall &&
    remoteCall &&
    remoteCall.status === "ACTIVE" &&
    remoteCall.participants.length > 0 &&
    !remoteCall.participants.some((p) => p.id === currentUser.id) &&
    mutedRingCallId !== remoteCall.callId
      ? remoteCall.callId
      : null;

  // Gelen arama çalma sesi: odada aktif arama var ama henüz katılmadıysak
  useEffect(() => {
    if (!incomingCallId) return;
    const stop = startRing("incoming");
    return stop;
  }, [incomingCallId]);

  const isWaitingForPeer =
    isInCall &&
    !peerConnected &&
    !isDeafened &&
    (remoteCall?.participants?.length ?? 1) < 2;

  // Giden arama çalma sesi: aramayı başlattık ve karşı tarafın katılmasını bekliyoruz
  useEffect(() => {
    if (!isWaitingForPeer) return;
    const stop = startRing("outgoing");
    return stop;
  }, [isWaitingForPeer]);

  const ensureLocalMic = async (): Promise<MediaStream | null> => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      rawMicStreamRef.current = rawStream;
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctor) {
          const ctx = new Ctor();
          if (ctx.state === "suspended") {
            await ctx.resume().catch(() => {});
          }
          if ((ctx.state as string) !== "running") {
            ctx.close().catch(() => {});
            localStreamRef.current = rawStream;
            return rawStream;
          }
          const src = ctx.createMediaStreamSource(rawStream);
          const highpass = ctx.createBiquadFilter();
          highpass.type = "highpass";
          highpass.frequency.value = 100;
          const lowpass = ctx.createBiquadFilter();
          lowpass.type = "lowpass";
          lowpass.frequency.value = 7500;
          const compressor = ctx.createDynamicsCompressor();
          compressor.threshold.value = -24;
          compressor.knee.value = 20;
          compressor.ratio.value = 4;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          const gateGain = ctx.createGain();
          gateGain.gain.value = 1;
          const dest = ctx.createMediaStreamDestination();

          src.connect(highpass);
          highpass.connect(lowpass);
          lowpass.connect(compressor);
          compressor.connect(analyser);
          compressor.connect(gateGain);
          gateGain.connect(dest);

          const data = new Uint8Array(analyser.frequencyBinCount);
          let lastVoiceAt = Date.now();
          const intervalId = setInterval(() => {
            if (!isNoiseSuppressionRef.current) {
              gateGain.gain.setTargetAtTime(1, ctx.currentTime, 0.02);
              return;
            }
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const now = Date.now();
            if (rms > 0.012) {
              lastVoiceAt = now;
              gateGain.gain.setTargetAtTime(1, ctx.currentTime, 0.015);
            } else if (now - lastVoiceAt > 260) {
              gateGain.gain.setTargetAtTime(0.03, ctx.currentTime, 0.06);
            }
          }, 30);

          micProcessorRef.current = { ctx, intervalId, gateGain };
          localStreamRef.current = dest.stream;
          return dest.stream;
        }
      } catch {
        // fallback to rawStream
      }
      localStreamRef.current = rawStream;
      return rawStream;
    } catch {
      showToast("Mikrofon izni alınamadı.");
      return null;
    }
  };

  const createPeerFor = (callId: string, peerId: string): PeerEntry => {
    closePeerEntry(peerId);

    const pc = new RTCPeerConnection(ICE_CONFIG);
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.setAttribute("playsinline", "true");
    audioEl.muted = isDeafenedRef.current;
    audioEl.volume = Math.max(0, Math.min(1, volumeRef.current / 100));

    let screenSender: RTCRtpSender | null = null;
    let screenAudioSender: RTCRtpSender | null = null;
    const micStream = localStreamRef.current;
    if (micStream) {
      micStream.getTracks().forEach((track) => pc.addTrack(track, micStream));
    }
    if (screenStreamRef.current) {
      const vt = screenStreamRef.current.getVideoTracks()[0];
      if (vt) {
        screenSender = pc.addTrack(vt, screenStreamRef.current);
      }
      const outAudioStream =
        screenAudioProcessorRef.current?.stream || screenStreamRef.current;
      const at = outAudioStream.getAudioTracks()[0];
      if (at) {
        screenAudioSender = pc.addTrack(at, outAudioStream);
      }
    }

    const entry: PeerEntry = {
      callId,
      peerId,
      pc,
      audioEl,
      screenSender,
      screenAudioSender,
      sentOffer: false,
      appliedOffer: false,
      appliedAnswer: false,
      appliedCandCount: 0,
      handledRenegNonce: 0,
      appliedRenegAnswerNonce: 0,
      pendingCands: [],
      candFlushTimer: null,
      disconnectTimer: null,
      connected: false,
    };
    peersRef.current.set(peerId, entry);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        entry.pendingCands.push(e.candidate.toJSON());
        if (!entry.candFlushTimer) {
          entry.candFlushTimer = setTimeout(() => {
            entry.candFlushTimer = null;
            const batch = entry.pendingCands;
            entry.pendingCands = [];
            if (batch.length > 0) {
              postSignal({
                action: "PAIR_CANDIDATES",
                convId,
                callId,
                userId: currentUser.id,
                peerId,
                candidates: batch,
              });
            }
          }, 50);
        }
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      if (e.track.kind === "audio") {
        const pVol = getPeerVol(peerId);
        // Ekran yayını sesi gelirse mevcut mikrofon audio elementini ezme, ayrı audio elementi kullan
        if (entry.audioEl.srcObject && entry.audioEl.srcObject !== stream) {
          const extraEl = document.createElement("audio");
          extraEl.autoplay = true;
          extraEl.setAttribute("playsinline", "true");
          extraEl.srcObject = stream;
          extraEl.muted = isDeafenedRef.current || streamMutedRef.current;
          try {
            const Ctor =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;
            if (Ctor) {
              if (!entry.audioCtx || entry.audioCtx.state === "closed") {
                entry.audioCtx = new Ctor();
              }
              if (entry.audioCtx.state === "suspended") {
                entry.audioCtx.resume().catch(() => {});
              }
              const sSrc = entry.audioCtx.createMediaStreamSource(stream);
              const sGain = entry.audioCtx.createGain();
              sGain.gain.value =
                isDeafenedRef.current || streamMutedRef.current
                  ? 0
                  : streamVolumeRef.current / 100;
              sSrc.connect(sGain);
              sGain.connect(entry.audioCtx.destination);
              streamAudioGainNodesRef.current.push(sGain);
              extraEl.volume =
                entry.audioCtx.state === "running"
                  ? 0.01
                  : isDeafenedRef.current || streamMutedRef.current
                  ? 0
                  : Math.min(1, streamVolumeRef.current / 100);
            } else {
              extraEl.volume =
                isDeafenedRef.current || streamMutedRef.current
                  ? 0
                  : Math.min(1, streamVolumeRef.current / 100);
            }
          } catch {
            extraEl.volume =
              isDeafenedRef.current || streamMutedRef.current
                ? 0
                : Math.min(1, streamVolumeRef.current / 100);
          }
          extraEl.play().catch(() => {});
          entry.extraAudioEls = [...(entry.extraAudioEls || []), extraEl];
          e.track.onended = () => {
            extraEl.srcObject = null;
            extraEl.remove();
          };
          return;
        }
        entry.audioEl.srcObject = stream;
        entry.audioEl.muted = isDeafenedRef.current;
        try {
          const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext;
          if (Ctor) {
            if (!entry.audioCtx || entry.audioCtx.state === "closed") {
              entry.audioCtx = new Ctor();
            }
            if (entry.audioCtx.state === "suspended") {
              entry.audioCtx.resume().catch(() => {});
            }
            const src = entry.audioCtx.createMediaStreamSource(stream);
            const gain = entry.audioCtx.createGain();
            const analyser = entry.audioCtx.createAnalyser();
            analyser.fftSize = 256;
            gain.gain.value = isDeafenedRef.current ? 0 : pVol / 100;
            src.connect(analyser);
            src.connect(gain);
            gain.connect(entry.audioCtx.destination);
            entry.gainNode = gain;
            entry.remoteAnalyser = analyser;
            const syncElVol = () => {
              if (entry.audioCtx && entry.audioCtx.state === "running") {
                entry.audioEl.volume = 0.01;
              } else {
                entry.audioEl.volume = isDeafenedRef.current
                  ? 0
                  : Math.min(1, getPeerVol(peerId) / 100);
              }
            };
            syncElVol();
            entry.audioCtx.onstatechange = syncElVol;
          } else {
            entry.audioEl.volume = isDeafenedRef.current
              ? 0
              : Math.min(1, pVol / 100);
          }
        } catch {
          entry.audioEl.volume = isDeafenedRef.current
            ? 0
            : Math.min(1, pVol / 100);
        }
        entry.audioEl.play().catch(() => {});
      }
      if (e.track.kind === "video") {
        remoteStreamsByPeerRef.current.set(peerId, stream);
        remoteVideoStreamRef.current = stream;
        setRemoteStreamerIds(Array.from(remoteStreamsByPeerRef.current.keys()));
        setHasRemoteVideo(true);
        const clearRemoteVideo = () => {
          remoteStreamsByPeerRef.current.delete(peerId);
          const remainingIds = Array.from(remoteStreamsByPeerRef.current.keys());
          setRemoteStreamerIds(remainingIds);
          if (remainingIds.length === 0) {
            remoteVideoStreamRef.current = null;
            setHasRemoteVideo(false);
            setWatchedStreamerId(null);
            setIsWatchingRemoteStream(false);
            setStreamCtxMenu(null);
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
          } else {
            const fallbackId = remainingIds[0];
            remoteVideoStreamRef.current =
              remoteStreamsByPeerRef.current.get(fallbackId) || null;
            setWatchedStreamerId((prev) => (prev === peerId ? fallbackId : prev));
          }
        };
        e.track.onended = clearRemoteVideo;
        stream.onremovetrack = (ev) => {
          if (ev.track.kind === "video") clearRemoteVideo();
        };
      }
    };

    const syncConnState = () => {
      if (
        pc.connectionState === "connected" ||
        pc.iceConnectionState === "connected" ||
        pc.iceConnectionState === "completed"
      ) {
        if (entry.disconnectTimer) {
          clearTimeout(entry.disconnectTimer);
          entry.disconnectTimer = null;
        }
        if (!entry.connected) {
          entry.connected = true;
          callSfx.connected();
          recomputePeerConnected();
        }
      } else if (
        pc.connectionState === "failed" ||
        pc.connectionState === "closed" ||
        pc.iceConnectionState === "failed"
      ) {
        if (entry.disconnectTimer) {
          clearTimeout(entry.disconnectTimer);
          entry.disconnectTimer = null;
        }
        entry.connected = false;
        recomputePeerConnected();
      } else if (
        pc.connectionState === "disconnected" ||
        pc.iceConnectionState === "disconnected"
      ) {
        if (!entry.disconnectTimer) {
          entry.disconnectTimer = setTimeout(() => {
            entry.disconnectTimer = null;
            if (
              pc.connectionState !== "connected" &&
              pc.iceConnectionState !== "connected" &&
              pc.iceConnectionState !== "completed"
            ) {
              entry.connected = false;
              recomputePeerConnected();
            }
          }, 4000);
        }
      }
    };
    pc.onconnectionstatechange = syncConnState;
    pc.oniceconnectionstatechange = syncConnState;

    return entry;
  };

  const startOrJoinCall = async (
    action: "START" | "JOIN",
    overrideConvId?: string,
    overridePeerName?: string,
    overrideTargets?: string[]
  ) => {
    const targetConv = overrideConvId || convId;
    if (!targetConv) return;
    remoteAudioRef.current?.play().catch(() => {});
    const mic = await ensureLocalMic();
    if (!mic) return;
    setActiveCallConvId(targetConv);
    if (overridePeerName) setActiveCallPeerName(overridePeerName);
    if (overrideTargets) setActiveTargetUserIds(overrideTargets);
    isStartingRef.current = true;
    consecutiveNullPollsRef.current = 0;
    callJoinGuardUntilRef.current = Date.now() + 5000;
    isInCallRef.current = true;
    setIsInCall(true);
    callSfx.connected();

    try {
      const payload = JSON.stringify({
        action,
        convId: targetConv,
        userId: currentUser.id,
        nickname: currentUser.nickname,
        targetUserIds: overrideTargets || targetUserIds,
        isMuted,
        isDeafened,
      });
      let res = await fetch(callApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 300));
        res = await fetch(callApi, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
      }
      if (res.ok) {
        const data = (await res.json()) as { call?: RemoteCallData | null };
        if (data.call) {
          consecutiveNullPollsRef.current = 0;
          if (data.call.convId && data.call.convId !== targetConv) {
            setActiveCallConvId(data.call.convId);
          }
          setRemoteCall(data.call);
        }
      } else {
        const errText = await res.text().catch(() => "");
        showToast(
          `Arama sunucusuna bağlanılamadı (${res.status}${
            errText ? `: ${errText.slice(0, 60)}` : ""
          }).`
        );
      }
    } catch {
      showToast("Arama başlatılırken ağ hatası oluştu.");
    } finally {
      isStartingRef.current = false;
    }
  };

  useEffect(() => {
    if (callRequest && callRequest.nonce > lastTriggerRef.current) {
      lastTriggerRef.current = callRequest.nonce;
      if (!isInCallRef.current) {
        startOrJoinCall(
          "START",
          callRequest.convId,
          callRequest.peerName,
          callRequest.targetUserIds
        );
      } else {
        showToast("Zaten başka bir sesli aramadasın. Önce mevcut aramadan ayrıl.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callRequest]);

  // Signaling poller
  useEffect(() => {
    if (!convId) {
      setRemoteCall(null);
      return;
    }
    let active = true;
    const poll = async () => {
      if (isStartingRef.current || isPollingRef.current) {
        return;
      }
      isPollingRef.current = true;
      try {
        const res = await fetch(
          `${callApi}?convId=${encodeURIComponent(
            convId
          )}&userId=${encodeURIComponent(currentUser.id)}&inCall=${
            isInCallRef.current ? "1" : "0"
          }`,
          { cache: "no-store" }
        );
        if (!res.ok || !active || isStartingRef.current) return;
        const data = (await res.json()) as { call?: RemoteCallData | null };
        const remote = data.call ?? null;

        if (!remote || remote.status !== "ACTIVE") {
          if (!isInCallRef.current) {
            setRemoteCall(null);
            return;
          }
          if (Date.now() < callJoinGuardUntilRef.current) {
            return;
          }
          consecutiveNullPollsRef.current += 1;
          if (consecutiveNullPollsRef.current >= 3) {
            consecutiveNullPollsRef.current = 0;
            leaveCallLocal(false);
          }
          return;
        }
        consecutiveNullPollsRef.current = 0;

        // Sayfa yenilendiyse (!isInCall) ama sunucuda hala katılımcı görünüyorsak hayalet kaydı temizle
        if (
          !isInCallRef.current &&
          remote.participants.some((p) => p.id === currentUser.id)
        ) {
          recentlyLeftCallsRef.current.set(remote.callId, Date.now() + 8000);
          setMutedRingCallId(remote.callId);
          const remaining = remote.participants.filter(
            (p) => p.id !== currentUser.id
          );
          setRemoteCall(
            remaining.length > 0 ? { ...remote, participants: remaining } : null
          );
          fetch(callApi, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "LEAVE",
              convId: remote.convId || convId,
              userId: currentUser.id,
            }),
          }).catch(() => {});
          return;
        }

        if (
          !isInCallRef.current &&
          (recentlyLeftCallsRef.current.get(remote.callId) || 0) > Date.now()
        ) {
          setMutedRingCallId(remote.callId);
        }

        setRemoteCall(remote);
        if (!isInCallRef.current) return;

        // Eğer odada en az 2 kişi varsa her katılımcıyla bağımsız P2P Mesh bağlantısı kur
        if (remote.participants.length < 2) {
          if (peersRef.current.size > 0) {
            closePeerConnectionOnly();
          }
          return;
        }

        const otherIds = new Set(
          remote.participants
            .map((p) => p.id)
            .filter((id) => id && id !== currentUser.id)
        );

        const activeSigScope = remote.handshakeId || remote.callId;
        const effectiveConvId = remote.convId || convId;
        // Odadan ayrılan kişilerin veya yeni handshake başlayanların bağlantısını sıfırla
        Array.from(peersRef.current.keys()).forEach((pid) => {
          const existing = peersRef.current.get(pid);
          if (!otherIds.has(pid) || existing?.callId !== activeSigScope) {
            closePeerEntry(pid);
            recomputePeerConnected();
          }
        });

        const pairSignals = remote.pairSignals || {};
        for (const peerId of otherIds) {
          let entry = peersRef.current.get(peerId);
          if (!entry) {
            entry = createPeerFor(activeSigScope, peerId);
          }

          const pc = entry.pc;
          const sig = pairSignals[peerId];
          const isOfferer = currentUser.id < peerId;

          if (isOfferer && !entry.sentOffer && pc.signalingState === "stable") {
            entry.sentOffer = true;
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await fetch(callApi, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "PAIR_OFFER",
                  convId: effectiveConvId,
                  callId: activeSigScope,
                  userId: currentUser.id,
                  peerId,
                  sdp: offer,
                }),
              });
            } catch {
              entry.sentOffer = false;
            }
          }

          if (!isOfferer && sig?.offer && !entry.appliedOffer) {
            entry.appliedOffer = true;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await fetch(callApi, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "PAIR_ANSWER",
                  convId: effectiveConvId,
                  callId: activeSigScope,
                  userId: currentUser.id,
                  peerId,
                  sdp: answer,
                }),
              });
            } catch {
              entry.appliedOffer = false;
            }
          }

          if (
            isOfferer &&
            sig?.answer &&
            !entry.appliedAnswer &&
            pc.signalingState === "have-local-offer"
          ) {
            entry.appliedAnswer = true;
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(sig.answer));
            } catch {
              entry.appliedAnswer = false;
            }
          }

          if (pc.remoteDescription && sig?.peerCandidates?.length) {
            for (
              let i = entry.appliedCandCount;
              i < sig.peerCandidates.length;
              i++
            ) {
              await pc
                .addIceCandidate(new RTCIceCandidate(sig.peerCandidates[i]))
                .catch(() => {});
            }
            entry.appliedCandCount = sig.peerCandidates.length;
          }

          const rNonce = sig?.renegotiateNonce || 0;
          if (
            rNonce > entry.handledRenegNonce &&
            sig?.renegotiateFrom !== currentUser.id &&
            sig?.renegotiateOffer
          ) {
            entry.handledRenegNonce = rNonce;
            await pc.setRemoteDescription(
              new RTCSessionDescription(sig.renegotiateOffer)
            );
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            const offerSdp = sig.renegotiateOffer.sdp || "";
            const videoBlocks = offerSdp.split("m=video ").slice(1);
            const offerSendsVideo = videoBlocks.some(
              (blk) => blk.includes("a=sendonly") || blk.includes("a=sendrecv")
            );
            if (!offerSendsVideo) {
              remoteStreamsByPeerRef.current.delete(peerId);
              const remIds = Array.from(remoteStreamsByPeerRef.current.keys());
              setRemoteStreamerIds(remIds);
              if (remIds.length === 0) {
                setHasRemoteVideo(false);
                setWatchedStreamerId(null);
                setIsWatchingRemoteStream(false);
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
              }
            }
            await fetch(callApi, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "PAIR_RENEGOTIATE_ANSWER",
                convId: effectiveConvId,
                callId: activeSigScope,
                userId: currentUser.id,
                peerId,
                sdp: ans,
              }),
            }).catch(() => {});
          } else if (
            rNonce > entry.appliedRenegAnswerNonce &&
            sig?.renegotiateFrom === currentUser.id &&
            sig?.renegotiateAnswer
          ) {
            entry.appliedRenegAnswerNonce = rNonce;
            await pc.setRemoteDescription(
              new RTCSessionDescription(sig.renegotiateAnswer)
            );
          }
        }
      } catch {
        // ignore transient network errors
      } finally {
        isPollingRef.current = false;
      }
    };

    poll();
    const hasPendingPeers =
      isInCall &&
      (remoteCall?.participants?.length ?? 0) >= 2 &&
      Array.from(peersRef.current.values()).filter((p) => p.connected).length <
        (remoteCall?.participants?.length ?? 1) - 1;
    const pollMs = !isInCall
      ? 2200
      : hasPendingPeers || !peerConnected
      ? 350
      : 1800;
    const t = setInterval(poll, pollMs);
    return () => {
      active = false;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId, isInCall, peerConnected, remoteCall?.participants?.length, currentUser.id]);

  const syncParticipantState = (nextMuted: boolean, nextDeafened: boolean) => {
    if (!convIdRef.current) return;
    postSignal({
      action: "PARTICIPANT_STATE",
      convId: convIdRef.current,
      userId: currentUser.id,
      isMuted: nextMuted,
      isDeafened: nextDeafened,
    });
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    (next ? callSfx.mute : callSfx.unmute)();
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    syncParticipantState(next, isDeafened);
  };

  const toggleDeafen = () => {
    const next = !isDeafened;
    setIsDeafened(next);
    (next ? callSfx.deafen : callSfx.undeafen)();
    if (next) {
      setIsMuted(true);
      localStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
      syncParticipantState(true, true);
    } else {
      setIsMuted(false);
      localStreamRef.current?.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      syncParticipantState(false, false);
    }
  };

  const applyScreenSenderQuality = (
    sender: RTCRtpSender,
    maxBitrate: number,
    fps: number
  ) => {
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.degradationPreference = "maintain-resolution";
      params.encodings[0].scaleResolutionDownBy = 1;
      params.encodings[0].maxBitrate = maxBitrate;
      params.encodings[0].maxFramerate = fps;
      sender.setParameters(params).catch(() => {});
    } catch {
      // ignore
    }
  };

  const triggerRenegotiationAll = async (videoMaxKbps?: number) => {
    const tasks: Promise<unknown>[] = [];
    const targetCid = remoteCall?.convId || convId;
    peersRef.current.forEach((entry, peerId) => {
      tasks.push(
        entry.pc
          .createOffer()
          .then(async (offer) => {
            if (videoMaxKbps && offer.sdp) {
              offer.sdp = offer.sdp.replace(
                /(m=video [^\r\n]+\r\n(?:c=[^\r\n]+\r\n)?)/,
                `$1b=AS:${videoMaxKbps}\r\n`
              );
            }
            await entry.pc.setLocalDescription(offer);
            await fetch(callApi, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "PAIR_RENEGOTIATE_OFFER",
                convId: targetCid,
                callId: entry.callId,
                userId: currentUser.id,
                peerId,
                sdp: offer,
              }),
            }).catch(() => {});
          })
          .catch(() => {})
      );
    });
    await Promise.all(tasks);
  };

  const toggleScreenShare = async () => {
    if (peersRef.current.size === 0) return;

    if (isScreenSharing) {
      peersRef.current.forEach((entry) => {
        if (entry.screenSender) {
          entry.pc.removeTrack(entry.screenSender);
          entry.screenSender = null;
        }
        if (entry.screenAudioSender) {
          entry.pc.removeTrack(entry.screenAudioSender);
          entry.screenAudioSender = null;
        }
      });
      if (screenAudioProcessorRef.current) {
        clearInterval(screenAudioProcessorRef.current.intervalId);
        screenAudioProcessorRef.current.stream
          .getTracks()
          .forEach((t) => t.stop());
        screenAudioProcessorRef.current.ctx.close().catch(() => {});
        screenAudioProcessorRef.current = null;
      }
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (localScreenPreviewRef.current) {
        localScreenPreviewRef.current.srcObject = null;
      }
      setIsScreenSharing(false);
      callSfx.screenOff();
      await triggerRenegotiationAll();
      return;
    }

    try {
      const qMap = {
        "720p": { width: 1280, height: 720, maxBitrate: 2_500_000 },
        "1080p": { width: 1920, height: 1080, maxBitrate: 5_000_000 },
        "1440p": { width: 2560, height: 1440, maxBitrate: 9_000_000 },
        "4K": { width: 3840, height: 2160, maxBitrate: 16_000_000 },
      } as const;
      const cfg = qMap[screenQuality];
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: cfg.width, max: cfg.width },
          height: { ideal: cfg.height, max: cfg.height },
          frameRate: { ideal: screenFps, max: screenFps },
        },
        audio: shareSystemAudio
          ? ({
              restrictOwnAudio: true,
              suppressLocalAudioPlayback: false,
              echoCancellation: true,
              noiseSuppression: false,
              autoGainControl: false,
            } as MediaTrackConstraints)
          : false,
        selfBrowserSurface: "exclude",
      } as DisplayMediaStreamOptions);
      screenStreamRef.current = displayStream;
      const videoTrack = displayStream.getVideoTracks()[0];
      const rawScreenAudioTrack = shareSystemAudio
        ? displayStream.getAudioTracks()[0]
        : undefined;
      if (!videoTrack) return;
      try {
        videoTrack.contentHint = "detail";
      } catch {
        // ignore
      }

      let outgoingScreenAudioTrack: MediaStreamTrack | undefined =
        rawScreenAudioTrack;
      let outgoingScreenAudioStream: MediaStream = displayStream;

      // Eğer tarayıcı/OS restrictOwnAudio desteklemiyorsa, karşı taraf konuşurken yayın sesini otomatik kıs (yankı/kendi sesini duymayı önle)
      if (rawScreenAudioTrack) {
        try {
          const settings = rawScreenAudioTrack.getSettings() as MediaTrackSettings & {
            restrictOwnAudio?: boolean;
          };
          const Ctor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext;
          if (!settings.restrictOwnAudio && Ctor) {
            const sCtx = new Ctor();
            if (sCtx.state === "suspended") sCtx.resume().catch(() => {});
            const sSrc = sCtx.createMediaStreamSource(
              new MediaStream([rawScreenAudioTrack])
            );
            const sGain = sCtx.createGain();
            sGain.gain.value = 1;
            const sDest = sCtx.createMediaStreamDestination();
            sSrc.connect(sGain);
            sGain.connect(sDest);

            let lastPeerSpeechAt = 0;
            const intervalId = setInterval(() => {
              let peerSpeaking = false;
              peersRef.current.forEach((pEntry) => {
                if (!pEntry.remoteAnalyser) return;
                const buf = new Uint8Array(
                  pEntry.remoteAnalyser.frequencyBinCount
                );
                pEntry.remoteAnalyser.getByteTimeDomainData(buf);
                let sum = 0;
                for (let i = 0; i < buf.length; i++) {
                  const v = (buf[i] - 128) / 128;
                  sum += v * v;
                }
                if (Math.sqrt(sum / buf.length) > 0.015) {
                  peerSpeaking = true;
                }
              });
              const now = Date.now();
              if (peerSpeaking) {
                lastPeerSpeechAt = now;
                sGain.gain.setTargetAtTime(0.05, sCtx.currentTime, 0.015);
              } else if (now - lastPeerSpeechAt > 260) {
                sGain.gain.setTargetAtTime(1, sCtx.currentTime, 0.05);
              }
            }, 25);

            screenAudioProcessorRef.current = {
              ctx: sCtx,
              intervalId,
              stream: sDest.stream,
            };
            outgoingScreenAudioTrack = sDest.stream.getAudioTracks()[0];
            outgoingScreenAudioStream = sDest.stream;
          }
        } catch {
          // fallback to rawScreenAudioTrack
        }
      }

      peersRef.current.forEach((entry) => {
        const sender = entry.pc.addTrack(videoTrack, displayStream);
        entry.screenSender = sender;
        if (outgoingScreenAudioTrack) {
          entry.screenAudioSender = entry.pc.addTrack(
            outgoingScreenAudioTrack,
            outgoingScreenAudioStream
          );
        }
        applyScreenSenderQuality(sender, cfg.maxBitrate, screenFps);
      });
      setIsScreenSharing(true);
      setTimeout(() => {
        if (localScreenPreviewRef.current) {
          localScreenPreviewRef.current.srcObject = displayStream;
          localScreenPreviewRef.current.play().catch(() => {});
        }
      }, 50);

      videoTrack.onended = () => {
        if (screenAudioProcessorRef.current) {
          clearInterval(screenAudioProcessorRef.current.intervalId);
          screenAudioProcessorRef.current.stream
            .getTracks()
            .forEach((t) => t.stop());
          screenAudioProcessorRef.current.ctx.close().catch(() => {});
          screenAudioProcessorRef.current = null;
        }
        peersRef.current.forEach((entry) => {
          if (entry.screenSender) {
            entry.pc.removeTrack(entry.screenSender);
            entry.screenSender = null;
          }
          if (entry.screenAudioSender) {
            entry.pc.removeTrack(entry.screenAudioSender);
            entry.screenAudioSender = null;
          }
        });
        setIsScreenSharing(false);
        callSfx.screenOff();
        triggerRenegotiationAll().catch(() => {});
      };

      await triggerRenegotiationAll(Math.floor(cfg.maxBitrate / 1000));
      peersRef.current.forEach((entry) => {
        if (entry.screenSender) {
          applyScreenSenderQuality(entry.screenSender, cfg.maxBitrate, screenFps);
        }
      });
      callSfx.screenOn();
      showToast("Ekran yayını başlatıldı!");
    } catch {
      showToast("Ekran yayını iptal edildi.");
    }
  };

  // Başka bir sohbete bakarken (aramadayken) o sohbette aktif bir arama var mı kontrol et
  useEffect(() => {
    if (
      !isInCall ||
      activeSection !== "CHAT" ||
      !viewedConvId ||
      viewedConvId === convId
    ) {
      setViewedChatCall(null);
      return;
    }
    let active = true;
    const pollViewed = async () => {
      try {
        const res = await fetch(
          `${callApi}?convId=${encodeURIComponent(viewedConvId)}`,
          { cache: "no-store" }
        );
        if (!res.ok || !active) return;
        const data = (await res.json()) as { call?: RemoteCallData | null };
        const c = data.call ?? null;
        setViewedChatCall(
          c && c.status === "ACTIVE" && c.participants.length > 0 ? c : null
        );
      } catch {
        // ignore
      }
    };
    pollViewed();
    const t = setInterval(pollViewed, 1200);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [isInCall, activeSection, viewedConvId, convId, callApi]);

  const hasActiveRemote =
    Boolean(remoteCall) &&
    remoteCall!.status === "ACTIVE" &&
    remoteCall!.participants.length > 0;

  const isViewingCallChat =
    activeSection === "CHAT" && Boolean(convId) && viewedConvId === convId;

  if (!isInCall && (!hasActiveRemote || !isViewingCallChat)) {
    return <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />;
  }

  // Başka bir sohbete veya sayfaya geçildiğinde: sol altta küçük arama penceresi + (varsa) bakılan sohbetin üstteki aktif araması
  if (isInCall && !isViewingCallChat) {
    return (
      <>
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

        {/* Bakılan sohbette aktif bir arama varsa üstte göster */}
        {activeSection === "CHAT" && viewedChatCall && (
          <div className="sticky top-0 z-30 shrink-0 w-full border-b border-emerald-500/25 bg-[#0E1716]/95 pl-16 pr-4 py-2.5 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-white">
                    Bu Sohbette Sesli Arama Aktif ·{" "}
                    {viewedChatCall.participants.map((p) => p.nickname).join(", ")}
                  </div>
                  <div className="text-[10px] text-emerald-300">
                    Mevcut aramadan geçmek için katılabilirsin
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const nextCid = viewedChatCall.convId || viewedConvId || "";
                  leaveCallLocal(true);
                  setTimeout(() => {
                    startOrJoinCall("JOIN", nextCid);
                  }, 150);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 transition"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Aramaya Katıl</span>
              </button>
            </div>
          </div>
        )}

        {/* Sol Altta Küçük Arama Penceresi (Müzik çalar açıksa onun hemen üstünde durur) */}
        <div
          className={`fixed left-3 z-40 w-[calc(100%-1.5rem)] max-w-[300px] rounded-2xl border border-emerald-500/35 bg-[#0E1716]/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl ${
            globalTrack
              ? "bottom-44 md:bottom-28"
              : "bottom-20 md:bottom-3"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                if (convId) {
                  setActiveConversationId(convId);
                  setActiveSection("CHAT");
                }
              }}
              className="flex items-center gap-2 text-left min-w-0 flex-1 hover:opacity-85 transition"
              title="Aramanın Olduğu Sohbete Dön"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  peerConnected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                }`}
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-white">
                  {peerName}
                </div>
                <div className="text-[10px] text-emerald-300 tabular-nums">
                  {peerConnected
                    ? `Bağlı · ${formatDuration(callSeconds)}`
                    : (remoteCall?.participants.length || 1) < 2
                    ? "Katılım bekleniyor..."
                    : "Bağlanıyor..."}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? "Mikrofonu Aç" : "Sustur"}
                className={`rounded-lg p-1.5 transition ${
                  isMuted
                    ? "bg-rose-500/25 text-rose-300"
                    : "bg-white/10 text-gray-200 hover:bg-white/20"
                }`}
              >
                {isMuted ? (
                  <MicOff className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleDeafen}
                title={isDeafened ? "Sağırlaştırmayı Kapat" : "Sağırlaştır"}
                className={`rounded-lg p-1.5 transition ${
                  isDeafened
                    ? "bg-rose-500/25 text-rose-300"
                    : "bg-white/10 text-gray-200 hover:bg-white/20"
                }`}
              >
                {isDeafened ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Headphones className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => leaveCallLocal(true)}
                title="Aramadan Ayrıl"
                className="rounded-lg bg-rose-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-rose-400"
              >
                Ayrıl
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="sticky top-0 z-30 shrink-0 w-full border-b border-emerald-500/25 bg-[#0E1716]/95 pl-16 pr-4 py-2.5 backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] space-y-2">
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Başkası aramayı başlattıysa Discord tarzı "Aramaya Katıl" çubuğu */}
      {!isInCall && hasActiveRemote && remoteCall && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 animate-pulse">
              <Phone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">
                Sesli Arama Aktif ·{" "}
                {remoteCall.participants.map((p) => p.nickname).join(", ")}
              </div>
              <div className="text-[10px] text-emerald-300">
                Konuşmak için aramaya katılabilirsin
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {mutedRingCallId !== remoteCall.callId && (
              <button
                type="button"
                onClick={() => setMutedRingCallId(remoteCall.callId)}
                className="rounded-xl border border-white/10 px-2.5 py-1.5 text-[11px] text-gray-300 hover:bg-white/5"
              >
                Zili Sustur
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const cid = remoteCall.convId || convId;
                const callId = remoteCall.callId;
                recentlyLeftCallsRef.current.set(callId, Date.now() + 8000);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("satir_arasi_left_call", {
                      detail: { callId },
                    })
                  );
                }
                setRemoteCall(null);
                fetch(callApi, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "END",
                    convId: cid,
                    userId: currentUser.id,
                  }),
                }).catch(() => {});
              }}
              className="rounded-xl bg-rose-500/20 border border-rose-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30"
            >
              Reddet
            </button>
            <button
              type="button"
              onClick={() => startOrJoinCall("JOIN", remoteCall.convId)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 transition"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Aramaya Katıl</span>
            </button>
          </div>
        </div>
      )}

      {/* Arama İçindeyken Kontroller */}
      {isInCall && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                peerConnected
                  ? "bg-emerald-400"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            <span className="truncate text-xs font-semibold text-white">
              {remoteCall?.participants.length
                ? remoteCall.participants.map((p) => p.nickname).join(", ")
                : peerName}
            </span>
            <span className="text-[11px] text-emerald-300 tabular-nums shrink-0">
              {peerConnected
                ? `Bağlı · ${formatDuration(callSeconds)}`
                : (remoteCall?.participants.length || 1) < 2
                ? "Katılım bekleniyor..."
                : "Bağlanıyor..."}
            </span>
            {peerConnected && (
              <button
                type="button"
                onClick={() => setShowPingMs((v) => !v)}
                title={
                  callPingMs !== null
                    ? `Bağlantı gecikmesi: ${callPingMs} ms`
                    : "Gecikme ölçülüyor..."
                }
                className="group inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-2 py-0.5 text-[10px] font-medium text-gray-200 hover:border-emerald-400/40 shrink-0"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    callPingMs === null
                      ? "bg-gray-400"
                      : callPingMs <= 120
                      ? "bg-emerald-400"
                      : callPingMs <= 250
                      ? "bg-amber-400"
                      : "bg-rose-500"
                  }`}
                />
                <span>
                  {callPingMs === null
                    ? "Ölçülüyor"
                    : callPingMs <= 120
                    ? "İyi"
                    : callPingMs <= 250
                    ? "Orta"
                    : "Zayıf"}
                </span>
                {callPingMs !== null && (
                  <span
                    className={`${
                      showPingMs ? "inline" : "hidden group-hover:inline"
                    } tabular-nums text-emerald-300`}
                  >
                    · {callPingMs} ms
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              title={isMuted ? "Mikrofonu Aç" : "Sustur"}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                isMuted
                  ? "bg-rose-500/25 text-rose-300 border border-rose-500/30"
                  : "bg-white/10 text-gray-200 hover:bg-white/20"
              }`}
            >
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isMuted ? "Susturuldu" : "Sustur"}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleDeafen}
              title={isDeafened ? "Sağırlaştırmayı Kapat" : "Sağırlaştır"}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                isDeafened
                  ? "bg-rose-500/25 text-rose-300 border border-rose-500/30"
                  : "bg-white/10 text-gray-200 hover:bg-white/20"
              }`}
            >
              {isDeafened ? (
                <VolumeX className="h-3.5 w-3.5" />
              ) : (
                <Headphones className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isDeafened ? "Sağır" : "Sağırlaştır"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const next = !isNoiseSuppression;
                setIsNoiseSuppression(next);
                rawMicStreamRef.current?.getAudioTracks().forEach((t) => {
                  t.applyConstraints({
                    echoCancellation: true,
                    noiseSuppression: next,
                    autoGainControl: true,
                  }).catch(() => {});
                });
                showToast(
                  next
                    ? "Mikrofon gürültü engelleme açıldı."
                    : "Mikrofon gürültü engelleme kapatıldı."
                );
              }}
              title={
                isNoiseSuppression
                  ? "Gürültü Engelleme Açık"
                  : "Gürültü Engelleme Kapalı"
              }
              className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                isNoiseSuppression
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                  : "bg-white/10 text-gray-400 hover:bg-white/20"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Gürültü Eng.</span>
            </button>

            <select
              value={screenQuality}
              onChange={(e) => {
                const q = e.target.value as "720p" | "1080p" | "1440p" | "4K";
                setScreenQuality(q);
                if (isScreenSharing && screenStreamRef.current) {
                  const qMap = {
                    "720p": { width: 1280, height: 720, maxBitrate: 2_500_000 },
                    "1080p": { width: 1920, height: 1080, maxBitrate: 5_000_000 },
                    "1440p": { width: 2560, height: 1440, maxBitrate: 9_000_000 },
                    "4K": { width: 3840, height: 2160, maxBitrate: 16_000_000 },
                  } as const;
                  const cfg = qMap[q];
                  const vt = screenStreamRef.current.getVideoTracks()[0];
                  vt?.applyConstraints({
                    width: { ideal: cfg.width, max: cfg.width },
                    height: { ideal: cfg.height, max: cfg.height },
                    frameRate: { ideal: screenFps, max: screenFps },
                  }).catch(() => {});
                  peersRef.current.forEach((entry) => {
                    if (!entry.screenSender) return;
                    try {
                      const p = entry.screenSender.getParameters();
                      if (!p.encodings || p.encodings.length === 0) p.encodings = [{}];
                      p.encodings[0].maxBitrate = cfg.maxBitrate;
                      p.encodings[0].maxFramerate = screenFps;
                      entry.screenSender.setParameters(p).catch(() => {});
                    } catch {
                      // ignore
                    }
                  });
                }
              }}
              title="Yayın Kalitesi"
              className="rounded-lg border border-white/10 bg-[#151821] px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="1440p">2K (1440p)</option>
              <option value="4K">4K (2160p)</option>
            </select>

            <select
              value={screenFps}
              onChange={(e) => {
                const fps = Number(e.target.value) as 30 | 60 | 90 | 120;
                setScreenFps(fps);
                if (isScreenSharing && screenStreamRef.current) {
                  const vt = screenStreamRef.current.getVideoTracks()[0];
                  vt?.applyConstraints({
                    frameRate: { ideal: fps, max: fps },
                  }).catch(() => {});
                  peersRef.current.forEach((entry) => {
                    if (!entry.screenSender) return;
                    try {
                      const p = entry.screenSender.getParameters();
                      if (!p.encodings || p.encodings.length === 0) p.encodings = [{}];
                      p.encodings[0].maxFramerate = fps;
                      entry.screenSender.setParameters(p).catch(() => {});
                    } catch {
                      // ignore
                    }
                  });
                }
              }}
              title="Yayın FPS"
              className="rounded-lg border border-white/10 bg-[#151821] px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none"
            >
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
              <option value={90}>90 FPS</option>
              <option value={120}>120 FPS</option>
            </select>

            <button
              type="button"
              onClick={() => {
                const next = !shareSystemAudio;
                setShareSystemAudio(next);
                if (isScreenSharing && screenStreamRef.current) {
                  screenStreamRef.current.getAudioTracks().forEach((t) => {
                    t.enabled = next;
                  });
                }
              }}
              title={
                shareSystemAudio
                  ? "Ekran/Uygulama Sesi Gidiyor (Kapatmak için tıkla)"
                  : "Ekran/Uygulama Sesi Kapalı (Açmak için tıkla)"
              }
              className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                shareSystemAudio
                  ? "bg-emerald-500/20 text-emerald-200 border border-emerald-500/30"
                  : "bg-white/10 text-gray-400 hover:bg-white/20"
              }`}
            >
              {shareSystemAudio ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              <span className="hidden md:inline">
                {shareSystemAudio ? "Yayın Sesi Açık" : "Yayın Sesi Kapalı"}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleScreenShare}
              disabled={!peerConnected}
              title={isScreenSharing ? "Ekran Yayınını Durdur" : "Ekran Yayını Yap"}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition disabled:opacity-40 ${
                isScreenSharing
                  ? "bg-indigo-500 text-white"
                  : "bg-white/10 text-gray-200 hover:bg-white/20"
              }`}
            >
              {isScreenSharing ? (
                <MonitorOff className="h-3.5 w-3.5" />
              ) : (
                <Monitor className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isScreenSharing ? "Yayını Durdur" : "Ekran"}
              </span>
            </button>

            {hasRemoteVideo &&
              (remoteStreamerIds.length > 0 ? remoteStreamerIds : ["default"]).map(
                (sid) => {
                  const sName =
                    remoteCall?.participants.find((p) => p.id === sid)?.nickname ||
                    users.find((u) => u.id === sid)?.nickname ||
                    "Yayın";
                  const isCurrentlyWatched =
                    isWatchingRemoteStream &&
                    (watchedStreamerId === sid ||
                      (!watchedStreamerId && remoteStreamerIds[0] === sid));
                  return (
                    <button
                      key={sid}
                      type="button"
                      onClick={() => {
                        setWatchedStreamerId(sid === "default" ? null : sid);
                        setIsWatchingRemoteStream(true);
                      }}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                        isCurrentlyWatched
                          ? "bg-emerald-500 text-black font-semibold"
                          : "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span>
                        {remoteStreamerIds.length > 1
                          ? `${sName} Yayını İzle`
                          : isCurrentlyWatched
                          ? "Yayın İzleniyor"
                          : "Yayını İzle"}
                      </span>
                    </button>
                  );
                }
              )}

            <button
              type="button"
              onClick={() => leaveCallLocal(true)}
              title="Aramadan Ayrıl"
              className="flex shrink-0 items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-400"
            >
              <PhoneOff className="h-3.5 w-3.5" />
              <span>Ayrıl</span>
            </button>
          </div>
        </div>
      )}

      {/* Sesteki Kişiler Listesi (Normal Görünüm) */}
      {(isInCall || hasActiveRemote) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium text-gray-400">
            Sestekiler:
          </span>
          {(remoteCall?.participants?.length
            ? remoteCall.participants
            : isInCall
            ? [
                {
                  id: currentUser.id,
                  nickname: currentUser.nickname,
                  isMuted,
                  isDeafened,
                },
              ]
            : []
          ).map((p) => {
            const pMuted = p.id === currentUser.id ? isMuted : Boolean(p.isMuted);
            const pDeaf =
              p.id === currentUser.id ? isDeafened : Boolean(p.isDeafened);
            const pVol = peerVolumes[p.id] ?? 140;
            const isSpeaking = Boolean(speakingIds[p.id]) && !pMuted;
            return (
              <span
                key={p.id}
                onClick={() => {
                  if (p.id !== currentUser.id && isInCall) {
                    setActivePeerVolId((prev) => (prev === p.id ? null : p.id));
                  }
                }}
                className={`flex flex-wrap items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium text-emerald-200 cursor-pointer sm:cursor-default transition-all ${
                  isSpeaking
                    ? "border-emerald-400 bg-emerald-500/25 ring-2 ring-emerald-400/70 shadow-[0_0_12px_rgba(52,211,153,0.45)]"
                    : "border-emerald-500/30 bg-emerald-500/15"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isSpeaking ? "bg-emerald-300 animate-ping" : "bg-emerald-400"
                  }`}
                />
                <span>
                  {p.nickname}
                  {p.id === currentUser.id ? " (Sen)" : ""}
                </span>
                {pMuted && (
                  <span title="Mikrofon Kapalı">
                    <MicOff className="h-3 w-3 text-rose-400" />
                  </span>
                )}
                {pDeaf && (
                  <span title="Sağırlaştırılmış">
                    <VolumeX className="h-3 w-3 text-rose-400" />
                  </span>
                )}
                {p.id !== currentUser.id && isInCall && (
                  <span
                    onClick={(e) => e.stopPropagation()}
                    className={`${
                      activePeerVolId === p.id ? "flex" : "hidden sm:flex"
                    } ml-1 items-center gap-1 border-l border-emerald-500/30 pl-1.5`}
                  >
                    <Volume2 className="h-3 w-3 text-emerald-300 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={200}
                      step={10}
                      value={pVol}
                      onChange={(e) => setPeerVol(p.id, Number(e.target.value))}
                      title={`${p.nickname} Ses Seviyesi: %${pVol}`}
                      className="w-14 accent-emerald-400 cursor-pointer"
                    />
                    <span className="text-[9px] tabular-nums text-emerald-300/90">
                      %{pVol}
                    </span>
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      {hasRemoteVideo && isWatchingRemoteStream && (
        <div
          ref={screenContainerRef}
          onMouseMove={() => {
            setIsStreamUiIdle(false);
            if (streamIdleTimerRef.current) clearTimeout(streamIdleTimerRef.current);
            streamIdleTimerRef.current = setTimeout(() => {
              setIsStreamUiIdle(true);
            }, 2500);
          }}
          onTouchStart={() => {
            setIsStreamUiIdle(false);
            if (streamIdleTimerRef.current) clearTimeout(streamIdleTimerRef.current);
            streamIdleTimerRef.current = setTimeout(() => {
              setIsStreamUiIdle(true);
            }, 3500);
          }}
          onClick={() => {
            setIsStreamUiIdle(false);
            if (streamIdleTimerRef.current) clearTimeout(streamIdleTimerRef.current);
            streamIdleTimerRef.current = setTimeout(() => {
              setIsStreamUiIdle(true);
            }, 3500);
          }}
          onMouseLeave={() => {
            if (streamIdleTimerRef.current) clearTimeout(streamIdleTimerRef.current);
            setIsStreamUiIdle(true);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsStreamUiIdle(false);
            setStreamCtxMenu({ x: e.clientX, y: e.clientY });
          }}
          title="Yayın sesi için sağ tıkla veya ses butonuna dokun"
          className={`relative flex flex-col justify-between overflow-hidden bg-black transition-all ${
            isStreamUiIdle ? "cursor-none" : ""
          } ${
            isFullscreen
              ? "fixed inset-0 h-[100dvh] w-screen rounded-none border-0"
              : `mx-auto w-fit max-w-full rounded-xl ${
                  isStreamUiIdle ? "border-0" : "border border-white/15"
                }`
          }`}
        >
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={
              isFullscreen
                ? "w-screen h-[100dvh] object-contain sm:object-fill"
                : "block max-h-60 w-auto max-w-full object-contain"
            }
          />
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-2 top-2 flex items-center gap-1.5 transition-opacity duration-300 ${
              isStreamUiIdle ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            <button
              type="button"
              title="Yayın Sesi Ayarla"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setIsStreamUiIdle(false);
                setStreamCtxMenu((prev) =>
                  prev ? null : { x: rect.left, y: rect.bottom + 8 }
                );
              }}
              className="flex items-center gap-1 rounded-lg bg-black/75 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-black/90"
            >
              {streamMuted || streamVolume === 0 ? (
                <VolumeX className="h-3.5 w-3.5 text-rose-400" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span className="tabular-nums">
                {streamMuted ? "0%" : `%${streamVolume}`}
              </span>
            </button>
            <button
              type="button"
              title="Tam Ekran"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                } else {
                  screenContainerRef.current?.requestFullscreen?.().catch(() => {});
                }
              }}
              className="rounded-lg bg-black/70 p-1.5 text-white hover:bg-black/90"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Yayını İzlemeyi Bırak"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                setIsWatchingRemoteStream(false);
                setStreamCtxMenu(null);
              }}
              className="flex items-center gap-1 rounded-lg bg-rose-600/85 px-2 py-1 text-[11px] font-medium text-white hover:bg-rose-500"
            >
              <X className="h-3.5 w-3.5" />
              <span>İzlemeyi Bırak</span>
            </button>
          </div>

          {streamCtxMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                left: Math.max(
                  8,
                  Math.min(
                    streamCtxMenu.x,
                    (typeof window !== "undefined" ? window.innerWidth : 800) - 220
                  )
                ),
                top: Math.max(
                  8,
                  Math.min(
                    streamCtxMenu.y,
                    (typeof window !== "undefined" ? window.innerHeight : 600) - 160
                  )
                ),
              }}
              className="fixed z-[70] w-52 rounded-xl border border-white/15 bg-[#151821]/95 p-3 shadow-2xl backdrop-blur-md space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-200">
                <span>Yayın Sesi</span>
                <span className="tabular-nums text-emerald-300">
                  {streamMuted ? "Susturuldu" : `%${streamVolume}`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={200}
                step={5}
                value={streamMuted ? 0 : streamVolume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setStreamVolume(v);
                  if (v > 0 && streamMuted) setStreamMuted(false);
                }}
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStreamMuted((m) => !m)}
                  className={`flex-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                    streamMuted
                      ? "bg-emerald-500 text-black hover:bg-emerald-400"
                      : "bg-white/10 text-gray-200 hover:bg-white/20"
                  }`}
                >
                  {streamMuted ? "Sesi Aç" : "Yayını Sustur"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsWatchingRemoteStream(false);
                    setStreamCtxMenu(null);
                  }}
                  className="rounded-lg bg-rose-500/20 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/30"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}

          {/* Tam Ekranda ve Normalde Yayının Altında Sesteki Kişiler (Fare hareketsizken gizlenir) */}
          <div
            className={`${
              isFullscreen ? "absolute bottom-0 left-0 right-0" : ""
            } flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0B1012]/90 px-3 py-2 transition-opacity duration-300 ${
              isStreamUiIdle ? "opacity-0 pointer-events-none hidden" : "opacity-100"
            }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                Seste:
              </span>
              {(remoteCall?.participants?.length
                ? remoteCall.participants
                : [
                    {
                      id: currentUser.id,
                      nickname: currentUser.nickname,
                      isMuted,
                      isDeafened,
                    },
                  ]
              ).map((p) => {
                const pMuted =
                  p.id === currentUser.id ? isMuted : Boolean(p.isMuted);
                const pDeaf =
                  p.id === currentUser.id ? isDeafened : Boolean(p.isDeafened);
                return (
                  <span
                    key={p.id}
                    className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-200"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>
                      {p.nickname}
                      {p.id === currentUser.id ? " (Sen)" : ""}
                    </span>
                    {pMuted && (
                      <span title="Mikrofon Kapalı">
                        <MicOff className="h-3 w-3 text-rose-400" />
                      </span>
                    )}
                    {pDeaf && (
                      <span title="Sağırlaştırılmış">
                        <VolumeX className="h-3 w-3 text-rose-400" />
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
                title={isMuted ? "Mikrofonu Aç" : "Sustur"}
              >
                {isMuted ? (
                  <MicOff className="h-3.5 w-3.5 text-rose-300" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={toggleDeafen}
                className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
                title={isDeafened ? "Sağırlaştırmayı Kapat" : "Sağırlaştır"}
              >
                {isDeafened ? (
                  <VolumeX className="h-3.5 w-3.5 text-rose-300" />
                ) : (
                  <Headphones className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => leaveCallLocal(true)}
                className="rounded-lg bg-rose-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-rose-400"
              >
                Ayrıl
              </button>
            </div>
          </div>
        </div>
      )}

      {isScreenSharing && (
        <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl border border-indigo-500/30 bg-black">
          <div className="absolute left-2 top-2 z-10 rounded bg-indigo-600/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            Ekranını Paylaşıyorsun
          </div>
          <video
            ref={localScreenPreviewRef}
            autoPlay
            muted
            playsInline
            className="block h-40 w-auto max-w-full object-contain"
          />
        </div>
      )}
      </div>
    </div>
  );
}
