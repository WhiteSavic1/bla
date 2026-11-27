"use client";

import React, { useState } from "react";
import {
  Heart,
  MessageSquare,
  Bookmark,
  Repeat2,
  Music,
  Play,
  Highlighter,
  Send,
  BookOpen,
  Sparkles,
  X,
  Flag,
  Trash2,
  Image as ImageIcon,
  Pencil,
  Maximize2,
  Check,
  Headphones,
} from "lucide-react";
import { FontStyle, HighlightColor, Post, UserProfile } from "@/types/persona";
import { useApp } from "@/context/AppContext";
import { useTextHistory } from "@/hooks/useTextHistory";
import { formatRelativeTime, formatSeconds, getFontClass, HIGHLIGHT_COLORS } from "@/lib/constants";

function renderStyledAndHighlightedContent(
  content: string,
  highlights: Post["highlights"]
): React.ReactNode {
  // 1. Önce yazarın [[STYLE:metin]] bloklarını ayrıştır
  const regex =
    /\[\[(SANS|ITALIC|SERIF|HANDWRITING|MONO|CALLIGRAPHY):([\s\S]*?)\]\]/g;
  type StyledPart = { text: string; style?: FontStyle };
  const styledParts: StyledPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      styledParts.push({ text: content.slice(lastIndex, match.index) });
    }
    styledParts.push({
      text: match[2],
      style: match[1] as FontStyle,
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    styledParts.push({ text: content.slice(lastIndex) });
  }

  // 2. Her parçanın içinde Yakın Arkadaşların / kullanıcının altı çizili vurgularını işle
  const applyHighlights = (text: string, baseKey: string): React.ReactNode => {
    if (!highlights || highlights.length === 0) return text;

    type Segment = { text: string; color?: HighlightColor; title?: string };
    let segments: Segment[] = [{ text }];

    for (const h of highlights) {
      if (!h.text.trim()) continue;
      const nextSegments: Segment[] = [];
      for (const seg of segments) {
        if (seg.color) {
          nextSegments.push(seg);
          continue;
        }
        const idx = seg.text.toLowerCase().indexOf(h.text.toLowerCase());
        if (idx === -1) {
          nextSegments.push(seg);
        } else {
          const before = seg.text.slice(0, idx);
          const m = seg.text.slice(idx, idx + h.text.length);
          const after = seg.text.slice(idx + h.text.length);
          if (before) nextSegments.push({ text: before });
          nextSegments.push({
            text: m,
            color: h.color || "yellow",
            title: `${h.nickname} (Yakın Arkadaş) altını çizdi`,
          });
          if (after) nextSegments.push({ text: after });
        }
      }
      segments = nextSegments;
    }

    return segments.map((seg, i) => {
      if (!seg.color) {
        return <React.Fragment key={`${baseKey}_${i}`}>{seg.text}</React.Fragment>;
      }
      const style =
        HIGHLIGHT_COLORS.find((c) => c.id === seg.color)?.bgClass ||
        HIGHLIGHT_COLORS[0].bgClass;
      return (
        <span
          key={`${baseKey}_${i}`}
          title={seg.title}
          className={`rounded px-1 py-0.5 ${style}`}
        >
          {seg.text}
        </span>
      );
    });
  };

  return styledParts.map((part, idx) => {
    const inner = applyHighlights(part.text, `p_${idx}`);
    if (!part.style) {
      return <React.Fragment key={idx}>{inner}</React.Fragment>;
    }
    return (
      <span key={idx} className={getFontClass(part.style)}>
        {inner}
      </span>
    );
  });
}

