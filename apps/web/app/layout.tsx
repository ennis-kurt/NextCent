import type { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans, Manrope } from "next/font/google";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["500", "600", "700", "800"]
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"]
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"]
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${plexSans.variable} ${plexMono.variable} bg-[var(--pa-bg)] font-body text-[var(--pa-text)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
