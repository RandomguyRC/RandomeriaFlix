import type { Metadata } from "next";
import SessionHeartbeat from "@/components/SessionHeartbeat";
import "./globals.css";

export const metadata: Metadata = {
  title: "RandomeriaFlix",
  description: "A private local-first memory streaming app.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <SessionHeartbeat />
      </body>
    </html>
  );
}
