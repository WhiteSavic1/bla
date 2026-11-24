"use client";

import React, { useState } from "react";
import { Search, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { MOOD_TAGS } from "@/lib/constants";
import { HamburgerDrawer } from "./HamburgerDrawer";
import { NicknameGateModal } from "./NicknameGateModal";
import { CreatePostModal } from "./CreatePostModal";
import { PostCard } from "./PostCard";
import { ProfileView } from "./ProfileView";
import { PrivateNotesView } from "./PrivateNotesView";
import { ChatAndRoomView } from "./ChatAndRoomView";
import { SettingsView } from "./SettingsView";
import { DiscoverView } from "./DiscoverView";
import { GlobalMiniPlayer } from "./GlobalMiniPlayer";
import { ListeningRoomAudioHost } from "./ListeningRoomAudioHost";
import { VoiceCallPanel } from "./VoiceCallPanel";
import { AdminPanelView } from "./AdminPanelView";
import { PlaylistsView } from "./PlaylistsView";

export function AppShell() {
  const {
    activeSection,
    posts,
    users,
    openProfile,
    savedPostIds,
    feedBackgroundUrl,
    feedBgDim,
    friendIds,
    blockedUserIds,
    resolvedTheme,
    toastMessage,
    searchQuery,
    setSearchQuery,
  } = useApp();

  const [feedScope, setFeedScope] = useState<"GENEL" | "FRIENDS">("GENEL");
  const [moodFilter, setMoodFilter] = useState<string>("ALL");
  const [tagSearchInput, setTagSearchInput] = useState<string>("");

  const allFeedTags = Array.from(
    new Set([
      ...MOOD_TAGS,
      ...posts.flatMap((p) => (p.status === "PUBLISHED" ? p.moodTags : [])),
    ])
  );

  const matchedProfiles = searchQuery.trim()
    ? users.filter((u) => {
        const q = searchQuery.toLowerCase();
        return (
          u.nickname.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.bio.toLowerCase().includes(q)
        );
      })
    : [];

  const publicPosts = posts.filter(
    (p) => p.status === "PUBLISHED" && !blockedUserIds.includes(p.authorId)
  );
  const scopedPosts =
    feedScope === "FRIENDS"
      ? publicPosts.filter((p) => friendIds.includes(p.authorId))
      : publicPosts;
  const filteredPosts = scopedPosts.filter((p) => {
    const matchesMood =
      moodFilter === "ALL" || p.moodTags.includes(moodFilter);
    if (!matchesMood) return false;
    if (tagSearchInput.trim()) {
      const tq = tagSearchInput.trim().toLowerCase().replace(/^#/, "");
      const hasTag = p.moodTags.some((t) =>
        t.toLowerCase().replace(/^#/, "").includes(tq)
      );
      if (!hasTag) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.bookTitle && p.bookTitle.toLowerCase().includes(q)) ||
      (p.attachedTrack?.title && p.attachedTrack.title.toLowerCase().includes(q))
    );
  });

  const savedPosts = posts.filter((p) => savedPostIds.includes(p.id));
  const isFixedViewportSection = activeSection === "CHAT";

  return (
    <div
      className={
        isFixedViewportSection
          ? `relative h-[100dvh] w-full overflow-hidden ${
              resolvedTheme === "light" ? "bg-[#f3f5f9]" : "bg-[#0F1115]"
            }`
          : `relative min-h-[100dvh] w-full overflow-x-hidden ${
              resolvedTheme === "light" ? "bg-[#f3f5f9]" : "bg-[#0F1115]"
            }`
      }
    >
      {/* Tam Ekran Akış Arka Plan Fotoğrafı (Ayarlardan özelleştirilebilir) */}
      {feedBackgroundUrl && (
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-500"
          style={{ backgroundImage: `url(${feedBackgroundUrl})` }}
        />
      )}
      <div
        className="fixed inset-0 z-0 transition-opacity duration-300"
        style={{
          backgroundColor:
            resolvedTheme === "light"
              ? `rgba(243, 245, 249, ${feedBackgroundUrl ? feedBgDim / 100 : 1})`
              : `rgba(15, 17, 21, ${feedBackgroundUrl ? feedBgDim / 100 : 1})`,
          backdropFilter: feedBackgroundUrl ? "blur(3px)" : undefined,
        }}
      />

      {/* İçerik Katmanı */}
      <div
        className={
          isFixedViewportSection
            ? "relative z-10 flex flex-col h-[100dvh] w-full min-w-0 overflow-hidden"
            : "relative z-10 flex flex-col min-h-[100dvh] w-full min-w-0"
        }
      >
        <HamburgerDrawer />
        <VoiceCallPanel />

        {activeSection === "FEED" && (
          <main className="mx-auto w-full min-w-0 max-w-3xl px-3 sm:px-4 pt-18 pb-28 space-y-5">
            {/* Akış Sekmeleri: Sol Üstte Genel | Arkadaşlar */}
            <div className="flex items-center justify-start">
              <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#151821]/90 p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setFeedScope("GENEL")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                    feedScope === "GENEL"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Genel
                </button>
                <button
                  type="button"
                  onClick={() => setFeedScope("FRIENDS")}
                  className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition ${
                    feedScope === "FRIENDS"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Arkadaşlar
                </button>
              </div>
            </div>

            {/* Arama Çubuğu */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Profil, nickname, düşünce, şarkı, kitap adı ara..."
                className="w-full rounded-xl border border-white/10 bg-[#151821]/80 pl-10 pr-9 py-2.5 text-xs text-white placeholder-gray-400 backdrop-blur-md focus:border-indigo-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Eşleşen Profiller (Arama Sonucu) */}
            {matchedProfiles.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#151821]/90 p-3.5 space-y-2 backdrop-blur-md">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                  Eşleşen Profiller ({matchedProfiles.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {matchedProfiles.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => openProfile(u.id)}
                      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#0F1115]/90 px-3 py-2 text-left transition hover:border-indigo-400"
                    >
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.nickname}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/30 text-[10px] font-bold text-indigo-200">
                          {u.nickname.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-white">
                          {u.nickname}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          @{u.username} · {u.currentMood}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Etiket Arama & Ruh Hali Filtresi */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagSearchInput}
                  onChange={(e) => setTagSearchInput(e.target.value)}
                  placeholder="#etiket yazıp filtrele..."
                  className="w-full max-w-[14rem] sm:w-56 rounded-full border border-white/10 bg-[#151821]/85 px-3.5 py-1.5 text-xs text-white placeholder-gray-400 backdrop-blur-md focus:border-indigo-500 focus:outline-none"
                />
                {tagSearchInput && (
                  <button
                    onClick={() => setTagSearchInput("")}
                    className="text-[11px] text-gray-400 hover:text-white"
                  >
                    Temizle
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setMoodFilter("ALL")}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    moodFilter === "ALL"
                      ? "bg-indigo-600 text-white"
                      : "border border-white/10 bg-[#151821]/80 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  Tümü
                </button>
                {allFeedTags
                  .filter((tag) =>
                    tagSearchInput.trim()
                      ? tag
                          .toLowerCase()
                          .replace(/^#/, "")
                          .includes(
                            tagSearchInput.trim().toLowerCase().replace(/^#/, "")
                          )
                      : true
                  )
                  .map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setMoodFilter(tag)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                        moodFilter === tag
                          ? "bg-indigo-600 text-white"
                          : "border border-white/10 bg-[#151821]/80 text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
              </div>
            </div>

            {/* Tam Ekran Akış Kartları */}
            {filteredPosts.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#151821]/80 p-8 text-center text-sm text-gray-400">
                Bu ruh halinde henüz paylaşım yok. İlk paylaşımı sen yap!
              </div>
            ) : (
              filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </main>
        )}

        {activeSection === "DISCOVER" && <DiscoverView mode="DISCOVER" />}
        {activeSection === "FRIENDS" && <DiscoverView mode="FRIENDS" />}
        {activeSection === "PLAYLISTS" && <PlaylistsView />}
        {activeSection === "CHAT" && <ChatAndRoomView />}
        {activeSection === "PROFILE" && <ProfileView />}
        {activeSection === "JOURNAL" && (
          <PrivateNotesView section="JOURNAL" />
        )}
        {activeSection === "THOUGHTS" && (
          <PrivateNotesView section="THOUGHTS" />
        )}
        {activeSection === "READING_LIST" && (
          <div className="mx-auto max-w-3xl px-4 pt-18 pb-28 space-y-5">
            <h1 className="text-2xl font-bold text-white">Okuma Defterim</h1>
            {savedPosts.length === 0 ? (
              <p className="text-xs text-gray-400">
                Kaydettiğin veya altını çizdiğin yazılar burada birikir.
              </p>
            ) : (
              savedPosts.map((p) => <PostCard key={p.id} post={p} />)
            )}
          </div>
        )}
        {activeSection === "SETTINGS" && <SettingsView />}
        {activeSection === "ADMIN" && <AdminPanelView />}
      </div>

      {/* Modallar, Mini Oynatıcı & Bildirim Toast */}
      <NicknameGateModal />
      <CreatePostModal />
      <GlobalMiniPlayer />
      <ListeningRoomAudioHost />

      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-indigo-500/40 bg-[#151821]/95 px-4 py-2.5 text-xs font-medium text-white shadow-2xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
