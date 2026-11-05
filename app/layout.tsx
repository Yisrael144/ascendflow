import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ascend Flow — Your business, connected",
  description: "A connected workspace for relationships, revenue and growth.",
  icons: {
    icon: "/ascend-mark.svg",
    shortcut: "/ascend-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
