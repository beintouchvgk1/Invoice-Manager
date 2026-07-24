import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/Common/ToastProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "VGK Invoice Manager",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="logo" src="/images/logo.png" style={{ display: "none" }} alt="" />
      </body>
    </html>
  );
}
