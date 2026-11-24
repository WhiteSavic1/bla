import type { Metadata, Viewport } from "next";
import {
  Inter,
  Lora,
  Caveat,
  JetBrains_Mono,
  Cormorant_Garamond,
} from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-custom",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Satır Arası — Duygu, Blog, Müzik & Sohbet",
  description:
    "Duygularını, düşüncelerini, blog yazılarını, şarkı sözlerini ve kitap alıntılarını paylaş; ruh haline göre arkadaş bul ve birlikte şarkı dinle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${lora.variable} ${caveat.variable} ${jetbrainsMono.variable} ${cormorant.variable} dark h-full antialiased`}
    >
      <body className="min-h-full w-full overflow-x-hidden bg-[#0F1115] text-[#F3F4F6] selection:bg-indigo-500/40 selection:text-white">
        <script
          src="https://accounts.google.com/gsi/client"
          async
          defer
        ></script>
        {children}
      </body>
    </html>
  );
}
