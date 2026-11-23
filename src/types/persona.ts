export type FontStyle =
  | "SANS"
  | "ITALIC"
  | "SERIF"
  | "HANDWRITING"
  | "MONO"
  | "CALLIGRAPHY";

export type PostType = "BLOG" | "LYRIC" | "THOUGHT" | "QUOTE";
export type PostStatus = "DRAFT" | "PUBLISHED";

export interface TrackInfo {
  id: string;
  title: string;
  artist?: string; // Opsiyonel
  personalNote?: string; // Opsiyonel
  provider: "SPOTIFY" | "YOUTUBE" | "ITUNES" | "AMBIENT";
  url?: string;
  altYoutubeIds?: string[]; // Gömme engeli olursa sırayla denenecek alternatif YouTube ID'leri
  previewUrl?: string; // Gerçek 30sn önizleme ses dosyası
  coverColor?: string;
  artworkUrl?: string;
  synthMood?: "melancholy" | "night" | "hope" | "rain";
  startSec?: number;
  endSec?: number;
}

export interface ProfileAudioConfig {
  title: string;
  artist?: string;
  provider: "SPOTIFY" | "YOUTUBE" | "ITUNES" | "AMBIENT";
  url?: string;
  previewUrl?: string;
  artworkUrl?: string;
  startSec: number;
  endSec: number; // Constraint: endSec - startSec <= 30
  synthMood?: "melancholy" | "night" | "hope" | "rain";
}

export interface BookQuote {
  id: string;
  quoteText: string;
  bookTitle: string;
  authorName?: string;
  fontStyle: FontStyle;
}

export interface PostComment {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  body: string;
  attachmentUrl?: string;
  attachmentType?: "IMAGE" | "GIF";
  likes?: string[];
  createdAt: string;
  createdAtMs?: number;
}

export type HighlightColor = "yellow" | "rose" | "sky" | "emerald" | "purple";

export interface PostHighlight {
  id: string;
  userId: string;
  nickname: string;
  text: string;
  color: HighlightColor;
  createdAt: string;
  createdAtMs?: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorNickname?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  type: PostType;
  status: PostStatus;
  title?: string;
  content: string;
  fontStyle: FontStyle;
  moodTags: string[];
  bookTitle?: string;
  bookAuthor?: string;
  attachedTrack?: TrackInfo;
  likes: string[]; // user IDs
  comments: PostComment[];
  highlights: PostHighlight[];
  repostedBy: string[]; // unique user IDs who reposted
  repostedFrom?: {
    originalPostId: string;
    originalAuthorId: string;
    originalAuthorNickname: string;
  };
  createdAt: string;
  createdAtMs?: number;
}

export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  bio: string;
  currentMood: string;
  featuredQuote?: BookQuote;
  pinnedTrack?: TrackInfo;
  profileAudio?: ProfileAudioConfig;
  vibeScore?: number;
  isOnline?: boolean;
}

export interface PrivateNote {
  id: string;
  section: "JOURNAL" | "THOUGHTS";
  title: string;
  content: string;
  fontStyle: FontStyle;
  moodTag?: string;
  createdAt: string;
  createdAtMs?: number;
}

export interface ChatAttachment {
  name: string;
  sizeBytes: number;
  mimeType: string;
  dataUrl: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderNickname?: string;
  type: "TEXT" | "TRACK_SHARE" | "POST_REF" | "FILE";
  body: string;
  track?: TrackInfo;
  attachment?: ChatAttachment;
  refPostTitle?: string;
  replyTo?: {
    id: string;
    senderName: string;
    body: string;
  };
  edited?: boolean;
  reactions?: string[];
  reactionsByUser?: Record<string, string[]>;
  createdAt: string;
  createdAtMs?: number;
}

export interface Conversation {
  id: string;
  peerId: string;
  isGroup?: boolean;
  groupName?: string;
  groupAvatarUrl?: string;
  memberIds?: string[];
  status: "PENDING" | "ACTIVE" | "REJECTED";
  initiatorId: string;
  originPostId?: string;
  originPostPreview?: string;
  messages: ChatMessage[];
}

export interface ListeningRoomState {
  isOpen: boolean;
  conversationId?: string;
  hostUserId: string;
  allowCollaborativeQueue: boolean;
  currentTrack: TrackInfo | null;
  isPlaying: boolean;
  positionSec?: number;
  positionUpdatedAt?: number;
  seekNonce?: number;
  restartNonce?: number;
  participantIds?: string[];
  history?: TrackInfo[];
  queue: TrackInfo[];
}

export interface RegisteredAccount {
  id: string;
  email: string;
  password: string;
  profile: UserProfile;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  targetSection?: ActiveSection;
}

export type JournalLockType = "NONE" | "PIN" | "PATTERN" | "BOTH";

export interface JournalLockConfig {
  type: JournalLockType;
  pin?: string;
  pattern?: number[]; // 0-8 grid indices
}

export interface SupportTicket {
  id: string;
  userId: string;
  nickname: string;
  email?: string;
  category?: "JOURNAL_RESET" | "GENERAL";
  reason: string;
  newJournalPin?: string;
  adminNote?: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  createdAtMs?: number;
}

export interface ReportItem {
  id: string;
  targetType: "POST" | "USER" | "COMMENT";
  targetId: string;
  targetLabel: string;
  reporterId: string;
  reporterNickname: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  createdAtMs?: number;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  createdAtMs?: number;
}

export interface AdminRequest {
  id: string;
  targetEmail: string;
  initialPassword: string;
  requestedByEmail: string;
  requestedByNickname: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  createdAtMs?: number;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  authorId: string;
  tracks: TrackInfo[];
  likes: string[];
  isShared?: boolean;
  createdAt: string;
  createdAtMs?: number;
}

export type ActiveSection =
  | "FEED"
  | "DISCOVER"
  | "FRIENDS"
  | "PLAYLISTS"
  | "CHAT"
  | "PROFILE"
  | "JOURNAL"
  | "THOUGHTS"
  | "READING_LIST"
  | "SETTINGS"
  | "ADMIN";
