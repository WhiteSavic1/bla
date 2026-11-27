"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActiveSection,
  AdminRequest,
  AppNotification,
  BookQuote,
  ChatAttachment,
  ChatMessage,
  Conversation,
  FontStyle,
  FriendRequest,
  HighlightColor,
  JournalLockConfig,
  ListeningRoomState,
  Playlist,
  Post,
  PrivateNote,
  ProfileAudioConfig,
  RegisteredAccount,
  ReportItem,
  SupportTicket,
  TrackInfo,
  UserProfile,
} from "@/types/persona";
import {
  SEED_CONVERSATIONS,
  SEED_POSTS,
  SEED_USERS,
} from "@/lib/mockData";
import { audioEngine } from "@/lib/audioEngine";
import { extractSpotifyTrackId, extractYouTubeId } from "@/lib/constants";

export type PlaybackMode = "SEQUENTIAL" | "SHUFFLE" | "MANUAL";

interface AppContextValue {
  // Navigation & UI
  activeSection: ActiveSection;
  setActiveSection: (s: ActiveSection) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  viewedProfileId: string | null;
  openProfile: (userId: string) => void;
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;

  // Auth / Onboarding
  isGuest: boolean;
  hasEnteredNickname: boolean;
  currentEmail: string | null;
  showNicknameModal: boolean;
  setShowNicknameModal: (v: boolean) => void;
  registerAccount: (
    email: string,
    password: string,
    nickname: string
  ) => { ok: boolean; error?: string };
  loginAccount: (
    email: string,
    password: string
  ) => { ok: boolean; error?: string };
  loginWithGoogle: (
    email: string,
    nickname: string,
    picture?: string
  ) => { ok: boolean; error?: string };
  hasGoogleAccount: (email: string) => boolean;
  pendingGoogleUser: { email: string; name?: string; picture?: string } | null;
  setPendingGoogleUser: (
    u: { email: string; name?: string; picture?: string } | null
  ) => void;
  logout: () => void;
  enterAsGuest: () => void;

  // Search & Notifications
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notifications: AppNotification[];
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;

  // Current User & Settings
  currentUser: UserProfile;
  users: UserProfile[];
  updateCurrentUser: (patch: Partial<UserProfile>) => void;
  feedBackgroundUrl: string;
  setFeedBackgroundUrl: (url: string) => void;
  feedBgDim: number;
  setFeedBgDim: (dim: number) => void;

  // Journal / Thoughts Lock (PIN + Pattern + Support Ticket)
  journalLock: JournalLockConfig;
  isJournalUnlocked: boolean;
  unlockJournal: (pin?: string, pattern?: number[]) => boolean;
  lockJournal: () => void;
  updateJournalLock: (
    nextConfig: JournalLockConfig,
    oldPin?: string,
    oldPattern?: number[]
  ) => { ok: boolean; error?: string };
  supportTickets: SupportTicket[];
  createSupportTicket: (
    reason: string,
    category?: "JOURNAL_RESET" | "GENERAL"
  ) => void;
  adminResetJournalLock: (
    ticketId: string,
    newPin?: string,
    adminNote?: string
  ) => void;

  // Reports (Paylaşım / Hesap Bildirme)
  reports: ReportItem[];
  submitReport: (
    targetType: "POST" | "USER" | "COMMENT",
    targetId: string,
    targetLabel: string,
    reason: string
  ) => void;
  resolveReport: (reportId: string) => void;
  adminDeletePost: (postId: string) => void;
  adminDeleteComment: (postId: string, commentId: string) => void;
  bannedUserIds: string[];
  mutedUserIds: string[];
  adminBanUser: (userId: string) => void;
  adminUnbanUser: (userId: string) => void;
  adminMuteUser: (userId: string) => void;
  adminUnmuteUser: (userId: string) => void;
  adminDeleteUser: (userId: string) => void;
  themeMode: "SYSTEM" | "DARK" | "LIGHT";
  resolvedTheme: "dark" | "light";
  setThemeMode: (mode: "SYSTEM" | "DARK" | "LIGHT") => void;

  // Admin / Yetkili Sistemi (Sadece yetkili hesaplarda görünür + ekstra şifre)
  isAdmin: boolean;
  isFounder: boolean;
  isAdminVerified: boolean;
  isAdminPasswordChanged: boolean;
  adminInitialPasswordHint: string | null;
  adminEmails: string[];
  adminRequests: AdminRequest[];
  verifyAdminPassword: (pwd: string) => boolean;
  lockAdminPanel: () => void;
  addAdminEmail: (
    email: string,
    initialPassword: string
  ) => { ok: boolean; error?: string };
  approveAdminRequest: (reqId: string) => void;
  rejectAdminRequest: (reqId: string) => void;
  removeAdminEmail: (email: string) => void;
  changeAdminPassword: (
    oldPwd: string,
    newPwd: string
  ) => { ok: boolean; error?: string };
  privateNotes: PrivateNote[];
  addPrivateNote: (note: Omit<PrivateNote, "id" | "createdAt">) => void;
  deletePrivateNote: (id: string) => void;

