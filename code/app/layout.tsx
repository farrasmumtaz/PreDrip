import type { Metadata } from "next";

import "./globals.css";
import "leaflet/dist/leaflet.css";
import "./accessibility.css";

export const metadata: Metadata = {
  title: "PreDrip",
  description: "Flood risk intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="id">
      <body><a className="skip-link" href="#main-content">Lewati ke konten utama</a>{children}</body>
    </html>
  );
}