export function PostCard({ post }: { post: Post }) {
  const {
    users,
    currentUser,
    savedPostIds,
    closeFriendIds,
    openProfile,
    toggleLike,
    toggleSave,
    addComment,
    deleteComment,
    toggleCommentLike,
    blockedUserIds,
    addHighlight,
    removeHighlight,
    showCloseFriendHighlights,
    repostPost,
    undoRepost,
    playGlobalTrack,
    addToRoomQueue,
    joinedRoomConvId,
    startMessageRequest,
    submitReport,
    deletePost,
    editPost,
    isAdmin,
    showToast,
    requestConfirm,
  } = useApp();

  const [showComments, setShowComments] = useState(false);
  const [commentSort, setCommentSort] = useState<"NEWEST" | "TOP">("NEWEST");
  const [commentText, setCommentText] = useState("");
  const [commentAttachment, setCommentAttachment] = useState<{
    url: string;
    type: "IMAGE" | "GIF";
  } | null>(null);
  const [showGifInput, setShowGifInput] = useState(false);
  const [gifUrlInput, setGifUrlInput] = useState("");
  const [showHighlightInput, setShowHighlightInput] = useState(false);
  const [highlightText, setHighlightText] = useState("");
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title || "");
  const [editContent, setEditContent] = useState(post.content);
  const [showReadingModal, setShowReadingModal] = useState(false);
  const [highlightColor, setHighlightColor] =
    useState<HighlightColor>("yellow");
  const [showMsgRequest, setShowMsgRequest] = useState(false);
  const [firstMsg, setFirstMsg] = useState("");

  const [showRepostModal, setShowRepostModal] = useState(false);
  const {
    value: repostEditedContent,
    setValue: setRepostEditedContent,
    handleKeyDown: handleRepostKeyDown,
  } = useTextHistory(post.content);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Rahatsız edici içerik");

  const isOwnPost = post.authorId === currentUser.id;
  const author: UserProfile =
    users.find((u) => u.id === post.authorId) ||
    (isOwnPost
      ? currentUser
      : {
          id: post.authorId,
          nickname: post.authorNickname || "Kullanıcı",
          username: post.authorUsername || "kullanici",
          avatarUrl: post.authorAvatarUrl,
          bio: "",
          currentMood: "#gece-yarısı",
        });
  const isLiked = post.likes.includes(currentUser.id);
  const isSaved = savedPostIds.includes(post.id);
  const targetRepostId = post.repostedFrom?.originalPostId || post.id;
  const isRepostedByMe =
    (post.repostedBy || []).includes(currentUser.id) ||
    (post.authorId === currentUser.id && Boolean(post.repostedFrom));

  const [isCommentDragOver, setIsCommentDragOver] = useState(false);

  // Altı çizili kısımları SADECE kendimiz ve (ayardan açıksa) "Yakın Arkadaş" olarak seçtiğimiz kişiler görebilir
  const visibleHighlights = (post.highlights || []).filter(
    (h) =>
      h.userId === currentUser.id ||
      (showCloseFriendHighlights && closeFriendIds.includes(h.userId))
  );
  const myHighlights = (post.highlights || []).filter(
    (h) => h.userId === currentUser.id
  );

  const typeBadge: Record<Post["type"], string> = {
    BLOG: "Blog Yazısı",
    LYRIC: "Şarkı Sözü",
    THOUGHT: "Duygu & Düşünce",
    QUOTE: "Kitap Alıntısı",
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() && !commentAttachment) return;
    addComment(post.id, commentText, commentAttachment || undefined);
    setCommentText("");
    setCommentAttachment(null);
    setShowGifInput(false);
    setGifUrlInput("");
  };

  const handleCommentFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("Yalnızca fotoğraf veya GIF ekleyebilirsin.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("Fotoğraf veya GIF en fazla 2 MB olabilir.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCommentAttachment({
          url: reader.result,
          type: file.type === "image/gif" ? "GIF" : "IMAGE",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCommentImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    handleCommentFile(file);
  };

  const handleCommentPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imgItem = items.find((it) => it.type.startsWith("image/"));
    if (imgItem) {
      const file = imgItem.getAsFile();
      if (file) {
        e.preventDefault();
        handleCommentFile(file);
        return;
      }
    }
    const text = e.clipboardData?.getData("text")?.trim();
    if (text && /^https?:\/\/.+\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(text)) {
      e.preventDefault();
      setCommentAttachment({
        url: text,
        type: /\.gif(\?.*)?$/i.test(text) ? "GIF" : "IMAGE",
      });
    }
  };

  const handleOpenHighlight = () => {
    const selection =
      typeof window !== "undefined"
        ? window.getSelection()?.toString().trim()
        : "";
    if (
      selection &&
      post.content.toLowerCase().includes(selection.toLowerCase())
    ) {
      setHighlightText(selection);
    }
    setShowHighlightInput((v) => !v);
  };

  const handleHighlightSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!highlightText.trim()) return;
    addHighlight(post.id, highlightText, highlightColor);
    setHighlightText("");
    setShowHighlightInput(false);
  };

  const handleMsgRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstMsg.trim()) return;
    startMessageRequest(post.id, author.id, firstMsg);
    setFirstMsg("");
    setShowMsgRequest(false);
  };

  const handleRepostClick = () => {
    if (isRepostedByMe) {
      undoRepost(targetRepostId);
    } else {
      setRepostEditedContent(post.content);
      setShowRepostModal((v) => !v);
    }
  };

  const handleConfirmRepost = (e: React.FormEvent) => {
    e.preventDefault();
    repostPost(targetRepostId, repostEditedContent);
    setShowRepostModal(false);
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-[#151821]/85 p-5 sm:p-6 shadow-xl backdrop-blur-md transition hover:border-white/20">
      {/* Repost Rozeti */}
      {post.repostedFrom && (
        <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
          <Repeat2 className="h-3.5 w-3.5" />
          <span>
            {post.repostedFrom.originalAuthorId === post.authorId ||
            post.repostedFrom.originalAuthorNickname === author.nickname
              ? `${author.nickname} yeniden paylaştı`
              : `${author.nickname}, ${post.repostedFrom.originalAuthorNickname}'in paylaşımını repostladı`}
          </span>
        </div>
      )}

      {/* Üst Bilgi */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => openProfile(author.id)}
          className="flex items-center gap-3 text-left group"
        >
          {author.avatarUrl ? (
            <img
              src={author.avatarUrl}
              alt={author.nickname}
              className="h-10 w-10 rounded-full object-cover border border-white/15 group-hover:border-indigo-400 transition"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
              {author.nickname.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white group-hover:text-indigo-300 transition">
                {author.nickname}
              </span>
              {author.profileAudio && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                  ♪ Profil Müziği
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400">
              @{author.username} · {formatRelativeTime(post.createdAtMs, post.createdAt)}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowReadingModal(true)}
            title="Okuma Modu"
            className="rounded-full border border-white/10 bg-white/5 p-1.5 text-gray-300 hover:bg-white/15 hover:text-white transition"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          {isOwnPost && (
            <button
              type="button"
              onClick={() => {
                setEditTitle(post.title || "");
                setEditContent(post.content);
                setIsEditingPost((v) => !v);
              }}
              title="Gönderiyi Düzenle"
              className="rounded-full border border-white/10 bg-white/5 p-1.5 text-gray-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-gray-300">
            {typeBadge[post.type]}
          </span>
        </div>
      </div>

      {isEditingPost ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!editContent.trim()) return;
            editPost(post.id, { title: editTitle, content: editContent });
            setIsEditingPost(false);
          }}
          className="mt-4 space-y-2.5 rounded-xl border border-indigo-500/30 bg-[#0F1115]/90 p-3"
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Başlık (isteğe bağlı)..."
            className="w-full rounded-lg border border-white/10 bg-[#151821] px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-[#151821] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingPost(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-white"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Kaydet</span>
            </button>
          </div>
        </form>
      ) : (
        <>
          {post.title && (
            <h2 className="mt-4 text-lg sm:text-xl font-semibold text-white break-words">
              {post.title}
            </h2>
          )}

          {/* İçerik (Yazarın Parçalı Yazı Stilleri + Yakın Arkadaşların Altı Çizilileri) */}
          <div
            className={`mt-3 whitespace-pre-line break-words text-gray-200 leading-relaxed ${getFontClass(
              post.fontStyle
            )}`}
          >
            {renderStyledAndHighlightedContent(post.content, visibleHighlights)}
          </div>
        </>
      )}

      {(post.bookTitle || post.bookAuthor) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-indigo-300/90">
          <BookOpen className="h-3.5 w-3.5" />
          <span>
            {post.bookTitle}
            {post.bookAuthor ? ` — ${post.bookAuthor}` : ""}
          </span>
        </div>
      )}

      {post.attachedTrack && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F1115]/80 p-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
              <Music className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">
                {post.attachedTrack.title}
              </div>
              {post.attachedTrack.artist && (
                <div className="truncate text-xs text-gray-400">
                  {post.attachedTrack.artist}
                </div>
              )}
              {post.attachedTrack.personalNote && (
                <div className="mt-0.5 truncate text-[11px] italic text-indigo-300">
                  &ldquo;{post.attachedTrack.personalNote}&rdquo;
                </div>
              )}
              {(typeof post.attachedTrack.startSec === "number" ||
                typeof post.attachedTrack.endSec === "number") && (
                <div className="mt-0.5 text-[10px] font-medium text-emerald-300/90">
                  Kısım: {formatSeconds(post.attachedTrack.startSec || 0)} –{" "}
                  {typeof post.attachedTrack.endSec === "number"
                    ? formatSeconds(post.attachedTrack.endSec)
                    : "Sonu"}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {joinedRoomConvId && (
              <button
                type="button"
                onClick={() => addToRoomQueue(post.attachedTrack!)}
                title="Dinleme Odası Sırasına Ekle"
                className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
              >
                <Headphones className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Odaya Ekle</span>
              </button>
            )}
            <button
              onClick={() => playGlobalTrack(post.attachedTrack!)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/30"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Dinle</span>
            </button>
          </div>
        </div>
      )}

      {post.moodTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.moodTags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-gray-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Sosyal Etkileşim Barı */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="flex items-center">
            <button
              onClick={() => toggleLike(post.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
                isLiked
                  ? "bg-rose-500/15 text-rose-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              <span>{post.likes.length}</span>
            </button>
            {isOwnPost && post.likes.length > 0 && (
              <button
                onClick={() => setShowLikesModal(true)}
                className="ml-0.5 rounded-md px-1.5 py-1 text-[10px] text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200"
              >
                Beğenenler
              </button>
            )}
          </div>

          <button
            onClick={() => setShowComments((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            <MessageSquare className="h-4 w-4" />
            <span>{post.comments.length}</span>
          </button>

          <button
            onClick={() => toggleSave(post.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
              isSaved
                ? "bg-indigo-500/20 text-indigo-300"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Bookmark
              className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`}
            />
            <span>{isSaved ? "Kaydedildi" : "Kaydet"}</span>
          </button>

          {/* Repost Butonu (2. tıklamada geri çeker) */}
          <button
            onClick={handleRepostClick}
            title={
              isRepostedByMe
                ? "Repostu Geri Çek"
                : "Düzenleyerek Repostla"
            }
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition ${
              isRepostedByMe
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Repeat2 className="h-4 w-4" />
            <span>{Array.from(new Set(post.repostedBy || [])).length}</span>
          </button>

          {/* Paylaşan kişi kendi gönderisinde altını çizemez */}
          {!isOwnPost && (
            <button
              onClick={handleOpenHighlight}
              title="Metindeki Cümlenin Altını Çiz (Sadece Yakın Arkadaşların Görür)"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-amber-300/80 transition hover:bg-amber-500/10"
            >
              <Highlighter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Altını Çiz</span>
            </button>
          )}
        </div>

        {isOwnPost ? (
          <button
            onClick={() =>
              requestConfirm({
                title: "Paylaşımı Sil",
                message: "Bu paylaşımı silmek istediğine emin misin?",
                confirmLabel: "Sil",
                onConfirm: () => deletePost(post.id),
              })
            }
            title="Paylaşımı Sil"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-rose-400/80 transition hover:bg-rose-500/15 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Sil</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowReportModal(true)}
              title="Paylaşımı Bildir"
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setShowMsgRequest((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Bu Hissi Konuşalım</span>
            </button>
          </div>
        )}
      </div>

      {/* Ayrı Ekranda Açılan Düzenlenebilir Repost Penceresi */}
      {showRepostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-[#151821] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-emerald-300">
                <Repeat2 className="h-5 w-5" />
                <h3 className="text-base font-semibold text-white">
                  Paylaşımı Repostla
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRepostModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRepost} className="space-y-3">
              <p className="text-xs text-gray-400">
                Repostlarken metnin istediğin bir yerini değiştirebilir veya
                kendi dokunuşunu ekleyebilirsin:
              </p>
              <textarea
                rows={5}
                value={repostEditedContent}
                onChange={(e) => setRepostEditedContent(e.target.value)}
                onKeyDown={handleRepostKeyDown}
                className="w-full rounded-xl border border-white/15 bg-[#0F1115] px-4 py-3 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRepostModal(false)}
                  className="rounded-xl px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
                >
                  <Repeat2 className="h-4 w-4" />
                  <span>Repostla</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Beğenen Kişiler Listesi Penceresi (Sadece Paylaşan Kişi Görür) */}
      {showLikesModal && isOwnPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#151821] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Heart className="h-4 w-4 fill-current" />
                <h3 className="text-sm font-semibold text-white">
                  Beğenenler ({post.likes.length})
                </h3>
              </div>
              <button
                onClick={() => setShowLikesModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {post.likes.map((uid) => {
                const liker = users.find((u) => u.id === uid) || {
                  id: uid,
                  nickname: uid === currentUser.id ? currentUser.nickname : "Kullanıcı",
                  username: "kullanici",
                  avatarUrl: undefined,
                };
                return (
                  <button
                    key={uid}
                    onClick={() => {
                      setShowLikesModal(false);
                      openProfile(liker.id);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5"
                  >
                    {liker.avatarUrl ? (
                      <img
                        src={liker.avatarUrl}
                        alt={liker.nickname}
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-bold text-indigo-200">
                        {liker.nickname.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {liker.nickname}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        @{liker.username}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Paylaşım Bildirme Modalı */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#151821] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <Flag className="h-4 w-4" />
                <h3 className="text-sm font-semibold text-white">
                  Paylaşımı Bildir
                </h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                "Spam / Reklam",
                "Rahatsız edici içerik",
                "Hakaret / Taciz",
                "Telif veya yanlış bilgi",
              ].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReportReason(r)}
                  className={`block w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                    reportReason === r
                      ? "border-rose-500 bg-rose-500/15 text-white"
                      : "border-white/10 bg-[#0F1115] text-gray-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-xl px-3 py-2 text-xs text-gray-400 hover:text-white"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  submitReport(
                    "POST",
                    post.id,
                    `${author.nickname}: "${post.content.slice(0, 45)}..."`,
                    reportReason
                  );
                  setShowReportModal(false);
                }}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400"
              >
                Bildir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renkli Altını Çizme Formu (Sadece Okurlar İçin) */}
      {showHighlightInput && !isOwnPost && (
        <form
          onSubmit={handleHighlightSubmit}
          className="mt-3 rounded-xl border border-white/10 bg-[#0F1115]/90 p-3 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-300">
              Altı çizilen kısmı sadece sen ve{" "}
              <strong className="text-amber-300">Yakın Arkadaşların</strong>{" "}
              görebilir:
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  onClick={() => setHighlightColor(c.id)}
                  className={`h-5 w-5 rounded-full ${c.dotClass} transition ${
                    highlightColor === c.id
                      ? "ring-2 ring-white scale-110"
                      : "opacity-50 hover:opacity-90"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              placeholder="Altını çizmek istediğin cümleyi yaz veya metinden seç..."
              className="flex-1 rounded-lg border border-white/15 bg-[#151821] px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Çiz
            </button>
          </div>

          {myHighlights.length > 0 && (
            <div className="border-t border-white/10 pt-2 space-y-1.5">
              <div className="text-[10px] font-medium text-gray-400">
                Altını Çizdiklerim (Kaldırmak için tıkla):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {myHighlights.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => removeHighlight(post.id, h.id)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#151821] px-2 py-1 text-[11px] text-gray-200 hover:border-rose-500/40 hover:text-rose-300 transition"
                  >
                    <span className="max-w-[160px] truncate">&ldquo;{h.text}&rdquo;</span>
                    <X className="h-3 w-3 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {/* Bağlamlı Mesaj İsteği Formu */}
      {showMsgRequest && (
        <form
          onSubmit={handleMsgRequestSubmit}
          className="mt-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3 space-y-2"
        >
          <div className="text-xs text-indigo-200">
            <strong>{author.nickname}</strong> adlı kişiye bu paylaşım üzerinden
            ilk mesaj isteğini gönder:
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={firstMsg}
              onChange={(e) => setFirstMsg(e.target.value)}
              placeholder="Bu satırlar bana şunu hissettirdi..."
              className="flex-1 rounded-lg border border-white/10 bg-[#0F1115] px-3 py-2 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Gönder</span>
            </button>
          </div>
        </form>
      )}

      {/* Yorumlar */}
      {showComments && (
        <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
          {post.comments.filter((c) => !blockedUserIds.includes(c.userId)).length === 0 ? (
            <p className="text-xs text-gray-500">
              Henüz yorum yok. İlk hissi sen bırak.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 pb-1">
                <span className="text-[11px] font-medium text-gray-400">
                  Yorumlar ({post.comments.filter((c) => !blockedUserIds.includes(c.userId)).length})
                </span>
                <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#0F1115] p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setCommentSort("NEWEST")}
                    className={`rounded-md px-2 py-0.5 font-medium transition ${
                      commentSort === "NEWEST"
                        ? "bg-indigo-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Son Gönderilenler
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommentSort("TOP")}
                    className={`rounded-md px-2 py-0.5 font-medium transition ${
                      commentSort === "TOP"
                        ? "bg-indigo-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    En Çok Beğenilenler
                  </button>
                </div>
              </div>
              {[...post.comments]
                .filter((c) => !blockedUserIds.includes(c.userId))
                .sort((a, b) => {
                  if (commentSort === "TOP") {
                    const diff = (b.likes?.length || 0) - (a.likes?.length || 0);
                    if (diff !== 0) return diff;
                  }
                  return (b.createdAtMs || 0) - (a.createdAtMs || 0);
                })
                .map((c) => {
                const canDeleteComment =
                  isAdmin || c.userId === currentUser.id || isOwnPost;
                const isCommentLiked = (c.likes || []).includes(currentUser.id);
                return (
                  <div
                    key={c.id}
                    className="rounded-lg bg-[#0F1115]/70 px-3 py-2 text-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-indigo-300">
                          {c.nickname}:{" "}
                        </span>
                        {c.body && (
                          <span className="text-gray-200">{c.body}</span>
                        )}
                        <span className="ml-2 text-[10px] text-gray-500">
                          {formatRelativeTime(c.createdAtMs, c.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleCommentLike(post.id, c.id)}
                          title="Yorumu Beğen"
                          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition ${
                            isCommentLiked
                              ? "bg-rose-500/15 text-rose-400"
                              : "text-gray-500 hover:bg-white/5 hover:text-rose-300"
                          }`}
                        >
                          <Heart
                            className={`h-3 w-3 ${
                              isCommentLiked ? "fill-current" : ""
                            }`}
                          />
                          {(c.likes?.length || 0) > 0 && (
                            <span>{c.likes!.length}</span>
                          )}
                        </button>
                        <button
                          type="button"
                          title="Yorumu Şikayet Et"
                          onClick={() =>
                            submitReport(
                              "COMMENT",
                              c.id,
                              `${c.nickname}: ${c.body || "[Medya]"}`,
                              "Uygunsuz yorum"
                            )
                          }
                          className="rounded p-1 text-gray-500 hover:bg-amber-500/15 hover:text-amber-400 transition"
                        >
                          <Flag className="h-3 w-3" />
                        </button>
                        {canDeleteComment && (
                          <button
                            type="button"
                            title="Yorumu Sil"
                            onClick={() =>
                              requestConfirm({
                                title: "Yorumu Sil",
                                message: "Bu yorumu silmek istediğine emin misin?",
                                confirmLabel: "Sil",
                                onConfirm: () => deleteComment(post.id, c.id),
                              })
                            }
                            className="rounded p-1 text-gray-500 hover:bg-rose-500/15 hover:text-rose-400 transition"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    {c.attachmentUrl && (
                      <div className="pt-1">
                        <img
                          src={c.attachmentUrl}
                          alt={c.attachmentType === "GIF" ? "GIF" : "Fotoğraf"}
                          className="max-h-48 rounded-lg border border-white/10 object-contain"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {commentAttachment && (
            <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-950/20 p-2">
              <img
                src={commentAttachment.url}
                alt="Ek"
                className="h-12 w-12 rounded object-cover border border-white/10"
              />
              <span className="flex-1 text-[11px] text-indigo-200">
                {commentAttachment.type === "GIF" ? "GIF eklendi" : "Fotoğraf eklendi"}
              </span>
              <button
                type="button"
                onClick={() => setCommentAttachment(null)}
                className="rounded p-1 text-gray-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {showGifInput && (
            <div className="flex gap-1.5">
              <input
                type="url"
                value={gifUrlInput}
                onChange={(e) => setGifUrlInput(e.target.value)}
                placeholder="GIF bağlantısı yapıştır (https://...gif)"
                className="flex-1 rounded-lg border border-white/10 bg-[#0F1115] px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = gifUrlInput.trim();
                  if (!trimmed) return;
                  setCommentAttachment({ url: trimmed, type: "GIF" });
                  setShowGifInput(false);
                  setGifUrlInput("");
                }}
                className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                Ekle
              </button>
            </div>
          )}

          <form
            onSubmit={handleCommentSubmit}
            onDragOver={(e) => {
              e.preventDefault();
              setIsCommentDragOver(true);
            }}
            onDragLeave={() => setIsCommentDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsCommentDragOver(false);
              const file = e.dataTransfer?.files?.[0];
              if (file) handleCommentFile(file);
            }}
            className={`flex items-center gap-1.5 rounded-xl p-1 transition ${
              isCommentDragOver
                ? "ring-2 ring-indigo-500 bg-indigo-500/10"
                : ""
            }`}
          >
            <label
              title="Fotoğraf / GIF Yükle"
              className="cursor-pointer rounded-lg border border-white/10 bg-[#0F1115] p-2 text-gray-400 hover:bg-white/10 hover:text-white transition"
            >
              <ImageIcon className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleCommentImageUpload}
                className="hidden"
              />
            </label>
            <button
              type="button"
              title="GIF Linki Ekle"
              onClick={() => setShowGifInput((v) => !v)}
              className={`rounded-lg border px-2 py-2 text-[10px] font-bold transition ${
                showGifInput
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                  : "border-white/10 bg-[#0F1115] text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              GIF
            </button>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onPaste={handleCommentPaste}
              placeholder="Yorum yaz, GIF yapıştır veya sürükle..."
              className="flex-1 rounded-lg border border-white/10 bg-[#0F1115] px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
            >
              Gönder
            </button>
          </form>
        </div>
      )}

      {/* Okuma Modu (Tam Ekran Rahat Okuma) */}
      {showReadingModal && (
        <div
          onClick={() => setShowReadingModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[88dvh] overflow-y-auto rounded-2xl border border-white/15 bg-[#12151D] p-6 sm:p-8 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="text-xs font-semibold text-indigo-300">
                  {author.nickname} · @{author.username}
                </div>
                <div className="text-[11px] text-gray-400">
                  {typeBadge[post.type]} ·{" "}
                  {formatRelativeTime(post.createdAtMs, post.createdAt)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReadingModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-gray-300 hover:bg-white/15 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {post.title && (
              <h2 className="text-2xl font-bold text-white break-words">
                {post.title}
              </h2>
            )}

            <div
              className={`whitespace-pre-line break-words text-base sm:text-lg text-gray-100 leading-loose ${getFontClass(
                post.fontStyle
              )}`}
            >
              {renderStyledAndHighlightedContent(post.content, visibleHighlights)}
            </div>

            {(post.bookTitle || post.bookAuthor) && (
              <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-xs text-indigo-300">
                <BookOpen className="h-4 w-4" />
                <span>
                  {post.bookTitle}
                  {post.bookAuthor ? ` — ${post.bookAuthor}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
