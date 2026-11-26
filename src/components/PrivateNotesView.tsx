"use client";

import React, { useState } from "react";
import {
  Lock,
  Unlock,
  Trash2,
  BookHeart,
  Lightbulb,
  Plus,
  LifeBuoy,
  Undo2,
  Redo2,
  Search,
  Download,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useTextHistory } from "@/hooks/useTextHistory";
import { FONT_STYLE_OPTIONS, getFontClass } from "@/lib/constants";
import { FontStyle } from "@/types/persona";
import { PatternLockGrid } from "./PatternLockGrid";

export function PrivateNotesView({
  section,
}: {
  section: "JOURNAL" | "THOUGHTS";
}) {
  const {
    journalLock,
    isJournalUnlocked,
    unlockJournal,
    lockJournal,
    createSupportTicket,
    privateNotes,
    addPrivateNote,
    deletePrivateNote,
    setActiveSection,
  } = useApp();

  const [pinInput, setPinInput] = useState("");
  const [patternInput, setPatternInput] = useState<number[]>([]);
  const [lockError, setLockError] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketReason, setTicketReason] = useState("");
  const [noteQuery, setNoteQuery] = useState("");

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
  const [fontStyle, setFontStyle] = useState<FontStyle>(
    section === "JOURNAL" ? "HANDWRITING" : "ITALIC"
  );

  const filteredNotes = privateNotes.filter((n) => n.section === section);
  const searchedNotes = noteQuery.trim()
    ? filteredNotes.filter((n) => {
        const q = noteQuery.trim().toLocaleLowerCase("tr-TR");
        return (
          n.title.toLocaleLowerCase("tr-TR").includes(q) ||
          n.content.toLocaleLowerCase("tr-TR").includes(q)
        );
      })
    : filteredNotes;

  const handleExportNotes = () => {
    if (filteredNotes.length === 0) return;
    const header =
      section === "JOURNAL" ? "# Günlüğüm Yedeği\n\n" : "# Düşüncelerim Yedeği\n\n";
    const body = filteredNotes
      .map(
        (n) =>
          `## ${n.title}\n_${n.createdAt}_\n\n${n.content}\n\n---\n`
      )
      .join("\n");
    const blob = new Blob([header + body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      section === "JOURNAL" ? "gunlugum-yedek.md" : "dusuncelerim-yedek.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = unlockJournal(pinInput, patternInput);
    if (!ok) {
      setLockError(true);
    } else {
      setLockError(false);
      setPinInput("");
      setPatternInput([]);
    }
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSupportTicket(ticketReason);
    setTicketReason("");
    setShowTicketForm(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    addPrivateNote({
      section,
      title:
        title.trim() ||
        (section === "JOURNAL" ? "Günlük Sayfası" : "Anlık Düşünce"),
      content: content.trim(),
      fontStyle,
    });
    setTitle("");
    resetContent("");
  };

  // Kilitli ekran (PIN, Desen veya İkisi Birden)
  if (journalLock.type !== "NONE" && !isJournalUnlocked) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4 pt-16 pb-20">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#151821]/95 p-6 text-center shadow-2xl backdrop-blur-md space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {section === "JOURNAL" ? "Günlük" : "Düşüncelerim"} Kilitli
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              Bu alan sadece sana özeldir. Kilidi açmak için belirlediğin{" "}
              {journalLock.type === "PIN"
                ? "şifreyi"
                : journalLock.type === "PATTERN"
                ? "deseni"
                : "şifreyi ve deseni"}{" "}
              gir.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            {(journalLock.type === "PIN" || journalLock.type === "BOTH") && (
              <input
                type="password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setLockError(false);
                }}
                placeholder="Şifre (PIN)..."
                className="w-full rounded-xl border border-white/15 bg-[#0F1115] px-4 py-3 text-center text-sm tracking-widest text-white focus:border-indigo-500 focus:outline-none"
              />
            )}

            {(journalLock.type === "PATTERN" ||
              journalLock.type === "BOTH") && (
              <PatternLockGrid
                value={patternInput}
                onChange={(next) => {
                  setPatternInput(next);
                  setLockError(false);
                }}
                label="Kayıtlı Desenini Çiz"
              />
            )}

            {lockError && (
              <p className="text-center text-xs text-rose-400">
                Şifre veya desen hatalı, tekrar dene.
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Kilidi Aç
            </button>
          </form>

          {/* Şifremi/Desenimi Unuttum -> Destek Talebi */}
          <div className="border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={() => setShowTicketForm((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200"
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              <span>Şifremi / Desenimi Unuttum (Destek Oluştur)</span>
            </button>

            {showTicketForm && (
              <form
                onSubmit={handleTicketSubmit}
                className="mt-3 space-y-2 text-left"
              >
                <p className="text-[11px] text-gray-400">
                  Destek talebi oluşturduğunda yetkililer yalnızca kilidini
                  sıfırlayabilir; günlük ve düşüncelerim notlarını kesinlikle
                  göremezler.
                </p>
                <input
                  type="text"
                  value={ticketReason}
                  onChange={(e) => setTicketReason(e.target.value)}
                  placeholder="Kısa açıklama (örn: Desenimi unuttum)..."
                  className="w-full rounded-lg border border-white/15 bg-[#0F1115] px-3 py-2 text-xs text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-amber-500/20 py-2 text-xs font-medium text-amber-200 hover:bg-amber-500/30"
                >
                  Destek Talebi (Ticket) Gönder
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-18 pb-28 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {section === "JOURNAL" ? (
            <BookHeart className="h-6 w-6 text-rose-400" />
          ) : (
            <Lightbulb className="h-6 w-6 text-amber-400" />
          )}
          <div>
            <h1 className="text-xl font-bold text-white">
              {section === "JOURNAL" ? "Günlüğüm" : "Düşüncelerim"}
            </h1>
            <p className="text-xs text-gray-400">
              Sadece sana özel · Kimse tıklayarak göremez
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filteredNotes.length > 0 && (
            <button
              type="button"
              onClick={handleExportNotes}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Yedek İndir (.md)</span>
            </button>
          )}
          {journalLock.type === "NONE" && (
            <button
              onClick={() => setActiveSection("SETTINGS")}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Ayarlardan Şifre / Desen Koy</span>
            </button>
          )}
        </div>
      </div>

      {/* Yeni Özel Not Formu */}
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-white/10 bg-[#151821]/90 p-5 shadow-xl space-y-3"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            section === "JOURNAL"
              ? "Bugünün başlığı (isteğe bağlı)..."
              : "Düşünce başlığı (isteğe bağlı)..."
          }
          className="w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
        />

        {/* Yazı Stili & Geri Al / İleri Al */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {FONT_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFontStyle(opt.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] transition ${
                  fontStyle === opt.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white/5 text-gray-400 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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

        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleContentKeyDown}
          placeholder={
            section === "JOURNAL"
              ? "Bugün içinde kalanları buraya yaz..."
              : "Aklından geçenleri serbestçe not al..."
          }
          className={`w-full rounded-xl border border-white/10 bg-[#0F1115] px-4 py-3 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none ${getFontClass(
            fontStyle
          )}`}
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!content.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            <span>Özel Notu Kaydet</span>
          </button>
        </div>
      </form>

      {/* Kayıtlı Özel Notlar */}
      {filteredNotes.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={noteQuery}
            onChange={(e) => setNoteQuery(e.target.value)}
            placeholder="Notlarında ara..."
            className="w-full rounded-xl border border-white/10 bg-[#151821]/90 pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      )}

      <div className="space-y-3">
        {searchedNotes.length === 0 && filteredNotes.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#151821]/70 p-6 text-center text-xs text-gray-400">
            Aramanla eşleşen not bulunamadı.
          </div>
        ) : (
          searchedNotes.map((note) => (
          <div
            key={note.id}
            className="rounded-2xl border border-white/10 bg-[#151821]/80 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {note.title}
                </h3>
                <span className="text-[11px] text-gray-500">
                  {note.createdAt}
                </span>
              </div>
              <button
                onClick={() => deletePrivateNote(note.id)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-rose-500/10 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p
              className={`mt-3 whitespace-pre-line text-gray-200 ${getFontClass(
                note.fontStyle
              )}`}
            >
              {note.content}
            </p>
          </div>
          ))
        )}
      </div>
    </div>
  );
}
