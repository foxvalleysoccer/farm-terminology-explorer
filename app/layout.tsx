import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Farm Terminology Explorer",
  description:
    "A web-based training game for conservation professionals learning common farm terminology.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
