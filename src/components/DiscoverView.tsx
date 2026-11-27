"use client";

import React, { useState } from "react";
import {
  Music,
  BookOpen,
  UserPlus,
  UserCheck,
  Star,
  Clock,
  Check,
  X,
  MessageCircle,
  Search,
  Users,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { getFontClass } from "@/lib/constants";

export function DiscoverView({
  mode = "DISCOVER",
}: {
  mode?: "DISCOVER" | "FRIENDS";
}) {
  const {
    users,
    currentUser,
    openProfile,
    friendIds,
    closeFriendIds,
    friendRequests,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    toggleCloseFriend,
    startDirectChatFromProfile,
    requestConfirm,
    blockedUserIds,
    toggleBlockUser,
    onlineUserIds,
  } = useApp();

  const [query, setQuery] = useState("");
  const [onlyOnline, setOnlyOnline] = useState(false);

  const others = users.filter((u) => u.id !== currentUser.id);
  const myFriends = others.filter((u) => friendIds.includes(u.id));
  const onlineFriendsCount = myFriends.filter((u) =>
    onlineUserIds.includes(u.id)
  ).length;
  const discoverableUsers = others.filter((u) => !friendIds.includes(u.id));
  const baseList = mode === "FRIENDS" ? myFriends : discoverableUsers;
  const onlineScoped =
    mode === "FRIENDS" && onlyOnline
      ? baseList.filter((u) => onlineUserIds.includes(u.id))
      : baseList;
  const filteredUsers = (
    query.trim()
      ? onlineScoped.filter(
          (u) =>
            u.nickname.toLowerCase().includes(query.trim().toLowerCase()) ||
            u.username.toLowerCase().includes(query.trim().toLowerCase())
        )
      : onlineScoped
  ).sort((a, b) => {
    const ao = onlineUserIds.includes(a.id) ? 1 : 0;
    const bo = onlineUserIds.includes(b.id) ? 1 : 0;
    return bo - ao;
  });
  const incomingRequests = friendRequests.filter(
    (r) => r.toUserId === currentUser.id && r.status === "PENDING"
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pt-18 pb-28 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {mode === "FRIENDS"
            ? `Arkadaşlarım (${myFriends.length})`
            : `Arkadaş Bul (${discoverableUsers.length})`}
        </h1>
        <p className="mt-1 text-xs text-gray-400">
          {mode === "FRIENDS"
            ? "Ekli arkadaşlarını yönet, yakın arkadaş seç ve hemen sohbet başlat."
            : "Henüz arkadaş olmadığın kayıtlı hesapları keşfet ve arkadaşlık isteği gönder."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim veya @kullanıcı adı ile ara..."
            className="w-full rounded-xl border border-white/10 bg-[#151821]/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        {mode === "FRIENDS" && (
          <button
            type="button"
            onClick={() => setOnlyOnline((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium transition shrink-0 ${
              onlyOnline
                ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-200"
                : "border-white/10 bg-[#151821]/90 text-gray-300 hover:bg-white/5"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Çevrimiçi ({onlineFriendsCount})</span>
          </button>
        )}
      </div>

      {/* Gelen Arkadaşlık İstekleri */}
      {incomingRequests.length > 0 && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-2.5">
          <div className="text-xs font-semibold text-indigo-300">
            Gelen Arkadaşlık İstekleri ({incomingRequests.length})
          </div>
          {incomingRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0F1115] px-4 py-2.5 text-xs"
            >
              <div>
                <span className="font-semibold text-white">
                  {req.fromNickname}
                </span>{" "}
                <span className="text-gray-400">
                  seni arkadaş olarak eklemek istiyor.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => acceptFriendRequest(req.id)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-black hover:bg-emerald-400"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Kabul Et</span>
                </button>
                <button
                  onClick={() => rejectFriendRequest(req.id)}
                  className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-3 py-1.5 text-rose-300 hover:bg-rose-500/30"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reddet</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#151821]/85 p-8 text-center text-sm text-gray-400">
          {mode === "FRIENDS"
            ? "Henüz ekli arkadaşın yok. Sol menüdeki Arkadaş Bul kısmından arkadaş ekleyebilirsin."
            : "Şu anda arkadaş olmadığın başka kayıtlı hesap bulunmuyor."}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredUsers.map((user) => {
            const isFriend = friendIds.includes(user.id);
            const isCloseFriend = closeFriendIds.includes(user.id);
            const pendingSent = friendRequests.some(
              (r) =>
                r.status === "PENDING" &&
                r.fromUserId === currentUser.id &&
                r.toUserId === user.id
            );

            return (
              <div
                key={user.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#151821]/90 p-5 text-left shadow-xl transition hover:border-indigo-500/40"
              >
                <div>
                  <button
                    onClick={() => openProfile(user.id)}
                    className="flex items-center gap-3 text-left group"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.nickname}
                        className="h-12 w-12 rounded-xl object-cover border border-white/15 group-hover:border-indigo-400"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/30 text-sm font-bold text-indigo-200">
                        {user.nickname.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white group-hover:text-indigo-300">
                          {user.nickname}
                        </span>
                        {onlineUserIds.includes(user.id) && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Çevrimiçi
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">
                        @{user.username}
                      </div>
                    </div>
                  </button>

                  {user.bio && (
                    <p className="mt-3 text-xs text-gray-300">{user.bio}</p>
                  )}

                  {user.featuredQuote && (
                    <div className="mt-3 rounded-xl bg-[#0F1115]/80 p-3 text-xs text-gray-300">
                      <div className="mb-1 flex items-center gap-1 text-[10px] text-indigo-300">
                        <BookOpen className="h-3 w-3" />
                        <span>{user.featuredQuote.bookTitle}</span>
                      </div>
                      <span
                        className={getFontClass(user.featuredQuote.fontStyle)}
                      >
                        &ldquo;{user.featuredQuote.quoteText}&rdquo;
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {user.pinnedTrack && (
                    <div className="flex items-center gap-2 text-xs text-emerald-300">
                      <Music className="h-3.5 w-3.5" />
                      <span className="truncate">
                        En çok dinlediği: {user.pinnedTrack.title}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                    {isFriend ? (
                      <button
                        onClick={() =>
                          requestConfirm({
                            title: "Arkadaşı Çıkar",
                            message: `${user.nickname} adlı kişiyi arkadaşlarından çıkarmak istediğine emin misin?`,
                            confirmLabel: "Çıkar",
                            onConfirm: () => removeFriend(user.id),
                          })
                        }
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2 text-xs font-medium text-white hover:bg-rose-500/20 hover:text-rose-200"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Arkadaş</span>
                      </button>
                    ) : pendingSent ? (
                      <button
                        onClick={() => cancelFriendRequest(user.id)}
                        title="İsteği geri çekmek için tıkla"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 py-2 text-xs font-medium text-amber-300 hover:bg-rose-500/20 hover:text-rose-200 transition"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>İstek Gönderildi (Geri Çek)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-medium text-white hover:bg-indigo-500"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Arkadaş Ekle</span>
                      </button>
                    )}

                    {isFriend && (
                      <button
                        onClick={() => toggleCloseFriend(user.id)}
                        title="Yakın Arkadaş (Karşıya bildirim düşer)"
                        className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition ${
                          isCloseFriend
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : "border border-white/10 bg-white/5 text-gray-400 hover:text-amber-300"
                        }`}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            isCloseFriend ? "fill-current" : ""
                          }`}
                        />
                        <span>Yakın</span>
                      </button>
                    )}

                    <button
                      onClick={() => startDirectChatFromProfile(user.id)}
                      title={
                        isFriend
                          ? "Sınırsız Mesaj Gönder"
                          : "Arkadaş olmadan önce 1 mesaj hakkı"
                      }
                      className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-200 hover:bg-white/10"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleBlockUser(user.id)}
                      title={blockedUserIds.includes(user.id) ? "Engeli Kaldır" : "Kullanıcıyı Engelle"}
                      className={`flex items-center justify-center rounded-xl border px-2.5 py-2 text-[11px] font-medium transition ${
                        blockedUserIds.includes(user.id)
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                          : "border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                      }`}
                    >
                      {blockedUserIds.includes(user.id) ? "Engelli" : "Engelle"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
