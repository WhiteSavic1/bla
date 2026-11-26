"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Music,
  Play,
  Settings,
  ArrowLeft,
  UserPlus,
  UserCheck,
  Star,
  Flag,
  MessageCircle,
  Clock,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import {
  extractSpotifyTrackId,
  extractYouTubeId,
  formatSeconds,
  getFontClass,
} from "@/lib/constants";
import { PostCard } from "./PostCard";

export function ProfileView() {
  const {
    viewedProfileId,
    users,
    currentUser,
    posts,
    activeProfileAudio,
    toggleMuteProfileAudio,
    replayProfileAudio,
    playGlobalTrack,
    setActiveSection,
    publishDraft,
    friendIds,
    closeFriendIds,
    friendRequests,
    sendFriendRequest,
    cancelFriendRequest,
    removeFriend,
    toggleCloseFriend,
    startDirectChatFromProfile,
    submitReport,
    requestConfirm,
    blockedUserIds,
    toggleBlockUser,
    onlineUserIds,
    updateBannerTheme,
  } = useApp();

  const profileAudioRef = useRef<HTMLAudioElement | null>(null);
  const profileYoutubeRef = useRef<HTMLIFrameElement | null>(null);
  const [profileVolume, setProfileVolume] = useState<number>(() => {
    if (typeof window === "undefined") return 50;
    const saved = Number(localStorage.getItem("satir_arasi_profile_volume"));
    return Number.isFinite(saved) && saved >= 0 && saved <= 100 ? saved : 50;
  });
  const handleProfileVolumeChange = (next: number) => {
    const clamped = Math.max(0, Math.min(100, next));
    setProfileVolume(clamped);
    try {
      localStorage.setItem("satir_arasi_profile_volume", String(clamped));
    } catch {
      // ignore
    }
  };
  const toYtVol = (v: number) =>
    v <= 0 ? 0 : Math.max(1, Math.round(Math.pow(v / 100, 1.8) * 100));
  const user =
    users.find((u) => u.id === viewedProfileId) || currentUser;

  useEffect(() => {
    const el = profileAudioRef.current;
    if (el) {
      el.volume = Math.pow(Math.max(0, Math.min(100, profileVolume)) / 100, 2);
      if (
        activeProfileAudio &&
        activeProfileAudio.userId === user.id &&
        activeProfileAudio.isPlaying &&
        !activeProfileAudio.isMuted &&
        user.profileAudio?.previewUrl
      ) {
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    }
    if (profileYoutubeRef.current?.contentWindow) {
      profileYoutubeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "setVolume",
          args: [toYtVol(profileVolume)],
        }),
        "*"
      );
    }
  }, [
    activeProfileAudio?.userId,
    activeProfileAudio?.isPlaying,
    activeProfileAudio?.isMuted,
    user.id,
    user.profileAudio?.previewUrl,
    profileVolume,
  ]);
  const isOwnProfile = user.id === currentUser.id;
  const userPosts = posts.filter(
    (p) => p.authorId === user.id && (isOwnProfile || p.status === "PUBLISHED")
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-18 pb-28 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setActiveSection("FEED")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Akışa Dön</span>
        </button>

        {isOwnProfile ? (
          <button
            onClick={() => setActiveSection("SETTINGS")}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Profili & Müziği Düzenle</span>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {friendIds.includes(user.id) ? (
              <button
                onClick={() =>
                  requestConfirm({
                    title: "Arkadaşı Çıkar",
                    message: `${user.nickname} adlı kişiyi arkadaşlarından çıkarmak istediğine emin misin?`,
                    confirmLabel: "Çıkar",
                    onConfirm: () => removeFriend(user.id),
                  })
                }
                className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500/20"
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Arkadaş</span>
              </button>
            ) : friendRequests.some(
                (r) =>
                  r.status === "PENDING" &&
                  r.fromUserId === currentUser.id &&
                  r.toUserId === user.id
              ) ? (
              <button
                onClick={() => cancelFriendRequest(user.id)}
                title="İsteği geri çekmek için tıkla"
                className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-rose-500/20 hover:text-rose-200 transition"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>İstek Gönderildi (Geri Çek)</span>
              </button>
            ) : (
              <button
                onClick={() => sendFriendRequest(user.id)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Arkadaş Ekle</span>
              </button>
            )}

            <button
              onClick={() => startDirectChatFromProfile(user.id)}
              className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-200 hover:bg-indigo-500/25"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>
                {friendIds.includes(user.id)
                  ? "Mesaj Gönder"
                  : "Mesaj Gönder (1 Hak)"}
              </span>
            </button>
            {friendIds.includes(user.id) && (
              <button
                onClick={() => toggleCloseFriend(user.id)}
                className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  closeFriendIds.includes(user.id)
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "border border-white/10 bg-white/5 text-gray-400 hover:text-amber-300"
                }`}
              >
                <Star
                  className={`h-3.5 w-3.5 ${
                    closeFriendIds.includes(user.id) ? "fill-current" : ""
                  }`}
                />
                <span>Yakın Arkadaş</span>
              </button>
            )}
            <button
              onClick={() =>
                submitReport(
                  "USER",
                  user.id,
                  `${user.nickname} (@${user.username})`,
                  "Profil / Hesap bildirimi"
                )
              }
              title="Hesabı Bildir"
              className="flex items-center gap-1 rounded-xl border border-rose-500/25 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300 transition hover:bg-rose-500/20"
            >
              <Flag className="h-3.5 w-3.5" />
              <span>Bildir</span>
            </button>
            <button
              onClick={() => toggleBlockUser(user.id)}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                blockedUserIds.includes(user.id)
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  : "border-rose-500/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25"
              }`}
            >
              <span>
                {blockedUserIds.includes(user.id) ? "Engeli Kaldır" : "Engelle"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Profil Müziği Otomatik Çalma Çubuğu (Maks 30 sn) */}
      {user.profileAudio && activeProfileAudio?.userId === user.id && (() => {
        const ytId =
          extractYouTubeId(user.profileAudio.url) ||
          extractYouTubeId(user.profileAudio.title);
        const spId =
          extractSpotifyTrackId(user.profileAudio.url) ||
          extractSpotifyTrackId(user.profileAudio.title);

        return (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 backdrop-blur-md space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 ${
                    activeProfileAudio.isPlaying ? "animate-pulse" : ""
                  }`}
                >
                  <Music className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-emerald-200">
                    Profil Müziği: {user.profileAudio.title}
                    {user.profileAudio.artist
                      ? ` — ${user.profileAudio.artist}`
                      : ""}
                  </div>
                  <div className="text-[11px] text-emerald-300/75">
                    Aralık: {formatSeconds(user.profileAudio.startSec)} –{" "}
                    {formatSeconds(user.profileAudio.endSec)} ·{" "}
                    {activeProfileAudio.isPlaying
                      ? `Kalan: ${activeProfileAudio.remainingSec} sn`
                      : "30 sn kesit tamamlandı"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={toggleMuteProfileAudio}
                  title={activeProfileAudio.isMuted ? "Sesi Aç" : "Sustur"}
                  className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  {activeProfileAudio.isMuted ? (
                    <VolumeX className="h-4 w-4 text-rose-300" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-emerald-300" />
                  )}
                </button>
                <button
                  onClick={replayProfileAudio}
                  title="30 sn Kesiti Tekrar Çal"
                  className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Profil Müziği Ses Seviyesi */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0F1115]/50 px-3 py-1.5">
              <Volume2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] text-emerald-200/80 shrink-0">Ses</span>
              <input
                type="range"
                min={0}
                max={100}
                value={profileVolume}
                onChange={(e) => handleProfileVolumeChange(Number(e.target.value))}
                className="h-1.5 flex-1 accent-emerald-400 cursor-pointer"
              />
              <span className="w-8 text-right text-[11px] text-emerald-200/80">
                {profileVolume}%
              </span>
            </div>

            {user.profileAudio.previewUrl && (
              <audio
                ref={profileAudioRef}
                src={user.profileAudio.previewUrl}
                autoPlay
                className="hidden"
              />
            )}

            {!user.profileAudio.previewUrl &&
              ytId &&
              activeProfileAudio.isPlaying &&
              !activeProfileAudio.isMuted && (
                <div className="h-0 w-0 overflow-hidden opacity-0 pointer-events-none">
                  <iframe
                    ref={profileYoutubeRef}
                    className="h-1 w-1"
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&enablejsapi=1&start=${user.profileAudio.startSec}&end=${user.profileAudio.endSec}`}
                    title={user.profileAudio.title}
                    allow="autoplay; encrypted-media"
                    onLoad={() => {
                      profileYoutubeRef.current?.contentWindow?.postMessage(
                        JSON.stringify({
                          event: "command",
                          func: "setVolume",
                          args: [toYtVol(profileVolume)],
                        }),
                        "*"
                      );
                    }}
                  />
                </div>
              )}

            {spId && activeProfileAudio.isPlaying && !activeProfileAudio.isMuted && (
              <iframe
                className="h-20 w-full rounded-xl"
                src={`https://open.spotify.com/embed/track/${spId}?utm_source=generator&theme=0`}
                title={user.profileAudio.title}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              />
            )}
          </div>
        );
      })()}

      {/* Ana Profil Kartı */}
      {(() => {
        const bannerThemes: Record<string, string> = {
          indigo: "from-indigo-600/45 via-purple-600/30 to-transparent",
          emerald: "from-emerald-600/45 via-teal-600/30 to-transparent",
          rose: "from-rose-600/45 via-pink-600/30 to-transparent",
          amber: "from-amber-500/45 via-orange-600/30 to-transparent",
          violet: "from-violet-600/45 via-fuchsia-600/30 to-transparent",
          slate: "from-slate-500/45 via-zinc-600/30 to-transparent",
        };
        const activeBanner = bannerThemes[user.bannerTheme || "indigo"] || bannerThemes.indigo;
        const isOnline = isOwnProfile || onlineUserIds.includes(user.id);
        const totalLikes = userPosts.reduce((acc, p) => acc + p.likes.length, 0);
        const badges = [
          userPosts.length >= 1 ? { label: "İlk Satır", cls: "bg-indigo-500/20 text-indigo-200 border-indigo-500/30" } : null,
          userPosts.length >= 5 ? { label: "Aktif Yazar", cls: "bg-amber-500/20 text-amber-200 border-amber-500/30" } : null,
          user.profileAudio || user.pinnedTrack ? { label: "Müzik Tutkunu", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30" } : null,
          totalLikes >= 5 ? { label: "Popüler", cls: "bg-rose-500/20 text-rose-200 border-rose-500/30" } : null,
        ].filter((b): b is { label: string; cls: string } => Boolean(b));

        return (
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#151821]/90 p-6 shadow-xl backdrop-blur-md">
            <div className={`pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${activeBanner}`} />
            {isOwnProfile && (
              <div className="relative mb-3 flex items-center justify-end gap-1.5">
                <span className="text-[10px] text-gray-300/80 mr-1">Kapak:</span>
                {(
                  [
                    { id: "indigo", dot: "bg-indigo-500" },
                    { id: "emerald", dot: "bg-emerald-500" },
                    { id: "rose", dot: "bg-rose-500" },
                    { id: "amber", dot: "bg-amber-500" },
                    { id: "violet", dot: "bg-violet-500" },
                    { id: "slate", dot: "bg-slate-400" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => updateBannerTheme(t.id)}
                    title={`Kapak: ${t.id}`}
                    className={`h-4 w-4 rounded-full ${t.dot} transition ${
                      (user.bannerTheme || "indigo") === t.id
                        ? "ring-2 ring-white scale-110"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            )}
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.nickname}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-lg"
                />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-600/30 text-2xl font-bold text-indigo-200 border border-indigo-500/40">
                  {user.nickname.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-white">{user.nickname}</h1>
                  {isOnline && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Çevrimiçi
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">@{user.username}</div>
                <p className="mt-2.5 text-sm text-gray-300">{user.bio}</p>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-300">
                  <span>
                    <strong className="text-white">{userPosts.length}</strong> Paylaşım
                  </span>
                  <span>
                    <strong className="text-white">{totalLikes}</strong> Beğeni
                  </span>
                  {isOwnProfile && (
                    <span>
                      <strong className="text-white">{friendIds.length}</strong> Arkadaş
                    </span>
                  )}
                </div>

                {badges.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${b.cls}`}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

        {/* Kitaptan Altı Çizili Cümle */}
        {user.featuredQuote && (
          <div className="mt-6 rounded-xl border border-white/10 bg-[#0F1115]/80 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-indigo-300">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Kitaptan Altı Çizili Cümle</span>
            </div>
            <p
              className={`text-gray-100 ${getFontClass(
                user.featuredQuote.fontStyle
              )}`}
            >
              &ldquo;{user.featuredQuote.quoteText}&rdquo;
            </p>
            <div className="mt-2 text-xs text-gray-400">
              — {user.featuredQuote.bookTitle}
              {user.featuredQuote.authorName
                ? `, ${user.featuredQuote.authorName}`
                : ""}
            </div>
          </div>
        )}

        {/* "Bu Aralar En Çok Dinlediğim Şarkı" Eklentisi */}
        {user.pinnedTrack && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 to-[#0F1115] p-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Bu Aralar En Çok Dinlediğim Şarkı
              </div>
              <div className="mt-1 truncate text-sm font-semibold text-white">
                {user.pinnedTrack.title}
                {user.pinnedTrack.artist ? ` — ${user.pinnedTrack.artist}` : ""}
              </div>
              {user.pinnedTrack.personalNote && (
                <div className="mt-0.5 truncate text-xs italic text-gray-400">
                  &ldquo;{user.pinnedTrack.personalNote}&rdquo;
                </div>
              )}
            </div>
            <button
              onClick={() => playGlobalTrack(user.pinnedTrack!)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-emerald-400"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Dinle</span>
            </button>
          </div>
        )}
          </div>
        );
      })()}

      {/* Paylaşımlar */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
          Paylaşımlar ({userPosts.length})
        </h2>
        {userPosts.map((post) => (
          <div key={post.id} className="space-y-2">
            {post.status === "DRAFT" && isOwnProfile && (
              <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
                <span>Bu yazı henüz taslak (sadece sen görüyorsun)</span>
                <button
                  onClick={() => publishDraft(post.id)}
                  className="rounded-lg bg-amber-500 px-3 py-1 font-semibold text-black hover:bg-amber-400"
                >
                  Yayınla
                </button>
              </div>
            )}
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </div>
  );
}
