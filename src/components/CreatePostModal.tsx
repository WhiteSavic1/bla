"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Music, Save, Send, Sparkles, Plus, Undo2, Redo2, Play, Square, Volume2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTextHistory } from "@/hooks/useTextHistory";
import {
  extractYouTubeId,
  FONT_STYLE_OPTIONS,
  getFontClass,
  MOOD_TAGS,
  SAMPLE_TRACK_CATALOG,
  suggestTagsFromText,
} from "@/lib/constants";
import { FontStyle, PostType, TrackInfo } from "@/types/persona";
import { RealSongSearch } from "./RealSongSearch";

function renderPreviewText(text: string, baseStyle: FontStyle): React.ReactNode {
  const regex = /\[\[(SANS|ITALIC|SERIF|HANDWRITING|MONO|CALLIGRAPHY):([\s\S]*?)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const style = match[1] as FontStyle;
    const inner = match[2];
    parts.push(
      <span key={match.index} className={getFontClass(style)}>
        {inner}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <span className={getFontClass(baseStyle)}>{parts}</span>;
}

export function CreatePostModal() {
  const { showCreateModal, setShowCreateModal, createPost, showToast, posts, currentUser } =
    useApp();

  const [type, setType] = useState<PostType>("THOUGHT");
  const [title, setTitle] = useState("");
  const {
    value: content,
    setValue: setContent,
    undo: undoContent,
    redo: redoContent,
    reset: resetContent,
    handleKeyDown: handleContentKeyDown,
    canUndo: canUndoContent,
    canRedo: canRedoContent,
  } = useTextHistory("");
  const [fontStyle, setFontStyle] = useState<FontStyle>("SANS");
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");

  // Opsiyonel Şarkı Alanları
  const [includeTrack, setIncludeTrack] = useState(false);
  const [trackTitle, setTrackTitle] = useState("");
  const [trackUrl, setTrackUrl] = useState("");
  const [trackPreviewUrl, setTrackPreviewUrl] = useState("");
  const [trackArtworkUrl, setTrackArtworkUrl] = useState("");
  const [trackArtist, setTrackArtist] = useState("");
  const [trackNote, setTrackNote] = useState("");
  const [trackStartInput, setTrackStartInput] = useState("");
  const [trackEndInput, setTrackEndInput] = useState("");
  const [trackMood, setTrackMood] =
    useState<TrackInfo["synthMood"]>("night");
  const [isPreviewingTrack, setIsPreviewingTrack] = useState(false);
  const [previewVolume, setPreviewVolume] = useState(75);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewYtRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.volume = Math.max(0, Math.min(1, previewVolume / 100));
    }
    if (previewYtRef.current?.contentWindow) {
      previewYtRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func: "setVolume", args: [previewVolume] }),
        "*"
      );
    }
  }, [previewVolume, isPreviewingTrack]);

  useEffect(() => {
    if (!showCreateModal || !includeTrack) {
      setIsPreviewingTrack(false);
    }
  }, [showCreateModal, includeTrack]);

  const parseSecInput = (val: string): number | undefined => {
    const clean = val.trim();
    if (!clean) return undefined;
    if (clean.includes(":")) {
      const [mStr, sStr] = clean.split(":");
      const m = Number(mStr);
      const s = Number(sStr);
      if (Number.isFinite(m) && Number.isFinite(s) && m >= 0 && s >= 0) {
        return Math.floor(m * 60 + s);
      }
      return undefined;
    }
    const n = Number(clean);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const autoSuggestedTags = useMemo(
    () =>
      suggestTagsFromText(
        `${title} ${content}`,
        includeTrack ? trackTitle : undefined,
        includeTrack ? trackArtist : undefined
      ).filter((t) => !selectedMoods.includes(t)),
    [title, content, includeTrack, trackTitle, trackArtist, selectedMoods]
  );

  if (!showCreateModal) return null;

  const toggleMood = (tag: string) => {
    setSelectedMoods((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const raw = customTagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!raw) return;
    const formatted = raw.startsWith("#") ? raw : `#${raw}`;
    if (!selectedMoods.includes(formatted)) {
      setSelectedMoods((prev) => [...prev, formatted]);
    }
    setCustomTagInput("");
  };

  const applyInlineStyleToSelection = (style: FontStyle) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) {
      // Seçili metin yoksa genel yazı stilini değiştir
      setFontStyle(style);
      return;
    }
    const selected = content.slice(start, end);
    const wrapped = `[[${style}:${selected}]]`;
    const next = content.slice(0, start) + wrapped + content.slice(end);
    setContent(next, { immediate: true });
    showToast("Seçili kısma özel yazı stili uygulandı!");
  };

  const selectCatalogTrack = (t: TrackInfo) => {
    setTrackTitle(t.title);
    setTrackArtist(t.artist || "");
    setTrackMood(t.synthMood || "night");
  };

  const handleSubmit = (status: "PUBLISHED" | "DRAFT") => {
    if (!content.trim()) return;
    createPost({
      type,
      status,
      title: title.trim() || undefined,
      content: content.trim(),
      fontStyle,
      moodTags: selectedMoods,
      bookTitle: type === "QUOTE" ? bookTitle.trim() || undefined : undefined,
      bookAuthor: type === "QUOTE" ? bookAuthor.trim() || undefined : undefined,
      attachedTrack:
        includeTrack && (trackTitle.trim() || trackUrl.trim())
          ? {
              id: `trk_${Date.now()}`,
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
              startSec: parseSecInput(trackStartInput),
              endSec: parseSecInput(trackEndInput),
            }
          : undefined,
    });
    setTitle("");
    resetContent("");
    setBookTitle("");
    setBookAuthor("");
    setTrackTitle("");
    setTrackUrl("");
    setTrackPreviewUrl("");
    setTrackArtworkUrl("");
    setTrackArtist("");
    setTrackNote("");
    setTrackStartInput("");
    setTrackEndInput("");
    setIsPreviewingTrack(false);
    setIncludeTrack(false);
    setShowCreateModal(false);
  };

  const previousUserTags = Array.from(
    new Set([
      ...posts
        .filter((p) => p.authorId === currentUser.id)
        .flatMap((p) => p.moodTags || []),
      ...posts.flatMap((p) => p.moodTags || []),
    ])
  );

  const allAvailableTags = Array.from(
    new Set([...MOOD_TAGS, ...previousUserTags, ...selectedMoods])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#151821] shadow-2xl overflow-hidden">
        {/* Sabit Üst Başlık */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#151821] px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Yeni Paylaşım Oluştur
          </h2>
          <button
            onClick={() => setShowCreateModal(false)}
            aria-label="Kapat"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Kaydırılabilir Gövde */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: "THOUGHT", label: "Duygu & Düşünce" },
                { id: "BLOG", label: "Blog Yazısı" },
                { id: "LYRIC", label: "Sözler" },
                { id: "QUOTE", label: "Kitap Alıntısı" },
              ] as { id: PostType; label: string }[]
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id)}
                className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                  type === item.id
                    ? "bg-indigo-600 text-white"
                    : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {type === "BLOG" && (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blog yazısı başlığı..."
              className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            />
          )}

          {/* Yazı Stili Seçici (Seçili Kısma veya Tümüne Uygula) */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2 text-xs text-gray-400">
              <span>Cümle Yazı Stili</span>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[10px] text-indigo-300">
                  İpucu: Seçip stile tıkla • Ctrl+Z / Ctrl+Y
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={undoContent}
                    disabled={!canUndoContent}
                    title="Geri Al (Ctrl+Z)"
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0F1115] px-2 py-1 text-[11px] text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-35 transition"
                  >
                    <Undo2 className="h-3 w-3" />
                    <span>Geri Al</span>
                  </button>
                  <button
                    type="button"
                    onClick={redoContent}
                    disabled={!canRedoContent}
                    title="İleri Al (Ctrl+Y)"
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0F1115] px-2 py-1 text-[11px] text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-35 transition"
                  >
                    <Redo2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {FONT_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()} // Selection kaybolmasın
                  onClick={() => applyInlineStyleToSelection(opt.id)}
                  className={`rounded-xl border px-2.5 py-2 text-center transition ${
                    fontStyle === opt.id
                      ? "border-indigo-500 bg-indigo-500/20 text-white"
                      : "border-white/10 bg-[#0F1115] text-gray-400 hover:text-white"
                  }`}
                >
                  <div className={`text-xs ${opt.className}`}>Aa</div>
                  <div className="mt-0.5 text-[10px] truncate">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <textarea
            ref={textareaRef}
            rows={type === "BLOG" ? 5 : 4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleContentKeyDown}
            placeholder={
              type === "LYRIC"
                ? "Sevdiğin 1–8 satırlık şarkı sözünü yaz..."
                : type === "QUOTE"
                ? "Kitaptan sevdiğin cümleyi yaz..."
                : "Duygularını, düşüncelerini veya yazını bırak..."
            }
            className={`w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none ${getFontClass(
              fontStyle
            )}`}
          />

          {/* Parçalı Stil Önizlemesi */}
          {content.includes("[[") && (
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-3 text-xs text-gray-200">
              <div className="mb-1 text-[10px] font-semibold text-indigo-300">
                Canlı Stil Önizlemesi:
              </div>
              <div className="whitespace-pre-line">
                {renderPreviewText(content, fontStyle)}
              </div>
            </div>
          )}

          {type === "QUOTE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Kitap adı..."
                className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
              <input
                type="text"
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder="Yazar (opsiyonel)..."
                className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          )}

          {/* Şarkı Ekle */}
          <div className="rounded-xl border border-white/10 bg-[#0F1115]/60 p-3.5">
            <button
              type="button"
              onClick={() => setIncludeTrack((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-emerald-300"
            >
              <Music className="h-4 w-4" />
              <span>
                {includeTrack
                  ? "Şarkı Eklemeyi Kapat"
                  : "+ Şarkı Ekle (Sanatçı ve not zorunlu değil)"}
              </span>
            </button>

            {includeTrack && (
              <div className="mt-3 space-y-3">
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
                  className="w-full rounded-lg border border-white/10 bg-[#151821] px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <input
                  type="url"
                  value={trackUrl}
                  onChange={(e) => setTrackUrl(e.target.value)}
                  placeholder="YouTube veya Spotify şarkı linki (isteğe bağlı)..."
                  className="w-full rounded-lg border border-white/10 bg-[#151821] px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={trackArtist}
                    onChange={(e) => setTrackArtist(e.target.value)}
                    placeholder="Sanatçı (isteğe bağlı)"
                    className="rounded-lg border border-white/10 bg-[#151821] px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={trackNote}
                    onChange={(e) => setTrackNote(e.target.value)}
                    placeholder="Şarkıya not ekle (isteğe bağlı)"
                    className="rounded-lg border border-white/10 bg-[#151821] px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={trackStartInput}
                    onChange={(e) => setTrackStartInput(e.target.value)}
                    placeholder="Başlangıç (örn. 0:45 veya 45)"
                    className="rounded-lg border border-white/10 bg-[#151821] px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={trackEndInput}
                    onChange={(e) => setTrackEndInput(e.target.value)}
                    placeholder="Bitiş (örn. 1:15 — boş=sonu)"
                    className="rounded-lg border border-white/10 bg-[#151821] px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>

                {/* Şarkı Önizleme ve Ses Seviyesi Kontrolü */}
                {(trackPreviewUrl || extractYouTubeId(trackUrl)) && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-emerald-500/25 bg-[#151821]/90 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setIsPreviewingTrack((v) => !v)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        isPreviewingTrack
                          ? "bg-rose-500 text-white hover:bg-rose-400"
                          : "bg-emerald-500 text-black hover:bg-emerald-400"
                      }`}
                    >
                      {isPreviewingTrack ? (
                        <>
                          <Square className="h-3.5 w-3.5 fill-current" />
                          <span>Önizlemeyi Durdur</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Seçili Kısmı Önizle</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2 flex-1 min-w-[140px] max-w-[220px]">
                      <Volume2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={previewVolume}
                        onChange={(e) => setPreviewVolume(Number(e.target.value))}
                        aria-label="Önizleme Ses Seviyesi"
                        className="h-1.5 flex-1 accent-emerald-400 cursor-pointer"
                      />
                      <span className="w-8 text-right text-[11px] text-gray-300 tabular-nums">
                        %{previewVolume}
                      </span>
                    </div>

                    {isPreviewingTrack &&
                      (() => {
                        const ytId = extractYouTubeId(trackUrl);
                        const sSec = parseSecInput(trackStartInput) || 0;
                        const eSec = parseSecInput(trackEndInput);
                        if (ytId) {
                          return (
                            <div className="h-0 w-0 overflow-hidden opacity-0 pointer-events-none">
                              <iframe
                                ref={previewYtRef}
                                key={`${ytId}_${sSec}_${eSec || ""}`}
                                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1${
                                  sSec > 0 ? `&start=${sSec}` : ""
                                }${typeof eSec === "number" && eSec > sSec ? `&end=${eSec}` : ""}`}
                                title="Önizleme"
                                allow="autoplay; encrypted-media"
                                onLoad={() => {
                                  previewYtRef.current?.contentWindow?.postMessage(
                                    JSON.stringify({
                                      event: "command",
                                      func: "setVolume",
                                      args: [previewVolume],
                                    }),
                                    "*"
                                  );
                                }}
                                className="h-1 w-1"
                              />
                            </div>
                          );
                        }
                        if (trackPreviewUrl) {
                          return (
                            <audio
                              ref={previewAudioRef}
                              src={trackPreviewUrl}
                              autoPlay
                              onLoadedMetadata={(e) => {
                                const el = e.currentTarget;
                                el.volume = Math.max(0, Math.min(1, previewVolume / 100));
                                if (sSec > 0 && sSec < (el.duration || 30)) {
                                  el.currentTime = sSec;
                                }
                              }}
                              onTimeUpdate={(e) => {
                                const el = e.currentTarget;
                                if (typeof eSec === "number" && eSec > sSec && el.currentTime >= eSec) {
                                  el.pause();
                                  setIsPreviewingTrack(false);
                                }
                              }}
                              onEnded={() => setIsPreviewingTrack(false)}
                              className="hidden"
                            />
                          );
                        }
                        return null;
                      })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Otomatik Etiket Önerisi + Sınırsız Özel Etiket Ekleme */}
          <div className="space-y-2.5">
            {autoSuggestedTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-2.5">
                <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-200 mr-1">
                  <Sparkles className="h-3 w-3" />
                  Önerilen:
                </span>
                {autoSuggestedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleMood(tag)}
                    className="rounded-full bg-indigo-600/40 px-2.5 py-0.5 text-[11px] text-white hover:bg-indigo-600"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {allAvailableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleMood(tag)}
                  className={`rounded-full px-3 py-1 text-[11px] transition ${
                    selectedMoods.includes(tag)
                      ? "bg-indigo-600 text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="İstediğin yeni etiketi yaz (örn: #gece-yürüyüşü)..."
                className="flex-1 rounded-xl border border-white/10 bg-[#0F1115] px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ekle</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sabit Alt Aksiyon Barı */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-white/10 bg-[#151821] px-6 py-4">
          {type === "BLOG" && (
            <button
              type="button"
              onClick={() => handleSubmit("DRAFT")}
              disabled={!content.trim()}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-medium text-gray-200 hover:bg-white/10 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Taslak Kaydet</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit("PUBLISHED")}
            disabled={!content.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Yayınla</span>
          </button>
        </div>
      </div>
    </div>
  );
}