  // Friends & Close Friends (Yakın Arkadaşlar)
  friendIds: string[];
  closeFriendIds: string[];
  friendRequests: FriendRequest[];
  sendFriendRequest: (userId: string) => void;
  cancelFriendRequest: (userId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  removeFriend: (userId: string) => void;
  toggleCloseFriend: (userId: string) => void;
  blockedUserIds: string[];
  toggleBlockUser: (userId: string) => void;

  // Posts & Interactions
  posts: Post[];
  savedPostIds: string[];
  createPost: (
    post: Omit<
      Post,
      "id" | "authorId" | "likes" | "comments" | "highlights" | "repostedBy" | "createdAt"
    >
  ) => void;
  deletePost: (postId: string) => void;
  editPost: (postId: string, updates: { title?: string; content: string }) => void;
  publishDraft: (postId: string) => void;
  onlineUserIds: string[];
  updateBannerTheme: (themeId: string) => void;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  addComment: (
    postId: string,
    body: string,
    attachment?: { url: string; type: "IMAGE" | "GIF" }
  ) => void;
  deleteComment: (postId: string, commentId: string) => void;
  toggleCommentLike: (postId: string, commentId: string) => void;
  addHighlight: (postId: string, text: string, color: HighlightColor) => void;
  removeHighlight: (postId: string, highlightId: string) => void;
  showCloseFriendHighlights: boolean;
  setShowCloseFriendHighlights: (show: boolean) => void;
  hideOnlineStatus: boolean;
  setHideOnlineStatus: (hide: boolean) => void;
  muteUiSounds: boolean;
  setMuteUiSounds: (mute: boolean) => void;
  repostPost: (originalPostId: string, editedContent: string) => void;
  undoRepost: (originalPostId: string) => void;

  // Audio: Global Mini Player & 30s Profile Audio
  apiBaseUrl: string;
  callRequest: {
    convId: string;
    peerName: string;
    targetUserIds: string[];
    nonce: number;
  } | null;
  startVoiceCall: (
    convId: string,
    peerName: string,
    targetUserIds: string[]
  ) => void;
  globalTrack: TrackInfo | null;
  globalQueue: TrackInfo[];
  globalQueueIndex: number;
  isGlobalPlaying: boolean;
  isLooping: boolean;
  toggleLoop: () => void;
  globalPlayMode: PlaybackMode;
  setGlobalPlayMode: (mode: PlaybackMode) => void;
  volume: number;
  setVolume: (v: number) => void;
  playGlobalTrack: (track: TrackInfo, queue?: TrackInfo[]) => void;
  playGlobalPlaylist: (
    tracks: TrackInfo[],
    startIndex?: number,
    mode?: PlaybackMode
  ) => void;
  nextGlobalTrack: (autoAdvance?: boolean) => void;
  prevGlobalTrack: () => void;
  toggleGlobalPlay: () => void;
  stopGlobalTrack: () => void;

  // Playlists (Müzik Listeleri)
  playlists: Playlist[];
  createPlaylist: (
    title: string,
    description: string,
    tracks: TrackInfo[]
  ) => void;
  deletePlaylist: (playlistId: string) => void;
  addTrackToPlaylist: (playlistId: string, track: TrackInfo) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  movePlaylistTrack: (
    playlistId: string,
    index: number,
    direction: -1 | 1
  ) => void;
  updatePlaylistInfo: (
    playlistId: string,
    title: string,
    description: string
  ) => void;
  toggleLikePlaylist: (playlistId: string) => void;
  togglePlaylistShare: (playlistId: string) => void;
  sharePlaylistToFeed: (playlistId: string) => void;
  sharePlaylistToChat: (playlistId: string, convId: string) => void;

  activeProfileAudio: {
    userId: string;
    config: ProfileAudioConfig;
    remainingSec: number;
    isPlaying: boolean;
    isMuted: boolean;
  } | null;
  toggleMuteProfileAudio: () => void;
  replayProfileAudio: () => void;
  stopProfileAudio: () => void;

  // Chat & Listening Room
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  startMessageRequest: (postId: string, peerId: string, firstMsg: string) => void;
  startDirectChatFromProfile: (peerId: string) => void;
  createGroupConversation: (groupName: string, memberIds: string[]) => void;
  updateGroupAvatar: (convId: string, avatarUrl: string) => void;
  deleteConversation: (convId: string) => void;
  acceptConversation: (convId: string) => void;
  rejectConversation: (convId: string) => void;
  sendChatMessage: (
    convId: string,
    body: string,
    track?: TrackInfo,
    attachment?: ChatAttachment,
    replyTo?: ChatMessage["replyTo"]
  ) => void;
  editChatMessage: (convId: string, msgId: string, newBody: string) => void;
  deleteChatMessage: (convId: string, msgId: string) => void;
  pinChatMessage: (
    convId: string,
    pinned: Conversation["pinnedMessage"]
  ) => void;
  toggleMessageReaction: (convId: string, msgId: string, emoji: string) => void;

  listeningRoom: ListeningRoomState;
  joinedRoomConvId: string | null;
  getRoomForConv: (convId?: string | null) => ListeningRoomState;
  roomClockOffsetMs: number;
  roomDurationSec: number;
  setRoomDurationSec: (sec: number) => void;
  openListeningRoom: (convId: string) => void;
  closeListeningRoom: () => void;
  joinListeningRoom: (convId?: string) => void;
  leaveListeningRoom: () => void;
  playTrackInRoom: (track: TrackInfo) => void;
  playPlaylistInRoom: (tracks: TrackInfo[]) => void;
  addPlaylistToRoomQueue: (tracks: TrackInfo[]) => void;
  moveRoomQueueTrack: (index: number, direction: -1 | 1) => void;
  removeRoomQueueTrack: (index: number) => void;
  clearRoomQueue: () => void;
  restartRoomTrack: () => void;
  seekRoomTrack: (seconds: number) => void;
  toggleRoomPlay: (currentSec?: number) => void;
  toggleCollaborativeQueue: () => void;
  addToRoomQueue: (track: TrackInfo) => void;
  prevRoomTrack: () => void;
  skipRoomTrack: (autoAdvance?: boolean) => void;
  roomPlayMode: PlaybackMode;
  setRoomPlayMode: (mode: PlaybackMode) => void;

  // Toast feedback
  toastMessage: string | null;
  showToast: (msg: string) => void;
  confirmDialog: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null;
  requestConfirm: (cfg: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;
}

const DEFAULT_CURRENT_USER: UserProfile = {
  id: "u_me",
  username: "misafir_okur",
  nickname: "Misafir Okur",
  bio: "",
  currentMood: "#gece-yarısı",
  isOnline: true,
};

const mergeProfiles = (
  base: UserProfile[],
  incoming: UserProfile[]
): UserProfile[] => {
  const map = new Map<string, UserProfile>();
  for (const p of base) {
    if (p && p.id) map.set(p.id, p);
  }
  for (const p of incoming) {
    if (!p || !p.id) continue;
    const prev = map.get(p.id);
    map.set(p.id, prev ? { ...prev, ...p } : p);
  }
  return Array.from(map.values());
};

const playNotificationChime = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1174.66, now + 0.08);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);
    setTimeout(() => ctx.close().catch(() => {}), 350);
  } catch {
    // ignore audio autoplay restriction
  }
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<ActiveSection>("FEED");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewedProfileId, setViewedProfileId] = useState<string | null>("u_me");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [isGuest, setIsGuest] = useState(true);
  const [hasEnteredNickname, setHasEnteredNickname] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [currentUser, setCurrentUser] =
    useState<UserProfile>(DEFAULT_CURRENT_USER);
  const [feedBackgroundUrl, setFeedBackgroundUrl] = useState<string>("");
  const [feedBgDim, setFeedBgDim] = useState<number>(72);

  const [journalLock, setJournalLock] = useState<JournalLockConfig>({
    type: "NONE",
  });
  const [isJournalUnlocked, setIsJournalUnlocked] = useState<boolean>(true);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);

  const ROOT_ADMIN_EMAIL = "endend5526@gmail.com";
  const [adminEmails, setAdminEmails] = useState<string[]>([ROOT_ADMIN_EMAIL]);
  const [adminPasswords, setAdminPasswords] = useState<Record<string, string>>({
    [ROOT_ADMIN_EMAIL]: "WhiteSavic2026",
  });
  const [adminPasswordChangedEmails, setAdminPasswordChangedEmails] = useState<
    string[]
  >([]);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(false);
  const [privateNotes, setPrivateNotes] = useState<PrivateNote[]>([]);

  const [posts, setPosts] = useState<Post[]>(SEED_POSTS);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [closeFriendIds, setCloseFriendIds] = useState<string[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [registeredProfiles, setRegisteredProfiles] = useState<UserProfile[]>(
    []
  );

  const [callRequest, setCallRequest] = useState<{
    convId: string;
    peerName: string;
    targetUserIds: string[];
    nonce: number;
  } | null>(null);
  const startVoiceCall = (
    convId: string,
    peerName: string,
    targetUserIds: string[]
  ) => {
    setCallRequest((prev) => ({
      convId,
      peerName,
      targetUserIds,
      nonce: (prev?.nonce || 0) + 1,
    }));
  };

  const [globalTrack, setGlobalTrack] = useState<TrackInfo | null>(null);
  const [globalQueue, setGlobalQueue] = useState<TrackInfo[]>([]);
  const [globalQueueIndex, setGlobalQueueIndex] = useState<number>(-1);
  const [isGlobalPlaying, setIsGlobalPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [globalPlayMode, setGlobalPlayMode] = useState<PlaybackMode>("SEQUENTIAL");
  const [roomPlayMode, setRoomPlayMode] = useState<PlaybackMode>("SEQUENTIAL");
  const [volume, setVolumeState] = useState<number>(75);

  const toggleLoop = () => {
    setIsLooping((prev) => {
      const next = !prev;
      showToast(next ? "Şarkı tekrarı açıldı." : "Şarkı tekrarı kapatıldı.");
      return next;
    });
  };

  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: "pl_1",
      title: "Gece Yürüyüşü",
      description: "Saat 02:00 sonrası kulaklıkla dinlemelik şarkılar.",
      authorId: "u_gece",
      tracks: [
        {
          id: "plt_1",
          title: "Geceye Selam",
          artist: "Büyük Ev Ablukada",
          provider: "AMBIENT",
          synthMood: "night",
        },
      ],
      likes: ["u_plak"],
      createdAt: "Dün",
    },
  ]);

  const setVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(100, v));
    setVolumeState(clamped);
    audioEngine.setVolume(clamped / 100);
  };

  const [activeProfileAudio, setActiveProfileAudio] =
    useState<AppContextValue["activeProfileAudio"]>(null);
  const profileAudioTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  const [conversations, setConversations] =
    useState<Conversation[]>(SEED_CONVERSATIONS);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);

  const [roomsByConv, setRoomsByConv] = useState<
    Record<string, ListeningRoomState>
  >({});
  const [joinedRoomConvId, setJoinedRoomConvId] = useState<string | null>(null);
  const createEmptyRoom = (convId?: string): ListeningRoomState => ({
    isOpen: true,
    conversationId: convId,
    hostUserId: "u_me",
    allowCollaborativeQueue: true,
    currentTrack: null,
    isPlaying: false,
    queue: [],
  });
  const getRoomForConv = (convId?: string | null): ListeningRoomState =>
    convId ? roomsByConv[convId] || createEmptyRoom(convId) : createEmptyRoom();
  const effectiveJoinedRoomConvId =
    joinedRoomConvId ||
    Object.keys(roomsByConv).find((cid) =>
      (roomsByConv[cid]?.participantIds || []).includes(currentUser.id)
    ) ||
    null;
  const listeningRoom = effectiveJoinedRoomConvId
    ? getRoomForConv(effectiveJoinedRoomConvId)
    : getRoomForConv(activeConversationId);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  } | null>(null);
  const requestConfirm = (cfg: {
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
  }) => setConfirmDialog(cfg);
  const closeConfirm = () => setConfirmDialog(null);

  const [bannedUserIds, setBannedUserIds] = useState<string[]>([]);
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([]);
  const [themeMode, setThemeModeState] = useState<"SYSTEM" | "DARK" | "LIGHT">(
    "SYSTEM"
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("satir_arasi_theme_v1");
      if (saved === "LIGHT" || saved === "DARK" || saved === "SYSTEM") {
        setThemeModeState(saved);
      }
    } catch {
      // ignore
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemPrefersDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const resolvedTheme: "dark" | "light" =
    themeMode === "SYSTEM"
      ? systemPrefersDark
        ? "dark"
        : "light"
      : themeMode === "LIGHT"
      ? "light"
      : "dark";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setThemeMode = (mode: "SYSTEM" | "DARK" | "LIGHT") => {
    setThemeModeState(mode);
    try {
      localStorage.setItem("satir_arasi_theme_v1", mode);
    } catch {
      // ignore
    }
  };

  const [showCloseFriendHighlights, setShowCloseFriendHighlightsState] =
    useState<boolean>(() => {
      if (typeof window === "undefined") return true;
      try {
        return localStorage.getItem("satir_arasi_show_cf_highlights_v1") !== "false";
      } catch {
        return true;
      }
    });

  const setShowCloseFriendHighlights = (show: boolean) => {
    setShowCloseFriendHighlightsState(show);
    try {
      localStorage.setItem("satir_arasi_show_cf_highlights_v1", String(show));
    } catch {
      // ignore
    }
  };

  const [hideOnlineStatus, setHideOnlineStatusState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("satir_arasi_hide_online_v1") === "true";
    } catch {
      return false;
    }
  });
  const setHideOnlineStatus = (hide: boolean) => {
    setHideOnlineStatusState(hide);
    try {
      localStorage.setItem("satir_arasi_hide_online_v1", String(hide));
    } catch {
      // ignore
    }
  };

  const [muteUiSounds, setMuteUiSoundsState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("satir_arasi_mute_ui_sounds_v1") === "true";
    } catch {
      return false;
    }
  });
  const setMuteUiSounds = (mute: boolean) => {
    setMuteUiSoundsState(mute);
    try {
      localStorage.setItem("satir_arasi_mute_ui_sounds_v1", String(mute));
    } catch {
      // ignore
    }
  };

  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  useEffect(() => {
    if (typeof window === "undefined" || !currentUser.id) return;
    try {
      const raw = localStorage.getItem(`satir_arasi_blocked_${currentUser.id}`);
      const parsed = raw ? JSON.parse(raw) : [];
      setBlockedUserIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setBlockedUserIds([]);
    }
  }, [currentUser.id]);

  const toggleBlockUser = (userId: string) => {
    if (!requireAuthAction()) return;
    if (!userId || userId === currentUser.id) return;
    setBlockedUserIds((prev) => {
      const isBlocked = prev.includes(userId);
      const next = isBlocked
        ? prev.filter((id) => id !== userId)
        : [...prev, userId];
      try {
        localStorage.setItem(
          `satir_arasi_blocked_${currentUser.id}`,
          JSON.stringify(next)
        );
      } catch {
        // ignore
      }
      showToast(
        isBlocked
          ? "Kullanıcının engeli kaldırıldı."
          : "Kullanıcı engellendi (paylaşım, mesaj ve yorumlarını görmeyeceksin)."
      );
      return next;
    });
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 3200);
  };

  const [isHydrated, setIsHydrated] = useState(false);
  const [isRemoteLoaded, setIsRemoteLoaded] = useState(false);
  const lastRemoteJsonRef = useRef<string>("");
  const lastAdminJsonRef = useRef<string>("");
  const syncVersionRef = useRef<number>(0);
  const inFlightSyncsRef = useRef<number>(0);
  const pendingSyncBodyRef = useRef<string | null>(null);
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const markDeletedId = (id: string) => {
    if (id) {
      deletedIdsRef.current.add(id);
      lastLocalMutationAtRef.current = Date.now();
      syncVersionRef.current += 1;
    }
  };
  const lastLocalMutationAtRef = useRef<number>(0);
  const lastRoomMutationAtByConvRef = useRef<Record<string, number>>({});
  const lastRoomJsonByConvRef = useRef<Record<string, string>>({});
  const lastRoomVersionByConvRef = useRef<Record<string, string>>({});
  const lastSyncedPerKeyRef = useRef<Record<string, string>>({});
  const [roomClockOffsetMs, setRoomClockOffsetMs] = useState<number>(0);
  const [roomDurationSec, setRoomDurationSec] = useState<number>(0);
  const roomClockOffsetRef = useRef<number>(0);
  const seenMessageIdsRef = useRef<Set<string> | null>(null);

  // Yeni gelen mesajlarda (sohbet ekranında değilsek veya sekme arka plandaysa) bildirim sesi çal
  useEffect(() => {
    if (!isRemoteLoaded || isGuest) return;
    const myConvs = conversations.filter((c) =>
      c.isGroup
        ? !c.memberIds || c.memberIds.includes(currentUser.id)
        : c.initiatorId === currentUser.id ||
          c.peerId === currentUser.id ||
          Boolean(c.memberIds?.includes(currentUser.id))
    );
    const allIds = new Set<string>();
    const newlyArrived: { senderName: string; body: string }[] = [];

    for (const c of myConvs) {
      for (const m of c.messages) {
        allIds.add(m.id);
        if (
          seenMessageIdsRef.current !== null &&
          !seenMessageIdsRef.current.has(m.id) &&
          m.senderId !== currentUser.id
        ) {
          newlyArrived.push({
            senderName: m.senderNickname || "Yeni Mesaj",
            body: m.body || "Medya gönderdi",
          });
        }
      }
    }

    if (seenMessageIdsRef.current === null) {
      seenMessageIdsRef.current = allIds;
      return;
    }

    seenMessageIdsRef.current = allIds;

    if (newlyArrived.length > 0) {
      const notLookingAtChat =
        activeSection !== "CHAT" ||
        (typeof document !== "undefined" && document.hidden);
      if (notLookingAtChat) {
        playNotificationChime();
      }
    }
  }, [conversations, isRemoteLoaded, isGuest, currentUser.id, activeSection]);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{
    email: string;
    name?: string;
    picture?: string;
  } | null>(null);
  const fallbackApiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const [activeApiUrl, setActiveApiUrl] = useState<string>("");
  const apiUrl = activeApiUrl;

  // Handle Google OAuth redirect (#access_token=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token=")) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    if (!accessToken) return;

    // URL'den token'ı temizle
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );

    fetch(`${activeApiUrl}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    })
      .then((r) => r.json())
      .then(
        (data: {
          ok?: boolean;
          found?: boolean;
          email?: string;
          name?: string;
          picture?: string;
          profile?: UserProfile;
        }) => {
          if (!data?.ok || !data.email) {
            showToast("Google kullanıcı bilgileri alınamadı.");
            return;
          }
          const cleanEmail = data.email.trim().toLowerCase();
          const rawAccs = localStorage.getItem("satir_arasi_accounts_v1");
          const accs: RegisteredAccount[] = rawAccs ? JSON.parse(rawAccs) : [];
          const existingLocal = accs.find((a) => a.email === cleanEmail);
          const resolvedProfile =
            (data.found && data.profile) ||
            existingLocal?.profile ||
            registeredProfiles.find(
              (p) => p.email?.toLowerCase() === cleanEmail
            );

          if (resolvedProfile) {
            const normalizedProfile: UserProfile = {
              ...resolvedProfile,
              email: resolvedProfile.email || cleanEmail,
            };
            if (!existingLocal) {
              const nextAccs = [
                ...accs,
                {
                  id: `acc_g_${Date.now()}`,
                  email: cleanEmail,
                  password: "__google_oauth__",
                  profile: normalizedProfile,
                },
              ];
              localStorage.setItem(
                "satir_arasi_accounts_v1",
                JSON.stringify(nextAccs)
              );
            }
            setCurrentUser(normalizedProfile);
            setCurrentEmail(cleanEmail);
            setIsGuest(false);
            setHasEnteredNickname(true);
            setShowNicknameModal(false);
            setRegisteredProfiles((prev) =>
              mergeProfiles(prev, [normalizedProfile])
            );
            showToast(
              `Google hesabıyla giriş yapıldı (${normalizedProfile.nickname})`
            );
          } else {
            setPendingGoogleUser({
              email: cleanEmail,
              name: data.name,
              picture: data.picture,
            });
            setShowNicknameModal(true);
          }
        }
      )
      .catch(() => {
        showToast("Google kullanıcı bilgileri alınamadı.");
      });
  }, []);

  const remoteHashesRef = useRef<Record<string, string>>({});

  // Load persisted state gradually by section & per-key hashes (avoids downloading everything at once)
  useEffect(() => {
    let targetBase = activeApiUrl;
    let active = true;

    const fetchKeys = async (keys: string[]) => {
      if (
        !active ||
        inFlightSyncsRef.current > 0 ||
        pendingSyncBodyRef.current !== null ||
        Date.now() - lastLocalMutationAtRef.current < 1200
      ) {
        return;
      }
      const startVersion = syncVersionRef.current;
      const hashesParam = keys
        .map((k) => `${k}:${remoteHashesRef.current[k] || ""}`)
        .join(",");
      const qs = `?keys=${encodeURIComponent(
        keys.join(",")
      )}&hashes=${encodeURIComponent(hashesParam)}`;

      try {
        let res = await fetch(`${targetBase}/api/state${qs}`, {
          cache: "no-store",
        });
        if (res.status === 503 && !targetBase && fallbackApiUrl) {
          targetBase = fallbackApiUrl;
          setActiveApiUrl(fallbackApiUrl);
          res = await fetch(`${fallbackApiUrl}/api/state${qs}`, {
            cache: "no-store",
          });
        }
        if (!res.ok || !active) return;
        const remote = await res.json();
        if (
          syncVersionRef.current !== startVersion ||
          inFlightSyncsRef.current > 0 ||
          pendingSyncBodyRef.current !== null ||
          Date.now() - lastLocalMutationAtRef.current < 1200
        ) {
          return;
        }
        if (remote?.hashes && typeof remote.hashes === "object") {
          remoteHashesRef.current = {
            ...remoteHashesRef.current,
            ...remote.hashes,
          };
        }
        if (Array.isArray(remote.posts)) {
          const del = deletedIdsRef.current;
          const cleanedPosts = (remote.posts as Post[])
            .filter((p) => p?.id && !del.has(p.id) && !del.has(p.authorId))
            .map((p) => ({
              ...p,
              comments: (p.comments || []).filter(
                (c) => c?.id && !del.has(c.id) && !del.has(c.userId)
              ),
              highlights: (p.highlights || []).filter(
                (h) => h?.id && !del.has(h.id) && !del.has(h.userId)
              ),
              repostedBy: (p.repostedBy || []).filter(
                (uid) => !del.has(`unrepost:${p.id}:${uid}`) && !del.has(uid)
              ),
            }));
          lastSyncedPerKeyRef.current.posts = JSON.stringify(cleanedPosts);
          setPosts(cleanedPosts);
        }
        if (Array.isArray(remote.playlists)) {
          lastSyncedPerKeyRef.current.playlists = JSON.stringify(
            remote.playlists
          );
          setPlaylists(remote.playlists);
        }
        if (Array.isArray(remote.friendRequests)) {
          const remoteList = remote.friendRequests as FriendRequest[];
          const prevSyncedJson = lastSyncedPerKeyRef.current.friendRequests;
          let prevSyncedIds = new Set<string>();
          if (prevSyncedJson) {
            try {
              const parsed = JSON.parse(prevSyncedJson) as FriendRequest[];
              prevSyncedIds = new Set(parsed.map((r) => r.id));
            } catch {
              // ignore
            }
          }
          lastSyncedPerKeyRef.current.friendRequests = JSON.stringify(remoteList);
          setFriendRequests((prev) => {
            const remoteIds = new Set(remoteList.map((r) => r.id));
            const unsyncedLocal = prev.filter(
              (r) => !remoteIds.has(r.id) && !prevSyncedIds.has(r.id)
            );
            const mergedRemote = remoteList.map((rr) => {
              const localMatch = prev.find((lr) => lr.id === rr.id);
              if (
                localMatch &&
                localMatch.status === "ACCEPTED" &&
                rr.status === "PENDING"
              ) {
                return localMatch;
              }
              return rr;
            });
            return [...unsyncedLocal, ...mergedRemote];
          });
        }
        if (Array.isArray(remote.conversations)) {
          lastSyncedPerKeyRef.current.conversations = JSON.stringify(
            remote.conversations
          );
          setConversations(remote.conversations);
        }
        if (Array.isArray(remote.reports)) {
          lastSyncedPerKeyRef.current.reports = JSON.stringify(remote.reports);
          setReports(remote.reports);
        }
        if (Array.isArray(remote.supportTickets)) {
          lastSyncedPerKeyRef.current.supportTickets = JSON.stringify(
            remote.supportTickets
          );
          setSupportTickets(remote.supportTickets);
        }
        if (
          Array.isArray(remote.registeredProfiles) &&
          remote.registeredProfiles.length > 0
        ) {
          setRegisteredProfiles(() => {
            const cleaned = (remote.registeredProfiles as UserProfile[]).filter(
              (u) => u?.id && !deletedIdsRef.current.has(u.id)
            );
            lastSyncedPerKeyRef.current.registeredProfiles =
              JSON.stringify(cleaned);
            return cleaned;
          });
        }
        if (Array.isArray(remote.adminRequests)) {
          lastSyncedPerKeyRef.current.adminRequests = JSON.stringify(
            remote.adminRequests
          );
          setAdminRequests(remote.adminRequests);
        }
        if (Array.isArray(remote.adminEmails) && remote.adminEmails.length > 0) {
          setAdminEmails(
            Array.from(new Set([ROOT_ADMIN_EMAIL, ...remote.adminEmails]))
          );
        }
        if (
          remote.adminPasswords &&
          typeof remote.adminPasswords === "object" &&
          !Array.isArray(remote.adminPasswords)
        ) {
          setAdminPasswords((prev) => ({ ...prev, ...remote.adminPasswords }));
        }
        if (Array.isArray(remote.adminPasswordChangedEmails)) {
          setAdminPasswordChangedEmails(remote.adminPasswordChangedEmails);
        }
        if (Array.isArray(remote.bannedUserIds)) {
          lastSyncedPerKeyRef.current.bannedUserIds = JSON.stringify(
            remote.bannedUserIds
          );
          setBannedUserIds(remote.bannedUserIds);
        }
        if (Array.isArray(remote.mutedUserIds)) {
          lastSyncedPerKeyRef.current.mutedUserIds = JSON.stringify(
            remote.mutedUserIds
          );
          setMutedUserIds(remote.mutedUserIds);
        }
      } catch {
        // ignore network errors
      } finally {
        setIsRemoteLoaded(true);
      }
    };

    const primaryKeys =
      activeSection === "CHAT"
        ? ["conversations", "friendRequests"]
        : ["posts", "playlists"];
    const secondaryKeys =
      activeSection === "CHAT"
        ? ["posts", "playlists"]
        : ["conversations", "friendRequests"];
    const metaKeys = [
      "registeredProfiles",
      "reports",
      "supportTickets",
      "adminRequests",
      "adminEmails",
      "adminPasswords",
      "adminPasswordChangedEmails",
      "bannedUserIds",
      "mutedUserIds",
    ];

    // Kademeli ilk yükleme: önce aktif sekme verisi, ardından diğer gruplar yavaş yavaş alınır
    fetchKeys(primaryKeys);
    const t1 = setTimeout(() => fetchKeys(secondaryKeys), 650);
    const t2 = setTimeout(() => fetchKeys(metaKeys), 1500);

    let tickCount = 0;
    const secondaryRotation = [
      ["conversations"],
      ["posts"],
      ["playlists"],
      ["friendRequests"],
      ["registeredProfiles"],
      metaKeys,
    ];
    const loadRemote = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      tickCount += 1;
      // Her zaman küçük parça parça çeker: önce aktif sekme anahtarı, aralarda sırayla diğer tekil anahtarlar
      if (tickCount % 2 === 1) {
        fetchKeys([primaryKeys[0]]);
      } else {
        const idx = Math.floor(tickCount / 2) % secondaryRotation.length;
        fetchKeys(secondaryRotation[idx]);
      }
    };
    const intervalMs = activeSection === "CHAT" ? 12000 : 18000;
    const interval = setInterval(loadRemote, intervalMs);
    const onFocus = () => fetchKeys([...primaryKeys, ...secondaryKeys]);
    window.addEventListener("focus", onFocus);

    let es: EventSource | null = null;
    if (typeof window !== "undefined" && typeof EventSource !== "undefined") {
      try {
        es = new EventSource(`${apiUrl}/api/events`);
        es.addEventListener("sync", (ev) => {
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              keys?: string[];
            };
            if (Array.isArray(payload.keys) && payload.keys.length > 0) {
              fetchKeys(payload.keys);
            }
          } catch {
            // ignore
          }
        });
        es.addEventListener("room", (ev) => {
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              convId?: string;
            };
            window.dispatchEvent(
              new CustomEvent("satir_arasi_sse_room", {
                detail: { convId: payload.convId || "" },
              })
            );
          } catch {
            // ignore
          }
        });
        es.addEventListener("typing", (ev) => {
          try {
            const payload = JSON.parse((ev as MessageEvent).data) as {
              convId?: string;
              userId?: string;
              nickname?: string;
              ts?: number;
            };
            window.dispatchEvent(
              new CustomEvent("satir_arasi_sse_typing", { detail: payload })
            );
          } catch {
            // ignore
          }
        });
      } catch {
        // ignore SSE init errors
      }
    }

    return () => {
      active = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      if (es) es.close();
    };
  }, [activeApiUrl, fallbackApiUrl, activeSection]);

  // Ultra-fast 250ms dedicated per-conversation Listening Room sync (arka plandayken yalnızca odaya katılımlıysa yavaşlar)
  useEffect(() => {
    const viewConvId =
      activeSection === "CHAT" ? activeConversationId : null;
    const targetIds = Array.from(
      new Set([joinedRoomConvId, viewConvId].filter((x): x is string => Boolean(x)))
    );
    if (!isRemoteLoaded || targetIds.length === 0) {
      return;
    }
    const fetchOneRoom = async (cid: string) => {
      if (Date.now() - (lastRoomMutationAtByConvRef.current[cid] || 0) < 400) {
        return;
      }
      try {
        const rv = lastRoomVersionByConvRef.current[cid] || "";
        const res = await fetch(
          `${apiUrl}/api/room?convId=${encodeURIComponent(cid)}${
            rv ? `&v=${encodeURIComponent(rv)}` : ""
          }`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.serverNow === "number") {
          const offset = data.serverNow - Date.now();
          roomClockOffsetRef.current = offset;
          setRoomClockOffsetMs(offset);
        }
        if (data?.unchanged) return;
        if (typeof data?.v === "string") {
          lastRoomVersionByConvRef.current[cid] = data.v;
        }
        if (Date.now() - (lastRoomMutationAtByConvRef.current[cid] || 0) < 400) {
          return;
        }
        if (data?.listeningRoom && typeof data.listeningRoom === "object") {
          const serialized = JSON.stringify(data.listeningRoom);
          if (serialized !== lastRoomJsonByConvRef.current[cid]) {
            lastRoomJsonByConvRef.current[cid] = serialized;
            setRoomsByConv((prev) => ({
              ...prev,
              [cid]: data.listeningRoom as ListeningRoomState,
            }));
          }
        }
      } catch {
        // ignore
      }
    };
    let lastBgPoll = 0;
    const pollRoom = async () => {
      if (typeof document !== "undefined" && document.hidden) {
        if (!joinedRoomConvId) return;
        if (Date.now() - lastBgPoll < 2000) return;
        lastBgPoll = Date.now();
      }
      await Promise.all(targetIds.map(fetchOneRoom));
    };
    pollRoom();
    const onSseRoom = (ev: Event) => {
      const cid = (ev as CustomEvent<{ convId?: string }>).detail?.convId;
      if (cid && targetIds.includes(cid)) {
        fetchOneRoom(cid);
      }
    };
    window.addEventListener("satir_arasi_sse_room", onSseRoom);
    const roomPollMs = effectiveJoinedRoomConvId ? 8000 : 12000;
    const t = setInterval(pollRoom, roomPollMs);
    return () => {
      clearInterval(t);
      window.removeEventListener("satir_arasi_sse_room", onSseRoom);
    };
  }, [isRemoteLoaded, effectiveJoinedRoomConvId, joinedRoomConvId, activeConversationId, activeSection, apiUrl]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("satir_arasi_state_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentUser) setCurrentUser(parsed.currentUser);
        if (parsed.currentEmail !== undefined)
          setCurrentEmail(parsed.currentEmail);
        if (typeof parsed.hasEnteredNickname === "boolean") {
          setHasEnteredNickname(parsed.hasEnteredNickname);
          if (parsed.hasEnteredNickname) {
            setIsGuest(false);
            setShowNicknameModal(false);
          }
        }
        if (parsed.feedBackgroundUrl !== undefined)
          setFeedBackgroundUrl(parsed.feedBackgroundUrl);
        if (parsed.feedBgDim !== undefined) setFeedBgDim(parsed.feedBgDim);
        if (typeof parsed.volume === "number") setVolume(parsed.volume);
        if (parsed.journalLock !== undefined) {
          setJournalLock(parsed.journalLock);
          if (parsed.journalLock.type !== "NONE") setIsJournalUnlocked(false);
        }
        if (parsed.supportTickets) setSupportTickets(parsed.supportTickets);
        if (parsed.reports) setReports(parsed.reports);
        if (parsed.adminEmails) setAdminEmails(parsed.adminEmails);
        if (parsed.adminPasswords) setAdminPasswords(parsed.adminPasswords);
        if (parsed.adminPasswordChangedEmails)
          setAdminPasswordChangedEmails(parsed.adminPasswordChangedEmails);
        if (parsed.adminRequests) setAdminRequests(parsed.adminRequests);
        if (parsed.privateNotes) {
          setPrivateNotes(
            (parsed.privateNotes as PrivateNote[]).filter(
              (n) => n.id !== "pn_1" && n.id !== "pn_2"
            )
          );
        }
        if (parsed.savedPostIds) {
          setSavedPostIds(
            (parsed.savedPostIds as string[]).filter(
              (id) => id !== "p_1" && id !== "p_2" && id !== "p_3"
            )
          );
        }
        if (parsed.friendIds) setFriendIds(parsed.friendIds);
        if (parsed.closeFriendIds) setCloseFriendIds(parsed.closeFriendIds);
        if (parsed.friendRequests) setFriendRequests(parsed.friendRequests);
        if (parsed.posts) {
          setPosts(
            (parsed.posts as Post[]).filter(
              (p) => p.id !== "p_1" && p.id !== "p_2" && p.id !== "p_3"
            )
          );
        }
        if (parsed.playlists) setPlaylists(parsed.playlists);
        if (parsed.conversations) {
          setConversations(
            (parsed.conversations as Conversation[]).filter(
              (c) => c.id !== "conv_1"
            )
          );
        }
      }
      const accRaw = localStorage.getItem("satir_arasi_accounts_v1");
      if (accRaw) {
        const accs: RegisteredAccount[] = JSON.parse(accRaw);
        setRegisteredProfiles((prev) =>
          mergeProfiles(
            prev,
            accs.map((a) => a.profile)
          )
        );
      }
    } catch {
      // ignore storage errors
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Persist key user state ONLY after initial hydration
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        "satir_arasi_state_v1",
        JSON.stringify({
          currentUser,
          currentEmail,
          hasEnteredNickname,
          feedBackgroundUrl,
          feedBgDim,
          volume,
          journalLock,
          supportTickets,
          reports,
          adminEmails,
          adminPasswords,
          adminPasswordChangedEmails,
          adminRequests,
          privateNotes,
          savedPostIds,
          friendIds,
          closeFriendIds,
          friendRequests,
          posts,
          playlists,
          conversations,
        })
      );
    } catch {
      // ignore quota errors
    }

    if (isRemoteLoaded) {
      const keyMap: Record<string, unknown> = {
        posts,
        playlists,
        friendRequests,
        conversations,
        reports,
        supportTickets,
        registeredProfiles,
        adminRequests,
        bannedUserIds,
        mutedUserIds,
      };
      const deltaBody: Record<string, unknown> = {};
      let hasDataDelta = false;
      for (const [k, val] of Object.entries(keyMap)) {
        const serialized = JSON.stringify(val);
        if (lastSyncedPerKeyRef.current[k] !== serialized) {
          lastSyncedPerKeyRef.current[k] = serialized;
          deltaBody[k] = val;
          hasDataDelta = true;
        }
      }

      const isCurrentlyAdmin = Boolean(
        currentEmail &&
          adminEmails.includes(currentEmail.trim().toLowerCase())
      );
      const adminSnapshot =
        isCurrentlyAdmin && isAdminVerified
          ? JSON.stringify({
              adminEmails,
              adminPasswords,
              adminPasswordChangedEmails,
            })
          : "";
      const adminChanged =
        Boolean(adminSnapshot) && adminSnapshot !== lastAdminJsonRef.current;

      if (hasDataDelta || adminChanged) {
        if (adminChanged) {
          lastAdminJsonRef.current = adminSnapshot;
        }
        syncVersionRef.current += 1;
        lastLocalMutationAtRef.current = Date.now();
        const payload = JSON.stringify({
          ...deltaBody,
          ...(deletedIdsRef.current.size > 0
            ? { deletedIds: Array.from(deletedIdsRef.current) }
            : {}),
          ...(isCurrentlyAdmin && isAdminVerified && adminChanged
            ? {
                adminEmails,
                adminPasswords,
                adminPasswordChangedEmails,
              }
            : {}),
        });

        const sendNext = (bodyStr: string) => {
          inFlightSyncsRef.current += 1;
          fetch(`${apiUrl}/api/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: bodyStr,
          })
            .catch(() => {})
            .finally(() => {
              inFlightSyncsRef.current = Math.max(0, inFlightSyncsRef.current - 1);
              lastLocalMutationAtRef.current = Date.now();
              if (pendingSyncBodyRef.current !== null && inFlightSyncsRef.current === 0) {
                const queued = pendingSyncBodyRef.current;
                pendingSyncBodyRef.current = null;
                sendNext(queued);
              }
            });
        };

        if (inFlightSyncsRef.current > 0) {
          pendingSyncBodyRef.current = payload;
        } else {
          sendNext(payload);
        }
      }
    }
  }, [
    isHydrated,
    isRemoteLoaded,
    isAdminVerified,
    apiUrl,
    currentUser,
    currentEmail,
    hasEnteredNickname,
    feedBackgroundUrl,
    feedBgDim,
    volume,
    journalLock,
    supportTickets,
    reports,
    adminEmails,
    adminPasswords,
    adminPasswordChangedEmails,
    adminRequests,
    privateNotes,
    savedPostIds,
    friendIds,
    closeFriendIds,
    friendRequests,
    posts,
    playlists,
    conversations,
  ]);

  const knownUserIds = new Set<string>([
    currentUser.id,
    ...registeredProfiles.map((u) => u.id),
  ]);
  const postDerivedProfiles: UserProfile[] = [];
  for (const p of posts) {
    if (!knownUserIds.has(p.authorId) && p.authorNickname) {
      knownUserIds.add(p.authorId);
      postDerivedProfiles.push({
        id: p.authorId,
        nickname: p.authorNickname,
        username: p.authorUsername || "kullanici",
        avatarUrl: p.authorAvatarUrl,
        bio: "",
        currentMood: "#gece-yarısı",
      });
    }
    for (const c of p.comments || []) {
      if (!knownUserIds.has(c.userId) && c.nickname) {
        knownUserIds.add(c.userId);
        postDerivedProfiles.push({
          id: c.userId,
          nickname: c.nickname,
          username: c.nickname.toLowerCase().replace(/[^a-z0-9ğüşıöç]+/g, "_") || "kullanici",
          avatarUrl: c.avatarUrl,
          bio: "",
          currentMood: "#gece-yarısı",
        });
      }
    }
  }
  for (const req of friendRequests) {
    if (!knownUserIds.has(req.fromUserId) && req.fromNickname) {
      knownUserIds.add(req.fromUserId);
      postDerivedProfiles.push({
        id: req.fromUserId,
        nickname: req.fromNickname,
        username: req.fromNickname.toLowerCase().replace(/[^a-z0-9ğüşıöç]+/g, "_") || "kullanici",
        bio: "",
        currentMood: "#gece-yarısı",
      });
    }
  }
  for (const t of supportTickets) {
    if (!knownUserIds.has(t.userId) && t.nickname) {
      knownUserIds.add(t.userId);
      postDerivedProfiles.push({
        id: t.userId,
        email: t.email,
        nickname: t.nickname,
        username: t.nickname.toLowerCase().replace(/[^a-z0-9ğüşıöç]+/g, "_") || "kullanici",
        bio: "",
        currentMood: "#gece-yarısı",
      });
    }
  }

  const users = [
    currentUser,
    ...registeredProfiles.filter((u) => u.id !== currentUser.id),
    ...postDerivedProfiles,
  ];

  useEffect(() => {
    if (!isHydrated || isGuest || !hasEnteredNickname || currentUser.id === "u_me") {
      return;
    }
    setRegisteredProfiles((prev) => {
      const existing = prev.find((u) => u.id === currentUser.id);
      if (
        existing &&
        existing.nickname === currentUser.nickname &&
        existing.username === currentUser.username &&
        existing.avatarUrl === currentUser.avatarUrl &&
        existing.email === (currentEmail || existing.email)
      ) {
        return prev;
      }
      return mergeProfiles(prev, [
        { ...currentUser, email: currentUser.email || currentEmail || undefined },
      ]);
    });
  }, [isHydrated, isGuest, hasEnteredNickname, currentUser, currentEmail]);

  const enterAsGuest = () => {
    setIsGuest(true);
    setShowNicknameModal(false);
  };

  const getStoredAccounts = (): RegisteredAccount[] => {
    try {
      const raw = localStorage.getItem("satir_arasi_accounts_v1");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const registerAccount = (
    email: string,
    password: string,
    nickname: string
  ): { ok: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanNick = nickname.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { ok: false, error: "Geçerli bir e-posta adresi gir." };
    }
    if (password.length < 4) {
      return { ok: false, error: "Şifre en az 4 karakter olmalı." };
    }
    if (!cleanNick) {
      return { ok: false, error: "Görünecek bir nickname belirlemelisin." };
    }

    const accounts = getStoredAccounts();
    if (accounts.some((a) => a.email === cleanEmail)) {
      return { ok: false, error: "Bu e-posta ile zaten bir hesap var." };
    }

    const uid = `u_${Date.now()}`;
    const newProfile: UserProfile = {
      ...DEFAULT_CURRENT_USER,
      id: uid,
      email: cleanEmail,
      nickname: cleanNick,
      username:
        cleanNick
          .toLowerCase()
          .replace(/[^a-z0-9ğüşıöç]+/g, "_")
          .replace(/^_|_$/g, "") || "persona",
    };

    const updatedAccounts: RegisteredAccount[] = [
      ...accounts,
      { id: `acc_${Date.now()}`, email: cleanEmail, password, profile: newProfile },
    ];
    localStorage.setItem(
      "satir_arasi_accounts_v1",
      JSON.stringify(updatedAccounts)
    );
    setRegisteredProfiles((prev) => mergeProfiles(prev, [newProfile]));
    fetch(`${apiUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password, profile: newProfile }),
    }).catch(() => {});

    setCurrentUser(newProfile);
    setCurrentEmail(cleanEmail);
    setIsGuest(false);
    setHasEnteredNickname(true);
    setShowNicknameModal(false);
    showToast(`Kayıt tamamlandı! Hoş geldin, ${cleanNick}.`);
    return { ok: true };
  };

  const loginAccount = (
    email: string,
    password: string
  ): { ok: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const accounts = getStoredAccounts();
    const found = accounts.find(
      (a) => a.email === cleanEmail && a.password === password
    );
    if (!found) {
      return { ok: false, error: "E-posta veya şifre hatalı." };
    }
    setCurrentUser(found.profile);
    setCurrentEmail(found.email);
    setIsGuest(false);
    setHasEnteredNickname(true);
    setShowNicknameModal(false);
    showToast(`Tekrar hoş geldin, ${found.profile.nickname}!`);
    return { ok: true };
  };

  const hasGoogleAccount = (email: string): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    return getStoredAccounts().some((a) => a.email === cleanEmail);
  };

  const loginWithGoogle = (
    email: string,
    nickname: string,
    picture?: string
  ): { ok: boolean; error?: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanNick = nickname.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { ok: false, error: "Geçerli bir Google e-posta adresi gir." };
    }

    const accounts = getStoredAccounts();
    const existingLocal = accounts.find((a) => a.email === cleanEmail);
    const existingRemote = registeredProfiles.find(
      (p) => p.email?.toLowerCase() === cleanEmail
    );
    const existingProfile = existingLocal?.profile || existingRemote;
    if (!existingProfile && !cleanNick) {
      return { ok: false, error: "Google hesabın için görünecek bir nickname gir." };
    }

    const profileToUse: UserProfile = existingProfile
      ? { ...existingProfile, email: existingProfile.email || cleanEmail }
      : {
          ...DEFAULT_CURRENT_USER,
          id: `u_${Date.now()}`,
          email: cleanEmail,
          nickname: cleanNick,
          avatarUrl: picture || undefined,
          username:
            cleanNick
              .toLowerCase()
              .replace(/[^a-z0-9ğüşıöç]+/g, "_")
              .replace(/^_|_$/g, "") || "persona",
        };

    if (!existingLocal) {
      const nextAccs = [
        ...accounts,
        {
          id: `acc_g_${Date.now()}`,
          email: cleanEmail,
          password: "__google_oauth__",
          profile: profileToUse,
        },
      ];
      localStorage.setItem("satir_arasi_accounts_v1", JSON.stringify(nextAccs));
      fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password: "__google_oauth__",
          profile: profileToUse,
        }),
      })
        .then((r) => r.json())
        .then((data: { ok?: boolean; existing?: boolean; account?: { profile?: UserProfile } }) => {
          if (data?.existing && data.account?.profile?.id) {
            const existingP = {
              ...data.account.profile,
              email: data.account.profile.email || cleanEmail,
            };
            setCurrentUser(existingP);
            setRegisteredProfiles((prev) => mergeProfiles(prev, [existingP]));
            const latest = getStoredAccounts().map((a) =>
              a.email === cleanEmail ? { ...a, profile: existingP } : a
            );
            localStorage.setItem("satir_arasi_accounts_v1", JSON.stringify(latest));
          }
        })
        .catch(() => {});
    }
    setRegisteredProfiles((prev) => mergeProfiles(prev, [profileToUse]));

    setCurrentUser(profileToUse);
    setCurrentEmail(cleanEmail);
    setIsGuest(false);
    setHasEnteredNickname(true);
    setShowNicknameModal(false);
    showToast(`Google hesabıyla giriş yapıldı (${profileToUse.nickname})`);
    return { ok: true };
  };

  const logout = () => {
    setIsGuest(true);
    setHasEnteredNickname(false);
    setCurrentEmail(null);
    setIsAdminVerified(false);
    setCurrentUser(DEFAULT_CURRENT_USER);
    setActiveSection("FEED");
    setDrawerOpen(false);
    setShowNicknameModal(true);
    showToast("Çıkış yapıldı.");
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const updateCurrentUser = (patch: Partial<UserProfile>) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...patch };
      try {
        const accounts = getStoredAccounts();
        const nextAccs = accounts.map((a) =>
          a.email === currentEmail || a.profile.id === prev.id
            ? { ...a, profile: updated }
            : a
        );
        localStorage.setItem("satir_arasi_accounts_v1", JSON.stringify(nextAccs));
        setRegisteredProfiles((prev2) => mergeProfiles(prev2, [updated]));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const patternsEqual = (a?: number[], b?: number[]) => {
    if (!a || !b || a.length !== b.length) return false;
    return a.every((v, i) => v === b[i]);
  };

  const unlockJournal = (pin?: string, pattern?: number[]) => {
    if (journalLock.type === "NONE") {
      setIsJournalUnlocked(true);
      return true;
    }
    if (journalLock.type === "PIN") {
      const ok = pin === journalLock.pin;
      if (ok) setIsJournalUnlocked(true);
      return ok;
    }
    if (journalLock.type === "PATTERN") {
      const ok = patternsEqual(pattern, journalLock.pattern);
      if (ok) setIsJournalUnlocked(true);
      return ok;
    }
    if (journalLock.type === "BOTH") {
      const ok =
        pin === journalLock.pin &&
        patternsEqual(pattern, journalLock.pattern);
      if (ok) setIsJournalUnlocked(true);
      return ok;
    }
    return false;
  };

  const lockJournal = () => {
    if (journalLock.type !== "NONE") setIsJournalUnlocked(false);
  };

  const updateJournalLock = (
    nextConfig: JournalLockConfig,
    oldPin?: string,
    oldPattern?: number[]
  ): { ok: boolean; error?: string } => {
    // Mevcut kilit varsa önce doğrula
    if (journalLock.type !== "NONE") {
      if (
        (journalLock.type === "PIN" || journalLock.type === "BOTH") &&
        oldPin !== journalLock.pin
      ) {
        return { ok: false, error: "Mevcut şifre (PIN) hatalı." };
      }
      if (
        (journalLock.type === "PATTERN" || journalLock.type === "BOTH") &&
        !patternsEqual(oldPattern, journalLock.pattern)
      ) {
        return { ok: false, error: "Mevcut desen hatalı." };
      }
    }

    if (
      (nextConfig.type === "PIN" || nextConfig.type === "BOTH") &&
      (!nextConfig.pin || nextConfig.pin.length < 4)
    ) {
      return { ok: false, error: "Yeni şifre en az 4 karakter olmalı." };
    }
    if (
      (nextConfig.type === "PATTERN" || nextConfig.type === "BOTH") &&
      (!nextConfig.pattern || nextConfig.pattern.length < 3)
    ) {
      return { ok: false, error: "Desen için en az 3 nokta birleştirmelisin." };
    }

    setJournalLock(nextConfig);
    setIsJournalUnlocked(true);
    showToast(
      nextConfig.type === "NONE"
        ? "Günlük & Düşüncelerim kilidi kaldırıldı."
        : "Günlük & Düşüncelerim güvenlik kilidi güncellendi!"
    );
    return { ok: true };
  };

  const createSupportTicket = (
    reason: string,
    category: "JOURNAL_RESET" | "GENERAL" = "JOURNAL_RESET"
  ) => {
    const ticket: SupportTicket = {
      id: `tkt_${Date.now()}`,
      userId: currentUser.id,
      nickname: currentUser.nickname,
      email: currentEmail || undefined,
      category,
      reason: reason.trim() || "Günlük şifre/desen sıfırlama talebi",
      status: "OPEN",
      createdAt: "Az önce",
    };
    setSupportTickets((prev) => [ticket, ...prev]);
    showToast("Destek talebi (Ticket) oluşturuldu!");
  };

  useEffect(() => {
    if (!isHydrated || isGuest) return;
    try {
      const appliedRaw = localStorage.getItem("satir_arasi_applied_tickets_v1");
      const appliedIds: string[] = appliedRaw ? JSON.parse(appliedRaw) : [];
      const matching = supportTickets.find(
        (t) =>
          t.status === "RESOLVED" &&
          t.newJournalPin &&
          !appliedIds.includes(t.id) &&
          (t.userId === currentUser.id ||
            (currentEmail &&
              t.email &&
              t.email.toLowerCase() === currentEmail.toLowerCase()))
      );
      if (!matching) return;
      if (matching.newJournalPin === "__RESET__") {
        setJournalLock({ type: "NONE" });
        setIsJournalUnlocked(true);
        showToast("Yetkili günlük/düşünceler kilidini sıfırladı!");
      } else if (matching.newJournalPin) {
        setJournalLock({ type: "PIN", pin: matching.newJournalPin });
        setIsJournalUnlocked(false);
        showToast("Yetkili günlük/düşünceler şifreni güncelledi!");
      }
      localStorage.setItem(
        "satir_arasi_applied_tickets_v1",
        JSON.stringify([...appliedIds, matching.id])
      );
    } catch {
      // ignore
    }
  }, [supportTickets, currentUser.id, currentEmail, isHydrated, isGuest]);

  const currentEmailLower = currentEmail ? currentEmail.toLowerCase() : "";
  const isFounder = currentEmailLower === ROOT_ADMIN_EMAIL;
  const isAdmin = Boolean(
    currentEmailLower && adminEmails.includes(currentEmailLower)
  );
  const isAdminPasswordChanged = Boolean(
    currentEmailLower && adminPasswordChangedEmails.includes(currentEmailLower)
  );
  const adminInitialPasswordHint =
    !isAdminPasswordChanged && isAdmin && currentEmailLower
      ? adminPasswords[currentEmailLower] ?? "WhiteSavic2026"
      : null;

  const verifyAdminPassword = (pwd: string): boolean => {
    if (!currentEmailLower) return false;
    const expected = adminPasswords[currentEmailLower] ?? "WhiteSavic2026";
    if (pwd === expected) {
      setIsAdminVerified(true);
      showToast("Yetkili doğrulaması başarılı!");
      return true;
    }
    return false;
  };

  const lockAdminPanel = () => {
    setIsAdminVerified(false);
  };

  const addAdminEmail = (
    email: string,
    initialPassword: string
  ): { ok: boolean; error?: string } => {
    if (!isAdmin || !isAdminVerified) {
      return { ok: false, error: "Yetkili doğrulaması gerekli." };
    }
    const clean = email.trim().toLowerCase();
    const cleanPwd = initialPassword.trim();
    if (!clean || !clean.includes("@")) {
      return { ok: false, error: "Geçerli bir e-posta adresi gir." };
    }
    if (cleanPwd.length < 4) {
      return {
        ok: false,
        error: "Yeni yetkili için en az 4 karakterlik bir varsayılan şifre belirle.",
      };
    }
    if (adminEmails.includes(clean)) {
      return { ok: false, error: "Bu hesap zaten yetkili." };
    }

    if (isFounder) {
      setAdminEmails((prev) => [...prev, clean]);
      setAdminPasswords((prev) => ({ ...prev, [clean]: cleanPwd }));
      showToast(`${clean} artık yetkili!`);
      return { ok: true };
    }

    // Kurucu dışındaki yetkililer istek gönderir; kurucu onaylar
    const alreadyRequested = adminRequests.some(
      (r) => r.status === "PENDING" && r.targetEmail === clean
    );
    if (alreadyRequested) {
      return {
        ok: false,
        error: "Bu e-posta için zaten kurucu onayı bekleyen bir istek var.",
      };
    }

    const newReq: AdminRequest = {
      id: `adm_req_${Date.now()}`,
      targetEmail: clean,
      initialPassword: cleanPwd,
      requestedByEmail: currentEmailLower,
      requestedByNickname: currentUser.nickname,
      status: "PENDING",
      createdAt: "Az önce",
    };
    setAdminRequests((prev) => [newReq, ...prev]);
    showToast("Yetkili ekleme isteği kurucuya (WhiteSavic) gönderildi!");
    return { ok: true };
  };

  const approveAdminRequest = (reqId: string) => {
    if (!isFounder || !isAdminVerified) {
      showToast("Sadece kurucu yetkili isteklerini onaylayabilir.");
      return;
    }
    const req = adminRequests.find((r) => r.id === reqId);
    if (!req) return;
    setAdminRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "APPROVED" } : r))
    );
    setAdminEmails((prev) =>
      prev.includes(req.targetEmail) ? prev : [...prev, req.targetEmail]
    );
    setAdminPasswords((prev) => ({
      ...prev,
      [req.targetEmail]: req.initialPassword,
    }));
    showToast(`${req.targetEmail} yetkili olarak onaylandı!`);
  };

  const rejectAdminRequest = (reqId: string) => {
    if (!isFounder || !isAdminVerified) return;
    setAdminRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: "REJECTED" } : r))
    );
    showToast("Yetkili ekleme isteği reddedildi.");
  };

  const removeAdminEmail = (email: string) => {
    if (!isAdmin || !isAdminVerified) return;
    if (email.toLowerCase() === ROOT_ADMIN_EMAIL) {
      showToast("Ana kurucu yetkisi (WhiteSavic) kaldırılamaz.");
      return;
    }
    setAdminEmails((prev) => prev.filter((e) => e !== email.toLowerCase()));
    showToast(`${email} yetkisi kaldırıldı.`);
  };

  const changeAdminPassword = (
    oldPwd: string,
    newPwd: string
  ): { ok: boolean; error?: string } => {
    if (!currentEmailLower) {
      return { ok: false, error: "Oturum bulunamadı." };
    }
    const expected = adminPasswords[currentEmailLower] ?? "WhiteSavic2026";
    if (oldPwd !== expected) {
      return { ok: false, error: "Mevcut yetkili şifresi hatalı." };
    }
    if (newPwd.trim().length < 4) {
      return { ok: false, error: "Yeni yetkili şifresi en az 4 karakter olmalı." };
    }
    setAdminPasswords((prev) => ({
      ...prev,
      [currentEmailLower]: newPwd.trim(),
    }));
    setAdminPasswordChangedEmails((prev) =>
      prev.includes(currentEmailLower) ? prev : [...prev, currentEmailLower]
    );
    showToast("Yetkili şifresi güncellendi!");
    return { ok: true };
  };

  const adminResetJournalLock = (
    ticketId: string,
    newPin?: string,
    adminNote?: string
  ) => {
    if (!isAdmin || !isAdminVerified) {
      showToast("Bu işlem için yetkili şifresi doğrulaması gerekir.");
      return;
    }
    const targetTicket = supportTickets.find((t) => t.id === ticketId);
    const cleanPin = newPin?.trim();
    const isJournalReset =
      !targetTicket?.category || targetTicket.category === "JOURNAL_RESET";

    setSupportTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: "RESOLVED",
              newJournalPin: cleanPin
                ? cleanPin
                : isJournalReset
                ? "__RESET__"
                : undefined,
              adminNote: adminNote?.trim() || t.adminNote,
            }
          : t
      )
    );
    showToast(
      cleanPin
        ? `Hesap için yeni şifre (${cleanPin}) ayarlandı!`
        : isJournalReset
        ? "Günlük kilidi sıfırlandı (kullanıcıda otomatik güncellenecek)."
        : "Destek talebi çözüldü olarak işaretlendi."
    );
  };

  const submitReport = (
    targetType: "POST" | "USER" | "COMMENT",
    targetId: string,
    targetLabel: string,
    reason: string
  ) => {
    if (!requireAuthAction()) return;
    const cooldownKey = `${currentUser.id}:${targetType}:${targetId}`;
    const alreadyOpen = reports.some(
      (r) =>
        r.status === "OPEN" &&
        r.reporterId === currentUser.id &&
        r.targetType === targetType &&
        r.targetId === targetId
    );
    if (alreadyOpen) {
      showToast("Bu içeriği veya hesabı zaten bildirdin (inceleniyor).");
      return;
    }
    try {
      const raw = localStorage.getItem("satir_arasi_report_cooldowns_v1");
      const map: Record<string, number> = raw ? JSON.parse(raw) : {};
      const lastAt = map[cooldownKey] || 0;
      const diffMs = Date.now() - lastAt;
      if (diffMs < 5 * 60 * 1000) {
        const remSec = Math.ceil((5 * 60 * 1000 - diffMs) / 1000);
        showToast(
          `Aynı şeyi tekrar bildirmek için ${remSec} sn beklemelisin.`
        );
        return;
      }
      map[cooldownKey] = Date.now();
      localStorage.setItem(
        "satir_arasi_report_cooldowns_v1",
        JSON.stringify(map)
      );
    } catch {
      // ignore
    }
    const newRep: ReportItem = {
      id: `rep_${Date.now()}`,
      targetType,
      targetId,
      targetLabel,
      reporterId: currentUser.id,
      reporterNickname: currentUser.nickname,
      reason: reason.trim() || "Uygunsuz içerik",
      status: "OPEN",
      createdAt: "Az önce",
    };
    setReports((prev) => [newRep, ...prev]);
    showToast("Bildirimin yetkililere iletildi.");
  };

  const resolveReport = (reportId: string) => {
    if (!isAdmin || !isAdminVerified) return;
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: "RESOLVED" } : r))
    );
    showToast("Bildirim çözüldü olarak işaretlendi.");
  };

  const adminDeletePost = (postId: string) => {
    if (!isAdmin || !isAdminVerified) return;
    markDeletedId(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    showToast("Paylaşım yetkili tarafından kaldırıldı.");
  };

  const adminDeleteComment = (postId: string, commentId: string) => {
    if (!isAdmin || !isAdminVerified) return;
    markDeletedId(commentId);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.filter((c) => c.id !== commentId) }
          : p
      )
    );
    showToast("Yorum yetkili tarafından silindi.");
  };

  const adminBanUser = (userId: string) => {
    if (!isAdmin || !isAdminVerified) return;
    if (userId === currentUser.id) return;
    setBannedUserIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId]
    );
    showToast("Kullanıcı yasaklandı.");
  };

  const adminUnbanUser = (userId: string) => {
    if (!isAdmin || !isAdminVerified) return;
    setBannedUserIds((prev) => prev.filter((id) => id !== userId));
    showToast("Kullanıcı yasağı kaldırıldı.");
  };

  const adminMuteUser = (userId: string) => {
    if (!isAdmin || !isAdminVerified) return;
    if (userId === currentUser.id) return;
    setMutedUserIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId]
    );
    showToast("Kullanıcı susturuldu.");
  };

  const adminUnmuteUser = (userId: string) => {
    if (!isAdmin || !isAdminVerified) return;
    setMutedUserIds((prev) => prev.filter((id) => id !== userId));
    showToast("Kullanıcı susturması kaldırıldı.");
  };

  const adminDeleteUser = (userId: string) => {
    if (!isAdmin || !isAdminVerified) return;
    if (userId === currentUser.id) return;
    markDeletedId(userId);
    posts.forEach((p) => {
      if (p.authorId === userId) markDeletedId(p.id);
      (p.comments || []).forEach((c) => {
        if (c.userId === userId) markDeletedId(c.id);
      });
    });
    conversations.forEach((c) => {
      if (!c.isGroup && (c.initiatorId === userId || c.peerId === userId)) {
        markDeletedId(c.id);
      }
    });
    setRegisteredProfiles((prev) => prev.filter((p) => p.id !== userId));
    setPosts((prev) =>
      prev
        .filter((p) => p.authorId !== userId)
        .map((p) => ({
          ...p,
          comments: (p.comments || []).filter((c) => c.userId !== userId),
        }))
    );
    setConversations((prev) =>
      prev.filter(
        (c) => c.isGroup || (c.initiatorId !== userId && c.peerId !== userId)
      )
    );
    setFriendRequests((prev) =>
      prev.filter((r) => r.fromUserId !== userId && r.toUserId !== userId)
    );
    setBannedUserIds((prev) =>
      prev.includes(userId) ? prev : [...prev, userId]
    );
    try {
      const nextAccs = getStoredAccounts().filter(
        (a) => a.profile?.id !== userId
      );
      localStorage.setItem("satir_arasi_accounts_v1", JSON.stringify(nextAccs));
    } catch {
      // ignore
    }
    showToast("Hesap ve tüm içerikleri kalıcı olarak silindi.");
  };

  const addPrivateNote = (note: Omit<PrivateNote, "id" | "createdAt">) => {
    const newNote: PrivateNote = {
      ...note,
      id: `pn_${Date.now()}`,
      createdAt: "Az önce",
    };
    setPrivateNotes((prev) => [newNote, ...prev]);
    showToast(
      note.section === "JOURNAL"
        ? "Günlük kaydın şifreli kasana eklendi."
        : "Düşüncen özel notlarına kaydedildi."
    );
  };

  const deletePrivateNote = (id: string) => {
    setPrivateNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const requireAuthAction = (): boolean => {
    if (isGuest && !hasEnteredNickname) {
      setShowNicknameModal(true);
      showToast("Bu işlem için önce bir nickname belirlemelisin.");
      return false;
    }
    return true;
  };

  const sendFriendRequest = (userId: string) => {
    if (!requireAuthAction()) return;
    if (effectiveFriendIds.includes(userId)) {
      showToast("Bu kişiyle zaten arkadaşsınız.");
      return;
    }
    const alreadyPending = friendRequests.some(
      (r) =>
        r.status === "PENDING" &&
        r.fromUserId === currentUser.id &&
        r.toUserId === userId
    );
    if (alreadyPending) {
      showToast("Zaten bekleyen bir arkadaşlık isteğin var.");
      return;
    }
    const req: FriendRequest = {
      id: `freq_${Date.now()}`,
      fromUserId: currentUser.id,
      fromNickname: currentUser.nickname,
      toUserId: userId,
      status: "PENDING",
      createdAt: "Az önce",
    };
    setFriendRequests((prev) => {
      const next = [req, ...prev];
      const apiBase = activeApiUrl || fallbackApiUrl || "";
      fetch(`${apiBase}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendRequests: next }),
      }).catch(() => {});
      return next;
    });
    const target = users.find((u) => u.id === userId);
    setNotifications((prev) => [
      {
        id: `n_fr_${Date.now()}`,
        title: "Arkadaşlık İsteği Gönderildi",
        body: `${target?.nickname || "Kullanıcı"} adlı kişiye arkadaşlık isteği gönderildi.`,
        read: false,
        createdAt: "Az önce",
        targetSection: "DISCOVER",
      },
      ...prev,
    ]);
    showToast("Arkadaşlık isteği gönderildi! Kabul edince arkadaş olacaksınız.");
  };

  const cancelFriendRequest = (userId: string) => {
    const pending = friendRequests.filter(
      (r) =>
        r.fromUserId === currentUser.id &&
        r.toUserId === userId &&
        r.status === "PENDING"
    );
    pending.forEach((r) => markDeletedId(r.id));
    setFriendRequests((prev) =>
      prev.filter(
        (r) =>
          !(
            r.fromUserId === currentUser.id &&
            r.toUserId === userId &&
            r.status === "PENDING"
          )
      )
    );
    showToast("Arkadaşlık isteği geri çekildi.");
  };

  const acceptedRequestFriendIds = friendRequests
    .filter(
      (r) =>
        r.status === "ACCEPTED" &&
        (r.fromUserId === currentUser.id || r.toUserId === currentUser.id)
    )
    .map((r) => (r.fromUserId === currentUser.id ? r.toUserId : r.fromUserId));

  const effectiveFriendIds = Array.from(
    new Set([...friendIds, ...acceptedRequestFriendIds])
  );

  const getDirectPeerId = (c: Conversation, myId: string): string => {
    if (c.peerId === myId && c.initiatorId && c.initiatorId !== myId) {
      return c.initiatorId;
    }
    if (c.memberIds && c.memberIds.length === 2) {
      return c.memberIds.find((id) => id !== myId) || c.peerId;
    }
    return c.peerId;
  };

  const isMyDirectConvWith = (
    c: Conversation,
    myId: string,
    otherId: string
  ): boolean => {
    if (c.isGroup) return false;
    const participates =
      c.initiatorId === myId ||
      c.peerId === myId ||
      Boolean(c.memberIds?.includes(myId));
    return participates && getDirectPeerId(c, myId) === otherId;
  };

  const acceptFriendRequest = (requestId: string) => {
    if (!requireAuthAction()) return;
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;
    const otherId =
      req.fromUserId === currentUser.id ? req.toUserId : req.fromUserId;
    setFriendRequests((prev) => {
      const next = prev.map((r) =>
        r.id === requestId ? { ...r, status: "ACCEPTED" as const } : r
      );
      const apiBase = activeApiUrl || fallbackApiUrl || "";
      fetch(`${apiBase}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendRequests: next }),
      }).catch(() => {});
      return next;
    });
    setFriendIds((prev) => (prev.includes(otherId) ? prev : [...prev, otherId]));
    // Arkadaş olunca aralarındaki bekleyen sohbet de sınırsız (ACTIVE) olur
    setConversations((prev) =>
      prev.map((c) =>
        isMyDirectConvWith(c, currentUser.id, otherId)
          ? { ...c, status: "ACTIVE" }
          : c
      )
    );
    showToast("Arkadaşlık isteği kabul edildi!");
  };

  const rejectFriendRequest = (requestId: string) => {
    setFriendRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "REJECTED" } : r))
    );
    showToast("Arkadaşlık isteği reddedildi.");
  };

  const removeFriend = (userId: string) => {
    setFriendIds((prev) => prev.filter((id) => id !== userId));
    setCloseFriendIds((prev) => prev.filter((id) => id !== userId));
    setFriendRequests((prev) =>
      prev.filter(
        (r) =>
          !(
            r.status === "ACCEPTED" &&
            ((r.fromUserId === currentUser.id && r.toUserId === userId) ||
              (r.toUserId === currentUser.id && r.fromUserId === userId))
          )
      )
    );
    showToast("Arkadaşlıktan çıkarıldı.");
  };

  const toggleCloseFriend = (userId: string) => {
    if (!requireAuthAction()) return;
    if (!effectiveFriendIds.includes(userId)) {
      showToast("Yakın arkadaş yapabilmek için önce arkadaş olmalısınız.");
      return;
    }
    const target = users.find((u) => u.id === userId);
    const isClose = closeFriendIds.includes(userId);
    setCloseFriendIds((prev) =>
      isClose ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
    if (!isClose) {
      setNotifications((prev) => [
        {
          id: `n_cf_${Date.now()}`,
          title: "Yakın Arkadaş Bildirimi",
          body: `${target?.nickname || "Kullanıcı"} yakın arkadaşlarına eklendi (bildirim gönderildi).`,
          read: false,
          createdAt: "Az önce",
        },
        ...prev,
      ]);
      showToast(
        "Yakın arkadaş olarak seçildi! (İstek gerekmez, karşı tarafa bildirim düşer.)"
      );
    } else {
      showToast("Yakın arkadaşlardan çıkarıldı.");
    }
  };

  const deletePost = (postId: string) => {
    markDeletedId(postId);
    setPosts((prev) => {
      const target = prev.find((p) => p.id === postId);
      const origId = target?.repostedFrom?.originalPostId;
      return prev
        .filter((p) => p.id !== postId)
        .map((p) =>
          origId && p.id === origId && target
            ? {
                ...p,
                repostedBy: (p.repostedBy || []).filter(
                  (id) => id !== target.authorId
                ),
              }
            : p
        );
    });
    setSavedPostIds((prev) => prev.filter((id) => id !== postId));
    showToast("Paylaşımın silindi.");
  };

  const editPost = (
    postId: string,
    updates: { title?: string; content: string }
  ) => {
    const cleanContent = updates.content.trim();
    if (!cleanContent) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId && p.authorId === currentUser.id
          ? {
              ...p,
              title: updates.title?.trim() || undefined,
              content: cleanContent,
            }
          : p
      )
    );
    showToast("Paylaşım güncellendi.");
  };

  const updateBannerTheme = (themeId: string) => {
    const updated: UserProfile = { ...currentUser, bannerTheme: themeId };
    setRegisteredProfiles((prev) =>
      prev.map((u) => (u.id === currentUser.id ? updated : u))
    );
    showToast("Profil kapak teması güncellendi.");
  };

  useEffect(() => {
    let active = true;
    const ping = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const base = activeApiUrl || fallbackApiUrl || "";
      try {
        const res =
          currentUser.id && currentUser.id !== "u_me" && !hideOnlineStatus
            ? await fetch(`${base}/api/presence`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: currentUser.id }),
              })
            : await fetch(`${base}/api/presence`, { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = (await res.json()) as { onlineUserIds?: string[] };
        if (Array.isArray(data.onlineUserIds)) {
          setOnlineUserIds(data.onlineUserIds);
        }
      } catch {
        // ignore
      }
    };
    ping();
    const t = setInterval(ping, 15_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [currentUser.id, activeApiUrl, fallbackApiUrl, hideOnlineStatus]);

  const createPost = (
    post: Omit<
      Post,
      "id" | "authorId" | "likes" | "comments" | "highlights" | "repostedBy" | "createdAt"
    >
  ) => {
    if (!requireAuthAction()) return;
    if (bannedUserIds.includes(currentUser.id)) {
      showToast("Hesabın yetkili tarafından yasaklandığı için paylaşım yapamazsın.");
      return;
    }
    if (mutedUserIds.includes(currentUser.id)) {
      showToast("Hesabın yetkili tarafından susturulduğu için paylaşım yapamazsın.");
      return;
    }
    const nowMs = Date.now();
    const newPost: Post = {
      ...post,
      id: `p_${nowMs}`,
      authorId: currentUser.id,
      authorNickname: currentUser.nickname,
      authorUsername: currentUser.username,
      authorAvatarUrl: currentUser.avatarUrl,
      likes: [],
      comments: [],
      highlights: [],
      repostedBy: [],
      createdAt: "Az önce",
      createdAtMs: nowMs,
    };
    setPosts((prev) => [newPost, ...prev]);
    showToast(
      post.status === "DRAFT"
        ? "Yazın taslak olarak kaydedildi."
        : "Paylaşımın akışa eklendi!"
    );
  };

  const publishDraft = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, status: "PUBLISHED" } : p))
    );
    showToast("Taslak yayınlandı!");
  };

  const toggleLike = (postId: string) => {
    if (!requireAuthAction()) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const has = p.likes.includes(currentUser.id);
        return {
          ...p,
          likes: has
            ? p.likes.filter((id) => id !== currentUser.id)
            : [...p.likes, currentUser.id],
        };
      })
    );
  };

  const toggleSave = (postId: string) => {
    if (!requireAuthAction()) return;
    setSavedPostIds((prev) => {
      const exists = prev.includes(postId);
      showToast(
        exists ? "Kaydedilenlerden çıkarıldı." : "Kaydettiklerine eklendi."
      );
      return exists ? prev.filter((id) => id !== postId) : [postId, ...prev];
    });
  };

  const addComment = (
    postId: string,
    body: string,
    attachment?: { url: string; type: "IMAGE" | "GIF" }
  ) => {
    if (!requireAuthAction()) return;
    if (!body.trim() && !attachment?.url) return;
    const nowMs = Date.now();
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...p.comments,
                {
                  id: `c_${nowMs}`,
                  userId: currentUser.id,
                  nickname: currentUser.nickname,
                  avatarUrl: currentUser.avatarUrl,
                  body: body.trim(),
                  attachmentUrl: attachment?.url,
                  attachmentType: attachment?.type,
                  likes: [],
                  createdAt: "Az önce",
                  createdAtMs: nowMs,
                },
              ],
            }
          : p
      )
    );
    showToast("Yorumun eklendi.");
  };

  const toggleCommentLike = (postId: string, commentId: string) => {
    if (!requireAuthAction()) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: (p.comments || []).map((c) => {
            if (c.id !== commentId) return c;
            const curLikes = c.likes || [];
            const has = curLikes.includes(currentUser.id);
            return {
              ...c,
              likes: has
                ? curLikes.filter((id) => id !== currentUser.id)
                : [...curLikes, currentUser.id],
            };
          }),
        };
      })
    );
  };

  const deleteComment = (postId: string, commentId: string) => {
    markDeletedId(commentId);
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          comments: p.comments.filter((c) => {
            if (c.id !== commentId) return true;
            const canDelete =
              isAdmin || c.userId === currentUser.id || p.authorId === currentUser.id;
            return !canDelete;
          }),
        };
      })
    );
    showToast("Yorum silindi.");
  };

  const addHighlight = (
    postId: string,
    text: string,
    color: HighlightColor
  ) => {
    if (!requireAuthAction()) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const existingIdx = (p.highlights || []).findIndex(
          (h) =>
            h.userId === currentUser.id &&
            h.text.toLowerCase() === trimmed.toLowerCase()
        );
        if (existingIdx !== -1) {
          const nextHighlights = [...(p.highlights || [])];
          nextHighlights[existingIdx] = {
            ...nextHighlights[existingIdx],
            color,
          };
          return { ...p, highlights: nextHighlights };
        }
        return {
          ...p,
          highlights: [
            ...(p.highlights || []),
            {
              id: `h_${Date.now()}`,
              userId: currentUser.id,
              nickname: currentUser.nickname,
              text: trimmed,
              color,
              createdAt: "Az önce",
            },
          ],
        };
      })
    );
    showToast("Cümlenin altı çizildi!");
  };

  const removeHighlight = (postId: string, highlightId: string) => {
    if (!requireAuthAction()) return;
    markDeletedId(highlightId);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              highlights: (p.highlights || []).filter(
                (h) => !(h.id === highlightId && h.userId === currentUser.id)
              ),
            }
          : p
      )
    );
    showToast("Altını çizme kaldırıldı.");
  };

  const repostPost = (originalPostId: string, editedContent: string) => {
    if (!requireAuthAction()) return;
    const orig = posts.find((p) => p.id === originalPostId);
    if (!orig) return;
    if ((orig.repostedBy || []).includes(currentUser.id)) return;
    deletedIdsRef.current.delete(`unrepost:${originalPostId}:${currentUser.id}`);

    const origAuthorNickname =
      orig.authorNickname ||
      users.find((u) => u.id === orig.authorId)?.nickname ||
      "Kullanıcı";

    const repostedItem: Post = {
      id: `rp_${Date.now()}`,
      authorId: currentUser.id,
      authorNickname: currentUser.nickname,
      authorUsername: currentUser.username,
      authorAvatarUrl: currentUser.avatarUrl,
      type: orig.type,
      status: "PUBLISHED",
      title: orig.title,
      content: editedContent.trim() || orig.content,
      fontStyle: orig.fontStyle,
      moodTags: orig.moodTags,
      bookTitle: orig.bookTitle,
      bookAuthor: orig.bookAuthor,
      attachedTrack: orig.attachedTrack,
      likes: [],
      comments: [],
      highlights: [],
      repostedBy: [],
      repostedFrom: {
        originalPostId: orig.id,
        originalAuthorId: orig.authorId,
        originalAuthorNickname: origAuthorNickname,
      },
      createdAt: "Az önce",
      createdAtMs: Date.now(),
    };

    setPosts((prev) => [
      repostedItem,
      ...prev.map((p) =>
        p.id === originalPostId
          ? {
              ...p,
              repostedBy: Array.from(
                new Set([...(p.repostedBy || []), currentUser.id])
              ),
            }
          : p
      ),
    ]);
    showToast("Paylaşım repostlandı!");
  };

  const undoRepost = (originalPostId: string) => {
    if (!requireAuthAction()) return;
    markDeletedId(`unrepost:${originalPostId}:${currentUser.id}`);
    posts.forEach((p) => {
      if (
        p.authorId === currentUser.id &&
        p.repostedFrom?.originalPostId === originalPostId
      ) {
        markDeletedId(p.id);
      }
    });
    setPosts((prev) =>
      prev
        .filter(
          (p) =>
            !(
              p.authorId === currentUser.id &&
              p.repostedFrom?.originalPostId === originalPostId
            )
        )
        .map((p) =>
          p.id === originalPostId
            ? {
                ...p,
                repostedBy: (p.repostedBy || []).filter(
                  (id) => id !== currentUser.id
                ),
              }
            : p
        )
    );
    showToast("Repost geri çekildi.");
  };

  const createPlaylist = (
    title: string,
    description: string,
    tracks: TrackInfo[]
  ) => {
    if (!requireAuthAction()) return;
    if (!title.trim()) return;
    const newPl: Playlist = {
      id: `pl_${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      authorId: currentUser.id,
      tracks,
      likes: [],
      createdAt: "Az önce",
    };
    setPlaylists((prev) => [newPl, ...prev]);
    showToast(`"${newPl.title}" müzik listesi oluşturuldu!`);
  };

  const deletePlaylist = (playlistId: string) => {
    markDeletedId(playlistId);
    setPlaylists((prev) => prev.filter((pl) => pl.id !== playlistId));
    showToast("Müzik listesi silindi.");
  };

  const addTrackToPlaylist = (playlistId: string, track: TrackInfo) => {
    if (!requireAuthAction()) return;
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId
          ? { ...pl, tracks: [...pl.tracks, track] }
          : pl
      )
    );
    showToast(`"${track.title}" listeye eklendi!`);
  };

  const toggleLikePlaylist = (playlistId: string) => {
    if (!requireAuthAction()) return;
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        const has = pl.likes.includes(currentUser.id);
        return {
          ...pl,
          likes: has
            ? pl.likes.filter((id) => id !== currentUser.id)
            : [...pl.likes, currentUser.id],
        };
      })
    );
  };

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId && p.authorId === currentUser.id
          ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) }
          : p
      )
    );
    showToast("Şarkı listeden çıkarıldı.");
  };

  const movePlaylistTrack = (
    playlistId: string,
    index: number,
    direction: -1 | 1
  ) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId || p.authorId !== currentUser.id) return p;
        const target = index + direction;
        if (target < 0 || target >= p.tracks.length) return p;
        const nextTracks = [...p.tracks];
        const tmp = nextTracks[index];
        nextTracks[index] = nextTracks[target];
        nextTracks[target] = tmp;
        return { ...p, tracks: nextTracks };
      })
    );
  };

  const updatePlaylistInfo = (
    playlistId: string,
    title: string,
    description: string
  ) => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId && p.authorId === currentUser.id
          ? { ...p, title: cleanTitle, description: description.trim() }
          : p
      )
    );
    showToast("Müzik listesi güncellendi.");
  };

  const togglePlaylistShare = (playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId || p.authorId !== currentUser.id) return p;
        const next = !p.isShared;
        showToast(
          next
            ? "Müzik listesi arkadaşlarınla paylaşıldı!"
            : "Müzik listesi sadece sana özel yapıldı."
        );
        return { ...p, isShared: next };
      })
    );
  };

  const sharePlaylistToFeed = (playlistId: string) => {
    if (!requireAuthAction()) return;
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    setPlaylists((prev) =>
      prev.map((p) => (p.id === playlistId ? { ...p, isShared: true } : p))
    );
    const trackLines = pl.tracks
      .map((t, idx) => `${idx + 1}. ${t.title}${t.artist ? ` — ${t.artist}` : ""}`)
      .join("\n");

    createPost({
      type: "THOUGHT",
      status: "PUBLISHED",
      title: `🎵 Müzik Listem: ${pl.title}`,
      content: `${pl.description ? pl.description + "\n\n" : ""}${
        trackLines || "Henüz şarkı eklenmedi."
      }`,
      fontStyle: "SANS",
      moodTags: ["#müzik", "#playlist"],
      attachedTrack: pl.tracks[0],
    });
    setActiveSection("FEED");
  };

  const sharePlaylistToChat = (playlistId: string, convId: string) => {
    if (!requireAuthAction()) return;
    const pl = playlists.find((p) => p.id === playlistId);
    if (!pl) return;
    const summary = pl.tracks
      .map((t, idx) => `${idx + 1}. ${t.title}${t.artist ? ` (${t.artist})` : ""}`)
      .join(" · ");
    sendChatMessage(
      convId,
      `🎵 "${pl.title}" müzik listemi paylaştım:\n${summary}`,
      pl.tracks[0]
    );
    setActiveConversationId(convId);
    setActiveSection("CHAT");
    showToast("Müzik listesi sohbete gönderildi!");
  };

  // Global Mini Player controls
  const stopProfileAudio = () => {
    if (profileAudioTimerRef.current) {
      clearInterval(profileAudioTimerRef.current);
      profileAudioTimerRef.current = null;
    }
    audioEngine.stop();
    setActiveProfileAudio(null);
  };

  const hasExternalEmbed = (url?: string, title?: string, previewUrl?: string) =>
    Boolean(
      previewUrl ||
        extractYouTubeId(url) ||
        extractYouTubeId(title) ||
        extractSpotifyTrackId(url) ||
        extractSpotifyTrackId(title)
    );

  const startGlobalTrackDirect = (track: TrackInfo) => {
    stopProfileAudio();
    setGlobalTrack(track);
    setIsGlobalPlaying(true);
    if (hasExternalEmbed(track.url, track.title, track.previewUrl)) {
      audioEngine.stop();
    } else {
      audioEngine.start(track.synthMood || "night", (volume / 100) * 0.25, track.title);
    }
  };

  const playGlobalTrack = (track: TrackInfo, queue?: TrackInfo[]) => {
    if (queue && queue.length > 0) {
      const idx = queue.findIndex((t) => t.id === track.id);
      setGlobalQueue(queue);
      setGlobalQueueIndex(idx >= 0 ? idx : 0);
    } else {
      const existingIdx = globalQueue.findIndex((t) => t.id === track.id);
      if (existingIdx >= 0) {
        setGlobalQueueIndex(existingIdx);
      } else {
        setGlobalQueue([track]);
        setGlobalQueueIndex(0);
      }
    }
    startGlobalTrackDirect(track);
  };

  const playGlobalPlaylist = (
    tracks: TrackInfo[],
    startIndex = 0,
    mode?: PlaybackMode
  ) => {
    if (!tracks || tracks.length === 0) return;
    if (mode) setGlobalPlayMode(mode);
    const activeMode = mode || globalPlayMode;
    const safeIdx =
      activeMode === "SHUFFLE" && startIndex === 0 && tracks.length > 1
        ? Math.floor(Math.random() * tracks.length)
        : Math.max(0, Math.min(tracks.length - 1, startIndex));
    setGlobalQueue(tracks);
    setGlobalQueueIndex(safeIdx);
    startGlobalTrackDirect(tracks[safeIdx]);
  };

  const stopGlobalTrack = () => {
    audioEngine.stop();
    setIsGlobalPlaying(false);
    setGlobalTrack(null);
    setGlobalQueue([]);
    setGlobalQueueIndex(-1);
  };

  const nextGlobalTrack = (autoAdvance = false) => {
    if (globalQueue.length === 0) {
      stopGlobalTrack();
      return;
    }
    if (autoAdvance && globalPlayMode === "MANUAL" && !isLooping) {
      audioEngine.stop();
      setIsGlobalPlaying(false);
      return;
    }
    if (globalPlayMode === "SHUFFLE" && globalQueue.length > 1) {
      let randIdx = Math.floor(Math.random() * globalQueue.length);
      if (randIdx === globalQueueIndex) {
        randIdx = (randIdx + 1) % globalQueue.length;
      }
      setGlobalQueueIndex(randIdx);
      startGlobalTrackDirect(globalQueue[randIdx]);
      return;
    }
    const nextIdx = globalQueueIndex + 1;
    if (nextIdx >= globalQueue.length) {
      if (autoAdvance && !isLooping) {
        stopGlobalTrack();
        return;
      }
      setGlobalQueueIndex(0);
      startGlobalTrackDirect(globalQueue[0]);
      return;
    }
    setGlobalQueueIndex(nextIdx);
    startGlobalTrackDirect(globalQueue[nextIdx]);
  };

  const prevGlobalTrack = () => {
    if (globalQueue.length === 0) return;
    const prevIdx =
      globalQueueIndex > 0 ? globalQueueIndex - 1 : globalQueue.length - 1;
    setGlobalQueueIndex(prevIdx);
    startGlobalTrackDirect(globalQueue[prevIdx]);
  };

  const toggleGlobalPlay = () => {
    if (!globalTrack) return;
    if (isGlobalPlaying) {
      audioEngine.stop();
      setIsGlobalPlaying(false);
    } else {
      if (
        !hasExternalEmbed(
          globalTrack.url,
          globalTrack.title,
          globalTrack.previewUrl
        )
      ) {
        audioEngine.start(
          globalTrack.synthMood || "night",
          (volume / 100) * 0.25,
          globalTrack.title
        );
      }
      setIsGlobalPlaying(true);
    }
  };

  // Profile Audio (Max 30s auto-play when clicking a profile)
  const startProfileAudio = (user: UserProfile) => {
    if (!user.profileAudio) return;
    const cfg = user.profileAudio;
    const duration = Math.min(30, Math.max(1, cfg.endSec - cfg.startSec));

    // Pause global track temporarily while profile audio plays
    if (isGlobalPlaying) {
      setIsGlobalPlaying(false);
    }
    if (profileAudioTimerRef.current) {
      clearInterval(profileAudioTimerRef.current);
    }

    if (hasExternalEmbed(cfg.url, cfg.title, cfg.previewUrl)) {
      audioEngine.stop();
    } else {
      audioEngine.start(cfg.synthMood || "night", 0.16, cfg.title);
    }
    setActiveProfileAudio({
      userId: user.id,
      config: cfg,
      remainingSec: duration,
      isPlaying: true,
      isMuted: false,
    });

    profileAudioTimerRef.current = setInterval(() => {
      setActiveProfileAudio((prev) => {
        if (!prev || !prev.isPlaying) return prev;
        if (prev.remainingSec <= 1) {
          if (profileAudioTimerRef.current) {
            clearInterval(profileAudioTimerRef.current);
            profileAudioTimerRef.current = null;
          }
          audioEngine.stop();
          return { ...prev, remainingSec: 0, isPlaying: false };
        }
        return { ...prev, remainingSec: prev.remainingSec - 1 };
      });
    }, 1000);
  };

  const toggleMuteProfileAudio = () => {
    setActiveProfileAudio((prev) => {
      if (!prev) return null;
      const nextMuted = !prev.isMuted;
      if (nextMuted) {
        audioEngine.stop();
      } else if (prev.remainingSec > 0) {
        if (
          !hasExternalEmbed(
            prev.config.url,
            prev.config.title,
            prev.config.previewUrl
          )
        ) {
          audioEngine.start(
            prev.config.synthMood || "night",
            0.16,
            prev.config.title
          );
        }
      }
      return { ...prev, isMuted: nextMuted, isPlaying: !nextMuted && prev.remainingSec > 0 };
    });
  };

  const replayProfileAudio = () => {
    if (!viewedProfileId) return;
    const target = users.find((u) => u.id === viewedProfileId);
    if (target) startProfileAudio(target);
  };

  const openProfile = (userId: string) => {
    setViewedProfileId(userId);
    setActiveSection("PROFILE");
    setDrawerOpen(false);
    const target = users.find((u) => u.id === userId);
    if (target?.profileAudio) {
      startProfileAudio(target);
    } else {
      stopProfileAudio();
    }
  };

  // Stop profile audio if navigating away from PROFILE
  useEffect(() => {
    if (activeSection !== "PROFILE" && activeProfileAudio) {
      stopProfileAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // Chat & Message Request (Context-required)
  const startMessageRequest = (
    postId: string,
    peerId: string,
    firstMsg: string
  ) => {
    if (!requireAuthAction()) return;
    const post = posts.find((p) => p.id === postId);
    const existing = conversations.find((c) =>
      isMyDirectConvWith(c, currentUser.id, peerId)
    );
    if (existing) {
      setActiveConversationId(existing.id);
      setActiveSection("CHAT");
      showToast("Bu kişiyle zaten bir sohbetin var.");
      return;
    }

    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      peerId,
      memberIds: [currentUser.id, peerId],
      status: "PENDING",
      initiatorId: currentUser.id,
      originPostId: postId,
      originPostPreview: post?.title || post?.content.slice(0, 60),
      messages: [
        {
          id: `m_${Date.now()}`,
          senderId: currentUser.id,
          type: "POST_REF",
          body: firstMsg,
          refPostTitle: post?.title || post?.content.slice(0, 48) + "...",
          createdAt: "Az önce",
        },
      ],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setActiveSection("CHAT");
    showToast("Bağlamlı mesaj isteği gönderildi!");
  };

  const startDirectChatFromProfile = (peerId: string) => {
    if (!requireAuthAction()) return;
    const existing = conversations.find((c) =>
      isMyDirectConvWith(c, currentUser.id, peerId)
    );
    if (existing) {
      setActiveConversationId(existing.id);
      setActiveSection("CHAT");
      return;
    }

    const areFriends = effectiveFriendIds.includes(peerId);
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      peerId,
      memberIds: [currentUser.id, peerId],
      status: areFriends ? "ACTIVE" : "PENDING",
      initiatorId: currentUser.id,
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setActiveSection("CHAT");
    if (!areFriends) {
      showToast(
        "Arkadaş olmadığınız için kabul edilene kadar tek 1 mesaj gönderebilirsin."
      );
    }
  };

  const createGroupConversation = (groupName: string, memberIds: string[]) => {
    if (!requireAuthAction()) return;
    const cleanName = groupName.trim();
    if (!cleanName) {
      showToast("Grup adı girmelisin.");
      return;
    }
    const friendOnlyMembers = memberIds.filter((id) =>
      effectiveFriendIds.includes(id)
    );
    if (friendOnlyMembers.length === 0) {
      showToast("Grup kurmak için arkadaşlarından en az 1 kişi seçmelisin.");
      return;
    }
    const allMembers = Array.from(new Set([currentUser.id, ...friendOnlyMembers]));
    const nowMs = Date.now();
    const newGroup: Conversation = {
      id: `grp_${nowMs}`,
      peerId: allMembers[0],
      isGroup: true,
      groupName: cleanName,
      memberIds: allMembers,
      status: "ACTIVE",
      initiatorId: currentUser.id,
      messages: [
        {
          id: `m_${nowMs}`,
          senderId: currentUser.id,
          senderNickname: currentUser.nickname,
          type: "TEXT",
          body: `"${cleanName}" grubu oluşturuldu!`,
          createdAt: "Az önce",
          createdAtMs: nowMs,
        },
      ],
    };
    setConversations((prev) => [newGroup, ...prev]);
    setActiveConversationId(newGroup.id);
    setActiveSection("CHAT");
    showToast(`"${cleanName}" grubu oluşturuldu!`);
  };

  const updateGroupAvatar = (convId: string, avatarUrl: string) => {
    if (!requireAuthAction()) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId || !c.isGroup) return c;
        if (c.memberIds && !c.memberIds.includes(currentUser.id)) return c;
        return { ...c, groupAvatarUrl: avatarUrl || undefined };
      })
    );
    showToast(avatarUrl ? "Grup fotoğrafı güncellendi!" : "Grup fotoğrafı kaldırıldı.");
  };

  const deleteConversation = (convId: string) => {
    markDeletedId(convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      setActiveConversationId(null);
    }
    showToast("Sohbet silindi.");
  };

  const acceptConversation = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, status: "ACTIVE" } : c))
    );
    showToast("Mesaj isteği kabul edildi!");
  };

  const rejectConversation = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, status: "REJECTED" } : c))
    );
  };

  const sendChatMessage = (
    convId: string,
    body: string,
    track?: TrackInfo,
    attachment?: ChatAttachment,
    replyTo?: ChatMessage["replyTo"]
  ) => {
    if (!requireAuthAction()) return;
    if (bannedUserIds.includes(currentUser.id)) {
      showToast("Hesabın yasaklandığı için mesaj gönderemezsin.");
      return;
    }
    if (mutedUserIds.includes(currentUser.id)) {
      showToast("Hesabın yetkili tarafından susturuldu.");
      return;
    }
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        if (c.status === "PENDING" && c.initiatorId === currentUser.id && c.messages.length >= 1) {
          showToast("Alıcı isteği kabul edene kadar en fazla 1 ilk mesaj gönderebilirsin.");
          return c;
        }
        return {
          ...c,
          messages: [
            ...c.messages,
            {
              id: `m_${Date.now()}`,
              senderId: currentUser.id,
              senderNickname: currentUser.nickname,
              type: attachment ? "FILE" : track ? "TRACK_SHARE" : "TEXT",
              body:
                body ||
                (track
                  ? `Şarkı paylaştı: ${track.title}`
                  : attachment
                  ? `Dosya paylaştı: ${attachment.name}`
                  : ""),
              track,
              attachment,
              replyTo,
              createdAt: "Az önce",
              createdAtMs: Date.now(),
            },
          ],
        };
      })
    );
  };

  const editChatMessage = (convId: string, msgId: string, newBody: string) => {
    if (!newBody.trim()) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== convId
          ? c
          : {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId && m.senderId === currentUser.id
                  ? { ...m, body: newBody.trim(), edited: true }
                  : m
              ),
            }
      )
    );
    showToast("Mesaj düzenlendi.");
  };

  const deleteChatMessage = (convId: string, msgId: string) => {
    markDeletedId(msgId);
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== convId
          ? c
          : {
              ...c,
              messages: c.messages.filter((m) => m.id !== msgId),
            }
      )
    );
    showToast("Mesaj silindi.");
  };

  const pinChatMessage = (
    convId: string,
    pinned: Conversation["pinnedMessage"]
  ) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, pinnedMessage: pinned } : c))
    );
    showToast(pinned ? "Mesaj sohbete sabitlendi." : "Sabitlenen mesaj kaldırıldı.");
  };

  const toggleMessageReaction = (
    convId: string,
    msgId: string,
    emoji: string
  ) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== convId
          ? c
          : {
              ...c,
              messages: c.messages.map((m) => {
                if (m.id !== msgId) return m;
                const byUser: Record<string, string[]> = {
                  ...(m.reactionsByUser || {}),
                };
                const mine = byUser[currentUser.id] || [];
                const hasMine = mine.includes(emoji);
                const nextMine = hasMine
                  ? mine.filter((e) => e !== emoji)
                  : [...mine, emoji];
                if (nextMine.length === 0) {
                  delete byUser[currentUser.id];
                } else {
                  byUser[currentUser.id] = nextMine;
                }
                const allEmojis = Array.from(
                  new Set(Object.values(byUser).flat())
                );
                return {
                  ...m,
                  reactionsByUser: byUser,
                  reactions: allEmojis,
                };
              }),
            }
      )
    );
  };

  // Listening Room (sohbet başına ayrı oda — katılınan oda varsa sohbet değişse bile o oda aktif kalır)
  const resolveTargetRoomConvId = (explicitConvId?: string) =>
    explicitConvId ||
    effectiveJoinedRoomConvId ||
    (activeSection === "CHAT" ? activeConversationId : null) ||
    listeningRoom.conversationId ||
    "global";

  const updateRoomAndSync = (
    updater: (prev: ListeningRoomState) => ListeningRoomState,
    stampPosition = false,
    explicitConvId?: string
  ) => {
    const targetConvId = resolveTargetRoomConvId(explicitConvId);
    lastRoomMutationAtByConvRef.current[targetConvId] = Date.now();
    setRoomsByConv((prevMap) => {
      const prevRoom = prevMap[targetConvId] || createEmptyRoom(targetConvId);
      const next = updater(prevRoom);
      const optimistic: ListeningRoomState = stampPosition
        ? {
            ...next,
            conversationId: targetConvId,
            positionUpdatedAt: Date.now() + roomClockOffsetRef.current,
          }
        : { ...next, conversationId: targetConvId };
      lastRoomJsonByConvRef.current[targetConvId] = JSON.stringify(optimistic);
      fetch(`${apiUrl}/api/room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          convId: targetConvId,
          listeningRoom: optimistic,
          stampPosition,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (typeof data?.serverNow === "number") {
            const offset = data.serverNow - Date.now();
            roomClockOffsetRef.current = offset;
            setRoomClockOffsetMs(offset);
          }
          if (data?.listeningRoom) {
            lastRoomJsonByConvRef.current[targetConvId] = JSON.stringify(
              data.listeningRoom
            );
          }
        })
        .catch(() => {});
      return { ...prevMap, [targetConvId]: optimistic };
    });
  };

  const openListeningRoom = (convId: string) => {
    setJoinedRoomConvId(convId);
    updateRoomAndSync(
      (prev) => ({
        ...prev,
        isOpen: true,
        conversationId: convId,
        participantIds: Array.from(
          new Set([...(prev.participantIds || []), currentUser.id])
        ),
      }),
      false,
      convId
    );
  };

  const closeListeningRoom = () => {
    const target = joinedRoomConvId;
    audioEngine.stop();
    setJoinedRoomConvId(null);
    if (!target) return;
    updateRoomAndSync(
      (prev) => ({
        ...prev,
        isOpen: true,
        participantIds: (prev.participantIds || []).filter(
          (id) => id !== currentUser.id
        ),
      }),
      false,
      target
    );
  };

  const joinListeningRoom = (convId?: string) => {
    const target = resolveTargetRoomConvId(convId);
    if (joinedRoomConvId && joinedRoomConvId !== target) {
      const prevJoined = joinedRoomConvId;
      updateRoomAndSync(
        (prev) => ({
          ...prev,
          participantIds: (prev.participantIds || []).filter(
            (id) => id !== currentUser.id
          ),
        }),
        false,
        prevJoined
      );
    }
    setJoinedRoomConvId(target);
    updateRoomAndSync(
      (prev) => ({
        ...prev,
        isOpen: true,
        conversationId: target,
        participantIds: Array.from(
          new Set([...(prev.participantIds || []), currentUser.id])
        ),
      }),
      false,
      target
    );
    showToast("Dinleme odasına katıldın!");
  };

  const leaveListeningRoom = () => {
    const target = joinedRoomConvId || activeConversationId;
    audioEngine.stop();
    setJoinedRoomConvId(null);
    if (target) {
      updateRoomAndSync(
        (prev) => ({
          ...prev,
          isOpen: true,
          participantIds: (prev.participantIds || []).filter(
            (id) => id !== currentUser.id
          ),
        }),
        false,
        target
      );
    }
    showToast("Dinleme odasından ayrıldın.");
  };

  const isSameTrack = (a: TrackInfo, b: TrackInfo): boolean => {
    if (a.url && b.url && a.url.trim().toLowerCase() === b.url.trim().toLowerCase()) {
      return true;
    }
    const keyA = `${a.title.trim().toLowerCase()}|${(a.artist || "").trim().toLowerCase()}`;
    const keyB = `${b.title.trim().toLowerCase()}|${(b.artist || "").trim().toLowerCase()}`;
    return keyA === keyB;
  };

  const addPlaylistToRoomQueue = (tracks: TrackInfo[]) => {
    if (!tracks || tracks.length === 0) return;
    const now = Date.now();
    const normalized = tracks.map((t, i) => ({
      ...t,
      id: `${t.id}_${now}_${i}`,
    }));
    const [firstTrack, ...restTracks] = normalized;
    updateRoomAndSync((prev) => ({
      ...prev,
      currentTrack: firstTrack,
      queue: restTracks,
      history: [],
      isPlaying: true,
      positionSec: 0,
      positionUpdatedAt: now,
      seekNonce: (prev.seekNonce || 0) + 1,
    }));
    showToast(`${normalized.length} şarkılık liste başlatıldı.`);
  };

  const moveRoomQueueTrack = (index: number, direction: -1 | 1) => {
    updateRoomAndSync((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.queue.length) return prev;
      const nextQueue = [...prev.queue];
      const temp = nextQueue[index];
      nextQueue[index] = nextQueue[target];
      nextQueue[target] = temp;
      return { ...prev, queue: nextQueue };
    });
  };

  const removeRoomQueueTrack = (index: number) => {
    updateRoomAndSync((prev) => ({
      ...prev,
      queue: prev.queue.filter((_, i) => i !== index),
    }));
  };

  const clearRoomQueue = () => {
    updateRoomAndSync((prev) => ({
      ...prev,
      queue: [],
    }));
    showToast("Dinleme sırası temizlendi.");
  };

  const playTrackInRoom = (track: TrackInfo) => {
    stopGlobalTrack();
    stopProfileAudio();
    if (hasExternalEmbed(track.url, track.title, track.previewUrl)) {
      audioEngine.stop();
    } else {
      audioEngine.start(
        track.synthMood || "night",
        (volume / 100) * 0.25,
        track.title
      );
    }
    updateRoomAndSync(
      (prev) => ({
        ...prev,
        history:
          prev.currentTrack && prev.currentTrack.id !== track.id
            ? [...(prev.history || []).slice(-29), prev.currentTrack]
            : prev.history || [],
        currentTrack: track,
        isPlaying: true,
        positionSec: 0,
        positionUpdatedAt: Date.now(),
        seekNonce: (prev.seekNonce || 0) + 1,
      }),
      true
    );
  };

  const playPlaylistInRoom = (tracks: TrackInfo[]) => {
    if (!tracks || tracks.length === 0) return;
    const [first, ...rest] = tracks;
    stopGlobalTrack();
    stopProfileAudio();
    if (hasExternalEmbed(first.url, first.title, first.previewUrl)) {
      audioEngine.stop();
    } else {
      audioEngine.start(
        first.synthMood || "night",
        (volume / 100) * 0.25,
        first.title
      );
    }
    updateRoomAndSync(
      (prev) => ({
        ...prev,
        currentTrack: first,
        isPlaying: true,
        positionSec: 0,
        positionUpdatedAt: Date.now(),
        seekNonce: (prev.seekNonce || 0) + 1,
        queue: rest,
      }),
      true
    );
    showToast(`Çalma listesi odada başlatıldı (${tracks.length} şarkı).`);
  };

  const restartRoomTrack = () => {
    updateRoomAndSync(
      (prev) => ({
        ...prev,
        isPlaying: true,
        positionSec: 0,
        positionUpdatedAt: Date.now(),
        seekNonce: (prev.seekNonce || 0) + 1,
        restartNonce: (prev.restartNonce || 0) + 1,
      }),
      true
    );
  };

  const seekRoomTrack = (seconds: number) => {
    const safeSec = Math.max(0, Math.floor(seconds));
    updateRoomAndSync(
      (prev) => ({
        ...prev,
        positionSec: safeSec,
        positionUpdatedAt: Date.now(),
        seekNonce: (prev.seekNonce || 0) + 1,
      }),
      true
    );
  };

  const toggleRoomPlay = (currentSec?: number) => {
    updateRoomAndSync((prev) => {
      const next = !prev.isPlaying;
      if (next && prev.currentTrack) {
        if (
          hasExternalEmbed(
            prev.currentTrack.url,
            prev.currentTrack.title,
            prev.currentTrack.previewUrl
          )
        ) {
          audioEngine.stop();
        } else {
          audioEngine.start(
            prev.currentTrack.synthMood || "night",
            (volume / 100) * 0.25,
            prev.currentTrack.title
          );
        }
      } else {
        audioEngine.stop();
      }
      const serverNow = Date.now() + roomClockOffsetRef.current;
      const computedPos =
        prev.isPlaying && prev.positionUpdatedAt
          ? Math.max(
              0,
              Math.floor(
                (prev.positionSec ?? 0) + (serverNow - prev.positionUpdatedAt) / 1000
              )
            )
          : prev.positionSec ?? 0;
      const pos =
        typeof currentSec === "number"
          ? Math.max(0, Math.floor(currentSec))
          : computedPos;
      return {
        ...prev,
        isPlaying: next,
        positionSec: pos,
        positionUpdatedAt: serverNow,
      };
    }, true);
  };

  const toggleCollaborativeQueue = () => {
    updateRoomAndSync((prev) => {
      const next = !prev.allowCollaborativeQueue;
      showToast(
        next
          ? "Ortak Sıra (Collaborative Queue) açıldı."
          : "Sadece DJ kontrolüne geçildi."
      );
      return { ...prev, allowCollaborativeQueue: next };
    });
  };

  const addToRoomQueue = (track: TrackInfo) => {
    let dupIndex = -1;
    let isCurrentlyPlaying = false;
    updateRoomAndSync((prev) => {
      if (prev.currentTrack && isSameTrack(prev.currentTrack, track)) {
        isCurrentlyPlaying = true;
        return prev;
      }
      const idx = prev.queue.findIndex((q) => isSameTrack(q, track));
      if (idx !== -1) {
        dupIndex = idx;
        return prev;
      }
      return {
        ...prev,
        queue: [...prev.queue, track],
      };
    });
    showToast(
      isCurrentlyPlaying
        ? `"${track.title}" şu anda zaten çalıyor!`
        : dupIndex !== -1
        ? `"${track.title}" zaten listede (${dupIndex + 1}. sırada)!`
        : `"${track.title}" ortak sıraya eklendi.`
    );
  };

  const prevRoomTrack = () => {
    updateRoomAndSync((prev) => {
      const hist = prev.history || [];
      if (hist.length === 0) return prev;
      const previous = hist[hist.length - 1];
      const nextHistory = hist.slice(0, -1);
      const nextQueue = prev.currentTrack
        ? [prev.currentTrack, ...prev.queue]
        : prev.queue;
      if (prev.isPlaying) {
        if (hasExternalEmbed(previous.url, previous.title, previous.previewUrl)) {
          audioEngine.stop();
        } else {
          audioEngine.start(
            previous.synthMood || "night",
            (volume / 100) * 0.25,
            previous.title
          );
        }
      }
      return {
        ...prev,
        currentTrack: previous,
        history: nextHistory,
        queue: nextQueue,
        positionSec: 0,
        positionUpdatedAt: Date.now(),
        seekNonce: (prev.seekNonce || 0) + 1,
      };
    }, true);
  };

  const skipRoomTrack = (autoAdvance = false) => {
    updateRoomAndSync((prev) => {
      if (prev.queue.length === 0) {
        if (autoAdvance) {
          audioEngine.stop();
          return { ...prev, isPlaying: false };
        }
        return prev;
      }
      if (autoAdvance && roomPlayMode === "MANUAL") {
        audioEngine.stop();
        return { ...prev, isPlaying: false };
      }
      const pickIdx =
        roomPlayMode === "SHUFFLE"
          ? Math.floor(Math.random() * prev.queue.length)
          : 0;
      const nextTrack = prev.queue[pickIdx];
      const rest = prev.queue.filter((_, idx) => idx !== pickIdx);
      if (prev.isPlaying) {
        if (hasExternalEmbed(nextTrack.url, nextTrack.title, nextTrack.previewUrl)) {
          audioEngine.stop();
        } else {
          audioEngine.start(
            nextTrack.synthMood || "night",
            (volume / 100) * 0.25,
            nextTrack.title
          );
        }
      }
      return {
        ...prev,
        history: prev.currentTrack
          ? [...(prev.history || []).slice(-29), prev.currentTrack]
          : prev.history || [],
        currentTrack: nextTrack,
        queue: rest,
        positionSec: 0,
        positionUpdatedAt: Date.now(),
        seekNonce: (prev.seekNonce || 0) + 1,
      };
    }, true);
  };

  return (
    <AppContext.Provider
      value={{
        activeSection,
        setActiveSection,
        drawerOpen,
        setDrawerOpen,
        viewedProfileId,
        openProfile,
        showCreateModal,
        setShowCreateModal,
        isGuest,
        hasEnteredNickname,
        currentEmail,
        showNicknameModal,
        setShowNicknameModal,
        registerAccount,
        loginAccount,
        loginWithGoogle,
        hasGoogleAccount,
        pendingGoogleUser,
        setPendingGoogleUser,
        logout,
        enterAsGuest,
        searchQuery,
        setSearchQuery,
        notifications,
        markAllNotificationsRead,
        markNotificationRead,
        deleteNotification,
        currentUser,
        users,
        updateCurrentUser,
        feedBackgroundUrl,
        setFeedBackgroundUrl,
        feedBgDim,
        setFeedBgDim,
        journalLock,
        isJournalUnlocked,
        unlockJournal,
        lockJournal,
        updateJournalLock,
        supportTickets,
        createSupportTicket,
        adminResetJournalLock,
        reports,
        submitReport,
        resolveReport,
        adminDeletePost,
        adminDeleteComment,
        bannedUserIds,
        mutedUserIds,
        adminBanUser,
        adminUnbanUser,
        adminMuteUser,
        adminUnmuteUser,
        adminDeleteUser,
        themeMode,
        resolvedTheme,
        setThemeMode,
        isAdmin,
        isFounder,
        isAdminVerified,
        isAdminPasswordChanged,
        adminInitialPasswordHint,
        adminEmails,
        adminRequests,
        verifyAdminPassword,
        lockAdminPanel,
        addAdminEmail,
        approveAdminRequest,
        rejectAdminRequest,
        removeAdminEmail,
        changeAdminPassword,
        privateNotes,
        addPrivateNote,
        deletePrivateNote,
        friendIds: effectiveFriendIds,
        closeFriendIds,
        friendRequests,
        sendFriendRequest,
        cancelFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,
        toggleCloseFriend,
        blockedUserIds,
        toggleBlockUser,
        posts,
        savedPostIds,
        createPost,
        deletePost,
        editPost,
        publishDraft,
        onlineUserIds,
        updateBannerTheme,
        toggleLike,
        toggleSave,
        addComment,
        deleteComment,
        toggleCommentLike,
        addHighlight,
        removeHighlight,
        showCloseFriendHighlights,
        setShowCloseFriendHighlights,
        hideOnlineStatus,
        setHideOnlineStatus,
        muteUiSounds,
        setMuteUiSounds,
        repostPost,
        undoRepost,
        apiBaseUrl: activeApiUrl,
        callRequest,
        startVoiceCall,
        globalTrack,
        globalQueue,
        globalQueueIndex,
        isGlobalPlaying,
        isLooping,
        toggleLoop,
        globalPlayMode,
        setGlobalPlayMode,
        volume,
        setVolume,
        playGlobalTrack,
        playGlobalPlaylist,
        nextGlobalTrack,
        prevGlobalTrack,
        toggleGlobalPlay,
        stopGlobalTrack,
        playlists,
        createPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        movePlaylistTrack,
        updatePlaylistInfo,
        toggleLikePlaylist,
        togglePlaylistShare,
        sharePlaylistToFeed,
        sharePlaylistToChat,
        activeProfileAudio,
        toggleMuteProfileAudio,
        replayProfileAudio,
        stopProfileAudio,
        conversations,
        activeConversationId,
        setActiveConversationId,
        startMessageRequest,
        startDirectChatFromProfile,
        createGroupConversation,
        updateGroupAvatar,
        deleteConversation,
        acceptConversation,
        rejectConversation,
        sendChatMessage,
        editChatMessage,
        deleteChatMessage,
        pinChatMessage,
        toggleMessageReaction,
        listeningRoom,
        joinedRoomConvId: effectiveJoinedRoomConvId,
        getRoomForConv,
        roomClockOffsetMs,
        roomDurationSec,
        setRoomDurationSec,
        openListeningRoom,
        closeListeningRoom,
        joinListeningRoom,
        leaveListeningRoom,
        playTrackInRoom,
        playPlaylistInRoom,
        addPlaylistToRoomQueue,
        moveRoomQueueTrack,
        removeRoomQueueTrack,
        clearRoomQueue,
        restartRoomTrack,
        seekRoomTrack,
        toggleRoomPlay,
        toggleCollaborativeQueue,
        addToRoomQueue,
        prevRoomTrack,
        skipRoomTrack,
        roomPlayMode,
        setRoomPlayMode,
        toastMessage,
        showToast,
        confirmDialog,
        requestConfirm,
        closeConfirm,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
