"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Headphones,
  Send,
  Music,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Users,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  Reply,
  Paperclip,
  FileText,
  Download,
  Volume2,
  RotateCcw,
  ListMusic,
  Smile,
  ArrowUp,
  ArrowDown,
  Phone,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  extractSpotifyTrackId,
  extractYouTubeId,
  formatRelativeTime,
  SAMPLE_TRACK_CATALOG,
} from "@/lib/constants";
import { ChatAttachment, ChatMessage, TrackInfo } from "@/types/persona";
import { RealSongSearch } from "./RealSongSearch";
import { VoiceCallPanel } from "./VoiceCallPanel";

const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
const QUICK_EMOJIS = ["❤️", "🎵", "✨", "😂", "🔥", "👏", "😊", "😮", "😢", "💯"];

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

export function ChatAndRoomView() {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    setActiveSection,
    users,
    currentUser,
    friendIds,
    blockedUserIds,
    startDirectChatFromProfile,
    acceptConversation,
    rejectConversation,
    createGroupConversation,
    updateGroupAvatar,
    deleteConversation,
    sendChatMessage,
    editChatMessage,
    deleteChatMessage,
    toggleMessageReaction,
    playGlobalTrack,
    openProfile,
    joinedRoomConvId,
    getRoomForConv,
    roomClockOffsetMs,
    roomDurationSec,
    openListeningRoom,
    closeListeningRoom,
    joinListeningRoom,
    leaveListeningRoom,
    playTrackInRoom,
    playPlaylistInRoom,
    addPlaylistToRoomQueue,
    moveRoomQueueTrack,
    removeRoomQueueTrack,
    restartRoomTrack,
    seekRoomTrack,
    toggleRoomPlay,
    toggleCollaborativeQueue,
    addToRoomQueue,
    prevRoomTrack,
    skipRoomTrack,
    playlists,
    volume,
    setVolume,
    showToast,
    requestConfirm,
    startVoiceCall,
  } = useApp();

  const [msgText, setMsgText] = useState("");
  const [showTrackSender, setShowTrackSender] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [trackPreviewUrl, setTrackPreviewUrl] = useState("");
  const [trackArtworkUrl, setTrackArtworkUrl] = useState("");
  const [trackArtist, setTrackArtist] = useState("");
  const [trackNote, setTrackNote] = useState("");
  const [trackMood, setTrackMood] =
    useState<TrackInfo["synthMood"]>("night");

  const [pendingAttachment, setPendingAttachment] =
    useState<ChatAttachment | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage["replyTo"] | null>(
    null
  );
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");

  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [showNewChatPicker, setShowNewChatPicker] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [seenMsgMap, setSeenMsgMap] = useState<Record<string, string>>({});
  const [roomTime, setRoomTime] = useState(0);
  const roomDuration = roomDurationSec;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("");
  const [localCallNotices, setLocalCallNotices] = useState<
    { id: string; convId: string; text: string; createdAt: string }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadNotices = () => {
      try {
        const raw = localStorage.getItem(
          `satir_arasi_call_notices_${currentUser.id}`
        );
        if (raw) setLocalCallNotices(JSON.parse(raw));
      } catch {
        // ignore
      }
    };
    loadNotices();
    window.addEventListener("satir_arasi_call_notices_updated", loadNotices);
    return () =>
      window.removeEventListener("satir_arasi_call_notices_updated", loadNotices);
  }, [currentUser.id]);

  const addLocalCallNotice = (convId: string, text: string) => {
    setLocalCallNotices((prev) => {
      const next = [
        ...prev,
        {
          id: `cn_${Date.now()}`,
          convId,
          text,
          createdAt: new Date().toLocaleTimeString("tr-TR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ];
      try {
        localStorage.setItem(
          `satir_arasi_call_notices_${currentUser.id}`,
          JSON.stringify(next)
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const deleteLocalCallNotice = (noticeId: string) => {
    setLocalCallNotices((prev) => {
      const next = prev.filter((n) => n.id !== noticeId);
      try {
        localStorage.setItem(
          `satir_arasi_call_notices_${currentUser.id}`,
          JSON.stringify(next)
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const getOtherPeerId = (c: (typeof conversations)[number]): string => {
    if (
      c.peerId === currentUser.id &&
      c.initiatorId &&
      c.initiatorId !== currentUser.id
    ) {
      return c.initiatorId;
    }
    if (c.memberIds && c.memberIds.length === 2) {
      return c.memberIds.find((id) => id !== currentUser.id) || c.peerId;
    }
    return c.peerId;
  };

  const getConvLastActivityMs = (c: (typeof conversations)[number]): number => {
    const msgs = c.messages || [];
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      if (typeof last.createdAtMs === "number") return last.createdAtMs;
      const mNum = Number(String(last.id || "").replace(/\D+/g, ""));
      if (Number.isFinite(mNum) && mNum > 0) return mNum;
    }
    const cNum = Number(String(c.id || "").replace(/\D+/g, ""));
    return Number.isFinite(cNum) ? cNum : 0;
  };

  const myConversations = conversations
    .filter((c) => {
      if (c.isGroup) {
        return !c.memberIds || c.memberIds.includes(currentUser.id);
      }
      const isMine =
        c.initiatorId === currentUser.id ||
        c.peerId === currentUser.id ||
        Boolean(c.memberIds?.includes(currentUser.id));
      if (!isMine) return false;
      const otherId = getOtherPeerId(c);
      return !blockedUserIds.includes(otherId);
    })
    .sort((a, b) => getConvLastActivityMs(b) - getConvLastActivityMs(a));

  const activeConv =
    myConversations.find((c) => c.id === activeConversationId) ||
    myConversations[0];
  const peer =
    activeConv && !activeConv.isGroup
      ? users.find((u) => u.id === getOtherPeerId(activeConv))
      : null;

  const activeRoomConvId = joinedRoomConvId || activeConv?.id;
  const listeningRoom = getRoomForConv(activeRoomConvId);
  const isJoinedRoom =
    Boolean(activeRoomConvId) &&
    (listeningRoom.participantIds || []).includes(currentUser.id);

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
    return roomDuration > 0 ? Math.min(roomDuration, raw) : raw;
  };

  // Authoritative server-clock display (audio itself plays persistently in ListeningRoomAudioHost)
  useEffect(() => {
    if (!listeningRoom.currentTrack) {
      setRoomTime(0);
      return;
    }
    const tick = () => setRoomTime(computeSyncedSec());
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeConv?.id,
    listeningRoom.currentTrack?.id,
    listeningRoom.isPlaying,
    listeningRoom.positionSec,
    listeningRoom.positionUpdatedAt,
    roomClockOffsetMs,
    roomDuration,
  ]);

  const prevConvIdRef = useRef<string | undefined>(undefined);
  const [openEmojiMsgId, setOpenEmojiMsgId] = useState<string | null>(null);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"CHATS" | "MESSAGES" | "ROOM">("MESSAGES");
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const isConvSwitch = prevConvIdRef.current !== activeConv?.id;
    prevConvIdRef.current = activeConv?.id;
    messagesEndRef.current?.scrollIntoView({
      behavior: isConvSwitch ? "auto" : "smooth",
    });
  }, [activeConv?.id, activeConv?.messages.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      showToast("Dosya boyutu sınırı: Maksimum 2 MB yükleyebilirsiniz.");
      return;
    }

    const allowed =
      file.type.startsWith("image/") ||
      file.type.startsWith("audio/") ||
      file.type === "application/pdf" ||
      file.type === "text/plain";

    if (!allowed) {
      showToast("Desteklenmeyen dosya türü (Görsel, Ses, PDF veya TXT).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingAttachment({
          name: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          dataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const attachChatFile = (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      showToast("Dosya boyutu en fazla 2 MB olabilir.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPendingAttachment({
          name: file.name || (file.type === "image/gif" ? "image.gif" : "image.png"),
          sizeBytes: file.size,
          mimeType: file.type || "image/png",
          dataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChatPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const fileItem = items.find((it) => it.kind === "file");
    if (fileItem) {
      const f = fileItem.getAsFile();
      if (f) {
        e.preventDefault();
        attachChatFile(f);
        return;
      }
    }
    const text = e.clipboardData?.getData("text")?.trim();
    if (text && /^https?:\/\/.+\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(text)) {
      e.preventDefault();
      const isGif = /\.gif(\?.*)?$/i.test(text);
      setPendingAttachment({
        name: isGif ? "yapıştırılan.gif" : "yapıştırılan.png",
        sizeBytes: 0,
        mimeType: isGif ? "image/gif" : "image/png",
        dataUrl: text,
      });
    }
  };

  const handleGroupAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeConv?.isGroup) return;
    if (file.size > MAX_FILE_BYTES) {
      showToast("Grup fotoğrafı / GIF en fazla 2 MB olabilir.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updateGroupAvatar(activeConv.id, reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConv) return;
    if (
      !msgText.trim() &&
      !trackTitle.trim() &&
      !trackUrl.trim() &&
      !pendingAttachment
    ) {
      return;
    }

    const trackPayload: TrackInfo | undefined =
      trackTitle.trim() || trackUrl.trim()
        ? {
            id: `chat_trk_${Date.now()}`,
            title: trackTitle.trim() || "Paylaşılan Şarkı",
            url: trackUrl.trim() || undefined,
            previewUrl: trackPreviewUrl || undefined,
            artworkUrl: trackArtworkUrl || undefined,
            artist: trackArtist.trim() || undefined,
            personalNote: trackNote.trim() || undefined,
            provider: trackPreviewUrl
              ? "ITUNES"
              : trackUrl.includes("spotify")
              ? "SPOTIFY"
              : trackUrl.includes("youtu")
              ? "YOUTUBE"
              : "AMBIENT",
            synthMood: trackMood,
          }
        : undefined;

    sendChatMessage(
      activeConv.id,
      msgText.trim(),
      trackPayload,
      pendingAttachment || undefined,
      replyingTo || undefined
    );

    setMsgText("");
    setTrackTitle("");
    setTrackUrl("");
    setTrackPreviewUrl("");
    setTrackArtworkUrl("");
    setTrackArtist("");
    setTrackNote("");
    setPendingAttachment(null);
    setReplyingTo(null);
    setShowTrackSender(false);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || groupMemberIds.length === 0) return;
    createGroupConversation(groupName.trim(), groupMemberIds);
    setGroupName("");
    setGroupMemberIds([]);
    setShowGroupCreator(false);
  };

  const toggleGroupMember = (uid: string) => {
    setGroupMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const selectableFriends = users.filter(
    (u) =>
      u.id !== currentUser.id &&
      friendIds.includes(u.id) &&
      !blockedUserIds.includes(u.id)
  );
  const groupSearchNorm = groupMemberSearch.trim().toLocaleLowerCase("tr-TR");
  const filteredGroupFriends = groupSearchNorm
    ? selectableFriends.filter(
        (u) =>
          u.nickname.toLocaleLowerCase("tr-TR").includes(groupSearchNorm) ||
          u.username.toLocaleLowerCase("tr-TR").includes(groupSearchNorm)
      )
    : selectableFriends;

  // Okunmamış mesaj takibi (sol Sohbetler listesi bildirimi)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`satir_arasi_seen_msgs_${currentUser.id}`);
      if (raw) {
        setSeenMsgMap(JSON.parse(raw));
      } else {
        // İlk kez yükleniyorsa mevcut sohbetlerin son mesajlarını görülmüş say
        const init: Record<string, string> = {};
        myConversations.forEach((c) => {
          const last = c.messages[c.messages.length - 1];
          if (last) init[c.id] = last.id;
        });
        setSeenMsgMap(init);
        localStorage.setItem(
          `satir_arasi_seen_msgs_${currentUser.id}`,
          JSON.stringify(init)
        );
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]);

  const isViewingActiveConvMessages =
    Boolean(activeConv) &&
    (typeof window === "undefined" ||
      window.innerWidth >= 768 ||
      mobileTab === "MESSAGES");

  useEffect(() => {
    if (!activeConv || !isViewingActiveConvMessages) return;
    const last = activeConv.messages[activeConv.messages.length - 1];
    if (!last) return;
    setSeenMsgMap((prev) => {
      if (prev[activeConv.id] === last.id) return prev;
      const next = { ...prev, [activeConv.id]: last.id };
      try {
        localStorage.setItem(
          `satir_arasi_seen_msgs_${currentUser.id}`,
          JSON.stringify(next)
        );
      } catch {
        // ignore
      }
      return next;
    });
  }, [
    activeConv,
    activeConv?.id,
    activeConv?.messages.length,
    isViewingActiveConvMessages,
    currentUser.id,
  ]);

  const getUnreadCount = (conv: (typeof myConversations)[number]): number => {
    if (
      activeConv?.id === conv.id &&
      isViewingActiveConvMessages
    ) {
      return 0;
    }
    const msgs = conv.messages || [];
    if (msgs.length === 0) return 0;
    const seenId = seenMsgMap[conv.id];
    if (seenId) {
      const idx = msgs.findIndex((m) => m.id === seenId);
      if (idx >= 0) {
        return msgs
          .slice(idx + 1)
          .filter((m) => m.senderId !== currentUser.id).length;
      }
    }
    let lastMyIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].senderId === currentUser.id) {
        lastMyIdx = i;
        break;
      }
    }
    return msgs
      .slice(lastMyIdx + 1)
      .filter((m) => m.senderId !== currentUser.id).length;
  };

  return (
    <div className="mx-auto max-w-[1440px] w-full px-3 sm:px-4 pt-14 pb-4 flex-1 min-h-0 flex flex-col">
      {/* Mobil 3-Sekme Geçiş Çubuğu */}
      <div className="flex md:hidden items-center gap-1.5 mb-2.5 p-1 rounded-xl border border-white/10 bg-[#151821]/90 shrink-0">
        <button
          onClick={() => setMobileTab("CHATS")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
            mobileTab === "CHATS"
              ? "bg-indigo-500 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Sohbetler
        </button>
        <button
          onClick={() => setMobileTab("MESSAGES")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
            mobileTab === "MESSAGES"
              ? "bg-indigo-500 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Mesajlar
        </button>
        <button
          onClick={() => setMobileTab("ROOM")}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
            mobileTab === "ROOM"
              ? "bg-emerald-500 text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Dinleme Odası
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Sol: Sohbet Listesi */}
        <div
          className={`${
            mobileTab === "CHATS" ? "flex" : "hidden"
          } md:flex md:col-span-3 rounded-2xl border border-white/10 bg-[#151821]/90 p-4 flex-col space-y-3 h-full min-h-0 overflow-hidden`}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Sohbetler</h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowNewChatPicker((prev) => !prev)}
                className="flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/25 transition"
              >
                <Plus className="h-3 w-3" />
                <span>Sohbet</span>
              </button>
              <button
                type="button"
                onClick={() => setShowGroupCreator((prev) => !prev)}
                className="flex items-center gap-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-2 py-1 text-[11px] font-medium text-indigo-300 hover:bg-indigo-600/30 transition"
              >
                <Plus className="h-3 w-3" />
                <span>Grup</span>
              </button>
            </div>
          </div>

          {showGroupCreator && (
            <form
              onSubmit={handleCreateGroup}
              className="rounded-xl border border-indigo-500/30 bg-[#0F1115] p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-300">
                  Yeni Grup Sohbeti
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupCreator(false);
                    setGroupMemberSearch("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Grup adı..."
                className="w-full rounded-lg border border-white/10 bg-[#151821] px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none"
              />
              <input
                type="text"
                value={groupMemberSearch}
                onChange={(e) => setGroupMemberSearch(e.target.value)}
                placeholder="Arkadaş ara..."
                className="w-full rounded-lg border border-white/10 bg-[#151821] px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none"
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredGroupFriends.length === 0 ? (
                  <p className="text-[11px] text-gray-500">
                    {selectableFriends.length === 0
                      ? "Eklenebilecek başka kullanıcı yok."
                      : "Aramaya uygun arkadaş bulunamadı."}
                  </p>
                ) : (
                  filteredGroupFriends.map((u) => {
                    const checked = groupMemberIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleGroupMember(u.id)}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-xs transition ${
                          checked
                            ? "bg-indigo-600/25 text-indigo-200 border border-indigo-500/30"
                            : "text-gray-300 hover:bg-white/5"
                        }`}
                      >
                        <span className="truncate">
                          {u.nickname}{" "}
                          <span className="text-[10px] text-gray-500">
                            @{u.username}
                          </span>
                        </span>
                        {checked && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
              <button
                type="submit"
                disabled={!groupName.trim() || groupMemberIds.length === 0}
                className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition"
              >
                Grubu Oluştur ({groupMemberIds.length} kişi)
              </button>
            </form>
          )}

          {myConversations.length === 0 ? (
            <p className="text-xs text-gray-500">
              Henüz sohbet yok. Akıştan bir yazıya &ldquo;Bu Hissi Konuşalım&rdquo;
              diyerek başlatabilirsin.
            </p>
          ) : (
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto">
              {myConversations.map((conv) => {
                const isGroup = Boolean(conv.isGroup);
                const p = !isGroup
                  ? users.find((u) => u.id === getOtherPeerId(conv))
                  : undefined;
                if (!isGroup && !p) return null;
                const isSelected = activeConv?.id === conv.id;
                const displayTitle = isGroup
                  ? conv.groupName || "Grup Sohbeti"
                  : p!.nickname;
                const memberCount = conv.memberIds?.length ?? 0;
                const unreadCount = getUnreadCount(conv);
                return (
                  <div
                    key={conv.id}
                    className={`flex w-full items-center gap-2 rounded-xl p-2 transition ${
                      isSelected
                        ? "bg-indigo-600/20 border border-indigo-500/30"
                        : unreadCount > 0
                        ? "bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/15"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setShowNewChatPicker(false);
                        setMobileTab("MESSAGES");
                      }}
                      className="flex flex-1 items-center gap-3 text-left min-w-0"
                    >
                      {isGroup ? (
                        conv.groupAvatarUrl ? (
                          <img
                            src={conv.groupAvatarUrl}
                            alt={displayTitle}
                            className="h-9 w-9 rounded-full object-cover shrink-0 border border-emerald-500/30"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                            <Users className="h-4 w-4" />
                          </div>
                        )
                      ) : p?.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt={p.nickname}
                          className="h-9 w-9 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                          {p!.nickname.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-semibold text-white">
                            {displayTitle}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {unreadCount > 0 && (
                              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow">
                                {unreadCount}
                              </span>
                            )}
                            {isGroup ? (
                              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] text-emerald-300 shrink-0">
                                {memberCount} üye
                              </span>
                            ) : (
                              conv.status === "PENDING" && (
                                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-300">
                                  İstek
                                </span>
                              )
                            )}
                          </div>
                        </div>
                        <div className="truncate text-[11px] text-gray-400">
                          {conv.messages[conv.messages.length - 1]?.body ||
                            "Sohbet"}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        requestConfirm({
                          title: "Sohbeti Sil",
                          message: "Bu sohbeti silmek istediğine emin misin?",
                          confirmLabel: "Sil",
                          onConfirm: () => deleteConversation(conv.id),
                        })
                      }
                      title="Sohbeti Sil"
                      className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-500/15 hover:text-rose-400 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Orta: Aktif Sohbet */}
        <div
          className={`${
            mobileTab === "MESSAGES" ? "flex" : "hidden"
          } md:flex md:col-span-5 flex-col rounded-2xl border border-white/10 bg-[#151821]/90 overflow-hidden h-full min-h-0`}
        >
          {!showNewChatPicker && activeConv && (activeConv.isGroup || peer) ? (
            <>
              {/* Sohbet Üst Bar */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                {activeConv.isGroup ? (
                  <div className="flex items-center gap-2.5">
                    <label
                      title="Grup Fotoğrafını / GIF'ini Değiştir (Tıkla)"
                      className="relative cursor-pointer group"
                    >
                      {activeConv.groupAvatarUrl ? (
                        <img
                          src={activeConv.groupAvatarUrl}
                          alt={activeConv.groupName || "Grup"}
                          className="h-9 w-9 rounded-full object-cover border border-emerald-500/40 group-hover:opacity-80 transition"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 group-hover:bg-emerald-500/30 transition">
                          <Users className="h-4 w-4" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*,.gif"
                        onChange={handleGroupAvatarUpload}
                        className="hidden"
                      />
                    </label>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {activeConv.groupName || "Grup Sohbeti"}
                        </span>
                        <label
                          title="Fotoğraf veya GIF Yükle"
                          className="cursor-pointer rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-emerald-300 hover:bg-white/10"
                        >
                          Fotoğraf/GIF Seç
                          <input
                            type="file"
                            accept="image/*,.gif"
                            onChange={handleGroupAvatarUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {(activeConv.memberIds || [])
                          .map(
                            (id) =>
                              users.find((u) => u.id === id)?.nickname || "Üye"
                          )
                          .join(", ")}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openProfile(peer!.id)}
                    className="flex items-center gap-2.5 text-left hover:opacity-80"
                  >
                    <div className="text-sm font-semibold text-white">
                      {peer!.nickname}
                    </div>
                    <span className="text-xs text-gray-400">
                      @{peer!.username}
                    </span>
                  </button>
                )}

                <div className="flex items-center gap-2">
                  {(activeConv.isGroup || (peer && friendIds.includes(peer.id))) && (
                    <button
                      type="button"
                      onClick={() =>
                        startVoiceCall(
                          activeConv.id,
                          activeConv.isGroup
                            ? activeConv.groupName || "Grup Sohbeti"
                            : peer?.nickname || "Kullanıcı",
                          activeConv.isGroup
                            ? (activeConv.memberIds || []).filter(
                                (id) => id !== currentUser.id
                              )
                            : peer
                            ? [peer.id]
                            : []
                        )
                      }
                      title="Sesli Arama Başlat"
                      className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/25 transition"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>Ara</span>
                    </button>
                  )}
                  <button
                    onClick={() =>
                      isJoinedRoom
                        ? leaveListeningRoom()
                        : joinListeningRoom(activeConv.id)
                    }
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                      isJoinedRoom
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                        : "bg-emerald-500 text-black hover:bg-emerald-400"
                    }`}
                  >
                    <Headphones className="h-3.5 w-3.5" />
                    <span>
                      {isJoinedRoom ? "Odadan Ayrıl" : "Odaya Katıl"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Mesaj İsteği Onay Çubuğu */}
              {activeConv.status === "PENDING" &&
                activeConv.initiatorId !== currentUser.id && (
                  <div className="flex items-center justify-between bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 border-b border-amber-500/20">
                    <span>
                      {peer?.nickname || "Bir kullanıcı"} bir paylaşımın üzerinden sohbet başlatmak
                      istiyor.
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptConversation(activeConv.id)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 font-semibold text-black"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Kabul Et</span>
                      </button>
                      <button
                        onClick={() => rejectConversation(activeConv.id)}
                        className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-2.5 py-1 text-rose-300"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reddet</span>
                      </button>
                    </div>
                  </div>
                )}

              {/* Mesaj Akışı (WhatsApp tarzı ardışık birleştirme) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4">
                {activeConv.messages
                  .filter((m) => !blockedUserIds.includes(m.senderId))
                  .map((m, idx, filteredMsgs) => {
                  const isMe = m.senderId === currentUser.id;
                  const prevMsg = idx > 0 ? filteredMsgs[idx - 1] : null;
                  const nextMsg =
                    idx < filteredMsgs.length - 1
                      ? filteredMsgs[idx + 1]
                      : null;
                  const isGroupedWithPrev = Boolean(
                    prevMsg &&
                      prevMsg.senderId === m.senderId &&
                      !m.replyTo &&
                      !m.refPostTitle &&
                      (!m.createdAtMs ||
                        !prevMsg.createdAtMs ||
                        m.createdAtMs - prevMsg.createdAtMs < 5 * 60 * 1000)
                  );
                  const isGroupedWithNext = Boolean(
                    nextMsg &&
                      nextMsg.senderId === m.senderId &&
                      !nextMsg.replyTo &&
                      !nextMsg.refPostTitle &&
                      (!nextMsg.createdAtMs ||
                        !m.createdAtMs ||
                        nextMsg.createdAtMs - m.createdAtMs < 5 * 60 * 1000)
                  );
                  const senderName = isMe
                    ? currentUser.nickname
                    : m.senderNickname ||
                      users.find((u) => u.id === m.senderId)?.nickname ||
                      peer?.nickname ||
                      "Üye";
                  const isEditing = editingMsgId === m.id;

                  return (
                    <div
                      key={m.id}
                      className={`group flex flex-col ${
                        isMe ? "items-end" : "items-start"
                      } ${isGroupedWithPrev ? "mt-0.5" : idx === 0 ? "" : "mt-3"}`}
                    >
                      {m.refPostTitle && (
                        <div className="mb-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[10px] text-indigo-300">
                          Referans: &ldquo;{m.refPostTitle}&rdquo;
                        </div>
                      )}

                      {activeConv.isGroup && !isMe && !isGroupedWithPrev && (
                        <span className="mb-0.5 px-1 text-[10px] font-medium text-indigo-300">
                          {senderName}
                        </span>
                      )}

                      <div
                        className={`flex items-center w-full ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          onClick={() =>
                            setSelectedMsgId((prev) =>
                              prev === m.id ? null : m.id
                            )
                          }
                          className={`relative max-w-[78%] sm:max-w-[62%] break-words rounded-2xl px-3.5 py-2 text-xs ${
                            isMe
                              ? "bg-indigo-600 text-white"
                              : "bg-[#0F1115] text-gray-200 border border-white/10"
                          }`}
                        >
                          {/* Mesaj Aksiyonları & Yan Emoji Seçici (masaüstünde hover, telefonda dokununca açılır) */}
                          {!isEditing && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className={`absolute max-md:-top-8 max-md:translate-y-0 md:top-1/2 md:-translate-y-1/2 z-20 transition flex items-center gap-1 ${
                                selectedMsgId === m.id
                                  ? "opacity-100 pointer-events-auto"
                                  : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
                              } ${
                                isMe
                                  ? "max-md:right-0 md:right-full md:pr-1.5 flex-row-reverse"
                                  : "max-md:left-0 md:left-full md:pl-1.5 flex-row"
                              }`}
                            >
                              <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#0F1115]/95 px-1 py-0.5 shadow-lg">
                                <button
                                  type="button"
                                  title="Yanıtla"
                                  onClick={() =>
                                    setReplyingTo({
                                      id: m.id,
                                      senderName,
                                      body: m.body || m.attachment?.name || "Medya",
                                    })
                                  }
                                  className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                                >
                                  <Reply className="h-3.5 w-3.5" />
                                </button>
                                {isMe && (
                                  <>
                                    <button
                                      type="button"
                                      title="Düzenle"
                                      onClick={() => {
                                        setEditingMsgId(m.id);
                                        setEditingBody(m.body);
                                      }}
                                      className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title="Sil"
                                      onClick={() =>
                                        requestConfirm({
                                          title: "Mesajı Sil",
                                          message: "Bu mesajı silmek istediğine emin misin?",
                                          confirmLabel: "Sil",
                                          onConfirm: () =>
                                            deleteChatMessage(activeConv.id, m.id),
                                        })
                                      }
                                      className="rounded p-1 text-gray-400 hover:bg-rose-500/15 hover:text-rose-400"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                              <div className="relative">
                                <button
                                  type="button"
                                  title="İfade ekle"
                                  onClick={() =>
                                    setOpenEmojiMsgId((prev) =>
                                      prev === m.id ? null : m.id
                                    )
                                  }
                                  className="rounded-lg border border-white/10 bg-[#0F1115]/95 p-1.5 text-gray-300 hover:text-white hover:bg-white/10 shadow-lg"
                                >
                                  <Smile className="h-3.5 w-3.5" />
                                </button>
                                {openEmojiMsgId === m.id && (
                                  <div
                                    className={`absolute bottom-full mb-1 z-30 flex flex-wrap w-[144px] items-center gap-0.5 rounded-xl border border-white/10 bg-[#0F1115]/95 p-1.5 text-xs shadow-2xl ${
                                      isMe ? "right-0" : "left-0"
                                    }`}
                                  >
                                    {QUICK_EMOJIS.map((em) => (
                                      <button
                                        key={em}
                                        type="button"
                                        onClick={() => {
                                          toggleMessageReaction(activeConv.id, m.id, em);
                                          setOpenEmojiMsgId(null);
                                        }}
                                        className="hover:scale-125 transition p-1 rounded hover:bg-white/10"
                                      >
                                        {em}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {/* Yanıtlanan Mesaj Önizlemesi */}
                          {m.replyTo && (
                            <div className="mb-1.5 rounded-lg border-l-2 border-white/40 bg-black/25 px-2.5 py-1 text-[10px] text-gray-200/80">
                              <span className="font-semibold">
                                {m.replyTo.senderName}:{" "}
                              </span>
                              <span className="truncate">{m.replyTo.body}</span>
                            </div>
                          )}

                          {/* Düzenleme Modu veya Normal Metin */}
                          {isEditing ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                editChatMessage(
                                  activeConv.id,
                                  m.id,
                                  editingBody
                                );
                                setEditingMsgId(null);
                              }}
                              className="flex items-center gap-1.5"
                            >
                              <input
                                type="text"
                                value={editingBody}
                                onChange={(e) => setEditingBody(e.target.value)}
                                autoFocus
                                className="rounded-lg bg-black/40 px-2 py-1 text-xs text-white focus:outline-none"
                              />
                              <button
                                type="submit"
                                className="rounded bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-black"
                              >
                                Kaydet
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingMsgId(null)}
                                className="rounded bg-white/10 px-2 py-1 text-[10px]"
                              >
                                İptal
                              </button>
                            </form>
                          ) : (
                            m.body && (
                              <p className="whitespace-pre-wrap">
                                {m.body}{" "}
                                {m.edited && (
                                  <span className="text-[9px] opacity-60">
                                    (düzenlendi)
                                  </span>
                                )}
                              </p>
                            )
                          )}

                          {/* Yüklenen Dosya / Fotoğraf */}
                          {m.attachment && (
                            <div className="mt-2">
                              {m.attachment.mimeType.startsWith("image/") ? (
                                <img
                                  src={m.attachment.dataUrl}
                                  alt={m.attachment.name}
                                  className="max-h-48 rounded-xl border border-white/15 object-cover"
                                />
                              ) : (
                                <a
                                  href={m.attachment.dataUrl}
                                  download={m.attachment.name}
                                  className="flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2 text-[11px] hover:bg-black/45"
                                >
                                  <FileText className="h-4 w-4 text-indigo-300 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium">
                                      {m.attachment.name}
                                    </div>
                                    <div className="text-[9px] opacity-70">
                                      {(m.attachment.sizeBytes / 1024).toFixed(
                                        1
                                      )}{" "}
                                      KB
                                    </div>
                                  </div>
                                  <Download className="h-3.5 w-3.5 shrink-0" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Paylaşılan Şarkı */}
                          {m.track && (
                            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-black/30 p-2.5">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-emerald-300">
                                  ♪ {m.track.title}
                                </div>
                                {m.track.artist && (
                                  <div className="truncate text-[10px] text-gray-400">
                                    {m.track.artist}
                                  </div>
                                )}
                                {m.track.personalNote && (
                                  <div className="truncate text-[10px] italic text-gray-300">
                                    &ldquo;{m.track.personalNote}&rdquo;
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => playGlobalTrack(m.track!)}
                                className="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300 hover:bg-emerald-500/30"
                              >
                                <Play className="h-3.5 w-3.5 fill-current" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tepkiler & Saat */}
                      {((m.reactions || []).length > 0 || !isGroupedWithNext) && (
                        <div
                          className={`mt-0.5 flex flex-wrap items-center gap-1.5 ${
                            isMe ? "flex-row-reverse justify-start" : "justify-start"
                          }`}
                        >
                          {(() => {
                            const entries = m.reactionsByUser
                              ? (() => {
                                  const map = new Map<string, { count: number; mine: boolean }>();
                                  Object.entries(m.reactionsByUser).forEach(([uid, ems]) => {
                                    (ems || []).forEach((em) => {
                                      const cur = map.get(em) || { count: 0, mine: false };
                                      cur.count += 1;
                                      if (uid === currentUser?.id) cur.mine = true;
                                      map.set(em, cur);
                                    });
                                  });
                                  return Array.from(map.entries());
                                })()
                              : (m.reactions || []).map((em) => [em, { count: 1, mine: true }] as const);
                            if (entries.length === 0) return null;
                            return (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {entries.map(([e, info]) => (
                                  <button
                                    key={e}
                                    onClick={() => {
                                      if (info.mine || !m.reactionsByUser) {
                                        toggleMessageReaction(activeConv.id, m.id, e);
                                      }
                                    }}
                                    title={info.mine ? "Tepkini kaldır" : "Tepki eklemek için ifade butonunu kullan"}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] border transition ${
                                      info.mine
                                        ? "bg-indigo-500/25 border-indigo-400/50 text-white"
                                        : "bg-white/10 border-white/10 text-gray-300 cursor-default"
                                    }`}
                                  >
                                    <span>{e}</span>
                                    {info.count > 1 && <span className="text-[10px] opacity-80">{info.count}</span>}
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                          {!isGroupedWithNext && (
                            <span className="text-[10px] text-gray-500">
                              {(() => {
                                void nowTick;
                                return formatRelativeTime(m.createdAtMs, m.createdAt);
                              })()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {localCallNotices
                  .filter((n) => n.convId === activeConv.id)
                  .map((n) => (
                    <div
                      key={n.id}
                      className="my-2 flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold">Bilgi (Sadece sen görüyorsun): </span>
                        <span>{n.text}</span>
                        <span className="ml-2 text-[10px] text-amber-300/70">
                          {n.createdAt}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteLocalCallNotice(n.id)}
                        title="Mesajı Sil"
                        className="rounded p-1 text-amber-300/70 hover:bg-rose-500/20 hover:text-rose-300 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Mesaj, Dosya & Şarkı Gönderme Kutusu */}
              <form
                onSubmit={handleSend}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer?.files?.[0];
                  if (f) attachChatFile(f);
                }}
                className="border-t border-white/10 p-3 space-y-2"
              >
                {/* Yanıtlanan Mesaj Çubuğu */}
                {replyingTo && (
                  <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs">
                    <div className="truncate text-indigo-200">
                      <span className="font-semibold">
                        {replyingTo.senderName}
                      </span>{" "}
                      kişisine yanıt: &ldquo;{replyingTo.body}&rdquo;
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Seçili Dosya Önizlemesi */}
                {pendingAttachment && (
                  <div className="flex items-center justify-between rounded-xl border border-white/15 bg-[#0F1115] px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-indigo-300 shrink-0" />
                      <span className="truncate text-white">
                        {pendingAttachment.name}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        ({(pendingAttachment.sizeBytes / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingAttachment(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {showTrackSender && (
                  <div className="rounded-xl border border-white/10 bg-[#0F1115] p-2.5 space-y-2">
                    <RealSongSearch
                      onSelect={(t) => {
                        setTrackTitle(t.title);
                        setTrackArtist(t.artist || "");
                        setTrackUrl(t.url || "");
                        setTrackPreviewUrl(t.previewUrl || "");
                        setTrackArtworkUrl(t.artworkUrl || "");
                      }}
                    />
                    <input
                      type="text"
                      value={trackTitle}
                      onChange={(e) => setTrackTitle(e.target.value)}
                      placeholder="Şarkı adı..."
                      className="w-full rounded-lg border border-white/10 bg-[#151821] px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <input
                      type="url"
                      value={trackUrl}
                      onChange={(e) => setTrackUrl(e.target.value)}
                      placeholder="YouTube veya Spotify şarkı linki (isteğe bağlı)..."
                      className="w-full rounded-lg border border-white/10 bg-[#151821] px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={trackArtist}
                        onChange={(e) => setTrackArtist(e.target.value)}
                        placeholder="Sanatçı (zorunlu değil)"
                        className="rounded-lg border border-white/10 bg-[#151821] px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={trackNote}
                        onChange={(e) => setTrackNote(e.target.value)}
                        placeholder="Şarkıya not ekle (zorunlu değil)"
                        className="rounded-lg border border-white/10 bg-[#151821] px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {showEmojiPicker && (
                  <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-[#0F1115] p-2">
                    {[
                      "❤️", "😂", "😊", "🔥", "✨", "🎵", "🎧", "🌙", "☕", "🌧️",
                      "👏", "🙏", "😍", "😮", "😢", "💯", "💫", "💖", "🥀", "🎶",
                    ].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setMsgText((prev) => prev + em)}
                        className="rounded-lg p-1.5 text-base hover:bg-white/10 transition"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTrackSender((v) => !v)}
                    title="Şarkı Dinlet / Gönder"
                    className={`rounded-xl p-2.5 transition ${
                      showTrackSender
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    <Music className="h-4 w-4" />
                  </button>

                  <label
                    title="Dosya / Fotoğraf Gönder (Maks 2 MB)"
                    className="cursor-pointer rounded-xl bg-white/5 p-2.5 text-gray-400 transition hover:text-white"
                  >
                    <Paperclip className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*,audio/*,.pdf,.txt"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    title="Emoji Ekle"
                    className={`rounded-xl border p-2.5 transition ${
                      showEmojiPicker
                        ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
                        : "border-white/10 bg-[#0F1115] text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <Smile className="h-4 w-4" />
                  </button>

                  <input
                    type="text"
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    onPaste={handleChatPaste}
                    placeholder="Bir mesaj yaz veya GIF/fotoğraf yapıştır..."
                    className="flex-1 rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 p-2.5 text-white hover:bg-indigo-500"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Yeni Sohbet Başlat
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Arkadaşların veya kayıtlı kullanıcılarla hemen sohbet başlat.
                  </p>
                </div>
                {showNewChatPicker && activeConv && (
                  <button
                    type="button"
                    onClick={() => setShowNewChatPicker(false)}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-gray-300 hover:bg-white/5"
                  >
                    Sohbete Dön
                  </button>
                )}
              </div>

              <input
                type="text"
                value={newChatSearch}
                onChange={(e) => setNewChatSearch(e.target.value)}
                placeholder="İsim veya @kullanıcı adı ara..."
                className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
              />

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px]">
                {(() => {
                  const q = newChatSearch.trim().toLowerCase();
                  const sorted = [...selectableFriends].sort((a, b) => {
                    const af = friendIds.includes(a.id) ? 0 : 1;
                    const bf = friendIds.includes(b.id) ? 0 : 1;
                    return af - bf;
                  });
                  const list = q
                    ? sorted.filter(
                        (u) =>
                          u.nickname.toLowerCase().includes(q) ||
                          u.username.toLowerCase().includes(q)
                      )
                    : sorted;
                  if (list.length === 0) {
                    return (
                      <p className="py-8 text-center text-xs text-gray-500">
                        Sohbet başlatabileceğin başka kullanıcı bulunamadı.
                      </p>
                    );
                  }
                  return list.map((u) => {
                    const isFriend = friendIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F1115]/80 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.nickname}
                              className="h-9 w-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
                              {u.nickname.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-semibold text-white">
                                {u.nickname}
                              </span>
                              {isFriend && (
                                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] text-emerald-300">
                                  Arkadaş
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[11px] text-gray-400">
                              @{u.username}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            startDirectChatFromProfile(u.id);
                            setShowNewChatPicker(false);
                          }}
                          className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-black hover:bg-emerald-400 transition"
                        >
                          Sohbet Başlat
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Her Zaman Açık Senkronize Dinleme Odası Paneli */}
        <div
          className={`${
            mobileTab === "ROOM" ? "flex" : "hidden"
          } md:flex md:col-span-4 flex-col rounded-2xl border border-emerald-500/25 bg-[#12191C]/95 p-4 space-y-3 h-full min-h-0 overflow-y-auto`}
        >
          <div className="flex items-start justify-between gap-2 border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {listeningRoom.currentTrack?.artworkUrl ? (
                <img
                  src={listeningRoom.currentTrack.artworkUrl}
                  alt={listeningRoom.currentTrack.title}
                  className="h-11 w-11 rounded-lg object-cover shrink-0 border border-white/10"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                  <Headphones className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Dinleme Odası · {(listeningRoom.participantIds || []).length} kişi
                </div>
                <div className="truncate text-sm font-semibold text-white">
                  {listeningRoom.currentTrack?.title || "Şarkı seçilmedi"}
                </div>
                {listeningRoom.currentTrack?.artist && (
                  <div className="truncate text-xs text-gray-400">
                    {listeningRoom.currentTrack.artist}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                isJoinedRoom
                  ? leaveListeningRoom()
                  : joinListeningRoom(activeConv?.id)
              }
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                isJoinedRoom
                  ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                  : "bg-emerald-500 text-black hover:bg-emerald-400"
              }`}
            >
              {isJoinedRoom ? "Ayrıl" : "Katıl"}
            </button>
          </div>

            {/* Kontroller */}
            {isJoinedRoom ? (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={toggleCollaborativeQueue}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                  listeningRoom.allowCollaborativeQueue
                    ? "bg-indigo-500/25 text-indigo-200 border border-indigo-500/30"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>
                  {listeningRoom.allowCollaborativeQueue
                    ? "Ortak Sıra Açık"
                    : "Sadece DJ"}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={restartRoomTrack}
                  title="Sıfırdan Başlat"
                  className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={prevRoomTrack}
                  disabled={!(listeningRoom.history && listeningRoom.history.length > 0)}
                  title="Önceki Şarkı"
                  className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-35"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleRoomPlay(roomTime)}
                  className="rounded-lg bg-emerald-500 p-2 text-black hover:bg-emerald-400"
                >
                  {listeningRoom.isPlaying ? (
                    <Pause className="h-4 w-4 fill-current" />
                  ) : (
                    <Play className="h-4 w-4 fill-current" />
                  )}
                </button>
                <button
                  onClick={skipRoomTrack}
                  title="Sonraki Şarkı"
                  className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
            </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-200/80">
                Müzik eklemek ve odayı kontrol etmek için önce <span className="font-semibold text-emerald-300">Katıl</span> butonuna bas.
              </div>
            )}

            {/* Şarkı Süre Çubuğu + 5sn Geri / 5sn İleri */}
            {listeningRoom.currentTrack && (
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0F1115]/60 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => seekRoomTrack(Math.max(0, roomTime - 5))}
                  title="5 sn Geri"
                  className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-gray-200 hover:bg-white/20 shrink-0"
                >
                  -5sn
                </button>
                <span className="w-8 text-[10px] text-gray-400 tabular-nums shrink-0">
                  {formatSec(roomTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={roomDuration > 0 ? roomDuration : 180}
                  value={Math.min(
                    roomTime,
                    roomDuration > 0 ? roomDuration : 180
                  )}
                  onChange={(e) => seekRoomTrack(Number(e.target.value))}
                  className="h-1.5 flex-1 accent-emerald-400 cursor-pointer"
                />
                <span className="w-8 text-right text-[10px] text-gray-400 tabular-nums shrink-0">
                  {formatSec(roomDuration > 0 ? roomDuration : 180)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    seekRoomTrack(
                      Math.min(
                        roomDuration > 0 ? roomDuration : 180,
                        roomTime + 5
                      )
                    )
                  }
                  title="5 sn İleri"
                  className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-gray-200 hover:bg-white/20 shrink-0"
                >
                  +5sn
                </button>
              </div>
            )}

            {/* Ses Seviyesi Ayarı */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0F1115]/60 px-3 py-2">
              <Volume2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-gray-300 shrink-0">Ses</span>
              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1.5 flex-1 accent-emerald-400 cursor-pointer"
              />
              <span className="w-8 text-right text-[11px] text-gray-400">
                {volume}%
              </span>
            </div>

            {/* Tüm şarkılar (Spotify dahil) ListeningRoomAudioHost üzerinden kesintisiz çalar */}

            {/* Gerçek Şarkı Sıraya Ekleme & Müzik Listesi Sıraya Ekleme */}
            {isJoinedRoom && listeningRoom.allowCollaborativeQueue && (
              <div className="rounded-xl border border-white/10 bg-[#0F1115]/80 p-3 space-y-2.5">
                <div className="text-[11px] font-medium text-gray-300">
                  Sıraya Şarkı Ekle
                </div>
                <RealSongSearch
                  onSelect={(track) => addToRoomQueue(track)}
                  placeholder="Sıraya eklemek için şarkı ara veya link yapıştır..."
                />
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-300">
                      <ListMusic className="h-3.5 w-3.5" />
                      <span>Müzik Listesinden Sıraya Ekle</span>
                    </span>
                    {playlists.filter(
                      (p) =>
                        p.authorId === currentUser.id ||
                        (friendIds.includes(p.authorId) && Boolean(p.isShared))
                    ).length === 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveSection("PLAYLISTS")}
                        className="text-[10px] text-indigo-300 underline hover:text-indigo-200"
                      >
                        Liste Oluştur
                      </button>
                    )}
                  </div>
                  {(() => {
                    const accessiblePlaylists = playlists
                      .filter(
                        (p) =>
                          p.authorId === currentUser.id ||
                          (friendIds.includes(p.authorId) && Boolean(p.isShared))
                      )
                      .sort((a, b) =>
                        a.authorId === currentUser.id &&
                        b.authorId !== currentUser.id
                          ? -1
                          : b.authorId === currentUser.id &&
                            a.authorId !== currentUser.id
                          ? 1
                          : 0
                      );
                    if (accessiblePlaylists.length === 0) {
                      return (
                        <p className="text-[10px] text-gray-500">
                          Henüz eklenebilir müzik listen yok.
                        </p>
                      );
                    }
                    const activePl =
                      accessiblePlaylists.find(
                        (p) => p.id === selectedPlaylistId
                      ) || accessiblePlaylists[0];
                    return (
                      <div className="space-y-1.5">
                        <select
                          value={activePl?.id || ""}
                          onChange={(e) =>
                            setSelectedPlaylistId(e.target.value)
                          }
                          className="w-full rounded-lg border border-white/10 bg-[#151821] px-2.5 py-1.5 text-[11px] text-white focus:border-emerald-500 focus:outline-none"
                        >
                          {accessiblePlaylists.map((pl) => (
                            <option key={pl.id} value={pl.id}>
                              {pl.authorId === currentUser.id ? "★ " : ""}
                              {pl.title} ({pl.tracks.length} şarkı)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!activePl || activePl.tracks.length === 0}
                          onClick={() => {
                            if (activePl) addPlaylistToRoomQueue(activePl.tracks);
                          }}
                          className="w-full rounded-lg bg-emerald-500 py-1.5 text-[11px] font-semibold text-black hover:bg-emerald-400 disabled:opacity-40 transition"
                        >
                          Listeyi Çal (Sırayı Değiştir)
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Sıradakiler (Seçerek Çal + Sıra Değiştir + Kaldır) */}
            <div className="flex-1 min-h-0 flex flex-col space-y-1.5">
              <span className="text-[11px] font-medium text-gray-400">
                Sıradakiler ({listeningRoom.queue.length}) — Çalmak için tıkla
              </span>
              {listeningRoom.queue.length === 0 ? (
                <span className="text-[11px] text-gray-500">Sıra boş</span>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-1.5">
                  {listeningRoom.queue.map((q, idx) => (
                    <div
                      key={`${q.id}_${idx}`}
                      className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1.5 text-[11px] text-gray-200 hover:bg-emerald-500/15 transition"
                    >
                      <button
                        type="button"
                        onClick={() => playTrackInRoom(q)}
                        title="Bu şarkıyı çal"
                        className="flex flex-1 items-center gap-1.5 min-w-0 text-left hover:text-emerald-200"
                      >
                        <Play className="h-3 w-3 shrink-0 text-emerald-400" />
                        <span className="truncate">
                          {idx + 1}. {q.title}
                          {q.artist ? ` — ${q.artist}` : ""}
                        </span>
                      </button>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveRoomQueueTrack(idx, -1)}
                          title="Yukarı Taşı"
                          className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-25"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === listeningRoom.queue.length - 1}
                          onClick={() => moveRoomQueueTrack(idx, 1)}
                          title="Aşağı Taşı"
                          className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-25"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRoomQueueTrack(idx)}
                          title="Sıradan Kaldır"
                          className="rounded p-1 text-gray-400 hover:bg-rose-500/20 hover:text-rose-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
}
