"use client";

import React, { useState } from "react";
import {
  User,
  Image as ImageIcon,
  Music,
  Lock,
  Bookmark,
  Heart,
  Check,
  Upload,
  LifeBuoy,
  ShieldAlert,
  Play,
  Square,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTextHistory } from "@/hooks/useTextHistory";
import {
  extractYouTubeId,
  FONT_STYLE_OPTIONS,
  MOOD_TAGS,
  PRESET_BACKGROUNDS,
  SAMPLE_TRACK_CATALOG,
} from "@/lib/constants";
import { FontStyle, JournalLockType, TrackInfo } from "@/types/persona";
import { PostCard } from "./PostCard";
import { PatternLockGrid } from "./PatternLockGrid";
import { RealSongSearch } from "./RealSongSearch";

export function SettingsView() {
  const {
    currentUser,
    updateCurrentUser,
    feedBackgroundUrl,
    setFeedBackgroundUrl,
    feedBgDim,
    setFeedBgDim,
    journalLock,
    updateJournalLock,
    supportTickets,
    createSupportTicket,
    adminResetJournalLock,
    posts,
    savedPostIds,
    showToast,
    themeMode,
    setThemeMode,
    showCloseFriendHighlights,
    setShowCloseFriendHighlights,
  } = useApp();

  const [tab, setTab] = useState<
    "PROFILE" | "APPEARANCE" | "MUSIC" | "SECURITY" | "SAVED" | "LIKED"
  >("PROFILE");

  // Profile form state
  const [nickname, setNickname] = useState(currentUser.nickname);
  const {
    value: bio,
    setValue: setBio,
    handleKeyDown: handleBioKeyDown,
  } = useTextHistory(currentUser.bio);
  const [mood, setMood] = useState(currentUser.currentMood);
  const {
    value: quoteText,
    setValue: setQuoteText,
    handleKeyDown: handleQuoteKeyDown,
  } = useTextHistory(currentUser.featuredQuote?.quoteText || "");
  const [bookTitle, setBookTitle] = useState(
    currentUser.featuredQuote?.bookTitle || ""
  );
  const [bookAuthor, setBookAuthor] = useState(
    currentUser.featuredQuote?.authorName || ""
  );
  const [quoteFont, setQuoteFont] = useState<FontStyle>(
    currentUser.featuredQuote?.fontStyle || "SERIF"
  );

  // Music form state
  const [pinnedTitle, setPinnedTitle] = useState(
    currentUser.pinnedTrack?.title || ""
  );
  const [pinnedUrl, setPinnedUrl] = useState(
    currentUser.pinnedTrack?.url || ""
  );
  const [pinnedPreviewUrl, setPinnedPreviewUrl] = useState(
    currentUser.pinnedTrack?.previewUrl || ""
  );
  const [pinnedArtworkUrl, setPinnedArtworkUrl] = useState(
    currentUser.pinnedTrack?.artworkUrl || ""
  );
  const [pinnedArtist, setPinnedArtist] = useState(
    currentUser.pinnedTrack?.artist || ""
  );
  const [pinnedNote, setPinnedNote] = useState(
    currentUser.pinnedTrack?.personalNote || ""
  );
  const [pinnedMood, setPinnedMood] = useState<TrackInfo["synthMood"]>(
    currentUser.pinnedTrack?.synthMood || "night"
  );

  const [profAudioTitle, setProfAudioTitle] = useState(
    currentUser.profileAudio?.title || ""
  );
  const [profAudioUrl, setProfAudioUrl] = useState(
    currentUser.profileAudio?.url || ""
  );
  const [profAudioPreviewUrl, setProfAudioPreviewUrl] = useState(
    currentUser.profileAudio?.previewUrl || ""
  );
  const [profAudioArtworkUrl, setProfAudioArtworkUrl] = useState(
    currentUser.profileAudio?.artworkUrl || ""
  );
  const [profAudioArtist, setProfAudioArtist] = useState(
    currentUser.profileAudio?.artist || ""
  );
  const [profAudioMood, setProfAudioMood] = useState<TrackInfo["synthMood"]>(
    currentUser.profileAudio?.synthMood || "night"
  );
  const [startSecInput, setStartSecInput] = useState(
    String(currentUser.profileAudio?.startSec ?? 10)
  );
  const [endSecInput, setEndSecInput] = useState(
    String(currentUser.profileAudio?.endSec ?? 40)
  );
  const startSec = Number(startSecInput || 0);
  const endSec = Number(endSecInput || 0);

  const [recentBackgrounds, setRecentBackgrounds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("satir_arasi_recent_bgs_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string" && x) : [];
    } catch {
      return [];
    }
  });

  const saveRecentBackground = (url: string) => {
    if (!url) return;
    setRecentBackgrounds((prev) => {
      const next = [url, ...prev.filter((u) => u !== url)].slice(0, 8);
      try {
        localStorage.setItem("satir_arasi_recent_bgs_v1", JSON.stringify(next));
      } catch {
        // ignore storage quota
      }
      return next;
    });
  };

  const removeRecentBackground = (url: string) => {
    setRecentBackgrounds((prev) => {
      const next = prev.filter((u) => u !== url);
      try {
        localStorage.setItem("satir_arasi_recent_bgs_v1", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
    if (feedBackgroundUrl === url) {
      setFeedBackgroundUrl("");
    }
    showToast("Arka plan son kullanılanlardan kaldırıldı.");
  };

  // Security PIN + Pattern state
  const [oldPin, setOldPin] = useState("");
  const [oldPattern, setOldPattern] = useState<number[]>([]);
  const [nextLockType, setNextLockType] = useState<JournalLockType>(
    journalLock.type
  );
  const [newPin, setNewPin] = useState("");
  const [newPattern, setNewPattern] = useState<number[]>([]);
  const [secError, setSecError] = useState<string | null>(null);
  const [ticketReason, setTicketReason] = useState("");
  const [isPreviewingAudio, setIsPreviewingAudio] = useState(false);
  const [showLockChangeForm, setShowLockChangeForm] = useState(false);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onLoad: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onLoad(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUser({
      nickname: nickname.trim() || currentUser.nickname,
      bio: bio.trim(),
      currentMood: mood,
      featuredQuote: quoteText.trim()
        ? {
            id: "q_me",
            quoteText: quoteText.trim(),
            bookTitle: bookTitle.trim() || "Kitaptan",
            authorName: bookAuthor.trim() || undefined,
            fontStyle: quoteFont,
          }
        : undefined,
    });
    showToast("Profil bilgilerin güncellendi!");
  };

  const saveMusicSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const safeStart = Math.max(0, startSec);
    const safeEnd = Math.min(safeStart + 30, Math.max(safeStart + 1, endSec));
    setStartSecInput(String(safeStart));
    setEndSecInput(String(safeEnd));

    updateCurrentUser({
      pinnedTrack:
        pinnedTitle.trim() || pinnedUrl.trim()
          ? {
              id: "t_me",
              title: pinnedTitle.trim() || "En Çok Dinlediğim",
              url: pinnedUrl.trim() || undefined,
              previewUrl: pinnedPreviewUrl || undefined,
              artworkUrl: pinnedArtworkUrl || undefined,
              artist: pinnedArtist.trim() || undefined,
              personalNote: pinnedNote.trim() || undefined,
              provider: pinnedPreviewUrl
                ? "ITUNES"
                : pinnedUrl.includes("spotify")
                ? "SPOTIFY"
                : pinnedUrl.includes("youtu")
                ? "YOUTUBE"
                : "AMBIENT",
              synthMood: pinnedMood,
            }
          : undefined,
      profileAudio:
        profAudioTitle.trim() || profAudioUrl.trim()
          ? {
              title: profAudioTitle.trim() || "Profil Müziğim",
              url: profAudioUrl.trim() || undefined,
              previewUrl: profAudioPreviewUrl || undefined,
              artworkUrl: profAudioArtworkUrl || undefined,
              artist: profAudioArtist.trim() || undefined,
              provider: profAudioPreviewUrl
                ? "ITUNES"
                : profAudioUrl.includes("spotify")
                ? "SPOTIFY"
                : profAudioUrl.includes("youtu")
                ? "YOUTUBE"
                : "AMBIENT",
              startSec: safeStart,
              endSec: safeEnd,
              synthMood: profAudioMood,
            }
          : undefined,
    });
    showToast(
      `Müzik ayarların kaydedildi (Profil kesiti: ${safeEnd - safeStart} sn).`
    );
  };

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);
    const res = updateJournalLock(
      {
        type: nextLockType,
        pin:
          nextLockType === "PIN" || nextLockType === "BOTH"
            ? newPin.trim()
            : undefined,
        pattern:
          nextLockType === "PATTERN" || nextLockType === "BOTH"
            ? newPattern
            : undefined,
      },
      oldPin,
      oldPattern
    );
    if (!res.ok) {
      setSecError(res.error || "Güvenlik ayarı güncellenemedi.");
    } else {
      setOldPin("");
      setOldPattern([]);
      setNewPin("");
      setNewPattern([]);
    }
  };

  const savedPosts = posts.filter((p) => savedPostIds.includes(p.id));
  const likedPosts = posts.filter((p) => p.likes.includes(currentUser.id));

  const tabs = [
    { id: "PROFILE", label: "Profil & Alıntı", icon: <User className="h-3.5 w-3.5" /> },
    { id: "APPEARANCE", label: "Akış Arka Planı", icon: <ImageIcon className="h-3.5 w-3.5" /> },
    { id: "MUSIC", label: "Müzik & 30sn", icon: <Music className="h-3.5 w-3.5" /> },
    { id: "SECURITY", label: "Günlük Kilidi & Destek", icon: <Lock className="h-3.5 w-3.5" /> },
    { id: "SAVED", label: `Kaydettiklerim (${savedPosts.length})`, icon: <Bookmark className="h-3.5 w-3.5" /> },
    { id: "LIKED", label: `Beğendiklerim (${likedPosts.length})`, icon: <Heart className="h-3.5 w-3.5" /> },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl px-4 pt-18 pb-28 space-y-6">
      <h1 className="text-2xl font-bold text-white">Ayarlar & Arşivim</h1>

      {/* Sekmeler */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              tab === t.id
                ? "bg-indigo-600 text-white"
                : "border border-white/10 bg-[#151821] text-gray-300 hover:bg-white/10"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. Profil & Alıntı */}
      {tab === "PROFILE" && (
        <form
          onSubmit={saveProfile}
          className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-5"
        >
          <div className="flex items-center gap-4">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="Avatar"
                className="h-16 w-16 rounded-2xl object-cover border border-white/20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/30 text-lg font-bold text-indigo-200">
                {currentUser.nickname.slice(0, 2).toUpperCase()}
              </div>
            )}
            <label className="cursor-pointer flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10">
              <Upload className="h-4 w-4" />
              <span>Profil Fotoğrafı Yükle</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handleFileUpload(e, (url) => {
                    updateCurrentUser({ avatarUrl: url });
                    showToast("Profil fotoğrafın güncellendi!");
                  })
                }
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Görünecek Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Ruh Halin
              </label>
              <input
                type="text"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="Ruh halini yaz... (örn: #gece-yarısı veya kendi hissin)"
                className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Biyografi</label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              onKeyDown={handleBioKeyDown}
              placeholder="Kendinden veya hislerinden kısaca bahset..."
              className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
            />
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="text-xs font-semibold text-indigo-300">
              Profildeki Kitap Cümlesi & Yazı Stili
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FONT_STYLE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setQuoteFont(opt.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] ${
                    quoteFont === opt.id
                      ? "bg-indigo-600 text-white"
                      : "bg-white/5 text-gray-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              onKeyDown={handleQuoteKeyDown}
              placeholder="Kitaptan sevdiğin cümle..."
              className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-sm text-white focus:outline-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Kitap Adı"
                className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder="Yazar (opsiyonel)"
                className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            <Check className="h-4 w-4" />
            <span>Kaydet</span>
          </button>
        </form>
      )}

      {/* 2. Görünüm & Tema */}
      {tab === "APPEARANCE" && (
        <div className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-5">
          {/* Tema Seçimi (Açık / Koyu / Sistem) */}
          <div className="space-y-2 pb-4 border-b border-white/10">
            <h2 className="text-sm font-semibold text-white">Tema Tonu</h2>
            <p className="text-xs text-gray-400">
              Varsayılan olarak cihazının sistem temasını otomatik algılar.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {(
                [
                  { id: "SYSTEM", label: "Sistem", icon: <Monitor className="h-4 w-4" /> },
                  { id: "DARK", label: "Koyu", icon: <Moon className="h-4 w-4" /> },
                  { id: "LIGHT", label: "Açık", icon: <Sun className="h-4 w-4" /> },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setThemeMode(opt.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                    themeMode === opt.id
                      ? "border-indigo-500 bg-indigo-500/20 text-white"
                      : "border-white/10 bg-[#0F1115] text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Yakın Arkadaşların Altını Çizdiklerini Göster/Gizle */}
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Yakın Arkadaşların Altını Çizdiklerini Göster
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Kapatırsan paylaşımlarda yalnızca kendi altını çizdiğin yerleri görürsün.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !showCloseFriendHighlights;
                setShowCloseFriendHighlights(next);
                showToast(
                  next
                    ? "Yakın arkadaş vurguları açıldı."
                    : "Yakın arkadaş vurguları gizlendi."
                );
              }}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                showCloseFriendHighlights
                  ? "bg-emerald-500 text-black hover:bg-emerald-400"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {showCloseFriendHighlights ? "Açık" : "Kapalı"}
            </button>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              Akış Sayfası Arka Plan Fotoğrafı
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Tam ekran akışın arkasına kendi fotoğrafını yükleyebilir veya
              hazır atmosferlerden birini seçebilirsin.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-500">
            <Upload className="h-4 w-4" />
            <span>Bilgisayardan / Telefondan Fotoğraf Seç</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                handleFileUpload(e, (url) => {
                  setFeedBackgroundUrl(url);
                  saveRecentBackground(url);
                  showToast("Akış arka planı güncellendi!");
                })
              }
            />
          </label>

          {recentBackgrounds.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-300">
                Son Eklediğim Arka Planlar
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {recentBackgrounds.map((url, idx) => (
                  <div
                    key={`${idx}_${url.slice(0, 24)}`}
                    className={`relative group rounded-xl border p-1.5 text-left transition ${
                      feedBackgroundUrl === url
                        ? "border-indigo-500 bg-indigo-500/20"
                        : "border-white/10 bg-[#0F1115] hover:border-white/25"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setFeedBackgroundUrl(url);
                        showToast("Önceki arka plan uygulandı!");
                      }}
                      className="w-full text-left"
                    >
                      <div
                        className="h-14 w-full rounded-lg bg-cover bg-center bg-[#0F1115]"
                        style={{ backgroundImage: `url(${url})` }}
                      />
                      <div className="mt-1 truncate text-[10px] text-gray-400">
                        Fotoğraf #{idx + 1}
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Son kullanılanlardan kaldır"
                      onClick={() => removeRecentBackground(url)}
                      className="absolute top-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-rose-500 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESET_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                onClick={() => {
                  setFeedBackgroundUrl(bg.url);
                  showToast(`Arka plan: ${bg.label}`);
                }}
                className={`rounded-xl border p-2 text-left transition ${
                  feedBackgroundUrl === bg.url
                    ? "border-indigo-500 bg-indigo-500/20"
                    : "border-white/10 bg-[#0F1115]"
                }`}
              >
                <div
                  className="h-16 w-full rounded-lg bg-cover bg-center bg-[#0F1115]"
                  style={
                    bg.url ? { backgroundImage: `url(${bg.url})` } : undefined
                  }
                />
                <div className="mt-1.5 truncate text-[11px] text-gray-200">
                  {bg.label}
                </div>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Yazı Okunabilirliği İçin Karartma: %{feedBgDim}
            </label>
            <input
              type="range"
              min={30}
              max={95}
              value={feedBgDim}
              onChange={(e) => setFeedBgDim(Number(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>
        </div>
      )}

      {/* 3. Müzik & Max 30 sn Profil Müziği (Katalog + Özel Giriş) */}
      {tab === "MUSIC" && (
        <form
          onSubmit={saveMusicSettings}
          className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-6"
        >
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-emerald-300">
              Profil Müziği (Profile Tıklanınca Otomatik Çalar · Maks 30 sn)
            </h2>
            <RealSongSearch
              onSelect={(t) => {
                setProfAudioTitle(t.title);
                setProfAudioArtist(t.artist || "");
                setProfAudioUrl(t.url || "");
                setProfAudioPreviewUrl(t.previewUrl || "");
                setProfAudioArtworkUrl(t.artworkUrl || "");
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={profAudioTitle}
                onChange={(e) => setProfAudioTitle(e.target.value)}
                placeholder="Şarkı adı..."
                className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                value={profAudioArtist}
                onChange={(e) => setProfAudioArtist(e.target.value)}
                placeholder="Sanatçı (isteğe bağlı)"
                className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>
            <input
              type="url"
              value={profAudioUrl}
              onChange={(e) => setProfAudioUrl(e.target.value)}
              placeholder="Gerçek YouTube veya Spotify şarkı linki (isteğe bağlı)..."
              className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Başlangıç (sn)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={startSecInput}
                  onChange={(e) =>
                    setStartSecInput(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Bitiş (sn) — Fark maks. 30 sn
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={endSecInput}
                  onChange={(e) =>
                    setEndSecInput(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="30"
                  className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-gray-400">
                Seçili süre: {Math.min(30, Math.max(1, endSec - startSec))} saniye
                (sistem maksimum 30 sn sınırını korur).
              </p>
              {(profAudioPreviewUrl || extractYouTubeId(profAudioUrl)) && (
                <button
                  type="button"
                  onClick={() => setIsPreviewingAudio((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                    isPreviewingAudio
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                  }`}
                >
                  {isPreviewingAudio ? (
                    <>
                      <Square className="h-3 w-3 fill-current" />
                      <span>Önizlemeyi Durdur</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      <span>Seçili Aralığı Dinle</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isPreviewingAudio && (() => {
              const safeStart = Math.max(0, startSec);
              const safeEnd = Math.min(safeStart + 30, Math.max(safeStart + 1, endSec));
              const ytPreviewId = extractYouTubeId(profAudioUrl);
              if (ytPreviewId) {
                return (
                  <div className="h-0 w-0 overflow-hidden opacity-0 pointer-events-none">
                    <iframe
                      key={`${ytPreviewId}_${safeStart}_${safeEnd}`}
                      src={`https://www.youtube.com/embed/${ytPreviewId}?autoplay=1&start=${safeStart}&end=${safeEnd}`}
                      title="Profil Müziği Önizleme"
                      allow="autoplay; encrypted-media"
                      className="h-1 w-1"
                    />
                  </div>
                );
              }
              if (profAudioPreviewUrl) {
                return (
                  <audio
                    src={profAudioPreviewUrl}
                    autoPlay
                    onEnded={() => setIsPreviewingAudio(false)}
                    className="hidden"
                  />
                );
              }
              return null;
            })()}
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <h2 className="text-sm font-semibold text-white">
              &ldquo;Bu Aralar En Çok Dinlediğim Şarkı&rdquo; Eklentisi
            </h2>
            <RealSongSearch
              onSelect={(t) => {
                setPinnedTitle(t.title);
                setPinnedArtist(t.artist || "");
                setPinnedUrl(t.url || "");
                setPinnedPreviewUrl(t.previewUrl || "");
                setPinnedArtworkUrl(t.artworkUrl || "");
              }}
            />
            <input
              type="text"
              value={pinnedTitle}
              onChange={(e) => setPinnedTitle(e.target.value)}
              placeholder="Şarkı adı..."
              className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />
            <input
              type="url"
              value={pinnedUrl}
              onChange={(e) => setPinnedUrl(e.target.value)}
              placeholder="Gerçek YouTube veya Spotify şarkı linki (isteğe bağlı)..."
              className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white focus:outline-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={pinnedArtist}
                onChange={(e) => setPinnedArtist(e.target.value)}
                placeholder="Sanatçı (zorunlu değil)"
                className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                value={pinnedNote}
                onChange={(e) => setPinnedNote(e.target.value)}
                placeholder="Şarkıya not ekle (zorunlu değil)"
                className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-black hover:bg-emerald-400"
          >
            Müzik Ayarlarını Kaydet
          </button>
        </form>
      )}

      {/* 4. Günlük & Düşüncelerim Kilidi (Şifre / Desen / İkisi + Eski Şifre Doğrulama + Destek Ticket) */}
      {tab === "SECURITY" && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveSecurity}
            className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-5"
          >
            <div>
              <h2 className="text-sm font-semibold text-white">
                Günlük & Düşüncelerim Güvenlik Kilidi
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Mevcut durum:{" "}
                <strong className="text-indigo-300">
                  {journalLock.type === "NONE"
                    ? "Kilitsiz"
                    : journalLock.type === "PIN"
                    ? "Şifre (PIN) Korumalı"
                    : journalLock.type === "PATTERN"
                    ? "Desen Korumalı"
                    : "Şifre + Desen Korumalı"}
                </strong>
              </p>
            </div>

            {/* Mevcut kilit varsa sadece "Şifreyi Değiştir / Kaldır" butonuna basınca doğrulama alanı açılır */}
            {journalLock.type !== "NONE" && !showLockChangeForm ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNextLockType("NONE");
                    setShowLockChangeForm(true);
                  }}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-xs font-medium text-rose-200 hover:bg-rose-500/25 transition"
                >
                  Şifreyi Kaldır
                </button>
                <button
                  type="button"
                  onClick={() => setShowLockChangeForm(true)}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-gray-200 hover:bg-white/10 transition"
                >
                  Kilidi Değiştir
                </button>
              </div>
            ) : (
              <>
                {journalLock.type !== "NONE" && (
                  <div className="space-y-3 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-300">
                        Devam etmek için mevcut kilidini doğrula:
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowLockChangeForm(false)}
                        className="text-[11px] text-gray-400 hover:text-white"
                      >
                        Vazgeç
                      </button>
                    </div>
                    {(journalLock.type === "PIN" ||
                      journalLock.type === "BOTH") && (
                      <input
                        type="password"
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value)}
                        placeholder="Mevcut Şifre (PIN)..."
                        className="w-full max-w-xs rounded-xl border border-white/15 bg-[#0F1115] px-3.5 py-2 text-xs text-white"
                      />
                    )}
                    {(journalLock.type === "PATTERN" ||
                      journalLock.type === "BOTH") && (
                      <PatternLockGrid
                        value={oldPattern}
                        onChange={setOldPattern}
                        label="Mevcut Desenini Çiz"
                      />
                    )}
                  </div>
                )}

                {/* Yeni Kilit Türü Seçimi */}
                <div className="space-y-2">
                  <div className="text-xs text-gray-300">Yeni Güvenlik Yöntemi:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { id: "NONE", label: "Kilitsiz" },
                        { id: "PIN", label: "Sadece Şifre" },
                        { id: "PATTERN", label: "Sadece Desen" },
                        { id: "BOTH", label: "Şifre + Desen" },
                      ] as { id: JournalLockType; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNextLockType(opt.id)}
                        className={`rounded-xl py-2 px-3 text-xs font-medium transition ${
                          nextLockType === opt.id
                            ? "bg-indigo-600 text-white"
                            : "border border-white/10 bg-[#0F1115] text-gray-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {(nextLockType === "PIN" || nextLockType === "BOTH") && (
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Yeni Şifre / PIN (en az 4 karakter)"
                    className="w-full max-w-xs rounded-xl border border-white/10 bg-[#0F1115] px-4 py-2.5 text-sm text-white focus:outline-none"
                  />
                )}

                {(nextLockType === "PATTERN" || nextLockType === "BOTH") && (
                  <PatternLockGrid
                    value={newPattern}
                    onChange={setNewPattern}
                    label="Yeni Desenini Çiz (En az 3 nokta)"
                  />
                )}

                {secError && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {secError}
                  </div>
                )}

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Güvenlik Ayarını Kaydet
                </button>
              </>
            )}
          </form>

          {/* Şifremi / Desenimi Unuttum -> Destek Talebi */}
          <div className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-300">
              <LifeBuoy className="h-4 w-4" />
              <h3 className="text-sm font-semibold">
                Şifreni veya Desenini mi Unuttun?
              </h3>
            </div>
            <p className="text-xs text-gray-400">
              Destek talebi (Ticket) oluşturduğunda yetkililer yalnızca kilidi
              sıfırlayabilir. Günlük ve Düşüncelerim içindeki notlarını asla
              göremezler.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={ticketReason}
                onChange={(e) => setTicketReason(e.target.value)}
                placeholder="Talep açıklaması (örn: Eski desenimi unuttum)..."
                className="flex-1 rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  createSupportTicket(ticketReason);
                  setTicketReason("");
                }}
                className="rounded-xl bg-amber-500/20 px-4 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/30"
              >
                Destek Talebi Aç
              </button>
            </div>

            {/* Kullanıcının Kendi Destek Talepleri Durumu */}
            {supportTickets.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                <div className="text-[11px] font-semibold text-gray-300">
                  Destek Taleplerin
                </div>
                {supportTickets.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0F1115] p-3 text-xs"
                  >
                    <div>
                      <div className="font-medium text-white">{t.reason}</div>
                      <div className="text-[10px] text-gray-400">
                        {t.createdAt}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        t.status === "OPEN"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {t.status === "OPEN"
                        ? "Yetkili İnceliyor"
                        : "Kilidin Sıfırlandı"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Kaydettiklerim */}
      {tab === "SAVED" && (
        <div className="space-y-4">
          {savedPosts.length === 0 ? (
            <p className="text-xs text-gray-400">
              Henüz kaydettiğin bir şarkı, cümle veya kitap alıntısı yok.
            </p>
          ) : (
            savedPosts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      )}

      {/* 6. Beğendiklerim */}
      {tab === "LIKED" && (
        <div className="space-y-4">
          {likedPosts.length === 0 ? (
            <p className="text-xs text-gray-400">
              Henüz beğendiğin bir paylaşım yok.
            </p>
          ) : (
            likedPosts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      )}
    </div>
  );
}
