import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_APP_URL
    ? new URL(process.env.NEXT_PUBLIC_APP_URL)
    : undefined,
  title: {
    default: "Plasmart Reports",
    template: "%s · Plasmart Reports",
  },
  description: "Reportería interna de campañas digitales — Plasmart",
  applicationName: "Plasmart Reports",
  // Herramienta interna detrás de auth: nunca debe aparecer en buscadores.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  // Pinta el chrome del navegador mobile del color del fondo (acero oscuro).
  themeColor: "#0a0e14",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={`dark ${plexSans.variable} ${plexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}