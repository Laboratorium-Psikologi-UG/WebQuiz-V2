import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/Provider";
import { ToastProvider } from "@/components/toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WebQuiz | Laboratorium Psikologi",
  description: "Platform pre-test dan post-test Laboratorium Psikologi",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TRPCProvider><ToastProvider>{children}</ToastProvider></TRPCProvider>
      </body>
    </html>
  );
}
