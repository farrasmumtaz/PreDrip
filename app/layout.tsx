import type { Metadata } from "next";

import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
