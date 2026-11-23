import { Conversation, Post, UserProfile } from "@/types/persona";

export const SEED_USERS: UserProfile[] = [
  {
    id: "u_gece",
    username: "gece_okuru",
    nickname: "Gece Okuru",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
    bio: "Gece yarısı kahvesi, altı çizili satırlar ve yarım kalan melodiler.",
    currentMood: "#gece-yarısı",
    vibeScore: 94,
    isOnline: true,
    featuredQuote: {
      id: "q1",
      quoteText:
        "İnsan bazen sadece bir cümlenin içinde dinlenmek ister; ne çok şey anlatmak ne de anlaşılmak zorunda kalmadan.",
      bookTitle: "Tutunamayanlar",
      authorName: "Oğuz Atay",
      fontStyle: "SERIF",
    },
    pinnedTrack: {
      id: "t_gece",
      title: "Geceye Selam",
      artist: "Büyük Ev Ablukada",
      personalNote: "Bu ara her gece yürüyüşünde kulağımda...",
      provider: "AMBIENT",
      synthMood: "night",
    },
    profileAudio: {
      title: "Geceye Selam (Kesit)",
      artist: "Büyük Ev Ablukada",
      provider: "AMBIENT",
      startSec: 42,
      endSec: 72,
      synthMood: "night",
    },
  },
  {
    id: "u_plak",
    username: "plak_izi",
    nickname: "Plak İzi",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
    bio: "Eski plaklar, yağmurlu camlar ve mektup tadında blog yazıları.",
    currentMood: "#melankoli",
    vibeScore: 88,
    isOnline: true,
    featuredQuote: {
      id: "q2",
      quoteText:
        "Bazı şarkılar bir anıyı değil, o anıda kim olduğumuzu hatırlatır.",
      bookTitle: "Kürk Mantolu Madonna",
      authorName: "Sabahattin Ali",
      fontStyle: "ITALIC",
    },
    pinnedTrack: {
      id: "t_plak",
      title: "Yağmur Sonrası",
      provider: "AMBIENT",
      synthMood: "rain",
    },
    profileAudio: {
      title: "Yağmur Sonrası (Nakarat)",
      provider: "AMBIENT",
      startSec: 15,
      endSec: 40,
      synthMood: "rain",
    },
  },
  {
    id: "u_umut",
    username: "satir_sonu",
    nickname: "Satır Sonu",
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80",
    bio: "Kitaplardan topladığım cümlelerle kendime bir sığınak kuruyorum.",
    currentMood: "#umut",
    vibeScore: 81,
    isOnline: false,
    featuredQuote: {
      id: "q3",
      quoteText:
        "Karanlığın en koyu olduğu an, şafağın hemen öncesidir.",
      bookTitle: "Simyacı",
      authorName: "Paulo Coelho",
      fontStyle: "CALLIGRAPHY",
    },
    pinnedTrack: {
      id: "t_umut",
      title: "Sabah Işığı",
      artist: "Canozan",
      personalNote: "Güne başlarken iyi geliyor.",
      provider: "AMBIENT",
      synthMood: "hope",
    },
    profileAudio: {
      title: "Sabah Işığı",
      artist: "Canozan",
      provider: "AMBIENT",
      startSec: 60,
      endSec: 88,
      synthMood: "hope",
    },
  },
];

export const SEED_POSTS: Post[] = [];

export const SEED_CONVERSATIONS: Conversation[] = [];
