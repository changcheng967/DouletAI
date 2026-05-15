import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "DouletAI — Free AI Chat",
  description: "Chat with 50+ AI models from multiple providers — all free. Powered by NVIDIA, OpenRouter, Arli AI, FreeTheAi, and more.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
