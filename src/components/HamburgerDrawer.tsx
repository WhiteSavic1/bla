"use client";

import React from "react";
import {
  Menu,
  X,
  Flame,
  Compass,
  MessageCircle,
  User,
  BookHeart,
  Lightbulb,
  Bookmark,
  Settings,
  Lock,
  Plus,
  LogOut,
  Bell,
  ShieldCheck,
  ListMusic,
  LifeBuoy,
  UserCheck,
  Check,
  Trash2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { ActiveSection } from "@/types/persona";

export function HamburgerDrawer() {
  const {
    activeSection,
    setActiveSection,
    drawerOpen,
    setDrawerOpen,
    openProfile,
    currentUser,
    currentEmail,
    journalLock,
    conversations,
    setShowCreateModal,
    isGuest,
    hasEnteredNickname,
    setShowNicknameModal,
    logout,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    deleteNotification,
    isAdmin,
    supportTickets,
    createSupportTicket,
    confirmDialog,
    requestConfirm,
    closeConfirm,
    themeMode,
    setThemeMode,
  } = useApp();

  const [showNotifs, setShowNotifs] = React.useState(false);
  const [showTicketModal, setShowTicketModal] = React.useState(false);
  const [ticketCategory, setTicketCategory] = React.useState<
    "GENERAL" | "JOURNAL_RESET"
  >("GENERAL");
  const [ticketReason, setTicketReason] = React.useState("");
  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const openTicketsCount = supportTickets.filter(
    (t) => t.status === "OPEN"
  ).length;
  const myTickets = supportTickets.filter(
    (t) =>
      t.userId === currentUser.id ||
      (currentEmail && t.email?.toLowerCase() === currentEmail.toLowerCase())
  );

  const pendingCount = conversations.filter(
    (c) => c.status === "PENDING" && c.peerId === currentUser.id
  ).length;

  const navGroups: {
    title: string;
    items: {
      id: ActiveSection;
      label: string;
      icon: React.ReactNode;
      badge?: string | number;
      privateLock?: boolean;
    }[];
  }[] = [
    {
      title: "Sosyal",
      items: [
        { id: "FEED", label: "Akış", icon: <Flame className="h-4 w-4 text-orange-400" /> },
        {
          id: "CHAT",
          label: "Sohbet & Dinleme Odası",
          icon: <MessageCircle className="h-4 w-4 text-sky-400" />,
          badge: pendingCount > 0 ? pendingCount : undefined,
        },
        {
          id: "PLAYLISTS",
          label: "Müzik Listeleri",
          icon: <ListMusic className="h-4 w-4 text-emerald-400" />,
        },
        {
          id: "FRIENDS",
          label: "Arkadaşlarım",
          icon: <UserCheck className="h-4 w-4 text-emerald-300" />,
        },
        {
          id: "DISCOVER",
          label: "Arkadaş Bul",
          icon: <Compass className="h-4 w-4 text-indigo-300" />,
        },
      ],
    },
    {
      title: "Kişisel Alan",
      items: [
        {
          id: "PROFILE",
          label: "Profilim",
          icon: <User className="h-4 w-4 text-gray-300" />,
        },
        {
          id: "JOURNAL",
          label: "Günlük",
          icon: <BookHeart className="h-4 w-4 text-rose-400" />,
          privateLock: true,
        },
        {
          id: "THOUGHTS",
          label: "Düşüncelerim",
          icon: <Lightbulb className="h-4 w-4 text-amber-400" />,
          privateLock: true,
        },
        {
          id: "READING_LIST",
          label: "Okuma Defteri",
          icon: <Bookmark className="h-4 w-4 text-purple-300" />,
        },
      ],
    },
    {
      title: "Sistem",
      items: [
        {
          id: "SETTINGS",
          label: "Ayarlar & Arşiv",
          icon: <Settings className="h-4 w-4 text-gray-400" />,
        },
        ...(isAdmin
          ? [
              {
                id: "ADMIN" as ActiveSection,
                label: "Yetkili Paneli",
                icon: <ShieldCheck className="h-4 w-4 text-indigo-400" />,
                badge: openTicketsCount > 0 ? openTicketsCount : undefined,
              },
            ]
          : []),
      ],
    },
  ];

  const handleSelect = (id: ActiveSection) => {
    if (id === "PROFILE") {
      openProfile(currentUser.id);
    } else {
      setActiveSection(id);
      setDrawerOpen(false);
    }
  };

  return (
    <>
      {/* Sol Üst 3 Çizgi (Hamburger) & Hızlı Paylaşım Barı */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 pointer-events-none">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Menüyü Aç"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#151821]/85 text-white shadow-lg backdrop-blur-md transition hover:bg-[#1E2330]"
        >
          <Menu className="h-5 w-5" />
        </button>

        {activeSection === "FEED" && (
          <div className="pointer-events-auto flex items-center gap-2">
            {isGuest && !hasEnteredNickname && (
              <button
                onClick={() => setShowNicknameModal(true)}
                className="rounded-xl border border-indigo-500/40 bg-indigo-600/20 px-3.5 py-2 text-xs font-medium text-indigo-200 backdrop-blur-md transition hover:bg-indigo-600/35"
              >
                Giriş Yap / Kayıt Ol
              </button>
            )}
            <button
              onClick={() => {
                if (isGuest && !hasEnteredNickname) {
                  setShowNicknameModal(true);
                } else {
                  setShowCreateModal(true);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg transition hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              <span>Paylaş</span>
            </button>
          </div>
        )}
      </header>

      {/* Çekmece Backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Sol Çekmece Menü */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-full w-72 flex-col justify-between overflow-hidden border-r border-white/10 bg-[#12151D] p-3.5 shadow-2xl transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => {
              openProfile(currentUser.id);
              setDrawerOpen(false);
            }}
            title="Profilime Git"
            className="flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-lg p-1 -ml-1 hover:bg-white/5 transition"
          >
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.nickname}
                className="h-9 w-9 rounded-full object-cover border border-white/20 shrink-0"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600/30 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                {currentUser.nickname.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">
                {currentUser.nickname}
              </div>
              <div className="truncate text-[11px] text-gray-400">
                @{currentUser.username}
              </div>
            </div>
          </button>
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-2 flex-1 space-y-2 overflow-hidden">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              <div className="px-2.5 pt-1 text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                      isActive
                        ? "bg-indigo-600/20 text-indigo-300 font-medium border border-indigo-500/30"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {item.privateLock && (
                        <span
                          title="Sadece sana özel"
                          className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-gray-400"
                        >
                          <Lock className="h-2.5 w-2.5" />
                          {journalLock.type !== "NONE" ? "Şifreli" : "Özel"}
                        </span>
                      )}
                      {item.badge !== undefined && (
                        <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-2 space-y-1.5 shrink-0 border-t border-white/10 pt-2.5">
          {/* Bildirimler Butonu */}
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs text-gray-200 hover:bg-white/10"
          >
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-amber-300" />
              <span>Bildirimler</span>
            </div>
            {unreadNotifs > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {unreadNotifs}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="max-h-44 overflow-y-auto space-y-1.5 rounded-xl border border-white/10 bg-[#0F1115] p-2">
              {notifications.length > 0 && unreadNotifs > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="w-full rounded-lg bg-white/5 px-2 py-1 text-[10px] font-medium text-indigo-300 hover:bg-white/10"
                >
                  Tümünü Okundu İşaretle
                </button>
              )}
              {notifications.length === 0 ? (
                <div className="py-3 text-center text-[11px] text-gray-500">
                  Bildirim yok.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start justify-between gap-1.5 rounded-lg p-2 text-left text-[11px] transition ${
                      n.read ? "opacity-60 hover:bg-white/5" : "bg-indigo-500/10 border border-indigo-500/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (n.targetSection) setActiveSection(n.targetSection);
                        setDrawerOpen(false);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="font-semibold text-white truncate">
                        {n.title}
                      </div>
                      <div className="text-gray-400 break-words">{n.body}</div>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && (
                        <button
                          type="button"
                          title="Okundu Olarak İşaretle"
                          onClick={() => markNotificationRead(n.id)}
                          className="rounded p-1 text-emerald-400 hover:bg-emerald-500/15"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Bildirimi Sil"
                        onClick={() => deleteNotification(n.id)}
                        className="rounded p-1 text-gray-500 hover:bg-rose-500/15 hover:text-rose-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {currentEmail && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-indigo-300 truncate">
              {currentEmail}
            </div>
          )}

          {/* Hızlı Tema Seçici */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#0F1115] p-1">
            {(
              [
                { id: "SYSTEM", label: "Oto", icon: <Monitor className="h-3 w-3" /> },
                { id: "DARK", label: "Koyu", icon: <Moon className="h-3 w-3" /> },
                { id: "LIGHT", label: "Açık", icon: <Sun className="h-3 w-3" /> },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setThemeMode(opt.id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition ${
                  themeMode === opt.id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowTicketModal(true);
              setDrawerOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 py-2 text-xs font-medium text-indigo-200 transition hover:bg-indigo-500/25"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            <span>Destek Talebi (Ticket)</span>
          </button>

          {!isGuest || hasEnteredNickname ? (
            <button
              onClick={() =>
                requestConfirm({
                  title: "Hesaptan Çıkış",
                  message: "Hesabından çıkış yapmak istediğine emin misin?",
                  confirmLabel: "Çıkış Yap",
                  onConfirm: logout,
                })
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Çıkış Yap</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setDrawerOpen(false);
                setShowNicknameModal(true);
              }}
              className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-medium text-white hover:bg-indigo-500"
            >
              Giriş Yap / Kayıt Ol
            </button>
          )}
        </div>
      </aside>

      {/* Destek Talebi (Ticket) Penceresi */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#151821] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-indigo-300">
                <LifeBuoy className="h-4 w-4" />
                <h3 className="text-sm font-semibold text-white">
                  Destek Talebi (Ticket)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTicketModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ticketReason.trim()) return;
                createSupportTicket(ticketReason, ticketCategory);
                setTicketReason("");
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTicketCategory("GENERAL")}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    ticketCategory === "GENERAL"
                      ? "border-indigo-500 bg-indigo-500/20 text-white"
                      : "border-white/10 bg-[#0F1115] text-gray-400"
                  }`}
                >
                  Genel Destek / Öneri
                </button>
                <button
                  type="button"
                  onClick={() => setTicketCategory("JOURNAL_RESET")}
                  className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    ticketCategory === "JOURNAL_RESET"
                      ? "border-amber-500 bg-amber-500/20 text-amber-200"
                      : "border-white/10 bg-[#0F1115] text-gray-400"
                  }`}
                >
                  Şifre / Kilit Sıfırlama
                </button>
              </div>

              <textarea
                rows={3}
                value={ticketReason}
                onChange={(e) => setTicketReason(e.target.value)}
                placeholder={
                  ticketCategory === "JOURNAL_RESET"
                    ? "Günlük / Düşüncelerim şifre sıfırlama talebini yaz..."
                    : "İstediğin konu, sorun veya öneriyi buraya yaz..."
                }
                className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
              />

              <button
                type="submit"
                disabled={!ticketReason.trim()}
                className="w-full rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition"
              >
                Talep Gönder
              </button>
            </form>

            {myTickets.length > 0 && (
              <div className="border-t border-white/10 pt-3 space-y-2 max-h-44 overflow-y-auto">
                <div className="text-[11px] font-semibold text-gray-400">
                  Taleplerim ({myTickets.length})
                </div>
                {myTickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-white/10 bg-[#0F1115] p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-gray-500">
                        {t.category === "JOURNAL_RESET"
                          ? "Şifre Sıfırlama"
                          : "Genel Destek"}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          t.status === "RESOLVED"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {t.status === "RESOLVED" ? "Çözüldü" : "Bekliyor"}
                      </span>
                    </div>
                    <div className="text-gray-200">{t.reason}</div>
                    {t.adminNote && (
                      <div className="text-[11px] text-indigo-300">
                        Yetkili Notu: {t.adminNote}
                      </div>
                    )}
                    {t.status === "RESOLVED" &&
                      t.newJournalPin &&
                      t.newJournalPin !== "__RESET__" && (
                        <div className="text-[11px] text-emerald-300">
                          Yeni Günlük Şifren: <strong>{t.newJournalPin}</strong>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Genel Onay Penceresi (Silme / Çıkış vb.) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#151821] p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-semibold text-white">
              {confirmDialog.title}
            </h3>
            <p className="text-xs text-gray-300">{confirmDialog.message}</p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeConfirm}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-gray-300 hover:bg-white/5"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  closeConfirm();
                }}
                className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400"
              >
                {confirmDialog.confirmLabel || "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
