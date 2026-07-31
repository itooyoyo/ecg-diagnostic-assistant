import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ECG Diagnostic Assistant",
  description: "心電図読影・対応支援ツール",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
