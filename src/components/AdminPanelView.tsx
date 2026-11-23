"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Lock,
  UserPlus,
  Trash2,
  KeyRound,
  LifeBuoy,
  CheckCircle2,
  Flag,
  Ban,
  VolumeX,
  Users,
  MessageSquare,
} from "lucide-react";
import { useApp } from "@/context/AppContext";

export function AdminPanelView() {
  const {
    isAdmin,
    isFounder,
    isAdminVerified,
    adminInitialPasswordHint,
    verifyAdminPassword,
    adminEmails,
    adminRequests,
    addAdminEmail,
    approveAdminRequest,
    rejectAdminRequest,
    removeAdminEmail,
    changeAdminPassword,
    supportTickets,
    adminResetJournalLock,
    reports,
    resolveReport,
    adminDeletePost,
    adminDeleteComment,
    adminBanUser,
    adminUnbanUser,
    adminMuteUser,
    adminUnmuteUser,
    adminDeleteUser,
    bannedUserIds,
    mutedUserIds,
    users,
    posts,
    currentUser,
    openProfile,
    requestConfirm,
    setActiveSection,
  } = useApp();

  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState(false);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminInitPwd, setNewAdminInitPwd] = useState("");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  const [oldAdminPwd, setOldAdminPwd] = useState("");
  const [nextAdminPwd, setNextAdminPwd] = useState("");
  const [pwdChangeMsg, setPwdChangeMsg] = useState<string | null>(null);
  const [ticketPinInputs, setTicketPinInputs] = useState<Record<string, string>>({});
  const [ticketNoteInputs, setTicketNoteInputs] = useState<Record<string, string>>({});

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 pt-24 text-center space-y-4">
        <p className="text-sm text-rose-300">
          Bu sayfaya erişim yetkin bulunmuyor.
        </p>
        <button
          onClick={() => setActiveSection("FEED")}
          className="rounded-xl bg-white/10 px-4 py-2 text-xs text-white"
        >
          Akışa Dön
        </button>
      </div>
    );
  }

  // Ekstra Yetkili Şifresi Doğrulama Ekranı
  if (!isAdminVerified) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 pt-16">
        <div className="w-full max-w-sm rounded-2xl border border-indigo-500/30 bg-[#151821]/95 p-6 text-center shadow-2xl space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Yetkili Doğrulaması
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Yetkili özelliklerini kullanabilmek için ekstra yetkili şifreni
              gir.
            </p>
            {adminInitialPasswordHint && (
              <p className="mt-1 text-[10px] text-indigo-300/80">
                (Varsayılan ilk şifren:{" "}
                <code>{adminInitialPasswordHint}</code> — içeriden
                değiştirebilirsin)
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const ok = verifyAdminPassword(pwdInput);
              if (!ok) {
                setPwdError(true);
              } else {
                setPwdError(false);
                setPwdInput("");
              }
            }}
            className="space-y-3"
          >
            <input
              type="password"
              value={pwdInput}
              onChange={(e) => {
                setPwdInput(e.target.value);
                setPwdError(false);
              }}
              placeholder="Yetkili Şifresi..."
              className="w-full rounded-xl border border-white/15 bg-[#0F1115] px-4 py-3 text-center text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
            {pwdError && (
              <p className="text-xs text-rose-400">Yetkili şifresi hatalı.</p>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Yetkili Panelini Aç
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pt-18 pb-28 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Yetkili Paneli</h1>
            <p className="text-xs text-gray-400">
              Destek talepleri, kilidi sıfırlama ve yetkili atama merkezi
            </p>
          </div>
        </div>
      </div>

      {/* 1. Destek Talepleri (Ticketlar) */}
      <div className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-300">
            <LifeBuoy className="h-4 w-4" />
            <h2 className="text-sm font-semibold text-white">
              Destek Talepleri (Tickets)
            </h2>
          </div>
          <span className="text-[11px] text-emerald-300">
            Gizlilik Koruması: Kullanıcı notlarına erişim kapalıdır
          </span>
        </div>

        {supportTickets.length === 0 ? (
          <p className="text-xs text-gray-400">
            Şu anda bekleyen bir destek talebi yok.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {supportTickets.map((t) => {
              const pinVal = ticketPinInputs[t.id] || "";
              const noteVal = ticketNoteInputs[t.id] || "";
              return (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#0F1115] p-3.5 text-xs"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {t.nickname} {t.email ? `(${t.email})` : ""}
                        </span>
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">
                          {t.category === "GENERAL"
                            ? "Genel Destek"
                            : "Şifre Sıfırlama"}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-300">{t.reason}</div>
                      <div className="mt-1 text-[10px] text-gray-500">
                        {t.createdAt}
                      </div>
                      {t.adminNote && (
                        <div className="mt-1 text-[11px] text-indigo-300">
                          Yetkili Notu: {t.adminNote}
                        </div>
                      )}
                      {t.status === "RESOLVED" &&
                        t.newJournalPin &&
                        t.newJournalPin !== "__RESET__" && (
                          <div className="mt-1 text-[11px] text-emerald-300">
                            Ayarlanan Yeni Şifre: <strong>{t.newJournalPin}</strong>
                          </div>
                        )}
                    </div>

                    {t.status === "RESOLVED" && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Çözüldü</span>
                      </span>
                    )}
                  </div>

                  {t.status === "OPEN" && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2.5">
                      <input
                        type="text"
                        value={pinVal}
                        onChange={(e) =>
                          setTicketPinInputs((prev) => ({
                            ...prev,
                            [t.id]: e.target.value,
                          }))
                        }
                        placeholder="Yeni günlük şifresi/PIN (opsiyonel)"
                        className="w-48 rounded-lg border border-white/10 bg-[#151821] px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={noteVal}
                        onChange={(e) =>
                          setTicketNoteInputs((prev) => ({
                            ...prev,
                            [t.id]: e.target.value,
                          }))
                        }
                        placeholder="Kullanıcıya yanıt / not (opsiyonel)"
                        className="flex-1 min-w-[160px] rounded-lg border border-white/10 bg-[#151821] px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          adminResetJournalLock(t.id, pinVal, noteVal);
                          setTicketPinInputs((prev) => {
                            const copy = { ...prev };
                            delete copy[t.id];
                            return copy;
                          });
                          setTicketNoteInputs((prev) => {
                            const copy = { ...prev };
                            delete copy[t.id];
                            return copy;
                          });
                        }}
                        className="rounded-xl bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400"
                      >
                        {pinVal.trim()
                          ? "Şifreyi Ayarla & Çöz"
                          : t.category === "GENERAL"
                          ? "Çözüldü İşaretle"
                          : "Kilidi Sıfırla & Çöz"}
                      </button>
                      {t.userId && t.userId !== currentUser.id && (
                        <>
                          <button
                            type="button"
                            onClick={() => openProfile(t.userId)}
                            className="rounded-xl bg-white/10 px-2.5 py-1.5 text-[11px] text-gray-200 hover:bg-white/20"
                          >
                            Profil
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              requestConfirm({
                                title: "Kullanıcıyı Sustur",
                                message: "Bu kullanıcıyı susturmak istediğine emin misin?",
                                confirmLabel: "Sustur",
                                onConfirm: () => adminMuteUser(t.userId),
                              })
                            }
                            className="rounded-xl bg-amber-500/20 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 hover:bg-amber-500/30"
                          >
                            Sustur
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              requestConfirm({
                                title: "Kullanıcıyı Yasakla",
                                message: "Bu kullanıcıyı yasaklamak istediğine emin misin?",
                                confirmLabel: "Yasakla",
                                onConfirm: () => adminBanUser(t.userId),
                              })
                            }
                            className="rounded-xl bg-rose-500/20 px-2.5 py-1.5 text-[11px] font-medium text-rose-200 hover:bg-rose-500/30"
                          >
                            Yasakla
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              requestConfirm({
                                title: "Hesabı Kalıcı Olarak Sil",
                                message: "Bu hesabı ve tüm paylaşımlarını kalıcı olarak silmek istediğine emin misin?",
                                confirmLabel: "Hesabı Sil",
                                onConfirm: () => adminDeleteUser(t.userId),
                              })
                            }
                            className="rounded-xl bg-rose-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-500"
                          >
                            Hesabı Sil
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Paylaşım & Hesap Bildirimleri (Şikayetler) */}
      <div className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-400">
          <Flag className="h-4 w-4" />
          <h2 className="text-sm font-semibold text-white">
            Paylaşım & Hesap Bildirimleri ({reports.length})
          </h2>
        </div>

        {reports.length === 0 ? (
          <p className="text-xs text-gray-400">
            Şu anda bildirilen bir paylaşım veya hesap yok.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0F1115] p-3.5 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                      {r.targetType === "POST" ? "Paylaşım" : "Hesap"}
                    </span>
                    <span className="font-semibold text-white">
                      {r.targetLabel}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-300">Sebep: {r.reason}</div>
                  <div className="mt-0.5 text-[10px] text-gray-500">
                    Bildiren: {r.reporterNickname} · {r.createdAt}
                  </div>
                </div>

                {r.status === "OPEN" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {r.targetType === "POST" ? (
                      <button
                        onClick={() =>
                          requestConfirm({
                            title: "Paylaşımı Kaldır",
                            message: "Bildirilen bu paylaşımı kaldırmak istediğine emin misin?",
                            confirmLabel: "Kaldır",
                            onConfirm: () => {
                              adminDeletePost(r.targetId);
                              resolveReport(r.id);
                            },
                          })
                        }
                        className="rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-400"
                      >
                        Paylaşımı Kaldır
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => openProfile(r.targetId)}
                          className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs text-gray-200 hover:bg-white/20"
                        >
                          Profil
                        </button>
                        <button
                          onClick={() =>
                            requestConfirm({
                              title: "Kullanıcıyı Sustur",
                              message: "Bildirilen bu kullanıcıyı susturmak istediğine emin misin?",
                              confirmLabel: "Sustur",
                              onConfirm: () => {
                                adminMuteUser(r.targetId);
                                resolveReport(r.id);
                              },
                            })
                          }
                          className="rounded-xl bg-amber-500/20 px-2.5 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/30"
                        >
                          Sustur
                        </button>
                        <button
                          onClick={() =>
                            requestConfirm({
                              title: "Kullanıcıyı Yasakla",
                              message: "Bildirilen bu kullanıcıyı yasaklamak istediğine emin misin?",
                              confirmLabel: "Yasakla",
                              onConfirm: () => {
                                adminBanUser(r.targetId);
                                resolveReport(r.id);
                              },
                            })
                          }
                          className="rounded-xl bg-rose-500/20 px-2.5 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/30"
                        >
                          Yasakla
                        </button>
                        <button
                          onClick={() =>
                            requestConfirm({
                              title: "Hesabı Kalıcı Olarak Sil",
                              message: "Bildirilen bu hesabı ve tüm paylaşımlarını kalıcı olarak silmek istediğine emin misin?",
                              confirmLabel: "Hesabı Sil",
                              onConfirm: () => {
                                adminDeleteUser(r.targetId);
                                resolveReport(r.id);
                              },
                            })
                          }
                          className="rounded-xl bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                        >
                          Hesabı Sil
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => resolveReport(r.id)}
                      className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400"
                    >
                      Çözüldü
                    </button>
                  </div>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-300">
                    İncelendi
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Yetkili Atama & Yönetimi */}
      <div className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-4">
        <div className="flex items-center gap-2 text-indigo-300">
          <UserPlus className="h-4 w-4" />
          <h2 className="text-sm font-semibold text-white">
            Yetkili Hesapları Yönet
          </h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const res = addAdminEmail(newAdminEmail, newAdminInitPwd);
            if (!res.ok) {
              setAdminMsg(res.error || "Eklenemedi.");
            } else {
              setAdminMsg(
                isFounder
                  ? "Yeni yetkili ve şifresi eklendi!"
                  : "Yetkili ekleme isteğin kurucuya (WhiteSavic) gönderildi!"
              );
              setNewAdminEmail("");
              setNewAdminInitPwd("");
            }
          }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-2"
        >
          <input
            type="email"
            value={newAdminEmail}
            onChange={(e) => {
              setNewAdminEmail(e.target.value);
              setAdminMsg(null);
            }}
            placeholder="Yetkili yapılacak e-posta..."
            className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white focus:outline-none"
          />
          <input
            type="text"
            value={newAdminInitPwd}
            onChange={(e) => {
              setNewAdminInitPwd(e.target.value);
              setAdminMsg(null);
            }}
            placeholder="Varsayılan yetkili şifresi belirle..."
            className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2.5 text-xs text-white focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            {isFounder ? "Yetkili Yap" : "Kurucuya İstek Gönder"}
          </button>
        </form>

        {adminMsg && <p className="text-xs text-indigo-300">{adminMsg}</p>}

        {/* Kurucu Onayı Bekleyen Yetkili İstekleri */}
        {adminRequests.filter((r) => r.status === "PENDING").length > 0 && (
          <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5">
            <div className="text-xs font-semibold text-amber-300">
              Kurucu Onayı Bekleyen Yetkili İstekleri
            </div>
            {adminRequests
              .filter((r) => r.status === "PENDING")
              .map((req) => (
                <div
                  key={req.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#0F1115] px-3 py-2 text-xs"
                >
                  <div>
                    <span className="font-semibold text-white">
                      {req.targetEmail}
                    </span>{" "}
                    <span className="text-gray-400">
                      (İsteyen: {req.requestedByNickname})
                    </span>
                  </div>

                  {isFounder ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => approveAdminRequest(req.id)}
                        className="rounded-lg bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-black hover:bg-emerald-400"
                      >
                        Kabul Et
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectAdminRequest(req.id)}
                        className="rounded-lg bg-rose-500/20 px-3 py-1 text-[11px] text-rose-300 hover:bg-rose-500/30"
                      >
                        Reddet
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-amber-300">
                      Kurucu onayı bekleniyor
                    </span>
                  )}
                </div>
              ))}
          </div>
        )}

        <div className="space-y-2">
          {adminEmails.map((em) => (
            <div
              key={em}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0F1115] px-4 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                <span className="text-white">{em}</span>
                {em === "endend5526@gmail.com" && (
                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300">
                    Kurucu (WhiteSavic)
                  </span>
                )}
              </div>
              {em !== "endend5526@gmail.com" && (
                <button
                  onClick={() => removeAdminEmail(em)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Ekstra Yetkili Şifresini Değiştir */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const res = changeAdminPassword(oldAdminPwd, nextAdminPwd);
          if (!res.ok) {
            setPwdChangeMsg(res.error || "Değiştirilemedi.");
          } else {
            setPwdChangeMsg("Yetkili şifresi güncellendi!");
            setOldAdminPwd("");
            setNextAdminPwd("");
          }
        }}
        className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-3"
      >
        <div className="flex items-center gap-2 text-indigo-300">
          <KeyRound className="h-4 w-4" />
          <h2 className="text-sm font-semibold text-white">
            Ekstra Yetkili Şifresini Değiştir
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="password"
            value={oldAdminPwd}
            onChange={(e) => setOldAdminPwd(e.target.value)}
            placeholder="Mevcut yetkili şifresi..."
            className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white focus:outline-none"
          />
          <input
            type="password"
            value={nextAdminPwd}
            onChange={(e) => setNextAdminPwd(e.target.value)}
            placeholder="Yeni yetkili şifresi..."
            className="rounded-xl border border-white/10 bg-[#0F1115] px-3.5 py-2 text-xs text-white focus:outline-none"
          />
        </div>
        {pwdChangeMsg && (
          <p className="text-xs text-indigo-300">{pwdChangeMsg}</p>
        )}
        <button
          type="submit"
          className="rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/20"
        >
          Yetkili Şifresini Güncelle
        </button>
      </form>

      {/* 4. Kullanıcı Moderasyonu (Yasaklama & Susturma) */}
      <div className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-300">
          <Users className="h-4 w-4" />
          <h2 className="text-sm font-semibold text-white">
            Kullanıcı Moderasyonu ({users.filter((u) => u.id !== currentUser.id).length})
          </h2>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {users
            .filter((u) => u.id !== currentUser.id)
            .map((u) => {
              const isBanned = bannedUserIds.includes(u.id);
              const isMuted = mutedUserIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0F1115] px-4 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">
                        {u.nickname}
                      </span>
                      <span className="text-gray-400 truncate">@{u.username}</span>
                      {isBanned && (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">
                          Yasaklı
                        </span>
                      )}
                      {isMuted && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                          Susturuldu
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: isMuted ? "Susturmayı Kaldır" : "Kullanıcıyı Sustur",
                          message: `${u.nickname} (@${u.username}) için bu işlemi onaylıyor musun?`,
                          confirmLabel: isMuted ? "Kaldır" : "Sustur",
                          onConfirm: () =>
                            isMuted ? adminUnmuteUser(u.id) : adminMuteUser(u.id),
                        })
                      }
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                        isMuted
                          ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
                          : "bg-white/10 text-gray-300 hover:bg-amber-500/20 hover:text-amber-200"
                      }`}
                    >
                      <VolumeX className="h-3.5 w-3.5" />
                      <span>{isMuted ? "Susturmayı Kaldır" : "Sustur"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: isBanned ? "Yasağı Kaldır" : "Kullanıcıyı Yasakla",
                          message: `${u.nickname} (@${u.username}) için bu işlemi onaylıyor musun?`,
                          confirmLabel: isBanned ? "Kaldır" : "Yasakla",
                          onConfirm: () =>
                            isBanned ? adminUnbanUser(u.id) : adminBanUser(u.id),
                        })
                      }
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                        isBanned
                          ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                      }`}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>{isBanned ? "Yasağı Kaldır" : "Yasakla"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        requestConfirm({
                          title: "Hesabı Kalıcı Olarak Sil",
                          message: `${u.nickname} (@${u.username}) adlı kullanıcının hesabını ve tüm içeriklerini kalıcı olarak silmek istediğine emin misin?`,
                          confirmLabel: "Hesabı Sil",
                          onConfirm: () => adminDeleteUser(u.id),
                        })
                      }
                      className="flex items-center gap-1 rounded-lg bg-rose-600/80 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-rose-500 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Hesabı Sil</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 5. İçerik Yönetimi (Paylaşım ve Yorum Silme) */}
      <div className="rounded-2xl border border-white/10 bg-[#151821]/90 p-6 space-y-4">
        <div className="flex items-center gap-2 text-indigo-300">
          <MessageSquare className="h-4 w-4" />
          <h2 className="text-sm font-semibold text-white">
            İçerik Yönetimi ({posts.length} paylaşım)
          </h2>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {posts.map((p) => {
            const author = users.find((u) => u.id === p.authorId);
            return (
              <div
                key={p.id}
                className="rounded-xl border border-white/10 bg-[#0F1115] p-3.5 text-xs space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-indigo-300">
                      {author?.nickname || p.authorId}{" "}
                      <span className="text-gray-500 font-normal">
                        ({p.type})
                      </span>
                    </div>
                    <p className="mt-1 text-gray-200 line-clamp-2 break-words">
                      {p.title ? `${p.title} — ` : ""}
                      {p.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      requestConfirm({
                        title: "Paylaşımı Sil",
                        message: "Bu paylaşımı silmek istediğine emin misin?",
                        confirmLabel: "Paylaşımı Sil",
                        onConfirm: () => adminDeletePost(p.id),
                      })
                    }
                    className="shrink-0 flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/25"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Paylaşımı Sil</span>
                  </button>
                </div>

                {(p.comments || []).length > 0 && (
                  <div className="border-t border-white/10 pt-2 space-y-1.5">
                    {p.comments.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px]"
                      >
                        <div className="min-w-0 truncate text-gray-300">
                          <span className="font-semibold text-white">
                            {c.nickname}:{" "}
                          </span>
                          {c.body}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            requestConfirm({
                              title: "Yorumu Sil",
                              message: "Bu yorumu silmek istediğine emin misin?",
                              confirmLabel: "Sil",
                              onConfirm: () => adminDeleteComment(p.id, c.id),
                            })
                          }
                          title="Yorumu Sil"
                          className="shrink-0 rounded p-1 text-rose-300 hover:bg-rose-500/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
