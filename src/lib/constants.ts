import { FontStyle, HighlightColor, TrackInfo } from "@/types/persona";

export const NICKNAME_PLACEHOLDERS: string[] = [
  "Personanızı yazınız...",
  "Bu geceki ruh halinin adı ne?",
  "Seni hangi isimle tanıyalım?",
  "Satır aralarında hangi mahlasla yaşarsın?",
  "Kulaklığındaki sesin sahibi kim?",
  "Bugün kim olmak istersin?",
  "Hikayenin başkahramanına bir isim ver...",
  "Kelimelerinin arkasındaki isim...",
  "Sessizliğini hangi isimle paylaşacaksın?",
  "Yeni bir sayfa, yeni bir takma ad...",
];

export const FONT_STYLE_OPTIONS: {
  id: FontStyle;
  label: string;
  description: string;
  className: string;
  sample: string;
}[] = [
  {
    id: "SANS",
    label: "Normal",
    description: "Sade ve modern okuma",
    className: "style-sans",
    sample: "Gece sessizliğinde bir cümle...",
  },
  {
    id: "ITALIC",
    label: "İtalik",
    description: "İç ses ve duygusal vurgu",
    className: "style-italic",
    sample: "Gece sessizliğinde bir cümle...",
  },
  {
    id: "SERIF",
    label: "Edebi Serif",
    description: "Kitap sayfası estetiği",
    className: "style-serif",
    sample: "Gece sessizliğinde bir cümle...",
  },
  {
    id: "HANDWRITING",
    label: "El Yazısı",
    description: "Samimi defter hissi",
    className: "style-handwriting",
    sample: "Gece sessizliğinde bir cümle...",
  },
  {
    id: "MONO",
    label: "Daktilo",
    description: "Eski mektup ve taslak",
    className: "style-mono",
    sample: "Gece sessizliğinde bir cümle...",
  },
  {
    id: "CALLIGRAPHY",
    label: "Kaligrafi",
    description: "Şiirsel ve zarif akış",
    className: "style-calligraphy",
    sample: "Gece sessizliğinde bir cümle...",
  },
];

export function getFontClass(style: FontStyle): string {
  return (
    FONT_STYLE_OPTIONS.find((f) => f.id === style)?.className || "style-sans"
  );
}

export const MOOD_TAGS = [
  "#gece-yarısı",
  "#melankoli",
  "#umut",
  "#yağmur",
  "#yalnızlık",
  "#nostalji",
  "#kitap-köşesi",
  "#enerjik",
];

export function suggestTagsFromText(
  text: string,
  trackTitle?: string,
  trackArtist?: string
): string[] {
  const combined = `${text} ${trackTitle || ""} ${trackArtist || ""}`.toLowerCase();
  const rules: { keywords: string[]; tag: string }[] = [
    { keywords: ["gece", "uyku", "yıldız", "ay ", "karanlık", "sabah"], tag: "#gece-yarısı" },
    { keywords: ["yağmur", "ıslak", "bulut", "kahve", "pencere"], tag: "#yağmur" },
    { keywords: ["hüzün", "ağla", "kırık", "yara", "acı", "özle", "dert"], tag: "#melankoli" },
    { keywords: ["umut", "yarın", "güneş", "ışık", "şafak"], tag: "#umut" },
    { keywords: ["yalnız", "sessiz", "kimse", "tek başıma"], tag: "#yalnızlık" },
    { keywords: ["eski", "anı", "çocukluk", "geçmiş", "hatıra", "plak"], tag: "#nostalji" },
    { keywords: ["kitap", "roman", "sayfa", "yazar", "satır", "şiir"], tag: "#kitap-köşesi" },
    { keywords: ["şarkı", "müzik", "nota", "melodi", "kulaklık", "akustik"], tag: "#müzik" },
    { keywords: ["aşk", "sevgi", "kalp", "his", "duygu", "sen"], tag: "#duygusal" },
  ];

  const suggested: string[] = [];
  for (const r of rules) {
    if (r.keywords.some((kw) => combined.includes(kw))) {
      suggested.push(r.tag);
    }
  }
  if (trackTitle?.trim()) {
    if (!suggested.includes("#müzik")) suggested.unshift("#müzik");
    if (!suggested.includes("#şimdi-çalıyor")) suggested.push("#şimdi-çalıyor");
  }
  return suggested;
}

export const PRESET_BACKGROUNDS = [
  {
    id: "none",
    label: "Varsayılan Gece",
    url: "",
  },
  {
    id: "rainy-window",
    label: "Yağmurlu Gece Camı (Atmosferik)",
    url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "midnight-library",
    label: "Gece Kütüphanesi",
    url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "vinyl-lofi",
    label: "Lo-Fi Plak & Kahve",
    url: "https://images.unsplash.com/photo-1461784121038-f088ca1e7714?auto=format&fit=crop&w=1600&q=80",
  },
];

export function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

export function formatRelativeTime(
  createdAtMs?: number,
  fallback?: string
): string {
  if (!createdAtMs || !Number.isFinite(createdAtMs)) {
    return fallback || "Az önce";
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));
  if (diffSec < 60) return "Az önce";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(createdAtMs).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

export const HIGHLIGHT_COLORS: {
  id: HighlightColor;
  label: string;
  bgClass: string;
  dotClass: string;
}[] = [
  {
    id: "yellow",
    label: "Sarı",
    bgClass: "bg-amber-400/25 underline decoration-amber-400 decoration-2 underline-offset-4 text-amber-100",
    dotClass: "bg-amber-400",
  },
  {
    id: "rose",
    label: "Pembe",
    bgClass: "bg-rose-400/25 underline decoration-rose-400 decoration-2 underline-offset-4 text-rose-100",
    dotClass: "bg-rose-400",
  },
  {
    id: "sky",
    label: "Mavi",
    bgClass: "bg-sky-400/25 underline decoration-sky-400 decoration-2 underline-offset-4 text-sky-100",
    dotClass: "bg-sky-400",
  },
  {
    id: "emerald",
    label: "Yeşil",
    bgClass: "bg-emerald-400/25 underline decoration-emerald-400 decoration-2 underline-offset-4 text-emerald-100",
    dotClass: "bg-emerald-400",
  },
  {
    id: "purple",
    label: "Mor",
    bgClass: "bg-purple-400/25 underline decoration-purple-400 decoration-2 underline-offset-4 text-purple-100",
    dotClass: "bg-purple-400",
  },
];

export const SAMPLE_TRACK_CATALOG: TrackInfo[] = [
  {
    id: "cat_1",
    title: "Geceye Selam",
    artist: "Büyük Ev Ablukada",
    provider: "AMBIENT",
    synthMood: "night",
  },
  {
    id: "cat_2",
    title: "Yağmur Sonrası",
    artist: "Mor ve Ötesi",
    provider: "AMBIENT",
    synthMood: "rain",
  },
  {
    id: "cat_3",
    title: "Sabah Işığı",
    artist: "Canozan",
    provider: "AMBIENT",
    synthMood: "hope",
  },
  {
    id: "cat_4",
    title: "Yarım Kalan Plak",
    artist: "Dolu Kadehi Ters Tut",
    provider: "AMBIENT",
    synthMood: "melancholy",
  },
  {
    id: "cat_5",
    title: "Bir Derdim Var",
    artist: "Mor ve Ötesi",
    provider: "AMBIENT",
    synthMood: "melancholy",
  },
  {
    id: "cat_6",
    title: "Nadas",
    artist: "Madrigal",
    provider: "AMBIENT",
    synthMood: "night",
  },
];

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function extractSpotifyTrackId(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}
