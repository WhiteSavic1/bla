"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight, Eye, LogIn, UserPlus, X } from "lucide-react";
import { NICKNAME_PLACEHOLDERS } from "@/lib/constants";
import { useApp } from "@/context/AppContext";

const GoogleGIcon = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
    />
  </svg>
);

export function NicknameGateModal() {
  const {
    showNicknameModal,
    setShowNicknameModal,
    registerAccount,
    loginAccount,
    loginWithGoogle,
    pendingGoogleUser,
    setPendingGoogleUser,
    enterAsGuest,
  } = useApp();

  const [mode, setMode] = useState<"REGISTER" | "LOGIN" | "GOOGLE_NICKNAME">(
    "LOGIN"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!showNicknameModal) return;
    if (pendingGoogleUser) {
      setMode("GOOGLE_NICKNAME");
      setNickname(pendingGoogleUser.name || "");
      setError(null);
    } else {
      setMode("LOGIN");
      setError(null);
    }
  }, [showNicknameModal, pendingGoogleUser]);

  useEffect(() => {
    if (!showNicknameModal) return;
    const id = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % NICKNAME_PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(id);
  }, [showNicknameModal]);

  if (!showNicknameModal) return null;

  const handleGoogleRedirectLogin = () => {
    setError(null);
    if (!googleClientId) {
      setError("Google Client ID yapılandırılmamış.");
      return;
    }
    const redirectUri =
      window.location.hostname === "localhost"
        ? "http://localhost:3000"
        : window.location.hostname.endsWith(".vercel.app")
        ? "https://versetone.vercel.app"
        : window.location.origin;
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent("email profile")}` +
      `&prompt=select_account`;

    window.location.assign(authUrl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "REGISTER") {
      const res = registerAccount(email, password, nickname);
      if (!res.ok) setError(res.error || "Kayıt olunamadı.");
    } else if (mode === "LOGIN") {
      const res = loginAccount(email, password);
      if (!res.ok) setError(res.error || "Giriş yapılamadı.");
    } else if (mode === "GOOGLE_NICKNAME" && pendingGoogleUser) {
      const res = loginWithGoogle(
        pendingGoogleUser.email,
        nickname,
        pendingGoogleUser.picture
      );
      if (!res.ok) {
        setError(res.error || "Nickname kaydedilemedi.");
      } else {
        setPendingGoogleUser(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#151821] p-7 shadow-2xl my-8">
        <button
          onClick={() => {
            setPendingGoogleUser(null);
            setShowNicknameModal(false);
          }}
          aria-label="Kapat"
          className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-2.5 text-indigo-400">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">
            Satır Arası
          </span>
        </div>

        <h1 className="text-xl font-semibold text-white">
          {mode === "REGISTER"
            ? "Hesap Oluştur"
            : mode === "GOOGLE_NICKNAME"
            ? "Google Hesabın İçin Nickname Seç"
            : "Hesabına Giriş Yap"}
        </h1>
        <p className="mt-1.5 text-xs text-gray-400">
          {mode === "GOOGLE_NICKNAME"
            ? `${pendingGoogleUser?.email} seçildi. Şimdi profilinde görünecek nickname'i belirle.`
            : "Paylaşım yapmak, beğenmek, yorumlamak veya sohbet etmek için giriş yap ya da kayıt ol."}
        </p>

        {mode !== "GOOGLE_NICKNAME" && (
          <div className="mt-5 grid grid-cols-2 gap-1.5 rounded-xl bg-[#0F1115] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => {
                setMode("LOGIN");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                mode === "LOGIN"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Giriş Yap</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("REGISTER");
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                mode === "REGISTER"
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Kayıt Ol</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {mode !== "GOOGLE_NICKNAME" && (
            <>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  E-posta
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  className="w-full rounded-xl border border-white/15 bg-[#0F1115] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1">
                  Şifre
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="En az 4 karakter..."
                  className="w-full rounded-xl border border-white/15 bg-[#0F1115] px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </>
          )}

          {(mode === "REGISTER" || mode === "GOOGLE_NICKNAME") && (
            <div>
              <label className="block text-[11px] text-gray-400 mb-1">
                Görünecek Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={NICKNAME_PLACEHOLDERS[placeholderIndex]}
                maxLength={28}
                className="w-full rounded-xl border border-white/15 bg-[#0F1115] px-4 py-3 text-sm text-white placeholder-gray-400/80 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                <span>Dinamik öneri #{placeholderIndex + 1}</span>
                <span>{nickname.length}/28</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <span>
              {mode === "REGISTER"
                ? "Kayıt Ol ve İçeri Gir"
                : mode === "GOOGLE_NICKNAME"
                ? "Nickname ile Tamamla"
                : "Giriş Yap"}
            </span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {mode !== "GOOGLE_NICKNAME" && (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handleGoogleRedirectLogin}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white px-4 py-2.5 text-xs font-semibold text-gray-900 shadow transition hover:bg-gray-100"
            >
              <GoogleGIcon className="h-4 w-4" />
              <span>Google ile Giriş Yap</span>
            </button>

            <button
              type="button"
              onClick={enterAsGuest}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs text-gray-400 transition hover:text-white"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Misafir Olarak Okumaya Devam Et</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
