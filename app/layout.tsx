import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VGK Invoice Manager",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="logo" src="/images/logo.png" style={{ display: "none" }} alt="" />
      </body>
    </html>
  );
}
