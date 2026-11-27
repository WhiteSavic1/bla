"use client";

import React, { useState } from "react";
import {
  ListMusic,
  Plus,
  Play,
  Heart,
  Share2,
  Send,
  Trash2,
  Music,
  ListOrdered,
  Shuffle,
  MousePointerClick,
  ArrowUp,
  ArrowDown,
  Pencil,
  Check,
  X,
  Search,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { TrackInfo } from "@/types/persona";
import { RealSongSearch } from "./RealSongSearch";

export function PlaylistsView() {
  const {
    playlists,
    users,
    currentUser,
    friendIds,
    conversations,
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
    playGlobalTrack,
    playGlobalPlaylist,
    globalPlayMode,
    setGlobalPlayMode,
    openProfile,
    requestConfirm,
    showToast,
  } = useApp();

  const [plTab, setPlTab] = useState<"MINE" | "FRIENDS">("MINE");
  const [showCreator, setShowCreator] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [refPlaylistId, setRefPlaylistId] = useState("");
  const [title, setTitle] = useState("");
  const [trackSearch, setTrackSearch] = useState("");
  const [editingPlId, setEditingPlId] = useState<string | null>(null);
  const [editPlTitle, setEditPlTitle] = useState("");
  const [editPlDesc, setEditPlDesc] = useState("");
  const [description, setDescription] = useState("");
  const [draftTracks, setDraftTracks] = useState<TrackInfo[]>([]);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [sharingConvTarget, setSharingConvTarget] = useState<string | null>(
    null
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createPlaylist(title, description, draftTracks);
    setTitle("");
    setDescription("");
    setDraftTracks([]);
    setShowCreator(false);
  };

  const handleImportPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = importUrl.trim();
    if (!clean || isImporting) return;
    setIsImporting(true);
    try {
      const res = await fetch("/api/playlist-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clean }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        name?: string;
        tracks?: TrackInfo[];
        error?: string;
      };
      if (!res.ok || !data.ok || !data.tracks?.length) {
        showToast(data.error || "Müzik listesi aktarılamadı.");
        return;
      }
      createPlaylist(data.name || "Aktarılan Liste", "", data.tracks);
      setImportUrl("");
      setPlTab("MINE");
      showToast(`"${data.name || "Liste"}" (${data.tracks.length} şarkı) aktarıldı!`);
    } catch {
      showToast("Müzik listesi aktarılırken ağ hatası oluştu.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pt-18 pb-28 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ListMusic className="h-6 w-6 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Müzik Listeleri</h1>
            <p className="text-xs text-gray-400">
              Kendi şarkı listelerini oluştur, dinle ve akışta ya da sohbette
              başkalarıyla paylaş.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreator((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          <span>{showCreator ? "Kapat" : "Yeni Liste Oluştur"}</span>
        </button>
      </div>

      {/* Spotify veya YouTube Çalma Listesi Aktar */}
      <form
        onSubmit={handleImportPlaylist}
        className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-500/20 bg-[#151821]/85 p-3.5"
      >
        <input
          type="url"
          value={importUrl}
          onChange={(e) => setImportUrl(e.target.value)}
          placeholder="Spotify veya YouTube çalma listesi linkini yapıştır..."
          className="flex-1 min-w-[220px] rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isImporting || !importUrl.trim()}
          className="rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 transition"
        >
          {isImporting ? "Aktarılıyor..." : "Spotify / YouTube'dan Aktar"}
        </button>
      </form>

      {/* İki Sekme: Kendi Listelerim & Arkadaşlarımın Listeleri */}
      {(() => {
        const myPlaylists = playlists.filter((p) => p.authorId === currentUser.id);
        const friendPlaylists = playlists.filter(
          (p) =>
            p.authorId !== currentUser.id &&
            friendIds.includes(p.authorId) &&
            Boolean(p.isShared)
        );
        return (
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#151821] p-1 w-fit">
            <button
              type="button"
              onClick={() => setPlTab("MINE")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                plTab === "MINE"
                  ? "bg-emerald-500 text-black font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Kendi Listelerim ({myPlaylists.length})
            </button>
            <button
              type="button"
              onClick={() => setPlTab("FRIENDS")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                plTab === "FRIENDS"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Arkadaşlarımın Listeleri ({friendPlaylists.length})
            </button>
          </div>
        );
      })()}

      {/* Yeni Liste Oluşturma Formu */}
      {showCreator && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl border border-emerald-500/30 bg-[#151821]/95 p-5 space-y-4 shadow-xl"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Müzik listesi adı (örn: Gece Yarısı Akustik)..."
            className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kısa açıklama (isteğe bağlı)..."
            className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
          />

          {/* Başka Bir Listeyi Referans Alarak Şarkı Aktarma */}
          {(() => {
            const importable = playlists.filter(
              (p) =>
                p.tracks.length > 0 &&
                (p.authorId === currentUser.id ||
                  (friendIds.includes(p.authorId) && Boolean(p.isShared)))
            );
            if (importable.length === 0) return null;
            const chosen =
              importable.find((p) => p.id === refPlaylistId) || importable[0];
            return (
              <div className="rounded-xl border border-indigo-500/25 bg-indigo-950/20 p-3 space-y-2">
                <div className="text-[11px] font-medium text-indigo-300">
                  Başka Bir Listeyi Referans Al (Şarkıları Aktar):
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={chosen?.id || ""}
                    onChange={(e) => setRefPlaylistId(e.target.value)}
                    className="flex-1 min-w-[160px] rounded-lg border border-white/10 bg-[#0F1115] px-3 py-1.5 text-xs text-white focus:outline-none"
                  >
                    {importable.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.title} ({pl.tracks.length} şarkı)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!chosen) return;
                      setDraftTracks((prev) => {
                        const next = [...prev];
                        chosen.tracks.forEach((tr) => {
                          const exists = next.some(
                            (x) =>
                              x.id === tr.id ||
                              (x.title.toLowerCase() === tr.title.toLowerCase() &&
                                (x.artist || "").toLowerCase() ===
                                  (tr.artist || "").toLowerCase())
                          );
                          if (!exists) next.push(tr);
                        });
                        return next;
                      });
                    }}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition"
                  >
                    Şarkıları Aktar
                  </button>
                </div>
              </div>
            );
          })()}

          <div className="space-y-2">
            <div className="text-xs font-medium text-emerald-300">
              Listeye Gerçek Şarkılar Ekle:
            </div>
            <RealSongSearch
              onSelect={(t) =>
                setDraftTracks((prev) =>
                  prev.some((x) => x.id === t.id) ? prev : [...prev, t]
                )
              }
            />
          </div>

          {draftTracks.length > 0 && (
            <div className="space-y-1.5 rounded-xl bg-[#0F1115] p-3">
              {draftTracks.map((t, i) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between text-xs text-gray-200"
                >
                  <span className="truncate">
                    {i + 1}. {t.title} {t.artist ? `— ${t.artist}` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftTracks((prev) =>
                        prev.filter((x) => x.id !== t.id)
                      )
                    }
                    className="text-gray-500 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!title.trim()}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
            >
              Listeyi Kaydet
            </button>
          </div>
        </form>
      )}

      {/* Listeler */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={trackSearch}
            onChange={(e) => setTrackSearch(e.target.value)}
            placeholder="Liste veya şarkı adına göre ara..."
            className="w-full rounded-xl border border-white/10 bg-[#151821]/90 pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>
        {(() => {
          const tq = trackSearch.trim().toLocaleLowerCase("tr-TR");
          const visiblePlaylists = (
            plTab === "MINE"
              ? playlists.filter((p) => p.authorId === currentUser.id)
              : playlists.filter(
                  (p) =>
                    p.authorId !== currentUser.id &&
                    friendIds.includes(p.authorId) &&
                    Boolean(p.isShared)
                )
          ).filter((p) => {
            if (!tq) return true;
            return (
              p.title.toLocaleLowerCase("tr-TR").includes(tq) ||
              p.tracks.some(
                (t) =>
                  t.title.toLocaleLowerCase("tr-TR").includes(tq) ||
                  (t.artist || "").toLocaleLowerCase("tr-TR").includes(tq)
              )
            );
          });
          if (visiblePlaylists.length === 0) {
            return (
              <div className="rounded-2xl border border-white/10 bg-[#151821]/85 p-8 text-center text-xs text-gray-400">
                {plTab === "MINE"
                  ? "Henüz kendi müzik listen yok. Yukarıdan yeni bir liste oluşturabilirsin."
                  : "Arkadaşlarının paylaştığı bir müzik listesi henüz yok."}
              </div>
            );
          }
          return visiblePlaylists.map((pl) => {
          const author = users.find((u) => u.id === pl.authorId) || currentUser;
          const isOwn = pl.authorId === currentUser.id;
          const isLiked = pl.likes.includes(currentUser.id);

          return (
            <div
              key={pl.id}
              className="rounded-2xl border border-white/10 bg-[#151821]/90 p-5 space-y-4 shadow-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {editingPlId === pl.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!editPlTitle.trim()) return;
                        updatePlaylistInfo(pl.id, editPlTitle, editPlDesc);
                        setEditingPlId(null);
                      }}
                      className="space-y-2 rounded-xl border border-emerald-500/30 bg-[#0F1115] p-3"
                    >
                      <input
                        type="text"
                        value={editPlTitle}
                        onChange={(e) => setEditPlTitle(e.target.value)}
                        placeholder="Liste adı..."
                        className="w-full rounded-lg border border-white/10 bg-[#151821] px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editPlDesc}
                        onChange={(e) => setEditPlDesc(e.target.value)}
                        placeholder="Açıklama..."
                        className="w-full rounded-lg border border-white/10 bg-[#151821] px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingPlId(null)}
                          className="rounded-lg px-2.5 py-1 text-[11px] text-gray-400 hover:text-white"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="submit"
                          className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-black"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Kaydet</span>
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-white">
                          {pl.title}
                        </h2>
                        {isOwn && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlId(pl.id);
                              setEditPlTitle(pl.title);
                              setEditPlDesc(pl.description || "");
                            }}
                            title="Liste Adını/Açıklamasını Düzenle"
                            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => openProfile(author.id)}
                        className="text-xs text-indigo-300 hover:underline"
                      >
                        {author.nickname} · {pl.createdAt}
                      </button>
                      {pl.description && (
                        <p className="mt-1.5 text-xs text-gray-300">
                          {pl.description}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {pl.tracks.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => playGlobalPlaylist(pl.tracks, 0, "SEQUENTIAL")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          globalPlayMode === "SEQUENTIAL"
                            ? "bg-emerald-500 text-black hover:bg-emerald-400"
                            : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        }`}
                      >
                        <ListOrdered className="h-3.5 w-3.5" />
                        <span>Sırayla Çal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => playGlobalPlaylist(pl.tracks, 0, "SHUFFLE")}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          globalPlayMode === "SHUFFLE"
                            ? "bg-emerald-500 text-black hover:bg-emerald-400"
                            : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                        }`}
                      >
                        <Shuffle className="h-3.5 w-3.5" />
                        <span>Karışık Çal</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGlobalPlayMode("MANUAL");
                          showToast(
                            "Manuel seçim modu aktif: Aşağıdan istediğin şarkıya basarak sırayla seçebilirsin."
                          );
                        }}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          globalPlayMode === "MANUAL"
                            ? "bg-emerald-500 text-black hover:bg-emerald-400"
                            : "bg-white/10 text-gray-200 hover:bg-white/15"
                        }`}
                      >
                        <MousePointerClick className="h-3.5 w-3.5" />
                        <span>Manuel Seç</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => toggleLikePlaylist(pl.id)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition ${
                      isLiked
                        ? "bg-rose-500/15 text-rose-400"
                        : "bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <Heart
                      className={`h-3.5 w-3.5 ${isLiked ? "fill-current" : ""}`}
                    />
                    <span>{pl.likes.length}</span>
                  </button>

                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => togglePlaylistShare(pl.id)}
                      className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        pl.isShared
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-white/5 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <span>
                        {pl.isShared ? "Arkadaşlara Açık" : "Arkadaşlarla Paylaş"}
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => sharePlaylistToFeed(pl.id)}
                    className="flex items-center gap-1 rounded-lg bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-600/35"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Akışta Paylaş</span>
                  </button>

                  {conversations.length > 0 && (
                    <button
                      onClick={() =>
                        setSharingConvTarget(
                          sharingConvTarget === pl.id ? null : pl.id
                        )
                      }
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/25"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Sohbete Gönder</span>
                    </button>
                  )}

                  {isOwn && (
                    <button
                      onClick={() => deletePlaylist(pl.id)}
                      title="Müzik Listesini Sil"
                      className="flex items-center gap-1 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Sil</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Sohbet Seçici */}
              {sharingConvTarget === pl.id && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/25 bg-[#0F1115] p-3 text-xs">
                  <span className="text-gray-400">Kime gönderilsin?</span>
                  {conversations.map((c) => {
                    const p = users.find((u) => u.id === c.peerId);
                    if (!p) return null;
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          sharePlaylistToChat(pl.id, c.id);
                          setSharingConvTarget(null);
                        }}
                        className="rounded-lg bg-emerald-500 px-3 py-1 font-semibold text-black hover:bg-emerald-400"
                      >
                        {p.nickname}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Şarkılar */}
              <div className="space-y-2">
                {pl.tracks.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    Bu listede henüz şarkı yok.
                  </p>
                ) : (
                  pl.tracks.map((t, idx) => (
                    <div
                      key={`${t.id}_${idx}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#0F1115]/80 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {t.artworkUrl ? (
                          <img
                            src={t.artworkUrl}
                            alt={t.title}
                            className="h-8 w-8 rounded object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500/15 text-emerald-300 shrink-0">
                            <Music className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-xs font-medium text-white">
                            {t.title}
                          </div>
                          {t.artist && (
                            <div className="truncate text-[10px] text-gray-400">
                              {t.artist}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => playGlobalTrack(t, pl.tracks)}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Dinle</span>
                        </button>
                        {isOwn && (
                          <>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => movePlaylistTrack(pl.id, idx, -1)}
                              title="Yukarı Taşı"
                              className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-25"
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === pl.tracks.length - 1}
                              onClick={() => movePlaylistTrack(pl.id, idx, 1)}
                              title="Aşağı Taşı"
                              className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-25"
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                requestConfirm({
                                  title: "Şarkıyı Çıkar",
                                  message: `"${t.title}" şarkısını listeden çıkarmak istediğine emin misin?`,
                                  confirmLabel: "Çıkar",
                                  onConfirm: () => removeTrackFromPlaylist(pl.id, t.id),
                                })
                              }
                              title="Şarkıyı Listeden Çıkar"
                              className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-500/15 hover:text-rose-400 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Kendi listene sonradan şarkı ekle */}
              {isOwn && (
                <div>
                  <button
                    onClick={() =>
                      setAddingToId(addingToId === pl.id ? null : pl.id)
                    }
                    className="text-xs font-medium text-emerald-300 hover:underline"
                  >
                    {addingToId === pl.id
                      ? "Şarkı eklemeyi kapat"
                      : "+ Bu listeye yeni şarkı ekle"}
                  </button>
                  {addingToId === pl.id && (
                    <div className="mt-2">
                      <RealSongSearch
                        onSelect={(t) => addTrackToPlaylist(pl.id, t)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        });
        })()}
      </div>
    </div>
  );
}
